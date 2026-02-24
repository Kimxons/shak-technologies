
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace CBS.Entities.SystemCore
{
    [Table("t_MainModule")]
    public class MainModule
    {
        [Key] // Remove if composite key is configured via Fluent API
        public short MainModuleID { get; set; }

        public short MenuID { get; set; }

        [StringLength(510)]
        public string? Description { get; set; }

        [StringLength(6)]
        public string? ShortCutKey { get; set; }

        public byte MainModuleOrder { get; set; }

        public bool IsActive { get; set; }

        public bool IsMenuItem { get; set; }

        [StringLength(400)]
        public string? LicenseKey { get; set; }

        [StringLength(1000)]
        public string? MainModuleIcon { get; set; }
    }

}
