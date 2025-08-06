using Microsoft.AspNetCore.Mvc;
using UrlShortenerService.Models;
using UrlShortenerService.Services;
using UrlShortenerService.Events;
using UrlShortenerService.Helpers;

namespace UrlShortenerService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    public class UrlsController : ControllerBase
    {
        private readonly IShortCodeGeneratorService _shortCodeGenerator;
        private readonly IRedirectServiceClient _redirectServiceClient;
        private readonly IEventPublisher _eventPublisher;
        private readonly RateLimitingService _rateLimitingService;
        private readonly IConfiguration _configuration;
        private readonly ILogger<UrlsController> _logger;

        public UrlsController(
            IShortCodeGeneratorService shortCodeGenerator,
            IRedirectServiceClient redirectServiceClient,
            IEventPublisher eventPublisher,
            RateLimitingService rateLimitingService,
            IConfiguration configuration,
            ILogger<UrlsController> logger)
        {
            _shortCodeGenerator = shortCodeGenerator;
            _redirectServiceClient = redirectServiceClient;
            _eventPublisher = eventPublisher;
            _rateLimitingService = rateLimitingService;
            _configuration = configuration;
            _logger = logger;
        }

        /// <summary>
        /// Tạo mã rút gọn cho URL
        /// </summary>
        /// <param name="request">Thông tin URL cần rút gọn</param>
        /// <returns>Thông tin URL đã được rút gọn</returns>
        [HttpPost]
        [ProducesResponseType(typeof(UrlCreationResponse), 200)]
        [ProducesResponseType(typeof(string), 400)]
        [ProducesResponseType(typeof(string), 429)]
        public async Task<ActionResult<UrlCreationResponse>> CreateShortUrl([FromBody] UrlCreationRequest request)
        {
            try
            {
                // Rate limiting
                var clientId = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
                if (!_rateLimitingService.IsAllowed(clientId))
                {
                    return StatusCode(429, "Too many requests. Please try again later.");
                }

                // Validate URL
                if (!UrlValidator.IsValidUrl(request.OriginalUrl))
                {
                    return BadRequest("Invalid URL format");
                }

                if (UrlValidator.IsBlacklisted(request.OriginalUrl))
                {
                    return BadRequest("URL is not allowed");
                }

                // Generate or validate short code with alias availability checking
                string shortCode;
                bool isAvailable = false;
                int maxRetries = 5;
                int attempt = 0;

                do
                {
                    attempt++;
                    
                    if (!string.IsNullOrWhiteSpace(request.CustomAlias))
                    {
                        if (!_shortCodeGenerator.IsValidCustomAlias(request.CustomAlias))
                        {
                            return BadRequest("Invalid custom alias. Must be 3-20 characters long and contain only letters, numbers.");
                        }
                        shortCode = request.CustomAlias;
                    }
                    else
                    {
                        var length = _configuration.GetValue<int>("ShortCode:Length", 6);
                        shortCode = _shortCodeGenerator.GenerateShortCode(length);
                    }

                    // Check if alias/short code is available
                    isAvailable = await _redirectServiceClient.IsAliasAvailableAsync(shortCode);
                    
                    // If custom alias is not available, don't retry
                    if (!isAvailable && !string.IsNullOrWhiteSpace(request.CustomAlias))
                    {
                        return Conflict("Custom alias already exists");
                    }
                    
                    // If generated code is not available, retry with new code
                    if (!isAvailable && string.IsNullOrWhiteSpace(request.CustomAlias) && attempt < maxRetries)
                    {
                        _logger.LogInformation($"Short code {shortCode} already exists, retrying... (attempt {attempt}/{maxRetries})");
                        continue;
                    }
                    
                    break;
                    
                } while (attempt < maxRetries);

                // Check final result
                if (!isAvailable)
                {
                    _logger.LogError($"Failed to find available short code after {attempt} attempts");
                    return StatusCode(500, "Unable to generate unique short code. Please try again.");
                }

                var createdAt = DateTime.UtcNow;
                var baseUrl = _configuration["BaseUrl"] ?? "https://short.domain";

                // Create response
                var response = new UrlCreationResponse
                {
                    ShortCode = shortCode,
                    OriginalUrl = request.OriginalUrl,
                    ShortUrl = $"{baseUrl}/{shortCode}",
                    CreatedAt = createdAt,
                    ExpiresAt = request.ExpiresAt,
                    UserId = request.UserId
                };

                // Publish event to RedirectService for actual URL creation
                var urlCreatedEvent = new UrlCreatedEvent
                {
                    ShortCode = shortCode,
                    OriginalUrl = request.OriginalUrl,
                    UserId = request.UserId,
                    CreatedAt = createdAt,
                    ExpiresAt = request.ExpiresAt,
                    Metadata = request.Metadata
                };

                var routingKey = _configuration["RabbitMQ:RoutingKey"] ?? "url.created";
                await _eventPublisher.PublishAsync(urlCreatedEvent, routingKey);

                _logger.LogInformation($"Successfully created short URL: {shortCode} for {request.OriginalUrl}");

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating short URL");
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Health check endpoint
        /// </summary>
        [HttpGet("health")]
        [ProducesResponseType(typeof(object), 200)]
        public ActionResult GetHealth()
        {
            return Ok(new { status = "healthy", timestamp = DateTime.UtcNow });
        }
    }
}
