using kairo_ui.Models;

namespace kairo_ui.Services
{
    public interface IApiHelper
    {
        Task<IEnumerable<T>> GetResponse<T>();
        Task<T> GetSingleAsync<T>();
        Task<PaginatedResult<T>> GetPaginatedAsync<T>();
        Task<T> CreateAsync<T>();
    }
    public partial class ApiHelper : IApiHelper { }
}
