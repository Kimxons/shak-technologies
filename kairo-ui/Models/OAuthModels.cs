namespace kairo_ui.Models
{
    /// <summary>
    /// OAuth 2.0 Authorization Code Flow configuration
    /// </summary>
    public class OAuthSettings
    {
        public string? ClientId { get; set; }
        public string? ClientSecret { get; set; }
        public string? AuthorizeEndpoint { get; set; }
        public string? TokenEndpoint { get; set; }
        public string? RedirectUri { get; set; }
        public string? Scope { get; set; }
        public string? ResponseType { get; set; }
    }

    /// <summary>
    /// PKCE (Proof Key for Code Exchange) parameters for OAuth 2.0 Authorization Code Flow
    /// </summary>
    public class PkceParameters
    {
        public string? CodeChallenge { get; set; }
        public string? CodeChallengeMethod { get; set; }
        public string? CodeVerifier { get; set; }
    }

    /// <summary>
    /// OAuth 2.0 Authorization Code request
    /// </summary>
    public class AuthorizationCodeRequest
    {
        public string? ClientId { get; set; }
        public string? RedirectUri { get; set; }
        public string? Scope { get; set; }
        public string? State { get; set; }
        public string? CodeChallenge { get; set; }
        public string? CodeChallengeMethod { get; set; }
        public string? ResponseType { get; set; }
    }

    /// <summary>
    /// OAuth 2.0 Token request (using Authorization Code or Refresh Token)
    /// </summary>
    public class TokenRequest
    {
        public string? GrantType { get; set; }
        public string? Code { get; set; }
        public string? ClientId { get; set; }
        public string? ClientSecret { get; set; }
        public string? RedirectUri { get; set; }
        public string? CodeVerifier { get; set; }
        public string? RefreshToken { get; set; }
    }
}
