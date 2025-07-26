using System;

namespace UrlShortenerService.Models
{
    public class UrlDto
    {
        public required string OriginalUrl { get; set; }
        public required string ShortCode { get; set; }
        public required string UserId { get; set; }
        public DateTime? ExpiresAt { get; set; }
    }

    public class CreateUrlRequest
    {
        public required string OriginalUrl { get; set; }
        public required string UserId { get; set; }
        public DateTime? ExpiresAt { get; set; }
    }

    public class CreateUrlResponse
    {
        public required string ShortCode { get; set; }
        public required string OriginalUrl { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? ExpiresAt { get; set; }
    }
}
