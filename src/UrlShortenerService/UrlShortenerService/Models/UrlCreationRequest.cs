using System.ComponentModel.DataAnnotations;

namespace UrlShortenerService.Models
{
    public class UrlCreationRequest
    {
        [Required]
        [Url(ErrorMessage = "Invalid URL format")]
        public string OriginalUrl { get; set; } = string.Empty;

        public string? CustomAlias { get; set; }

        public DateTime? ExpiresAt { get; set; }

        public string? UserId { get; set; }

        public Dictionary<string, object>? Metadata { get; set; }
    }
}
