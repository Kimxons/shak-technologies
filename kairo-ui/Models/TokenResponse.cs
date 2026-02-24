namespace kairo_ui.Models
{
    /// <summary>
    /// Models the response from the authentication token endpoint
    /// </summary>
    public class TokenResponse
    {
        public string? AccessToken { get; set; }
        public string? RefreshToken { get; set; }
        public string? TokenType { get; set; }
        public int ExpiresIn { get; set; }
        public string? UserId { get; set; }
        public string? Username { get; set; }
        public string? Email { get; set; }
        public List<string>? Roles { get; set; }
        public int BranchId { get; set; }
        public bool Success { get; set; }
        public string? Message { get; set; }
    }
}
