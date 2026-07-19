FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build

WORKDIR /src

COPY src/BedtimeStoryTracker.Api/BedtimeStoryTracker.Api.csproj src/BedtimeStoryTracker.Api/
RUN dotnet restore src/BedtimeStoryTracker.Api/BedtimeStoryTracker.Api.csproj

COPY src/BedtimeStoryTracker.Api/ src/BedtimeStoryTracker.Api/
COPY src/data/stories.json src/data/stories.json
RUN dotnet publish src/BedtimeStoryTracker.Api/BedtimeStoryTracker.Api.csproj \
    --configuration Release \
    --no-restore \
    --output /app/publish \
    /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0-noble AS runtime

ARG GIT_SHA=unknown
ARG BUILD_DATE=unknown

LABEL org.opencontainers.image.title="Bedtime Story Tracker API" \
      org.opencontainers.image.revision="${GIT_SHA}" \
      org.opencontainers.image.created="${BUILD_DATE}"

RUN apt-get update \
    && apt-get install --yes --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080

USER app

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=5 \
    CMD curl --fail --silent --show-error http://127.0.0.1:8080/health > /dev/null || exit 1

ENTRYPOINT ["dotnet", "BedtimeStoryTracker.Api.dll"]
