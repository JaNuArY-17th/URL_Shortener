using System.Text;

namespace UrlShortenerService.Services
{
    public class ShortCodeGeneratorService : IShortCodeGeneratorService
    {
        private readonly string _characters;
        private readonly Random _random;

        public ShortCodeGeneratorService(IConfiguration configuration)
        {
            _characters = configuration["ShortCode:Characters"] ??
                         "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            _random = new Random();
        }

        public string GenerateShortCode(int length = 6)
        {
            var result = new StringBuilder(length);

            for (int i = 0; i < length; i++)
            {
                result.Append(_characters[_random.Next(_characters.Length)]);
            }

            return result.ToString();
        }

        public bool IsValidCustomAlias(string alias)
        {
            if (string.IsNullOrWhiteSpace(alias))
                return false;

            if (alias.Length < 3 || alias.Length > 20)
                return false;

            return alias.All(c => _characters.Contains(c));
        }
    }
}
