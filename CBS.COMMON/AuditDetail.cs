using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CBS.Entities.Common
{
    public partial class AuditDetail
    {
        private string createdby = string.Empty;
        [StringLength(50)]
        public string CreatedBy { get => createdby; set => createdby = value; }
        public DateTime CreatedOn { get; set; }
        [StringLength(50)]
        public string? ModifiedBy { get; set; }
        public DateTime? ModifiedOn { get; set; }
        [StringLength(50)]
        public string? SupervisedBy { get; set; }
        public DateTime? SupervisedOn { get; set; }
        private string requestsource = string.Empty;
        public string RequestSource { get => requestsource; set => requestsource = value; }
        private string requestid = string.Empty;
        public string RequestId { get => requestid; set => requestid = value; }
    }
}
