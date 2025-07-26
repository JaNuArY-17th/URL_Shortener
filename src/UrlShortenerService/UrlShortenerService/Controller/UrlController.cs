using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using UrlShortenerService.Models;
using UrlShortenerService.Services;
using System.Reflection;
using Microsoft.OpenApi.Models;
using System.IO;
using System;

namespace UrlShortenerService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Produces("application/json")]
    [ApiExplorerSettings(GroupName = "v1")]
    public class UrlsController : ControllerBase
    {
        private readonly IUrlShortenerService _urlShortenerService;

        public UrlsController(IUrlShortenerService urlShortenerService)
        {
            _urlShortenerService = urlShortenerService;
        }

        /// <summary>
        /// Tạo URL rút gọn mới
        /// </summary>
        /// <param name="request">Thông tin URL cần rút gọn</param>
        /// <returns>Thông tin URL đã được rút gọn</returns>
        /// <response code="201">Trả về thông tin URL rút gọn đã tạo</response>
        /// <response code="400">Nếu thông tin yêu cầu không hợp lệ</response>
        [HttpPost]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<CreateUrlResponse>> CreateShortUrl([FromBody] CreateUrlRequest request)
        {
            // Validate request
            if (string.IsNullOrEmpty(request.OriginalUrl))
            {
                return BadRequest("Original URL is required");
            }

            if (!Uri.TryCreate(request.OriginalUrl, UriKind.Absolute, out var uriResult) ||
                (uriResult.Scheme != Uri.UriSchemeHttp && uriResult.Scheme != Uri.UriSchemeHttps))
            {
                return BadRequest("Invalid URL format");
            }

            var response = await _urlShortenerService.CreateShortUrlAsync(request);
            return CreatedAtAction(nameof(CreateShortUrl), response);
        }

        /// <summary>
        /// Kiểm tra trạng thái hoạt động của service
        /// </summary>
        /// <returns>Trạng thái hoạt động</returns>
        [HttpGet("health")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public IActionResult HealthCheck()
        {
            return Ok(new { status = "healthy" });
        }
    }
}
