namespace UrlShortenerService.Services
{
    public interface IShortCodeGeneratorService
    {
        string GenerateShortCode(int length = 6);
        bool IsValidCustomAlias(string alias);
    }
}
