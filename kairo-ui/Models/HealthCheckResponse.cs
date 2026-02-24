namespace kairo_ui.Models
{
    /// <summary>
    /// Health check response model
    /// </summary>
    public class HealthCheckResponse
    {
        public string? Status { get; set; }
        public DateTime Timestamp { get; set; }
        public string? Version { get; set; }
        public string? Environment { get; set; }
        public HealthCheckDetails? Details { get; set; }
    }

    /// <summary>
    /// Detailed health check information
    /// </summary>
    public class HealthCheckDetails
    {
        public ComponentHealth? Application { get; set; }
        public ComponentHealth? Session { get; set; }
        public ComponentHealth? OAuth { get; set; }
        public ComponentHealth? Configuration { get; set; }
    }

    /// <summary>
    /// Individual component health status
    /// </summary>
    public class ComponentHealth
    {
        public string? Status { get; set; }
        public string? Message { get; set; }
        public long? ResponseTimeMs { get; set; }
    }
}
