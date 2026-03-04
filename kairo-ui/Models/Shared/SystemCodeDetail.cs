// This file is now deprecated - use CBS.Entities.SystemCore.SystemCodeDetail instead
// Kept for backward compatibility during migration period

using CBS.Entities.SystemCore;

namespace kairo_ui.Models.Shared
{
    /// <summary>
    /// Legacy model - use CBS.Entities.SystemCore.SystemCodeDetail instead
    /// This class now inherits from the shared entity for backward compatibility
    /// </summary>
    [Obsolete("Use CBS.Entities.SystemCore.SystemCodeDetail directly. This wrapper will be removed in a future version.")]
    public class SystemCodeDetail : CBS.Entities.SystemCore.SystemCodeDetail
    {
        // No additional properties - this is just a wrapper for backward compatibility
        // All properties are inherited from CBS.Entities.SystemCore.SystemCodeDetail
    }
}
