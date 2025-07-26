using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.OpenApi.Models;
using UrlShortenerService.Configuration;
using UrlShortenerService.Services;
using System.Reflection;
using System.IO;
using System;

var builder = WebApplication.CreateBuilder(args);

// Cấu hình port từ biến môi trường cho Render.com
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(port))
{
    builder.WebHost.UseUrls($"http://*:{port}");
}

// Cấu hình từ appsettings.json
builder.Services.Configure<AppSettings>(
    builder.Configuration.GetSection("AppSettings"));

// Đăng ký các service
builder.Services.AddMemoryCache();
builder.Services.AddSingleton<IMessagePublisher, RabbitMqPublisher>();
builder.Services.AddScoped<IUrlShortenerService, UrlShortenerServiceImpl>();

// Add health check
builder.Services.AddHealthChecks();

// Add controllers
builder.Services.AddControllers();

// Add Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { 
        Title = "UrlShortenerService API", 
        Version = "v1",
        Description = "API để tạo các URL rút gọn",
        Contact = new OpenApiContact
        {
            Name = "Admin",
            Email = "admin@urlshortener.com"
        }
    });
    
    // Thêm XML documentation
    var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    
    // Kiểm tra file có tồn tại không để tránh lỗi
    if (File.Exists(xmlPath))
    {
        c.IncludeXmlComments(xmlPath);
    }
    
    // Loại bỏ controller WeatherForecast mặc định
    c.DocInclusionPredicate((docName, apiDesc) =>
    {
        return !apiDesc.RelativePath?.Contains("weatherforecast", StringComparison.OrdinalIgnoreCase) == false;
    });
});

// CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
               .AllowAnyMethod()
               .AllowAnyHeader();
    });
});

var app = builder.Build();

// Configure middleware
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    // Xử lý ngoại lệ trong môi trường production
    app.UseExceptionHandler(appBuilder =>
    {
        appBuilder.Run(async context =>
        {
            context.Response.StatusCode = 500;
            await context.Response.WriteAsync("An error occurred. Please try again later.");
        });
    });
}

app.UseHttpsRedirection();
app.UseCors();
app.UseRouting();
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/health");

// In thông tin về cổng đang lắng nghe
Console.WriteLine($"Application is listening on port {port ?? "default"}");

app.Run();
