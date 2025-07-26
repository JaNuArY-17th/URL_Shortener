using ApiGateway.Middleware;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Ocelot.DependencyInjection;
using Ocelot.Middleware;
using Ocelot.Provider.Polly;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Thêm cấu hình Ocelot
builder.Configuration.AddJsonFile("ocelot.json", optional: false, reloadOnChange: true);
builder.Configuration.AddJsonFile($"ocelot.{builder.Environment.EnvironmentName}.json", optional: true, reloadOnChange: true);

// Thêm services
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// Thêm xử lý HttpClient
builder.Services.AddHttpClient();

// Cấu hình Swagger
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { 
        Title = "URL Shortener API Gateway", 
        Version = "v1",
        Description = "API Gateway cho hệ thống URL Shortener"
    });
    
    // Loại bỏ controller WeatherForecast mặc định
    c.DocInclusionPredicate((docName, apiDesc) =>
    {
        return !apiDesc.RelativePath?.Contains("weatherforecast", StringComparison.OrdinalIgnoreCase) == false;
    });
});

// Cấu hình SwaggerForOcelot - đặt sau AddSwaggerGen
builder.Services.AddSwaggerForOcelot(builder.Configuration, options =>
{
    // Nếu không thể tải tài liệu Swagger từ các dịch vụ
    options.GenerateDocsForGatewayItSelf = true;
});

// Cấu hình xác thực JWT
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT key is missing")))
    };
});

// CORS configuration
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Thêm Ocelot với Polly cho circuit breaker và timeouts
builder.Services
    .AddOcelot()
    .AddPolly();

var app = builder.Build();

// Configure middleware - đảm bảo thứ tự đúng
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    app.UseSwagger();
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

// CORS
app.UseCors();

// Thêm middleware request ID trước
app.UseMiddleware<RequestIdMiddleware>();

// Middleware xác thực
app.UseAuthentication();
app.UseAuthorization();

// Thêm middleware authentication
app.UseMiddleware<AuthenticationMiddleware>();

// Thêm các controller
app.MapControllers();

// Swagger UI cho Ocelot - xử lý lỗi riêng cho phần này
try
{
    // Cấu hình Swagger UI
    app.UseSwaggerForOcelotUI(opt =>
    {
        opt.PathToSwaggerGenerator = "/swagger/docs";
    });
}
catch (Exception ex)
{
    app.Logger.LogError(ex, "Error configuring Swagger UI for Ocelot");
}

// Đặt Ocelot cuối cùng - xử lý lỗi riêng cho phần này
try
{
    await app.UseOcelot();
}
catch (Exception ex)
{
    app.Logger.LogError(ex, "Error configuring Ocelot middleware");
}

app.Run();
