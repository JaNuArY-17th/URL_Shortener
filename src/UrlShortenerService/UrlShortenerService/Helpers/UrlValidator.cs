using System.Text.RegularExpressions;

namespace UrlShortenerService.Helpers
{
    public static class UrlValidator
    {
        private static readonly Regex UrlRegex = new(
            @"^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$",
            RegexOptions.Compiled | RegexOptions.IgnoreCase
        );

        public static bool IsValidUrl(string url)
        {
            if (string.IsNullOrWhiteSpace(url))
                return false;

            return Uri.TryCreate(url, UriKind.Absolute, out var uriResult)
                   && (uriResult.Scheme == Uri.UriSchemeHttp || uriResult.Scheme == Uri.UriSchemeHttps)
                   && UrlRegex.IsMatch(url);
        }

        public static bool IsBlacklisted(string url)
        {
            var blacklistedDomains = new[]
            {
                "localhost",
                "127.0.0.1",
                "0.0.0.0"
            };

            try
            {
                var uri = new Uri(url);
                return blacklistedDomains.Any(domain =>
                    uri.Host.Equals(domain, StringComparison.OrdinalIgnoreCase));
            }
            catch
            {
                return true;
            }
        }
    }
}
