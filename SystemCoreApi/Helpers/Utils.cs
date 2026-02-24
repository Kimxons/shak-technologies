namespace SystemCoreApi.Helpers
{
    public static class Utils
    {
        public static async Task<string> GetRequestBody(HttpRequest request)
        {
            request.EnableBuffering();
            var body = await new StreamReader(request.Body).ReadToEndAsync();
            request.Body.Position = 0;
            return body;
        }
    }
}
