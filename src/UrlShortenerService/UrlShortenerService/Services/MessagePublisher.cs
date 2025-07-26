using System;
using System.Text;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using RabbitMQ.Client;
using UrlShortenerService.Configuration;
using UrlShortenerService.Events;

namespace UrlShortenerService.Services
{
    public interface IMessagePublisher
    {
        void PublishUrlCreatedEvent(UrlCreatedEvent urlCreatedEvent);
    }

    public class RabbitMqPublisher : IMessagePublisher, IDisposable
    {
        private IConnection _connection;
        private IModel _channel;
        private readonly string _urlCreatedExchange;
        private readonly ILogger<RabbitMqPublisher> _logger;
        private readonly RabbitMqSettings _settings;
        private bool _isConnected = false;

        public RabbitMqPublisher(IOptions<AppSettings> options, ILogger<RabbitMqPublisher> logger = null)
        {
            _settings = options.Value.RabbitMq;
            _urlCreatedExchange = _settings.UrlCreatedExchange;
            _logger = logger;

            // Không khởi tạo kết nối trong constructor để tránh lỗi khi khởi động
            // Thay vào đó, kết nối sẽ được tạo khi cần thiết (lazy initialization)
            TryConnect();
        }

        private bool TryConnect()
        {
            if (_isConnected)
                return true;

            try
            {
                var factory = new ConnectionFactory
                {
                    HostName = _settings.Host,
                    UserName = _settings.Username,
                    Password = _settings.Password,
                    Port = _settings.Port,
                    VirtualHost = _settings.Vhost,
                    Ssl = new SslOption
                    {
                        Enabled = _settings.UseSsl
                    },
                    // Thêm timeout để tránh treo ứng dụng khi không kết nối được
                    RequestedConnectionTimeout = TimeSpan.FromSeconds(5),
                    SocketReadTimeout = TimeSpan.FromSeconds(5),
                    SocketWriteTimeout = TimeSpan.FromSeconds(5)
                };

                _connection = factory.CreateConnection();
                _channel = _connection.CreateModel();

                // Khai báo exchange
                _channel.ExchangeDeclare(
                    exchange: _urlCreatedExchange,
                    type: ExchangeType.Fanout,
                    durable: true,
                    autoDelete: false);

                _isConnected = true;
                LogInfo($"Connected to RabbitMQ at {_settings.Host}:{_settings.Port}");
                
                return true;
            }
            catch (Exception ex)
            {
                LogWarning($"Could not connect to RabbitMQ: {ex.Message}");
                return false;
            }
        }

        public void PublishUrlCreatedEvent(UrlCreatedEvent urlCreatedEvent)
        {
            if (!TryConnect())
            {
                LogWarning($"Failed to publish message, not connected to RabbitMQ");
                return; // Không ném lỗi, chỉ ghi log và tiếp tục
            }

            try
            {
                var message = JsonConvert.SerializeObject(urlCreatedEvent);
                var body = Encoding.UTF8.GetBytes(message);

                _channel.BasicPublish(
                    exchange: _urlCreatedExchange,
                    routingKey: "",
                    basicProperties: null,
                    body: body);

                LogInfo($"Published URL created event: {urlCreatedEvent.ShortCode}");
            }
            catch (Exception ex)
            {
                LogWarning($"Error publishing message: {ex.Message}");
                // Không ném lỗi, chỉ ghi log và tiếp tục
            }
        }

        private void LogInfo(string message)
        {
            _logger?.LogInformation(message) ?? Console.WriteLine(message);
        }

        private void LogWarning(string message)
        {
            _logger?.LogWarning(message) ?? Console.WriteLine(message);
        }

        public void Dispose()
        {
            try 
            {
                _channel?.Close();
                _connection?.Close();
                
                _channel = null;
                _connection = null;
                _isConnected = false;
            }
            catch (Exception ex)
            {
                LogWarning($"Error disposing RabbitMQ connection: {ex.Message}");
            }
        }
    }
}
