using RabbitMQ.Client;
using System.Text;
using Newtonsoft.Json;

namespace UrlShortenerService.Events
{
    public class RabbitMQEventPublisher : IEventPublisher, IDisposable
    {
        private readonly IConnection _connection;
        private readonly IModel _channel;
        private readonly string _exchangeName;
        private readonly ILogger<RabbitMQEventPublisher> _logger;

        public RabbitMQEventPublisher(IConfiguration configuration, ILogger<RabbitMQEventPublisher> logger)
        {
            _logger = logger;
            var connectionString = configuration.GetConnectionString("RabbitMQ") ??
                                 configuration["RabbitMQ:ConnectionString"];
            _exchangeName = configuration["RabbitMQ:Exchange"] ?? "url-shortener-events";

            var factory = new ConnectionFactory
            {
                Uri = new Uri(connectionString!)
            };

            _connection = factory.CreateConnection();
            _channel = _connection.CreateModel();

            // Declare exchange
            _channel.ExchangeDeclare(_exchangeName, ExchangeType.Topic, durable: true);
        }

        public async Task PublishAsync<T>(T eventData, string routingKey) where T : class
        {
            try
            {
                var json = JsonConvert.SerializeObject(eventData);
                var body = Encoding.UTF8.GetBytes(json);

                var properties = _channel.CreateBasicProperties();
                properties.Persistent = true;
                properties.Timestamp = new AmqpTimestamp(DateTimeOffset.UtcNow.ToUnixTimeSeconds());

                _channel.BasicPublish(
                    exchange: _exchangeName,
                    routingKey: routingKey,
                    basicProperties: properties,
                    body: body
                );

                _logger.LogInformation($"Published event {typeof(T).Name} with routing key {routingKey}");
                await Task.CompletedTask;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to publish event {typeof(T).Name}");
                throw;
            }
        }

        public void Dispose()
        {
            _channel?.Dispose();
            _connection?.Dispose();
        }
    }
}
