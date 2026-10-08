# LabTracker API. Built from backend/: docker build -t labtracker-api backend
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restore first so package downloads cache independently of source edits.
COPY LabTracker.slnx Directory.Build.props ./
COPY src/LabTracker.Api/LabTracker.Api.csproj src/LabTracker.Api/
COPY src/LabTracker.Application/LabTracker.Application.csproj src/LabTracker.Application/
COPY src/LabTracker.Domain/LabTracker.Domain.csproj src/LabTracker.Domain/
COPY src/LabTracker.Infrastructure/LabTracker.Infrastructure.csproj src/LabTracker.Infrastructure/
COPY src/LabTracker.Shared/LabTracker.Shared.csproj src/LabTracker.Shared/
RUN dotnet restore src/LabTracker.Api/LabTracker.Api.csproj

COPY src/ src/
RUN dotnet publish src/LabTracker.Api/LabTracker.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
# SkiaSharp (equipment image processing) needs fontconfig; Npgsql probes for
# GSSAPI on connect and logs an error on every start without it.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libfontconfig1 libgssapi-krb5-2 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app .
# The base image listens on 8080 and runs as the non-root `app` user.
ENV ASPNETCORE_ENVIRONMENT=Production
USER app
EXPOSE 8080
ENTRYPOINT ["dotnet", "LabTracker.Api.dll"]
