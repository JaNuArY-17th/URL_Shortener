using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Xunit;
using Newtonsoft.Json;
using RabbitMQ.Client;
using MongoDB.Driver;
using UrlShortenerService.Models;
using System.Text;
using System.Collections.Generic;
using Microsoft.Extensions.Configuration;

namespace UrlShortenerService.Tests
{
    public class IntegrationTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;
        private readonly CustomWebApplicationFactory _factory;
        private readonly IConnection _rabbitMQConnection;
        private readonly IModel _channel;
        private readonly MongoClient _mongoClient;
        private readonly IMongoDatabase _mongoDatabase;

        // Configuration
        private readonly string _rabbitMQUri = Environment.GetEnvironmentVariable("RABBITMQ_URI") ?? "amqps://irnrcdfe:i8Sii2DlRiD1u2fobfw_gIuEuQa-z-4f@chimpanzee.rmq.cloudamqp.com/irnrcdfe";
        private readonly string _mongoUri = Environment.GetEnvironmentVariable("MONGODB_URI") ?? "mongodb+srv://nhl170100:dHaPiWdbYDuKSnxF@cluster1.zayctcf.mongodb.net/test_integration?retryWrites=true&w=majority&appName=Cluster1";

        public IntegrationTests(CustomWebApplicationFactory factory)
        {
            _factory = factory;
            _client = factory.CreateClient();

            // Setup RabbitMQ connection
            var factory = new ConnectionFactory() 
            { 
                Uri = new Uri(_rabbitMQUri),
                DispatchConsumersAsync = true
            };
            _rabbitMQConnection = factory.CreateConnection();
            _channel = _rabbitMQConnection.CreateModel();
            
            // Setup exchange
            _channel.ExchangeDeclare("url-shortener-events", ExchangeType.Topic, true);

            // Setup MongoDB connection
            _mongoClient = new MongoClient(_mongoUri);
            _mongoDatabase = _mongoClient.GetDatabase("test_integration");
            
            // Clean up collections
            _mongoDatabase.GetCollection<dynamic>("urls").DeleteMany(Builders<dynamic>.Filter.Empty);
        }

        [Fact]
        public async Task Create_Url_Should_Generate_ShortCode_And_Publish_Event()
        {
            // Arrange
            var request = new UrlCreationRequest
            {
                OriginalUrl = "https://example.com/integration-test",
                CustomAlias = null,
                UserId = "507f1f77bcf86cd799439011"
            };

            // Setup consumer to capture the event
            var eventCaptured = new TaskCompletionSource<string>();
            var consumerTag = "";

            _channel.QueueDeclare("test-url-created-queue", true, false, false);
            _channel.QueueBind("test-url-created-queue", "url-shortener-events", "url.created");

            consumerTag = _channel.BasicConsume(
                queue: "test-url-created-queue",
                autoAck: true,
                consumer: new AsyncEventingBasicConsumer(_channel)
                {
                    ConsumerCancelled = (ch, ea) => eventCaptured.TrySetCanceled(),
                    Received = async (ch, ea) =>
                    {
                        var body = ea.Body.ToArray();
                        var message = Encoding.UTF8.GetString(body);
                        eventCaptured.TrySetResult(message);
                        await Task.CompletedTask;
                    }
                });

            // Act
            var response = await _client.PostAsJsonAsync("/api/urls", request);

            // Assert
            response.EnsureSuccessStatusCode();

            var responseContent = await response.Content.ReadAsStringAsync();
            var urlResponse = JsonConvert.DeserializeObject<UrlCreationResponse>(responseContent);

            Assert.NotNull(urlResponse);
            Assert.NotNull(urlResponse.ShortCode);
            Assert.Equal(request.OriginalUrl, urlResponse.OriginalUrl);

            // Wait for the event to be published and received
            var eventTask = await Task.WhenAny(eventCaptured.Task, Task.Delay(5000));
            if (eventTask != eventCaptured.Task)
            {
                Assert.Fail("Event was not received within timeout period");
            }

            var eventJson = await eventCaptured.Task;
            var eventData = JsonConvert.DeserializeObject<Dictionary<string, object>>(eventJson);

            Assert.NotNull(eventData);
            Assert.Equal(urlResponse.ShortCode, eventData["shortCode"].ToString());
            Assert.Equal(request.OriginalUrl, eventData["originalUrl"].ToString());

            // Cleanup
            _channel.BasicCancel(consumerTag);
        }

        [Fact]
        public async Task Create_Url_With_Custom_Alias_Should_Use_Provided_Alias()
        {
            // Arrange
            var customAlias = "custom-test-" + Guid.NewGuid().ToString().Substring(0, 8);
            var request = new UrlCreationRequest
            {
                OriginalUrl = "https://example.com/custom-alias-test",
                CustomAlias = customAlias,
                UserId = "507f1f77bcf86cd799439011"
            };

            // Act
            var response = await _client.PostAsJsonAsync("/api/urls", request);

            // Assert
            response.EnsureSuccessStatusCode();

            var responseContent = await response.Content.ReadAsStringAsync();
            var urlResponse = JsonConvert.DeserializeObject<UrlCreationResponse>(responseContent);

            Assert.NotNull(urlResponse);
            Assert.Equal(customAlias, urlResponse.ShortCode);
            Assert.Equal(request.OriginalUrl, urlResponse.OriginalUrl);
        }

        [Fact]
        public async Task Create_Invalid_Url_Should_Return_BadRequest()
        {
            // Arrange
            var request = new UrlCreationRequest
            {
                OriginalUrl = "not-a-valid-url",
                UserId = "507f1f77bcf86cd799439011"
            };

            // Act
            var response = await _client.PostAsJsonAsync("/api/urls", request);

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        public void Dispose()
        {
            _channel?.Close();
            _rabbitMQConnection?.Close();
        }
    }

    // Custom WebApplicationFactory for testing
    public class CustomWebApplicationFactory : WebApplicationFactory<Program>
    {
        protected override IHost CreateHost(IHostBuilder builder)
        {
            // Customize builder as needed for tests
            builder.ConfigureServices(services =>
            {
                // Add test configurations or mocks
            });

            return base.CreateHost(builder);
        }
    }
} 