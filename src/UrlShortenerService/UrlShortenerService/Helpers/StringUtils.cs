namespace UrlShortenerService.Helpers
{
    public static class StringUtils
    {
        public static string SanitizeString(string input)
        {
            if (string.IsNullOrWhiteSpace(input))
                return string.Empty;

            return input.Trim().Replace(" ", "-").ToLowerInvariant();
        }

        public static string GenerateId()
        {
            return Guid.NewGuid().ToString("N")[..8];
        }

        public static bool ContainsOnlyAllowedCharacters(string input, string allowedChars)
        {
            return input.All(allowedChars.Contains);
        }
    }
}
