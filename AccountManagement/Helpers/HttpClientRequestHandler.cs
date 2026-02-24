using System.Text.Json;

namespace ClientOnboarding.Helpers
{
    public class HttpClientRequestHandler : DelegatingHandler
    {
        public HttpClientRequestHandler(HttpMessageHandler innerHandler) : base(innerHandler) { }
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var body = request.Content == null ? null : await request.Content.ReadAsStringAsync(cancellationToken);
            var response = await base.SendAsync(request, cancellationToken);
            var responseContent = response.Content == null ? null : await response.Content.ReadAsStringAsync(cancellationToken);

            var builder = new UriBuilder(request.RequestUri!.AbsoluteUri);

            var log = new
            {
                //Url = request.RequestUri.AbsoluteUri,
                Url = builder.ToString(),
                Headers = JsonSerializer.Serialize(request.Headers!.ToDictionary(h => h.Key, h => h.Value)),
                Body = string.IsNullOrEmpty(body) ? string.Empty : body,
                Method = request.Method.Method,
                StatusCode = response.StatusCode,
                ReasonPhrase = response.ReasonPhrase,
                Response = responseContent,
                RequestDate = DateTime.Now
            };

            _ = Task.Run(async () => // Use Task.Run because we want to fire and forget and we don't want logging to make the call takes longer to run
            {
                try
                {
                    string logPath = AppDomain.CurrentDomain.BaseDirectory + "\\HttpLog\\";
                    // Log request and response here i.e Send message to queue, or log to a remote server
                    System.IO.Directory.CreateDirectory(logPath);
                    System.IO.File.AppendAllText(logPath + DateTime.Now.ToString("yyyy-MM-dd").Replace("-", "") + ".txt", string.Concat("\n", Convert.ToString(log)));

                }
                catch (Exception)
                {
                    // Do nothing or log why the request log had an exception
                }
            }, cancellationToken);

            return response;
        }

    }
}
