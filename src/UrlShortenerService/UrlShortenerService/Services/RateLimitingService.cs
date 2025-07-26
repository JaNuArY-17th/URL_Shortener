using System.Collections.Concurrent;

namespace UrlShortenerService.Services
{
    public class RateLimitingService
    {
        private readonly ConcurrentDictionary<string, Queue<DateTime>> _requests = new();
        private readonly int _maxRequestsPerMinute;
        private readonly TimeSpan _timeWindow;

        public RateLimitingService(IConfiguration configuration)
        {
            _maxRequestsPerMinute = configuration.GetValue<int>("RateLimit:MaxRequestsPerMinute", 60);
            _timeWindow = TimeSpan.FromMinutes(1);
        }

        public bool IsAllowed(string clientId)
        {
            var now = DateTime.UtcNow;
            var requests = _requests.GetOrAdd(clientId, _ => new Queue<DateTime>());

            lock (requests)
            {
                // Remove old requests outside time window
                while (requests.Count > 0 && now - requests.Peek() > _timeWindow)
                {
                    requests.Dequeue();
                }

                if (requests.Count >= _maxRequestsPerMinute)
                {
                    return false;
                }

                requests.Enqueue(now);
                return true;
            }
        }
    }
}
