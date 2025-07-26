using System;
using System.Text;
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
        private readonly IConnection _connection;
        private readonly IModel _channel;
        private readonly string _urlCreatedExchange;

        public RabbitMqPublisher(IOptions<AppSettings> options)
        {
            var settings = options.Value.RabbitMq;
            _urlCreatedExchange = settings.UrlCreatedExchange;

            var factory = new ConnectionFactory
            {
                HostName = settings.Host,
                UserName = settings.Username,
                Password = settings.Password,
                Port = settings.Port,
                VirtualHost = settings.Vhost,
                Ssl = new SslOption
                {
                    Enabled = settings.UseSsl
                }
            };

            try
            {
                _connection = factory.CreateConnection();
                _channel = _connection.CreateModel();

                // Khai báo exchange
                _channel.ExchangeDeclare(
                    exchange: _urlCreatedExchange,
                    type: ExchangeType.Fanout,
                    durable: true,
                    autoDelete: false);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error initializing RabbitMQ: {ex.Message}");
                throw;
            }
        }

        public void PublishUrlCreatedEvent(UrlCreatedEvent urlCreatedEvent)
        {
            try
            {
                var message = JsonConvert.SerializeObject(urlCreatedEvent);
                var body = Encoding.UTF8.GetBytes(message);

                _channel.BasicPublish(
                    exchange: _urlCreatedExchange,
                    routingKey: "",
                    basicProperties: null,
                    body: body);

                Console.WriteLine($"Published URL created event: {urlCreatedEvent.ShortCode}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error publishing message: {ex.Message}");
                throw;
            }
        }

        public void Dispose()
        {
            _channel?.Close();
            _connection?.Close();
        }
    }
}
