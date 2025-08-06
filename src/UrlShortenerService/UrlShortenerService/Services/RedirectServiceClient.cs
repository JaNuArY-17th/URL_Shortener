using System.Text.Json;

namespace UrlShortenerService.Services
{
    public class RedirectServiceClient : IRedirectServiceClient
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<RedirectServiceClient> _logger;
        private readonly string _redirectServiceUrl;

        public RedirectServiceClient(HttpClient httpClient, IConfiguration configuration, ILogger<RedirectServiceClient> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
            _redirectServiceUrl = configuration["RedirectService:BaseUrl"] ?? "http://localhost:5003";
        }

        public async Task<bool> IsAliasAvailableAsync(string alias)
        {
            try
            {
                var url = $"{_redirectServiceUrl}/api/urls/check-alias/{alias}";
                _logger.LogInformation($"Checking alias availability: {alias}");

                var response = await _httpClient.GetAsync(url);
                
                if (response.IsSuccessStatusCode)
                {
                    var content = await response.Content.ReadAsStringAsync();
                    var result = JsonSerializer.Deserialize<AliasCheckResponse>(content, new JsonSerializerOptions 
                    { 
                        PropertyNameCaseInsensitive = true 
                    });
                    
                    _logger.LogInformation($"Alias {alias} availability: {result?.Available}");
                    return result?.Available ?? false;
                }
                else
                {
                    _logger.LogWarning($"Failed to check alias availability. Status: {response.StatusCode}");
                    return false; // Assume not available on error to be safe
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error checking alias availability for: {alias}");
                return false; // Assume not available on error to be safe
            }
        }

        private class AliasCheckResponse
        {
            public bool Available { get; set; }
        }
    }
}