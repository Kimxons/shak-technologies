using System.Collections.Generic;

namespace kairo_ui.Models
{
    /// <summary>
    /// Generic pagination result wrapper for API responses
    /// </summary>
    public class PaginatedResult<T>
    {
        public List<T> Items { get; set; } = [];
        public int CurrentPage { get; set; }
        public int PageSize { get; set; }
        public int TotalItems { get; set; }
        public int TotalPages { get; set; }
    }
}
