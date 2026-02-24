using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClientDocumentApi.Models
{
    [Table("t_WFClient")]
    public class WFClient
    {
        [Key]
        [StringLength(40)]
        public string ClientID { get; set; } = default!;

        public long? PhotoID { get; set; }

        public long? SignID { get; set; }

        public long? BioID { get; set; }
        [StringLength(50)]
        public string? RequestID { get; set; } = default!;
    }
}
