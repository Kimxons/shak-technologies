using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using System.Text.Json;

namespace CBS.Entities.Common
{
    public partial class ResponseDetail<T> : Response where T : class
    {
        //[JsonPropertyName("Details")]
        public T? Details { get; set; }
    }
}
