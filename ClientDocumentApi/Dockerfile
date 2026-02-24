# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src

# Copy csproj and restore dependencies
COPY ["ClientDocumentApi.csproj", "."]
RUN dotnet restore "./ClientDocumentApi.csproj"

# Copy everything else and build
COPY . .
RUN dotnet build "./ClientDocumentApi.csproj" -c $BUILD_CONFIGURATION -o /app/build

# Publish stage
FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "./ClientDocumentApi.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# Expose port 80 for the application
EXPOSE 80

# Copy published files
COPY --from=publish /app/publish .

# Create directories for uploads and logs
RUN mkdir -p /app/uploads /app/logs && \
    chmod -R 777 /app/uploads /app/logs

ENTRYPOINT ["dotnet", "ClientDocumentApi.dll"]