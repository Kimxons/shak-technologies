# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project files
COPY ["AccountManagement/AccountManagement.csproj", "AccountManagement/"]
COPY ["CBS.COMMON/CBS.Entities.Common.csproj", "CBS.COMMON/"]

# Restore dependencies
RUN dotnet restore "AccountManagement/AccountManagement.csproj"

# Copy all source code
COPY . .

# Build the project
WORKDIR "/src/AccountManagement"
RUN dotnet build "AccountManagement.csproj" -c Release -o /app/build

# Stage 2: Publish
FROM build AS publish
RUN dotnet publish "AccountManagement.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Stage 3: Final runtime image
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# Create logs directory
RUN mkdir -p /app/Logs && chmod 777 /app/Logs

EXPOSE 80
EXPOSE 443

COPY --from=publish /app/publish .

# Set environment variables
ENV ASPNETCORE_URLS=http://+:80
ENV ASPNETCORE_ENVIRONMENT=Production

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/health || exit 1

ENTRYPOINT ["dotnet", "AccountManagement.dll"]
