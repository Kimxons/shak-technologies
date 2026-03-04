using System.ComponentModel.DataAnnotations;

namespace CBS.Entities.SystemCore
{
    /// <summary>
    /// Represents a dropdown-ready code item with standardized properties
    /// Used for UI dropdown/select components
    /// </summary>
    public class DropdownCodeItem
    {
        /// <summary>
        /// System code identifier (e.g., "ClientTypeID", "GenderID")
        /// </summary>
    [StringLength(50)]
        public string CodeID { get; set; } = string.Empty;

        /// <summary>
  /// Parent code ID for hierarchical codes (optional)
    /// </summary>
        [StringLength(50)]
        public string? ParentCodeID { get; set; }

        /// <summary>
      /// The value to be used in forms/API calls (SubCodeID)
  /// </summary>
      [StringLength(50)]
    public string Value { get; set; } = string.Empty;

        /// <summary>
      /// The display label for dropdown options (CodeDescription)
        /// </summary>
   [StringLength(300)]
        public string Label { get; set; } = string.Empty;

  /// <summary>
  /// Display order for sorting dropdown options
    /// </summary>
      public int DisplayOrder { get; set; }
    }
}
