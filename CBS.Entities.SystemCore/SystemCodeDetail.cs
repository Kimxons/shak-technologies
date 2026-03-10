using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CBS.Entities.SystemCore
{
    /// <summary>
    /// Represents a system code detail/option
    /// Used for dropdown options and lookup values
 /// Maps to t_SystemCodeDetail table
    /// </summary>
    [Table("t_SystemCodeDetail")]
    public class SystemCodeDetail
 {
        /// <summary>
 /// System code identifier (primary key part 1)
        /// </summary>
        [Key]
        [Column(Order = 0)]
    [StringLength(50)]
        public string CodeID { get; set; } = string.Empty;

  /// <summary>
  /// Sub-code identifier (primary key part 2 - the actual option value)
     /// </summary>
        [Key]
      [Column(Order = 1)]
      [StringLength(50)]
      public string SubCodeID { get; set; } = string.Empty;

     /// <summary>
        /// Description of the code option
        /// </summary>
        [StringLength(300)]
        public string? CodeDescription { get; set; }

      /// <summary>
 /// Parent code ID for hierarchical codes
        /// </summary>
        [StringLength(50)]
        public string? ParentCodeID { get; set; }

      /// <summary>
        /// Display order for sorting
    /// </summary>
        public int DisplayOrder { get; set; }

        /// <summary>
    /// Whether this is the default option
   /// </summary>
        public bool IsDefault { get; set; }

        /// <summary>
        /// Whether this code is active
        /// </summary>
        public bool IsActive { get; set; } = true;

        /// <summary>
        /// Charging currency identifier — used as dropdown value for Amount In fields
        /// </summary>
        [StringLength(50)]
        public string? ChargingCurrencyID { get; set; }
    }
}
