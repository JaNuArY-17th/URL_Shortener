using System.Text;

namespace UrlShortenerService.Helpers
{
    public class ShortCodeGenerator
    {
        // Characters used for generating the short code
        private const string Characters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        private static readonly Random Random = new Random();

        // Length of the short code
        private const int CodeLength = 6;

        // Generate a short code of fixed length
        public static string Generate()
        {
            var sb = new StringBuilder(CodeLength);

            for (int i = 0; i < CodeLength; i++)
            {
                // Select a random character from the Characters string
                int index = Random.Next(Characters.Length);
                sb.Append(Characters[index]);
            }

            return sb.ToString();
        }

        // Generate short code from ID
        public static string GenerateFromId(long id)
        {
            var sb = new StringBuilder();

            while (id > 0)
            {
                sb.Insert(0, Characters[(int)(id % Characters.Length)]);
                id /= Characters.Length;
            }

            while (sb.Length < CodeLength)
            {
                sb.Insert(0, Characters[0]);
            }

            return sb.ToString();
        }
    }
}
