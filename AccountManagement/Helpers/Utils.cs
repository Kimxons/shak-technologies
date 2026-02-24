using System.Text.Json;
using System.Text;

namespace AccountManagement.Helpers
{
    public static class Utils
    {

        public static async Task<string?> GetRequestBody(HttpRequest request)
        {
            request.EnableBuffering();
            var stream = request.Body;
            string body = string.Empty;
            using (StreamReader reader = new(stream, Encoding.UTF8, true, 1024, true))
            {
                body = await reader.ReadToEndAsync();
                if (stream.CanSeek)
                    stream.Seek(0, SeekOrigin.Begin);
            }
            return body;
        }
        public static bool IsValidJson(string jsonString)
        {
            try
            {
                JsonDocument.Parse(jsonString);
                return true;
            }
            catch (JsonException)
            {
                return false;
            }
        }
    }
}
