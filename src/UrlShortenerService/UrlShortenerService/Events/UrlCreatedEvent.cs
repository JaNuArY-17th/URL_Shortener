using System;

namespace UrlShortenerService.Events
{
    public class UrlCreatedEvent
    {
        public required string Id { get; set; }
        public required string ShortCode { get; set; }
        public required string OriginalUrl { get; set; }
        public required string UserId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? ExpiresAt { get; set; }
    }
}
