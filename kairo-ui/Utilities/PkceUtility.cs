using System;
using System.Security.Cryptography;
using System.Text;

namespace kairo_ui.Utilities
{
    /// <summary>
    /// PKCE (Proof Key for Code Exchange) utility for secure OAuth 2.0 Authorization Code Flow
    /// </summary>
    public static class PkceUtility
    {
        /// <summary>
        /// Generates a cryptographically random code verifier (43-128 characters)
        /// </summary>
        public static string GenerateCodeVerifier()
        {
            const int length = 128; // Maximum secure length
            const string allowedChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
            
            byte[] randomBytes = new byte[length];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(randomBytes);
            }

            var result = new StringBuilder(length);
            foreach (byte b in randomBytes)
            {
                result.Append(allowedChars[b % allowedChars.Length]);
            }

            return result.ToString();
        }

        /// <summary>
        /// Generates code challenge from code verifier using SHA256
        /// </summary>
        public static string GenerateCodeChallenge(string codeVerifier)
        {
            if (string.IsNullOrEmpty(codeVerifier))
                throw new ArgumentNullException(nameof(codeVerifier));

            byte[] bytes = Encoding.UTF8.GetBytes(codeVerifier);
            using (var sha256 = SHA256.Create())
            {
                byte[] hash = sha256.ComputeHash(bytes);
                return Base64UrlEncode(hash);
            }
        }

        /// <summary>
        /// Base64 URL encodes data (used for PKCE)
        /// </summary>
        private static string Base64UrlEncode(byte[] data)
        {
            string base64 = Convert.ToBase64String(data);
            // Convert standard Base64 to Base64Url
            return base64.Replace("+", "-")
                         .Replace("/", "_")
                         .TrimEnd('=');
        }

        /// <summary>
        /// Generates a random state parameter for CSRF protection
        /// </summary>
        public static string GenerateState()
        {
            const int length = 32;
            const string allowedChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            
            byte[] randomBytes = new byte[length];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(randomBytes);
            }

            var result = new StringBuilder(length);
            foreach (byte b in randomBytes)
            {
                result.Append(allowedChars[b % allowedChars.Length]);
            }

            return result.ToString();
        }
    }
}
