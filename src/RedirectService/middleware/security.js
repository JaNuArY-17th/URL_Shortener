const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('../services/logger');
const config = require('../config/config');

/**
 * Content Security Policy setup
 * @returns {Object} CSP middleware
 */
const setupCSP = () => {
  return helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https://cdn.jsdelivr.net"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://cdn.jsdelivr.net"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  });
};

/**
 * Smart rate limiting based on IP reputation
 * @returns {Function} Middleware
 */
const smartRateLimit = () => {
  // Cache to store IP reputations
  const ipReputations = new Map();
  const suspiciousPatterns = [
    /^bot/i,
    /spider/i,
    /crawl/i,
    /PhantomJS/i,
    /HeadlessChrome/i,
  ];

  // Preprocess IP reputation
  const preprocessIP = (req, res, next) => {
    const ip = req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || '';
    const referer = req.headers['referer'] || '';

    if (!ipReputations.has(ip)) {
      // Initial reputation score (higher is better)
      ipReputations.set(ip, {
        score: 100, // Default starting score
        requestCount: 0,
        lastRequest: Date.now(),
        fingerprint: `${userAgent}-${referer}`,
      });
    }

    const reputation = ipReputations.get(ip);
    const now = Date.now();
    
    // Update request count and time
    reputation.requestCount++;
    
    // Calculate time since last request in seconds
    const timeSinceLastRequest = (now - reputation.lastRequest) / 1000;
    reputation.lastRequest = now;

    // Adjust reputation based on behaviors
    if (timeSinceLastRequest < 1 && reputation.requestCount > 10) {
      // Too many requests in short time
      reputation.score -= 5;
    }

    // Check for suspicious user agent
    if (suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
      reputation.score -= 10;
      logger.warn(`Suspicious user agent detected: ${userAgent}`, { ip });
    }

    // Check for inconsistent fingerprint
    if (reputation.fingerprint && reputation.fingerprint !== `${userAgent}-${referer}`) {
      reputation.score -= 2;
      logger.debug(`Changing fingerprint for IP: ${ip}`);
    }
    
    // Update fingerprint
    reputation.fingerprint = `${userAgent}-${referer}`;
    
    // Keep score in bounds
    reputation.score = Math.max(0, Math.min(100, reputation.score));
    
    // Add reputation to request object for later use
    req.ipReputation = reputation.score;
    
    // Gradually restore reputation over time (reward good behavior)
    if (timeSinceLastRequest > 60 && reputation.score < 100) {
      reputation.score = Math.min(100, reputation.score + 1);
    }
    
    next();
  };

  // Main rate limiter using reputation for window size
  const reputationBasedRateLimit = rateLimit({
    windowMs: 60 * 1000, // Base window: 1 minute
    max: (req) => {
      const baseLimit = config.rateLimit.redirect.max;
      const reputation = req.ipReputation || 50;
      
      // Adjust limit based on reputation:
      // - High reputation (80-100): more requests allowed (150-200% of base)
      // - Medium reputation (30-80): normal amount (100% of base)
      // - Low reputation (0-30): fewer requests (30-90% of base)
      if (reputation >= 80) {
        return Math.floor(baseLimit * (1.5 + (reputation - 80) / 100));
      } else if (reputation >= 30) {
        return baseLimit;
      } else {
        return Math.max(3, Math.floor(baseLimit * (0.3 + reputation / 50)));
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
      const ip = req.ip || 'unknown';
      
      // Reduce reputation for rate-limited IPs
      if (ipReputations.has(ip)) {
        const reputation = ipReputations.get(ip);
        reputation.score = Math.max(0, reputation.score - 15);
        logger.warn(`Rate limit reached for IP: ${ip}, score reduced to ${reputation.score}`);
      }
      
      res.status(429).json({
        status: 'error',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil(options.windowMs / 1000)
      });
    },
    skip: (req) => {
      // Skip for health checks and documentation
      return req.path.startsWith('/api/health') || 
             req.path.startsWith('/api-docs');
    }
  });

  return [preprocessIP, reputationBasedRateLimit];
};

/**
 * Bot detection middleware
 * @returns {Function} Middleware
 */
const botDetection = () => {
  return (req, res, next) => {
    const userAgent = req.headers['user-agent'] || '';
    const ip = req.ip || 'unknown';
    
    // Advanced bot detection logic
    const botSignatures = [
      { pattern: /HeadlessChrome/, score: 0.7 },
      { pattern: /PhantomJS/, score: 0.8 },
      { pattern: /Googlebot|Bingbot|Slurp|DuckDuckBot|Baiduspider|YandexBot|Sogou/, score: 0.2 }, // Known legitimate bots
      { pattern: /bot|crawl|spider|scrape/i, score: 0.5 },
      { pattern: /curl|wget|Postman|insomnia/i, score: 0.6 },
      { pattern: /puppeteer|selenium|webdriver/i, score: 0.7 },
    ];
    
    // Calculate bot probability
    let botProbability = 0;
    for (const sig of botSignatures) {
      if (sig.pattern.test(userAgent)) {
        botProbability = Math.max(botProbability, sig.score);
      }
    }
    
    // Additional factors that might indicate bot
    if (!req.headers.referer) botProbability += 0.1;
    if (!req.headers.cookie) botProbability += 0.1;
    if (req.headers.accept && req.headers.accept === '*/*') botProbability += 0.1;
    
    // Cap at 1.0
    botProbability = Math.min(1.0, botProbability);
    
    // Add to request for use in other middleware
    req.botProbability = botProbability;
    
    // Log high probability bots
    if (botProbability > 0.7) {
      logger.debug(`Potential bot detected: ${ip}, UA: ${userAgent}, Score: ${botProbability.toFixed(2)}`);
      
      // For extremely high probability, may add to rate limiting
      if (botProbability > 0.9) {
        req.ipReputation = Math.max(0, (req.ipReputation || 50) - 30);
      }
    }
    
    // We don't block here, just annotate for metrics and potential action
    next();
  };
};

/**
 * Security headers middleware setup
 * @returns {Array} Array of security middleware
 */
const setupSecurityHeaders = () => {
  return [
    helmet.xssFilter(),
    helmet.noSniff(),
    helmet.hidePoweredBy(),
    helmet.frameguard({ action: 'deny' }),
    helmet.referrerPolicy({ policy: 'strict-origin-when-cross-origin' }),
    helmet.hsts({
      maxAge: 15552000, // 180 days in seconds
      includeSubDomains: true,
      preload: true
    }),
    helmet.permittedCrossDomainPolicies({
      permittedPolicies: 'none'
    }),
  ];
};

module.exports = {
  setupCSP,
  setupSecurityHeaders,
  smartRateLimit,
  botDetection,
}; 