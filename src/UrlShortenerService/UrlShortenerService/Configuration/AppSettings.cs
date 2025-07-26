namespace UrlShortenerService.Configuration
{
    public class AppSettings
    {
        public required RabbitMqSettings RabbitMq { get; set; }
        public required string BaseUrl { get; set; }
    }

    public class RabbitMqSettings
    {
        public required string Host { get; set; }
        public required string Username { get; set; }
        public required string Password { get; set; }
        public int Port { get; set; }
        public required string Vhost { get; set; }
        public bool UseSsl { get; set; }
        public required string UrlCreatedExchange { get; set; }
    }
}
