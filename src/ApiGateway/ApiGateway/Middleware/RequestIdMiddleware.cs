using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Primitives;

namespace ApiGateway.Middleware
{
    public class RequestIdMiddleware
    {
        private const string RequestIdHeaderName = "X-Request-Id";
        private readonly RequestDelegate _next;
        private readonly ILogger<RequestIdMiddleware> _logger;

        public RequestIdMiddleware(RequestDelegate next, ILogger<RequestIdMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // Kiểm tra request ID đã có trong header chưa
            if (!context.Request.Headers.TryGetValue(RequestIdHeaderName, out var requestId))
            {
                // Tạo request ID mới nếu chưa có
                requestId = new StringValues(Guid.NewGuid().ToString());
                context.Request.Headers[RequestIdHeaderName] = requestId;
            }
            
            // Log request ID
            _logger.LogInformation("Request {Method} {Path} started with Request ID: {RequestId}", 
                context.Request.Method, 
                context.Request.Path, 
                requestId);
            
            // Đảm bảo request ID được truyền đến các service khác
            if (!context.Response.Headers.ContainsKey(RequestIdHeaderName))
            {
                context.Response.Headers[RequestIdHeaderName] = requestId;
            }

            await _next(context);
        }
    }
} 