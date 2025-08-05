const { GoogleGenerativeAI } = require('@google/generative-ai');
const PrivacyAwareDataService = require('./privacyAwareDataService');
const logger = require('./logger');

/**
 * Gemini MCP Service for AI-powered insights and assistance
 * Integrates with Google's Gemini AI while maintaining data privacy
 */
class GeminiMCPService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
    this.dataService = new PrivacyAwareDataService();
    this.tools = this.initializeTools();
  }

  /**
   * Initialize MCP tools for Gemini AI
   */
  initializeTools() {
    return [
      {
        name: "analyze_url_performance",
        description: "Analyze URL performance and provide actionable insights",
        parameters: {
          type: "object",
          properties: {
            shortCode: { type: "string", description: "Short code of the URL to analyze" },
            timeRange: { type: "string", enum: ["1d", "7d", "30d", "90d"], default: "7d" }
          },
          required: ["shortCode"]
        },
        handler: this.analyzeUrlPerformance.bind(this)
      },
      {
        name: "get_system_insights",
        description: "Get comprehensive system analytics and insights",
        parameters: {
          type: "object",
          properties: {
            timeRange: { type: "string", enum: ["1d", "7d", "30d", "90d"], default: "7d" },
            includeRecommendations: { type: "boolean", default: true }
          }
        },
        handler: this.getSystemInsights.bind(this)
      },
      {
        name: "analyze_user_behavior",
        description: "Analyze user behavior patterns (anonymized)",
        parameters: {
          type: "object",
          properties: {
            segment: { type: "string", enum: ["all", "active", "new", "power_users"], default: "all" }
          }
        },
        handler: this.analyzeUserBehavior.bind(this)
      },
      {
        name: "generate_url_suggestions",
        description: "Generate smart URL suggestions based on content analysis",
        parameters: {
          type: "object",
          properties: {
            originalUrl: { type: "string", description: "The original URL to analyze" },
            context: { type: "string", description: "Additional context about the URL usage" }
          },
          required: ["originalUrl"]
        },
        handler: this.generateUrlSuggestions.bind(this)
      },
      {
        name: "detect_anomalies",
        description: "Detect unusual patterns in URL usage or system behavior",
        parameters: {
          type: "object",
          properties: {
            timeRange: { type: "string", enum: ["1d", "7d", "30d"], default: "7d" },
            sensitivity: { type: "string", enum: ["low", "medium", "high"], default: "medium" }
          }
        },
        handler: this.detectAnomalies.bind(this)
      }
    ];
  }

  /**
   * Analyze URL performance with AI insights
   */
  async analyzeUrlPerformance({ shortCode, timeRange = "7d" }) {
    try {
      // Get URL data
      const urlData = await this.dataService.getUrlData({ shortCode });
      if (!urlData.length) {
        return { error: "URL not found" };
      }

      const url = urlData[0];
      
      // Get analytics data
      const analyticsData = await this.dataService.getAnalyticsData({
        shortCode,
        timestamp: { 
          $gte: new Date(Date.now() - this.dataService.getTimeRangeMs(timeRange))
        }
      });

      // Prepare data for AI analysis
      const analysisData = {
        url: {
          shortCode: url.shortCode,
          clicks: url.clicks,
          uniqueVisitors: url.uniqueVisitors,
          createdAt: url.createdAt,
          lastAccessedAt: url.lastAccessedAt,
          active: url.active
        },
        analytics: {
          totalClicks: analyticsData.clickEvents.length,
          countries: this.dataService.aggregateByField(analyticsData.clickEvents, 'countryCode'),
          devices: this.dataService.aggregateByField(analyticsData.clickEvents, 'deviceType'),
          referrers: analyticsData.clickEvents.map(e => e.referer).filter(Boolean)
        },
        timeRange
      };

      // Generate AI insights
      const prompt = `
        Analyze this URL performance data and provide actionable insights:
        
        URL Metrics:
        - Short Code: ${analysisData.url.shortCode}
        - Total Clicks: ${analysisData.url.clicks}
        - Unique Visitors: ${analysisData.url.uniqueVisitors}
        - Created: ${analysisData.url.createdAt}
        - Last Accessed: ${analysisData.url.lastAccessedAt}
        - Active: ${analysisData.url.active}
        
        Recent Analytics (${timeRange}):
        - Clicks in period: ${analysisData.analytics.totalClicks}
        - Top countries: ${JSON.stringify(analysisData.analytics.countries.slice(0, 3))}
        - Device distribution: ${JSON.stringify(analysisData.analytics.devices)}
        
        Please provide:
        1. Performance summary
        2. Key insights and patterns
        3. Recommendations for optimization
        4. Potential issues or concerns
        
        Format as JSON with sections: summary, insights, recommendations, concerns.
      `;

      const result = await this.model.generateContent(prompt);
      const aiInsights = this.parseAIResponse(result.response.text());

      return {
        shortCode,
        timeRange,
        data: analysisData,
        aiInsights,
        generatedAt: new Date()
      };

    } catch (error) {
      logger.error('Error analyzing URL performance:', error);
      return { error: error.message };
    }
  }

  /**
   * Get comprehensive system insights
   */
  async getSystemInsights({ timeRange = "7d", includeRecommendations = true }) {
    try {
      const comprehensiveData = await this.dataService.getComprehensiveAnalytics(timeRange);
      
      const prompt = `
        Analyze this URL shortener system performance data and provide insights:
        
        Time Range: ${timeRange}
        
        Analytics Summary:
        - Total Clicks: ${comprehensiveData.analytics.totalClicks}
        - Unique URLs: ${comprehensiveData.analytics.uniqueUrls}
        - Top Countries: ${JSON.stringify(comprehensiveData.analytics.topCountries.slice(0, 5))}
        - Device Types: ${JSON.stringify(comprehensiveData.analytics.deviceTypes)}
        
        URL Metrics:
        - URLs Created: ${comprehensiveData.urls.totalCreated}
        - Active URLs: ${comprehensiveData.urls.activeUrls}
        - Expired URLs: ${comprehensiveData.urls.expiredUrls}
        - Avg Clicks per URL: ${comprehensiveData.urls.avgClicksPerUrl.toFixed(2)}
        
        User Statistics:
        - Total Users: ${comprehensiveData.users.totalUsers}
        - New Users This Month: ${comprehensiveData.users.usersThisMonth}
        - Admin Users: ${comprehensiveData.users.adminUsers}
        
        Please provide:
        1. Overall system health assessment
        2. Key performance indicators analysis
        3. Growth trends and patterns
        4. ${includeRecommendations ? 'Strategic recommendations for improvement' : ''}
        5. Potential scalability considerations
        
        Format as JSON with sections: health, kpis, trends, ${includeRecommendations ? 'recommendations, ' : ''}scalability.
      `;

      const result = await this.model.generateContent(prompt);
      const aiInsights = this.parseAIResponse(result.response.text());

      return {
        timeRange,
        systemData: comprehensiveData,
        aiInsights,
        generatedAt: new Date()
      };

    } catch (error) {
      logger.error('Error getting system insights:', error);
      return { error: error.message };
    }
  }

  /**
   * Analyze user behavior patterns (anonymized)
   */
  async analyzeUserBehavior({ segment = "all" }) {
    try {
      const behaviorData = await this.dataService.getUserBehaviorPatterns();
      
      // Filter based on segment
      let filteredData = behaviorData;
      switch (segment) {
        case "active":
          filteredData = behaviorData.filter(user => user.metrics.daysSinceLastActivity <= 7);
          break;
        case "new":
          filteredData = behaviorData.filter(user => user.metrics.accountAge <= 30);
          break;
        case "power_users":
          filteredData = behaviorData.filter(user => user.metrics.urlCount >= 10);
          break;
      }

      const prompt = `
        Analyze these anonymized user behavior patterns for a URL shortener service:
        
        Segment: ${segment}
        Total Users in Segment: ${filteredData.length}
        
        Sample Data (first 5 users):
        ${JSON.stringify(filteredData.slice(0, 5), null, 2)}
        
        Aggregate Statistics:
        - Avg URLs per user: ${(filteredData.reduce((sum, u) => sum + u.metrics.urlCount, 0) / filteredData.length).toFixed(2)}
        - Avg clicks per user: ${(filteredData.reduce((sum, u) => sum + u.metrics.totalClicks, 0) / filteredData.length).toFixed(2)}
        - Avg account age: ${(filteredData.reduce((sum, u) => sum + u.metrics.accountAge, 0) / filteredData.length).toFixed(0)} days
        
        Please provide:
        1. User behavior patterns and insights
        2. Engagement levels analysis
        3. User lifecycle observations
        4. Recommendations for user experience improvement
        5. Retention and growth strategies
        
        Format as JSON with sections: patterns, engagement, lifecycle, ux_recommendations, growth_strategies.
      `;

      const result = await this.model.generateContent(prompt);
      const aiInsights = this.parseAIResponse(result.response.text());

      return {
        segment,
        userCount: filteredData.length,
        behaviorData: filteredData,
        aiInsights,
        generatedAt: new Date()
      };

    } catch (error) {
      logger.error('Error analyzing user behavior:', error);
      return { error: error.message };
    }
  }

  /**
   * Generate smart URL suggestions
   */
  async generateUrlSuggestions({ originalUrl, context = "" }) {
    try {
      const prompt = `
        Generate smart short code suggestions for this URL:
        
        Original URL: ${originalUrl}
        Context: ${context}
        
        Please analyze the URL and suggest:
        1. 3-5 meaningful short codes that reflect the content/purpose
        2. Consider SEO-friendly options
        3. Include both branded and descriptive options
        4. Ensure codes are memorable and professional
        
        Format as JSON with array of suggestions, each containing:
        - code: the suggested short code
        - reason: why this code is recommended
        - type: "branded", "descriptive", "seo", or "memorable"
      `;

      const result = await this.model.generateContent(prompt);
      const suggestions = this.parseAIResponse(result.response.text());

      return {
        originalUrl,
        context,
        suggestions,
        generatedAt: new Date()
      };

    } catch (error) {
      logger.error('Error generating URL suggestions:', error);
      return { error: error.message };
    }
  }

  /**
   * Detect anomalies in system behavior
   */
  async detectAnomalies({ timeRange = "7d", sensitivity = "medium" }) {
    try {
      const currentData = await this.dataService.getComprehensiveAnalytics(timeRange);
      
      // Get comparison data from previous period
      const previousPeriodStart = new Date(Date.now() - 2 * this.dataService.getTimeRangeMs(timeRange));
      const previousPeriodEnd = new Date(Date.now() - this.dataService.getTimeRangeMs(timeRange));
      
      // This would need to be implemented in the data service
      // For now, we'll use current data for demonstration
      
      const prompt = `
        Analyze this URL shortener system data for anomalies and unusual patterns:
        
        Time Range: ${timeRange}
        Sensitivity: ${sensitivity}
        
        Current Period Data:
        - Total Clicks: ${currentData.analytics.totalClicks}
        - URLs Created: ${currentData.urls.totalCreated}
        - Active URLs: ${currentData.urls.activeUrls}
        - New Users: ${currentData.users.usersThisMonth}
        
        Device Distribution: ${JSON.stringify(currentData.analytics.deviceTypes)}
        Country Distribution: ${JSON.stringify(currentData.analytics.topCountries.slice(0, 5))}
        
        Please identify:
        1. Unusual spikes or drops in activity
        2. Suspicious patterns in traffic sources
        3. Potential security concerns
        4. Performance anomalies
        5. Recommendations for investigation
        
        Sensitivity level: ${sensitivity} (adjust detection thresholds accordingly)
        
        Format as JSON with sections: anomalies, security_concerns, performance_issues, recommendations.
      `;

      const result = await this.model.generateContent(prompt);
      const anomalies = this.parseAIResponse(result.response.text());

      return {
        timeRange,
        sensitivity,
        systemData: currentData,
        anomalies,
        generatedAt: new Date()
      };

    } catch (error) {
      logger.error('Error detecting anomalies:', error);
      return { error: error.message };
    }
  }

  /**
   * Parse AI response and handle JSON extraction
   */
  parseAIResponse(text) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // If no JSON found, return the text as is
      return { content: text };
    } catch (error) {
      logger.warn('Failed to parse AI response as JSON:', error);
      return { content: text };
    }
  }

  /**
   * Process user query with context
   */
  async processQuery(query, context = {}) {
    try {
      const { userId, timeRange = "7d", includeData = true } = context;
      
      let systemContext = "";
      if (includeData) {
        const systemData = await this.dataService.getComprehensiveAnalytics(timeRange);
        systemContext = `
          Current System Status:
          - Total Clicks (${timeRange}): ${systemData.analytics.totalClicks}
          - Active URLs: ${systemData.urls.activeUrls}
          - Total Users: ${systemData.users.totalUsers}
        `;
      }

      const prompt = `
        You are an AI assistant for a URL shortener service. Answer the user's question based on the available data and your knowledge.
        
        ${systemContext}
        
        User Query: ${query}
        
        Please provide a helpful, accurate response. If you need specific data that isn't available, suggest how the user can get that information.
      `;

      const result = await this.model.generateContent(prompt);
      
      return {
        query,
        response: result.response.text(),
        context,
        generatedAt: new Date()
      };

    } catch (error) {
      logger.error('Error processing query:', error);
      return { error: error.message };
    }
  }

  /**
   * Get available tools for MCP
   */
  getAvailableTools() {
    return this.tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }));
  }

  /**
   * Execute a tool by name
   */
  async executeTool(toolName, parameters) {
    const tool = this.tools.find(t => t.name === toolName);
    if (!tool) {
      throw new Error(`Tool '${toolName}' not found`);
    }

    return await tool.handler(parameters);
  }
}

module.exports = GeminiMCPService;