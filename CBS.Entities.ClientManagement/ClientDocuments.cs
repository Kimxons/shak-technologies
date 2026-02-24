using CBS.Entities.Common;
using System.ComponentModel.DataAnnotations;

namespace CBS.Entities.ClientMaintenance
{
    public partial class ClientDocuments : AuditDetail
    {
        //private string? ourBranchID = string.Empty; [StringLength(12)] public string? OurBranchID { get => ourBranchID; set => ourBranchID = value; }
        private string? clientID = string.Empty; [StringLength(40)] public string? ClientID { get => clientID; set => clientID = value; }
        //private string? clientTypeID = string.Empty; [StringLength(50)] public string? ClientTypeID { get => clientTypeID; set => clientTypeID = value; }
        private string? documentID = string.Empty; [StringLength(10)] public string? DocumentID { get => documentID; set => documentID = value; }
        private string? documentTypeID = string.Empty; [StringLength(50)] public string? DocumentTypeID { get => documentTypeID; set => documentTypeID = value; }
        //private string? documentClass = string.Empty; [StringLength(50)] public string? DocumentClass { get => documentClass; set => documentClass = value; }
        private string? receivedBy = string.Empty; [StringLength(50)] public string? ReceivedBy { get => receivedBy; set => receivedBy = value; }
        private DateTime? receivedDate = DateTime.Now; public DateTime? ReceivedDate { get => receivedDate; set => receivedDate = value; }
        private int? imageID = 0; public int? ImageID { get => imageID; set => imageID = value; }
        private string? locationID = string.Empty; [StringLength(50)] public string? LocationID { get => locationID; set => locationID = value; }
        private string? description = string.Empty; [StringLength(255)] public string? Description { get => description; set => description = value; }

        private string? updateCount = string.Empty; public string? UpdateCount { get => updateCount; set => updateCount = value; }

        private string? extraDetails = string.Empty;

        /// <summary>
        /// [{"id":1,"name":"","value":""}]
        /// </summary>
        public string? ExtraDetails { get => extraDetails; set => extraDetails = value; }

    }
}
