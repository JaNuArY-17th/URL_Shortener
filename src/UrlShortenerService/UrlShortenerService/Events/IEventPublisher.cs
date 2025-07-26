namespace UrlShortenerService.Events
{
    public interface IEventPublisher
    {
        Task PublishAsync<T>(T eventData, string routingKey) where T : class;
    }
}
