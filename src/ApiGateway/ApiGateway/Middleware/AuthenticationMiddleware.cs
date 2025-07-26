using System.IdentityModel.Tokens.Jwt;
using Microsoft.Extensions.Logging;

namespace ApiGateway.Middleware
{
    public class AuthenticationMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<AuthenticationMiddleware> _logger;

        public AuthenticationMiddleware(RequestDelegate next, ILogger<AuthenticationMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // Kiểm tra token JWT trong header Authorization
            var authHeader = context.Request.Headers["Authorization"].FirstOrDefault();
            
            if (authHeader != null && authHeader.StartsWith("Bearer "))
            {
                var token = authHeader.Substring("Bearer ".Length).Trim();
                try
                {
                    var tokenHandler = new JwtSecurityTokenHandler();
                    if (tokenHandler.CanReadToken(token))
                    {
                        var jwtToken = tokenHandler.ReadJwtToken(token);
                        
                        // Chuyển tiếp thông tin người dùng trong token đến các service
                        var userId = jwtToken.Claims.FirstOrDefault(x => x.Type == "sub")?.Value;
                        var userName = jwtToken.Claims.FirstOrDefault(x => x.Type == "name")?.Value;
                        var userRole = jwtToken.Claims.FirstOrDefault(x => x.Type == "role")?.Value;
                        
                        if (!string.IsNullOrEmpty(userId))
                        {
                            context.Request.Headers["X-User-Id"] = userId;
                        }
                        
                        if (!string.IsNullOrEmpty(userName))
                        {
                            context.Request.Headers["X-User-Name"] = userName;
                        }
                        
                        if (!string.IsNullOrEmpty(userRole))
                        {
                            context.Request.Headers["X-User-Role"] = userRole;
                        }
                        
                        _logger.LogInformation("Authentication successful for user: {UserId}", userId);
                    }
                }
                catch (System.Exception ex)
                {
                    _logger.LogWarning("Error parsing JWT token: {Message}", ex.Message);
                }
            }

            await _next(context);
        }
    }
} 