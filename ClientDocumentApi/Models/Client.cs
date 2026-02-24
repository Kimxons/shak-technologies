using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClientDocumentApi.Models
{
    [Table("t_Client")]
    public class Client
    {
        [Key]
        [StringLength(40)]
        public string ClientID { get; set; } = default!;

        public long? PhotoID { get; set; }

        public long? SignID { get; set; }

        public long? BioID { get; set; }
    }
}
