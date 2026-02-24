using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClientDocumentApi.Models
{
    [Table("t_AccountOperatedby")]
    public class AccountOperatedby
    {
        [Key]
        [StringLength(40)]
        public string SignatoryID { get; set; } = default!;

        public long? PhotoID { get; set; }

        public long? SignID { get; set; }

        public long? BioID { get; set; }
    }
}
