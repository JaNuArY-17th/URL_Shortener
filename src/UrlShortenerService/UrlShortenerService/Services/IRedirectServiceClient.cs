namespace UrlShortenerService.Services
{
    public interface IRedirectServiceClient
    {
        Task<bool> IsAliasAvailableAsync(string alias);
    }
}