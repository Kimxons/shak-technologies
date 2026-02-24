using CBS.Entities.Common;
using System.ComponentModel.DataAnnotations;

namespace CBS.Entities.ClientMaintenance
{
    public partial class ClientRelations : AuditDetail
    {
        private string? iD = string.Empty; public string? ID { get => iD; set => iD = value; }
        private string? clientID = string.Empty; [StringLength(40)] public string? ClientID { get => clientID; set => clientID = value; }
        private string? relatedClientID = string.Empty; [StringLength(40)] public string? RelatedClientID { get => relatedClientID; set => relatedClientID = value; }
        private string? relationID = string.Empty; [StringLength(50)] public string? RelationID { get => relationID; set => relationID = value; }
        private string? clientToRelationID = string.Empty; [StringLength(50)] public string? ClientToRelationID { get => clientToRelationID; set => clientToRelationID = value; }
        private string? relationRefNo = string.Empty; public string? RelationRefNo { get => relationRefNo; set => relationRefNo = value; }
        private string? remarks = string.Empty; [StringLength(255)] public string? Remarks { get => remarks; set => remarks = value; }
        private string? sharePercent = string.Empty; public string? SharePercent { get => sharePercent; set => sharePercent = value; }
        private string? updateCount = string.Empty; public string? UpdateCount { get => updateCount; set => updateCount = value; }
        private string? relationType = string.Empty; [StringLength(50)][Required] public string? RelationType { get => relationType; set => relationType = value; }

        private string? extraDetails = string.Empty;

        /// <summary>
        /// [{"id":1,"name":"","value":""}]
        /// </summary>
        public string? ExtraDetails { get => extraDetails; set => extraDetails = value; }

    }
}
