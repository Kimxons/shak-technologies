# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy solution and project files
COPY ["kairo-ui/kairo-ui.csproj", "kairo-ui/"]
COPY ["CBS.COMMON/CBS.Entities.Common.csproj", "CBS.COMMON/"]

# Restore dependencies
RUN dotnet restore "kairo-ui/kairo-ui.csproj"

# Copy all source code
COPY . .

# Build the project
WORKDIR "/src/kairo-ui"
RUN dotnet build "kairo-ui.csproj" -c Release -o /app/build

# Stage 2: Publish
FROM build AS publish
RUN dotnet publish "kairo-ui.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Stage 3: Final runtime image
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app

# Create logs directory
RUN mkdir -p /app/logs && chmod 777 /app/logs

EXPOSE 80
EXPOSE 443

COPY --from=publish /app/publish .

# Set environment variables
ENV ASPNETCORE_URLS=http://+:80
ENV ASPNETCORE_ENVIRONMENT=Production

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

ENTRYPOINT ["dotnet", "kairo-ui.dll"]
