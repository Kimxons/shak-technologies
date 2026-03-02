using System.Text.Json;

namespace kairo_ui.Models.MicroFinance
{
    public class MicroFinanceOldApiRequest
    {
        public string? FormId { get; set; }

        public JsonElement RequestData { get; set; }
    }
}