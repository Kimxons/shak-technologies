using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClientDocumentApi.Models
{
    [Table("t_SystemCode")]
    public class SystemCode
    {
        [Key]
        [StringLength(50)]
        public string CodeID { get; set; } = default!;

        [StringLength(50)]
        public string? SubCodeID { get; set; }

        [StringLength(300)]
        public string? CodeDescription { get; set; }

        [StringLength(50)]
        public string? ParentCodeID { get; set; }

        public int DisplayOrder { get; set; } = 0;
    }
}
