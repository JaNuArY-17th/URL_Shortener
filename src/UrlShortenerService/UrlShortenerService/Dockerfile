FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
ENV ASPNETCORE_URLS=http://+:${PORT}
EXPOSE ${PORT}
WORKDIR /app

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["UrlShortenerService.csproj", "./"]
RUN dotnet restore "UrlShortenerService.csproj"
COPY . .
WORKDIR "/src"
RUN dotnet build "UrlShortenerService.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "UrlShortenerService.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "UrlShortenerService.dll"]