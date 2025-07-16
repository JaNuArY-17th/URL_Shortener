# RedirectService

Xử lý chuyển hướng từ short code sang original URL, sử dụng cache Redis để tăng tốc. Phát sự kiện RedirectOccurredEvent, consume UrlCreatedEvent để làm nóng cache. 