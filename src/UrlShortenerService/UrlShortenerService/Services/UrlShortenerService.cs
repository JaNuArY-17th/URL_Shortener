using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Caching.Memory;
using UrlShortenerService.Events;
using UrlShortenerService.Helpers;
using UrlShortenerService.Models;

namespace UrlShortenerService.Services
{
    public interface IUrlShortenerService
    {
        Task<CreateUrlResponse> CreateShortUrlAsync(CreateUrlRequest request);
        Task<bool> IsShortCodeUniqueAsync(string shortCode);
    }

    public class UrlShortenerServiceImpl : IUrlShortenerService
    {
        private readonly IMessagePublisher _messagePublisher;
        private readonly IMemoryCache _cache;

        public UrlShortenerServiceImpl(IMessagePublisher messagePublisher, IMemoryCache cache)
        {
            _messagePublisher = messagePublisher;
            _cache = cache;
        }

        public async Task<CreateUrlResponse> CreateShortUrlAsync(CreateUrlRequest request)
        {
            // Tạo shortcode
            string shortCode;
            do
            {
                shortCode = ShortCodeGenerator.Generate();
            }
            while (!await IsShortCodeUniqueAsync(shortCode));

            // Tạo thông tin URL
            var createdAt = DateTime.UtcNow;

            // Tạo response
            var response = new CreateUrlResponse
            {
                ShortCode = shortCode,
                OriginalUrl = request.OriginalUrl,
                CreatedAt = createdAt,
                ExpiresAt = request.ExpiresAt
            };

            // Lưu vào cache tạm thời (nếu cần)
            var cacheOptions = new MemoryCacheEntryOptions()
                .SetAbsoluteExpiration(TimeSpan.FromMinutes(30)); // Lưu cache 30 phút

            _cache.Set($"shortcode:{shortCode}", request.OriginalUrl, cacheOptions);

            // Phát sự kiện URL đã được tạo
            var urlCreatedEvent = new UrlCreatedEvent
            {
                Id = Guid.NewGuid().ToString(),
                ShortCode = shortCode,
                OriginalUrl = request.OriginalUrl,
                UserId = request.UserId,
                CreatedAt = createdAt,
                ExpiresAt = request.ExpiresAt
            };

            _messagePublisher.PublishUrlCreatedEvent(urlCreatedEvent);

            return response;
        }

        public Task<bool> IsShortCodeUniqueAsync(string shortCode)
        {
            // Kiểm tra trong cache tạm thời
            // Trong thực tế, bạn có thể cần kiểm tra với RedirectService thông qua API
            bool exists = _cache.TryGetValue($"shortcode:{shortCode}", out _);
            return Task.FromResult(!exists);
        }
    }
}
