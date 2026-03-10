using Asp.Versioning;
using CBS.Entities.ClientMaintenance;
using CBS.Entities.Common;
using ClientManagement.Helpers;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace ClientManagement.Modules.ClientMaintenance
{
    [Route("api/v{version:apiVersion}/[controller]")]
    [ApiController]
    [ApiVersion(1.0)]
    public class ClientMaintenanceController(ILogger<ClientMaintenanceController> logger
            , IClientBasicDetailsRepo repoClientBasicDetails
            , IClientAddressRepo repoClientAddress
            , IClientDocumentsRepo repoClientDocuments
            , IClientRelationsRepo repoClientRelations
            , IClientEmploymentRepo repoClientEmployment
            , IClientIndividualRepo repoClientIndividual
            , IClientCorporateRepo repoClientCorporate
            , IClientProductAndServicesRepo repoClientProductAndServices
            , IClientOtherDetailsRepo repoClientOtherDetails
            , IClientSpecialOffersRepo repoClientSpecialOffers
            ) : ControllerBase
    {
        private readonly ILogger<ClientMaintenanceController> _logger = logger;
        private readonly IClientBasicDetailsRepo _repoClientBasicDetails = repoClientBasicDetails;
        private readonly IClientAddressRepo _repoClientAddress = repoClientAddress;
        private readonly IClientDocumentsRepo _repoClientDocuments = repoClientDocuments;
        private readonly IClientRelationsRepo _repoClientRelations = repoClientRelations;
        private readonly IClientEmploymentRepo _repoClientEmployment = repoClientEmployment;
        private readonly IClientIndividualRepo _repoClientIndividual = repoClientIndividual;
        private readonly IClientCorporateRepo _repoClientCorporate = repoClientCorporate;
        private readonly IClientProductAndServicesRepo _repoClientProductAndServices = repoClientProductAndServices;
        private readonly IClientOtherDetailsRepo _repoClientOtherDetails = repoClientOtherDetails;
        private readonly IClientSpecialOffersRepo _repoClientSpecialOffers = repoClientSpecialOffers;

        [HttpPost("GetClientBasicDetails")]
        public async Task<IActionResult> GetClientBasicDetails([FromBody] InDataRequest<object?> reqDat, CancellationToken cancellationToken = default)
        {
            LogLevel logLevel = LogLevel.None;
            int httpStatusCode = 200;
            object? resp = null;
            try
            {
                if (reqDat is null)
                {
                    logLevel = LogLevel.Error;
                    resp = new ResponseDetail<string>
                    {
                        ResponseCode = "APIEX96",
                        ResponseMessage = "Empty or Invalid Body"
                    };
                    httpStatusCode = 400;
                }
                else
                {
                    string? requestJson = await Utils.GetRequestBody(Request);
                    //reqDat.RequestData = Regex.Unescape(JsonSerializer.Serialize(reqDat.RequestData));
                    requestJson = string.IsNullOrEmpty(requestJson) ? JsonSerializer.Serialize(reqDat) : requestJson;
                    requestJson = Regex.Unescape(requestJson);
                    resp = await _repoClientBasicDetails.GetClientBasicDetails(requestJson!, cancellationToken);
                    if (resp is null)
                    {
                        logLevel = LogLevel.Error;
                        resp = new ResponseDetail<string>
                        {
                            ResponseCode = "APIEX96",
                            ResponseMessage = "Empty response"
                        };
                        httpStatusCode = 400;
                    }
                    else
                    {
                        logLevel = LogLevel.Information;
                    }
                }
            }
            catch (Exception ex)
            {
                logLevel = LogLevel.Error;
                resp = new Response
                {
                    ResponseCode = "APIEX96",
                    ResponseMessage = ex.Message,
                };
            }
            finally
            {
                _logger.Log(logLevel, "{@message}", new { MethodName = Request.Path.ToString(), Request = reqDat, Response = resp, RemoteIp = Request.HttpContext.Connection.RemoteIpAddress!.MapToIPv4().ToString() });
            }
            return StatusCode(httpStatusCode, resp);

        }
        [HttpPost("CreateClientBasicDetails")]
        public async Task<IActionResult> CreateClientBasicDetails([FromBody] InDataRequest<ClientBasicDetails?> reqDat, CancellationToken cancellationToken = default)
        {
            LogLevel logLevel = LogLevel.None;
            int httpStatusCode = 200;
            object? resp = null;
            try
            {
                if (reqDat is null)
                {
                    logLevel = LogLevel.Error;
                    resp = new ResponseDetail<string>
                    {
                        ResponseCode = "APIEX96",
                        ResponseMessage = "Empty Body"
                    };
                    httpStatusCode = 400;
                }
                else
                {
                    string? requestJson = await Utils.GetRequestBody(Request);
                    requestJson = string.IsNullOrEmpty(requestJson) ? JsonSerializer.Serialize(reqDat) : requestJson;
                    requestJson = Regex.Unescape(requestJson);
                    resp = await _repoClientBasicDetails.CreateClientBasicDetails(requestJson!, cancellationToken);
                    if (resp is null)
                    {
                        logLevel = LogLevel.Error;
                        resp = new ResponseDetail<string>
                        {
                            ResponseCode = "96",
                            ResponseMessage = "Empty response"
                        };
                        httpStatusCode = 400;
                    }
                    logLevel = LogLevel.Information;
                }
            }
            catch (Exception ex)
            {
                logLevel = LogLevel.Error;
                resp = new Response
                {
                    ResponseCode = "96",
                    ResponseMessage = ex.Message,
                };
            }
            finally
            {
                _logger.Log(logLevel, "{@message}", new { MethodName = Request.Path!.ToString(), Request = reqDat, Response = resp, RemoteIp = Request.HttpContext.Connection.RemoteIpAddress!.MapToIPv4().ToString() });
            }
            return StatusCode(httpStatusCode, resp);

        }
        [HttpPost("EditClientBasicDetails")]
        public async Task<IActionResult> UpdateClientBasicDetails([FromBody] InDataRequest<ClientBasicDetails?> reqDat, CancellationToken cancellationToken = default)
        {
            LogLevel logLevel = LogLevel.None;
            int httpStatusCode = 200;
            object? resp = null;
            try
            {
                if (reqDat is null)
                {
                    logLevel = LogLevel.Error;
                    resp = new ResponseDetail<string>
                    {
                        ResponseCode = "APIEX96",
                        ResponseMessage = "Empty Body"
                    };
                    httpStatusCode = 400;
                }
                else
                {
                    string? requestJson = await Utils.GetRequestBody(Request);
                    requestJson = string.IsNullOrEmpty(requestJson) ? JsonSerializer.Serialize(reqDat) : requestJson;
                    requestJson = Regex.Unescape(requestJson);
                    resp = await _repoClientBasicDetails.UpdateClientBasicDetails(requestJson!, cancellationToken);
                    if (resp is null)
                    {
                        logLevel = LogLevel.Error;
                        resp = new ResponseDetail<string>
                        {
                            ResponseCode = "APIEX96",
                            ResponseMessage = "Empty response"
                        };
                        httpStatusCode = 400;
                    }
                    else
                    {
                        logLevel = LogLevel.Information;
                    }
                }
            }
            catch (Exception ex)
            {
                logLevel = LogLevel.Error;
                resp = new Response
                {
                    ResponseCode = "APIEX96",
                    ResponseMessage = ex.Message,
                };
                httpStatusCode = 500;
            }
            finally
            {
                _logger.Log(logLevel, "{@message}", new { MethodName = Request.Path.ToString(), Request = reqDat, Response = resp, RemoteIp = Request.HttpContext.Connection.RemoteIpAddress!.MapToIPv4().ToString() });
            }
            return StatusCode(httpStatusCode, resp);

        }


        [HttpPost("GetClientAddress")]
        public async Task<IActionResult> GetClientAddress([FromBody] InDataRequest<object?> reqDat, CancellationToken cancellationToken = default)
        {
            LogLevel logLevel = LogLevel.None;
            int httpStatusCode = 200;
            object? resp = null;
            try
            {
                if (reqDat is null)
                {
                    logLevel = LogLevel.Error;
                    resp = new ResponseDetail<string>
                    {
                        ResponseCode = "APIEX96",
                        ResponseMessage = "Empty or Invalid Body"
                    };
                    httpStatusCode = 400;
                }
                else
                {
                    string? requestJson = await Utils.GetRequestBody(Request);
                    //reqDat.RequestData = Regex.Unescape(JsonSerializer.Serialize(reqDat.RequestData));
                    requestJson = string.IsNullOrEmpty(requestJson) ? JsonSerializer.Serialize(reqDat) : requestJson;
                    requestJson = Regex.Unescape(requestJson);
                    resp = await _repoClientAddress.GetClientAddress(requestJson!, cancellationToken);
                    if (resp is null)
                    {
                        logLevel = LogLevel.Error;
                        resp = new ResponseDetail<string>
                        {
                            ResponseCode = "APIEX96",
                            ResponseMessage = "Empty response"
                        };
                        httpStatusCode = 400;
                    }
                    else
                    {
                        logLevel = LogLevel.Information;
                    }
                }
            }
            catch (Exception ex)
            {
                logLevel = LogLevel.Error;
                resp = new Response
                {
                    ResponseCode = "APIEX96",
                    ResponseMessage = ex.Message,
                };
            }
            finally
            {
                _logger.Log(logLevel, "{@message}", new { MethodName = Request.Path.ToString(), Request = reqDat, Response = resp, RemoteIp = Request.HttpContext.Connection.RemoteIpAddress!.MapToIPv4().ToString() });
            }
            return StatusCode(httpStatusCode, resp);

        }
        [HttpPost("CreateClientAddress")]
        public async Task<IActionResult> CreateClientAddress([FromBody] InDataRequest<ClientMultipleAddress?> reqDat, CancellationToken cancellationToken = default)
        {
            LogLevel logLevel = LogLevel.None;
            int httpStatusCode = 200;
            object? resp = null;
            try
            {
                if (reqDat is null)
                {
                    logLevel = LogLevel.Error;
                    resp = new ResponseDetail<string>
                    {
                        ResponseCode = "APIEX96",
                        ResponseMessage = "Empty Body"
                    };
                    httpStatusCode = 400;
                }
                else
                {
                    string? requestJson = await Utils.GetRequestBody(Request);
                    requestJson = string.IsNullOrEmpty(requestJson) ? JsonSerializer.Serialize(reqDat) : requestJson;
                    requestJson = Regex.Unescape(requestJson);
                    resp = await _repoClientAddress.CreateClientAddress(requestJson!, cancellationToken);
                    if (resp is null)
                    {
                        logLevel = LogLevel.Error;
                        resp = new ResponseDetail<string>
                        {
                            ResponseCode = "96",
                            ResponseMessage = "Empty response"
                        };
                        httpStatusCode = 400;
                    }
                    logLevel = LogLevel.Information;
                }
            }
            catch (Exception ex)
            {
                logLevel = LogLevel.Error;
                resp = new Response
                {
                    ResponseCode = "96",
                    ResponseMessage = ex.Message,
                };
            }
            finally
            {
                _logger.Log(logLevel, "{@message}", new { MethodName = Request.Path!.ToString(), Request = reqDat, Response = resp, RemoteIp = Request.HttpContext.Connection.RemoteIpAddress!.MapToIPv4().ToString() });
            }
            return StatusCode(httpStatusCode, resp);

        }
        [HttpPost("EditClientAddress")]
        public async Task<IActionResult> UpdateClientAddress([FromBody] InDataRequest<ClientMultipleAddress?> reqDat, CancellationToken cancellationToken = default)
        {
            LogLevel logLevel = LogLevel.None;
            int httpStatusCode = 200;
            object? resp = null;
            try
            {
                if (reqDat is null)
                {
                    logLevel = LogLevel.Error;
                    resp = new ResponseDetail<string>
                    {
                        ResponseCode = "APIEX96",
                        ResponseMessage = "Empty Body"
                    };
                    httpStatusCode = 400;
                }
                else
                {
                    string? requestJson = await Utils.GetRequestBody(Request);
                    requestJson = string.IsNullOrEmpty(requestJson) ? JsonSerializer.Serialize(reqDat) : requestJson;
                    requestJson = Regex.Unescape(requestJson);
                    resp = await _repoClientAddress.UpdateClientAddress(requestJson!, cancellationToken);
                    if (resp is null)
                    {
                        logLevel = LogLevel.Error;
                        resp = new ResponseDetail<string>
                        {
                            ResponseCode = "APIEX96",
                            ResponseMessage = "Empty response"
                        };
                        httpStatusCode = 400;
                    }
                    else
                    {
                        logLevel = LogLevel.Information;
                    }
                }
            }
            catch (Exception ex)
            {
                logLevel = LogLevel.Error;
                resp = new Response
                {
                    ResponseCode = "APIEX96",
                    ResponseMessage = ex.Message,
                };
                httpStatusCode = 500;
            }
            finally
            {
                _logger.Log(logLevel, "{@message}", new { MethodName = Request.Path.ToString(), Request = reqDat, Response = resp, RemoteIp = Request.HttpContext.Connection.RemoteIpAddress!.MapToIPv4().ToString() });
            }
            return StatusCode(httpStatusCode, resp);

        }


        [HttpPost("GetClientDocuments")]
        public async Task<IActionResult> GetClientDocuments([FromBody] InDataRequest<object?> reqDat, CancellationToken cancellationToken = default)
        {
            LogLevel logLevel = LogLevel.None;
            int httpStatusCode = 200;
            object? resp = null;
            try
            {
                if (reqDat is null)
                {
                    logLevel = LogLevel.Error;
                    resp = new ResponseDetail<string>
                    {
                        ResponseCode = "APIEX96",
                        ResponseMessage = "Empty or Invalid Body"
                    };
                    httpStatusCode = 400;
                }
                else
                {
                    string? requestJson = await Utils.GetRequestBody(Request);
                    //reqDat.RequestData = Regex.Unescape(JsonSerializer.Serialize(reqDat.RequestData));
                    requestJson = string.IsNullOrEmpty(requestJson) ? JsonSerializer.Serialize(reqDat) : requestJson;
                    requestJson = Regex.Unescape(requestJson);
                    resp = await _repoClientDocuments.GetClientDocuments(requestJson!, cancellationToken);
                    if (resp is null)
                    {
                        logLevel = LogLevel.Error;
                        resp = new ResponseDetail<string>
                        {
                            ResponseCode = "APIEX96",
                            ResponseMessage = "Empty response"
                        };
                        httpStatusCode = 400;
                    }
                    else
                    {
                        logLevel = LogLevel.Information;
                    }
                }
            }
            catch (Exception ex)
            {
                logLevel = LogLevel.Error;
                resp = new Response
                {
                    ResponseCode = "APIEX96",
                    ResponseMessage = ex.Message,
                };
            }
            finally
            {
                _logger.Log(logLevel, "{@message}", new { MethodName = Request.Path.ToString(), Request = reqDat, Response = resp, RemoteIp = Request.HttpContext.Connection.RemoteIpAddress!.MapToIPv4().ToString() });
            }
            return StatusCode(httpStatusCode, resp);

        }
        [HttpPost("CreateClientDocuments")]
        public async Task<IActionResult> CreateClientDocuments([FromBody] InDataRequest<ClientDocuments?> reqDat, CancellationToken cancellationToken = default)
        {
            LogLevel logLevel = LogLevel.None;
            int httpStatusCode = 200;
            object? resp = null;
            try
            {
                if (reqDat is null)
                {
                    logLevel = LogLevel.Error;
                    resp = new ResponseDetail<string>
                    {
                        ResponseCode = "APIEX96",
                        ResponseMessage = "Empty Body"
                    };
                    httpStatusCode = 400;
                }
                else
                {
                    string? requestJson = await Utils.GetRequestBody(Request);
                    requestJson = string.IsNullOrEmpty(requestJson) ? JsonSerializer.Serialize(reqDat) : requestJson;
                    requestJson = Regex.Unescape(requestJson);
                    resp = await _repoClientDocuments.CreateClientDocuments(requestJson!, cancellationToken);
                    if (resp is null)
                    {
                        logLevel = LogLevel.Error;
                        resp = new ResponseDetail<string>
                        {
                            ResponseCode = "96",
                            ResponseMessage = "Empty response"
                        };
                        httpStatusCode = 400;
                    }
                    logLevel = LogLevel.Information;
                }
            }
            catch (Exception ex)
            {
                logLevel = LogLevel.Error;
                resp = new Response
                {
                    ResponseCode = "96",
                    ResponseMessage = ex.Message,
                };
            }
            finally
            {
                _logger.Log(logLevel, "{@message}", new { MethodName = Request.Path!.ToString(), Request = reqDat, Response = resp, RemoteIp = Request.HttpContext.Connection.RemoteIpAddress!.MapToIPv4().ToString() });
            }
            return StatusCode(httpStatusCode, resp);

        }
        [HttpPost("EditClientDocuments")]
        public async Task<IActionResult> UpdateClientDocuments([FromBody] InDataRequest<ClientDocuments?> reqDat, CancellationToken cancellationToken = default)
        {
            LogLevel logLevel = LogLevel.None;
            int httpStatusCode = 200;
            object? resp = null;
            try
            {
                if (reqDat is null)
                {
                    logLevel = LogLevel.Error;
                    resp = new ResponseDetail<string>
                    {
                        ResponseCode = "APIEX96",
                        ResponseMessage = "Empty Body"
                    };
                    httpStatusCode = 400;
                }
                else
                {
                    string? requestJson = await Utils.GetRequestBody(Request);
                    requestJson = string.IsNullOrEmpty(requestJson) ? JsonSerializer.Serialize(reqDat) : requestJson;
                    requestJson = Regex.Unescape(requestJson);
                    resp = await _repoClientDocuments.UpdateClientDocuments(requestJson!, cancellationToken);
                    if (resp is null)
                    {
                        logLevel = LogLevel.Error;
                        resp = new ResponseDetail<string>
                        {
                            ResponseCode = "APIEX96",
                            ResponseMessage = "Empty response"
                        };
                        httpStatusCode = 400;
                    }
                    else
                    {
                        logLevel = LogLevel.Information;
                    }
                }
            }
            catch (Exception ex)
            {
                logLevel = LogLevel.Error;
                resp = new Response
                {
                    ResponseCode = "APIEX96",
                    ResponseMessage = ex.Message,
                };
                httpStatusCode = 500;
            }
            finally
            {
                _logger.Log(logLevel, "{@message}", new { MethodName = Request.Path.ToString(), Request = reqDat, Response = resp, RemoteIp = Request.HttpContext.Connection.RemoteIpAddress!.MapToIPv4().ToString() });
            }
            return StatusCode(httpStatusCode, resp);

        }


        [HttpPost("GetClientRelations")]
        public async Task<IActionResult> GetClientRelations([FromBody] InDataRequest<object?> reqDat, CancellationToken cancellationToken = default)
        {
            LogLevel logLevel = LogLevel.None;
            int httpStatusCode = 200;
            object? resp = null;
            try
            {
                if (reqDat is null)
                {
                    logLevel = LogLevel.Error;
                    resp = new ResponseDetail<string>
                    {
                        ResponseCode = "APIEX96",
                        ResponseMessage = "Empty or Invalid Body"
                    };
                    httpStatusCode = 400;
                }
                else
                {
                    string? requestJson = await Utils.GetRequestBody(Request);
                    //reqDat.RequestData = Regex.Unescape(JsonSerializer.Serialize(reqDat.RequestData));
                    requestJson = string.IsNullOrEmpty(requestJson) ? JsonSerializer.Serialize(reqDat) : requestJson;
                    requestJson = Regex.Unescape(requestJson);
                    resp = await _repoClientRelations.GetClientRelations(requestJson!, cancellationToken);
                    if (resp is null)
                    {
                        logLevel = LogLevel.Error;
                        resp = new ResponseDetail<string>
                        {
                            ResponseCode = "APIEX96",
                            ResponseMessage = "Empty response"
                        };
                        httpStatusCode = 400;
                    }
                    else
                    {
                        logLevel = LogLevel.Information;
                    }
                }
            }
            catch (Exception ex)
            {
                logLevel = LogLevel.Error;
                resp = new Response
                {
                    ResponseCode = "APIEX96",
                    ResponseMessage = ex.Message,
                };
            }
            finally
            {
                _logger.Log(logLevel, "{@message}", new { MethodName = Request.Path.ToString(), Request = reqDat, Response = resp, RemoteIp = Request.HttpContext.Connection.RemoteIpAddress!.MapToIPv4().ToString() });
            }
            return StatusCode(httpStatusCode, resp);

        }
        [HttpPost("CreateClientRelations")]
        public async Task<IActionResult> CreateClientRelations([FromBody] InDataRequest<ClientRelations?> reqDat, CancellationToken cancellationToken = default)
        {
            LogLevel logLevel = LogLevel.None;
            int httpStatusCode = 200;
            object? resp = null;
            try
            {
                if (reqDat is null)
                {
                    logLevel = LogLevel.Error;
                    resp = new ResponseDetail<string>
                    {
                        ResponseCode = "APIEX96",
                        ResponseMessage = "Empty Body"
                    };
                    httpStatusCode = 400;
                }
                else
                {
                    string? requestJson = await Utils.GetRequestBody(Request);
                    requestJson = string.IsNullOrEmpty(requestJson) ? JsonSerializer.Serialize(reqDat) : requestJson;
                    requestJson = Regex.Unescape(requestJson);
                    resp = await _repoClientRelations.CreateClientRelations(requestJson!, cancellationToken);
                    if (resp is null)
                    {
                        logLevel = LogLevel.Error;
                        resp = new ResponseDetail<string>
                        {
                            ResponseCode = "96",
                            ResponseMessage = "Empty response"
                        };
                        httpStatusCode = 400;
                    }
                    logLevel = LogLevel.Information;
                }
            }
            catch (Exception ex)
            {
                logLevel = LogLevel.Error;
                resp = new Response
                {
                    ResponseCode = "96",
                    ResponseMessage = ex.Message,
                };
            }
            finally
            {
                _logger.Log(logLevel, "{@message}", new { MethodName = Request.Path!.ToString(), Request = reqDat, Response = resp, RemoteIp = Request.HttpContext.Connection.RemoteIpAddress!.MapToIPv4().ToString() });
            }
            return StatusCode(httpStatusCode, resp);

        }
        [HttpPost("EditClientRelations")]
        public async Task<IActionResult> UpdateClientRelations([FromBody] InDataRequest<ClientRelations?> reqDat, CancellationToken cancellationToken = default)
        {
            LogLevel logLevel = LogLevel.None;
            int httpStatusCode = 200;
            object? resp = null;
            try
            {
                if (reqDat is null)
                {
                    logLevel = LogLevel.Error;
                    resp = new ResponseDetail<string>
                    {
                        ResponseCode = "APIEX96",
                        ResponseMessage = "Empty Body"
                    };
                    httpStatusCode = 400;
                }
                else
                {
                    string? requestJson = await Utils.GetRequestBody(Request);
                    requestJson = string.IsNullOrEmpty(requestJson) ? JsonSerializer.Serialize(reqDat) : requestJson;
                    requestJson = Regex.Unescape(requestJson);
                    resp = await _repoClientRelations.UpdateClientRelations(requestJson!, cancellationToken);
                    if (resp is null)
                    {
                        logLevel = LogLevel.Error;
                        resp = new ResponseDetail<string>
                        {
                            ResponseCode = "APIEX96",
                            ResponseMessage = "Empty response"
                        };
                        httpStatusCode = 400;
                    }
                    else
                    {
                        logLevel = LogLevel.Information;
                    }
                }
            }
            catch (Exception ex)
            {
                logLevel = LogLevel.Error;
                resp = new Response
                {
                    ResponseCode = "APIEX96",
                    ResponseMessage = ex.Message,
                };
                httpStatusCode = 500;
            }
            finally
            {
                _logger.Log(logLevel, "{@message}", new { MethodName = Request.Path.ToString(), Request = reqDat, Response = resp, RemoteIp = Request.HttpContext.Connection.RemoteIpAddress!.MapToIPv4().ToString() });
            }
            return StatusCode(httpStatusCode, resp);

        }


        [HttpPost("GetClientEmployment")]
        public async Task<IActionResult> GetClientEmployment([FromBody] InDataRequest<object?> reqDat, CancellationToken cancellationToken = default)
        {
            LogLevel logLevel = LogLevel.None;
            int httpStatusCode = 200;
            object? resp = null;
            try
            {
                if (reqDat is null)
                {
                    logLevel = LogLevel.Error;
                    resp = new ResponseDetail<string>
                    {
                        ResponseCode = "APIEX96",
                        ResponseMessage = "Empty or Invalid Body"
                    };
                    httpStatusCode = 400;
                }
                else
                {
                    string? requestJson = await Utils.GetRequestBody(Request);
                    //reqDat.RequestData = Regex.Unescape(JsonSerializer.Serialize(reqDat.RequestData));
                    requestJson = string.IsNullOrEmpty(requestJson) ? JsonSerializer.Serialize(reqDat) : requestJson;
                    requestJson = Regex.Unescape(requestJson);
                    resp = await _repoClientEmployment.GetClientEmployment(requestJson!, cancellationToken);
                    if (resp is null)
                    {
                        logLevel = LogLevel.Error;
                        resp = new ResponseDetail<string>
                        {
                            ResponseCode = "APIEX96",
                            ResponseMessage = "Empty response"
                        };
                        httpStatusCode = 400;
                    }
                    else
                    {
                        logLevel = LogLevel.Information;
                    }
                }
            }
            catch (Exception ex)
            {
                logLevel = LogLevel.Error;
                resp = new Response
                {
                    ResponseCode = "APIEX96",
                    ResponseMessage = ex.Message,
                };
            }
            finally
            {
                _logger.Log(logLevel, "{@message}", new { MethodName = Request.Path.ToString(), Request = reqDat, Response = resp, RemoteIp = Request.HttpContext.Connection.RemoteIpAddress!.MapToIPv4().ToString() });
            }
            return StatusCode(httpStatusCode, resp);

        }
        [HttpPost("CreateClientEmployment")]
        public async Task<IActionResult> CreateClientEmployment([FromBody] InDataRequest<ClientEmployment?> reqDat, CancellationToken cancellationToken = default)
        {
            LogLevel logLevel = LogLevel.None;
            int httpStatusCode = 200;
            object? resp = null;
            try
            {
                if (reqDat is null)
                {
                    logLevel = LogLevel.Error;
                    resp = new ResponseDetail<string>
                    {
                        ResponseCode = "APIEX96",
                        ResponseMessage = "Empty Body"
                    };
                    httpStatusCode = 400;
                }
                else
                {
                    string? requestJson = await Utils.GetRequestBody(Request);
                    requestJson = string.IsNullOrEmpty(requestJson) ? JsonSerializer.Serialize(reqDat) : requestJson;
                    requestJson = Regex.Unescape(requestJson);
                    resp = await _repoClientEmployment.CreateClientEmployment(requestJson!, cancellationToken);
                    if (resp is null)
                    {
                        logLevel = LogLevel.Error;
                        resp = new ResponseDetail<string>
                        {
                            ResponseCode = "96",
                            ResponseMessage = "Empty response"
                        };
                        httpStatusCode = 400;
                    }
                    logLevel = LogLevel.Information;
                }
            }
            catch (Exception ex)
            {
                logLevel = LogLevel.Error;
                resp = new Response
                {
                    ResponseCode = "96",
                    ResponseMessage = ex.Message,
                };
            }
            finally
            {
                _logger.Log(logLevel, "{@message}", new { MethodName = Request.Path!.ToString(), Request = reqDat, Response = resp, RemoteIp = Request.HttpContext.Connection.RemoteIpAddress!.MapToIPv4().ToString() });
            }
            return StatusCode(httpStatusCode, resp);

        }
        [HttpPost("EditClientEmployment")]
        public async Task<IActionResult> UpdateClientEmployment([FromBody] InDataRequest<ClientEmployment?> reqDat, CancellationToken cancellationToken = default)
        {
            LogLevel logLevel = LogLevel.None;
            int httpStatusCode = 200;
            object? resp = null;
            try
            {
                if (reqDat is null)
                {
                    logLevel = LogLevel.Error;
                    resp = new ResponseDetail<string>
                    {
                        ResponseCode = "APIEX96",
                        ResponseMessage = "Empty Body"
                    };
                    httpStatusCode = 400;
                }
                else
                {
                    string? requestJson = await Utils.GetRequestBody(Request);
                    requestJson = string.IsNullOrEmpty(requestJson) ? JsonSerializer.Serialize(reqDat) : requestJson;
                    requestJson = Regex.Unescape(requestJson);
                    resp = await _repoClientEmployment.UpdateClientEmployment(requestJson!, cancellationToken);
                    if (resp is null)
                    {
                        logLevel = LogLevel.Error;
                        resp = new ResponseDetail<string>
                        {
                            ResponseCode = "APIEX96",
                            ResponseMessage = "Empty response"
                        };
                        httpStatusCode = 400;
                    }
                    else
                    {
                        logLevel = LogLevel.Information;
                    }
                }
            }
            catch (Exception ex)
            {
                logLevel = LogLevel.Error;
                resp = new Response
                {
                    ResponseCode = "APIEX96",
                    ResponseMessage = ex.Message,
                };
                httpStatusCode = 500;
            }
            finally
            {
                _logger.Log(logLevel, "{@message}", new { MethodName = Request.Path.ToString(), Request = reqDat, Response = resp, RemoteIp = Request.HttpContext.Connection.RemoteIpAddress!.MapToIPv4().ToString() });
            }
            return StatusCode(httpStatusCode, resp);

        }


        [HttpPost("GetClientIndividual")]
        public async Task<IActionResult> GetClientIndividual([FromBody] InDataRequest<object?> reqDat, CancellationToken cancellationToken = default)
        {
            LogLevel logLevel = LogLevel.None;
            int httpStatusCode = 200;
            object? resp = null;
            try
            {
                if (reqDat is null)
                {
                    logLevel = LogLevel.Error;
                    resp = new ResponseDetail<string>
                    {
                        ResponseCode = "APIEX96",
                        ResponseMessage = "Empty or Invalid Body"
                    };
                    httpStatusCode = 400;
                }
                else
                {
                    string? requestJson = await Utils.GetRequestBody(Request);
                    //reqDat.RequestData = Regex.Unescape(JsonSerializer.Serialize(reqDat.RequestData));
                    requestJson = string.IsNullOrEmpty(requestJson) ? JsonSerializer.Serialize(reqDat) : requestJson;
                    requestJson = Regex.Unescape(requestJson);
                    resp = await _repoClientIndividual.GetClientIndividual(requestJson!, cancellationToken);
                    if (resp is null)
                    {
                        logLevel = LogLevel.Error;
                        resp = new ResponseDetail<string>
                        {
                            ResponseCode = "APIEX96",
                            ResponseMessage = "Empty response"
                        };
                        httpStatusCode = 400;
                    }
                    else
                    {
                        logLevel = LogLevel.Information;
                    }
                }
            }
            catch (Exception ex)
            {
                logLevel = LogLevel.Error;
                resp = new Response
                {
                    ResponseCode = "APIEX96",
                    ResponseMessage = ex.Message,
                };
            }
            finally
            {
                _logger.Log(logLevel, "{@message}", new { MethodName = Request.Path.ToString(), Request = reqDat, Response = resp, RemoteIp = Request.HttpContext.Connection.RemoteIpAddress!.MapToIPv4().ToString() });
            }
            return StatusCode(httpStatusCode, resp);

        }
        [HttpPost("CreateClientIndividual")]
        public async Task<IActionResult> CreateClientIndividual([FromBody] InDataRequest<ClientIndividual?> reqDat, CancellationToken cancellationToken = default)
        {
            LogLevel logLevel = LogLevel.None;
            int httpStatusCode = 200;
            object? resp = null;
            try
            {
                if (reqDat is null)
                {
                    logLevel = LogLevel.Error;
                    resp = new ResponseDetail<string>
                    {
                        ResponseCode = "APIEX96",
                        ResponseMessage = "Empty Body"
                    };
                    httpStatusCode = 400;
                }
                else
                {
                    string? requestJson = await Utils.GetRequestBody(Request);
                    requestJson = string.IsNullOrEmpty(requestJson) ? JsonSerializer.Serialize(reqDat) : requestJson;
                    requestJson = Regex.Unescape(requestJson);
                    resp = await _repoClientIndividual.CreateClientIndividual(requestJson!, cancellationToken);
                    if (resp is null)
                    {
                        logLevel = LogLevel.Error;
                        resp = new ResponseDetail<string>
                        {
                            ResponseCode = "96",
                            ResponseMessage = "Empty response"
                        };
                        httpStatusCode = 400;
                    }
                    logLevel = LogLevel.Information;
                }
            }
            catch (Exception ex)
            {
                logLevel = LogLevel.Error;
                resp = new Response
                {
                    ResponseCode = "96",
                    ResponseMessage = ex.Message,
                };
            }
            finally
            {
                _logger.Log(logLevel, "{@message}", new { MethodName = Request.Path!.ToString(), Request = reqDat, Response = resp, RemoteIp = Request.HttpContext.Connection.RemoteIpAddress!.MapToIPv4().ToString() });
            }
            return StatusCode(httpStatusCode, resp);

        }
        [HttpPost("EditClientIndividual")]
        public async Task<IActionResult> UpdateClientIndividual([FromBody] InDataRequest<ClientIndividual?> reqDat, CancellationToken cancellationToken = default)
        {
            LogLevel logLevel = LogLevel.None;
            int httpStatusCode = 200;
            object? resp = null;
            try
            {
                if (reqDat is null)
                {
                    logLevel = LogLevel.Error;
                    resp = new ResponseDetail<string>
                    {
                        ResponseCode = "APIEX96",
                        ResponseMessage = "Empty Body"
                    };
                    httpStatusCode = 400;
                }
                else
                {
                    string? requestJson = await Utils.GetRequestBody(Request);
                    requestJson = string.IsNullOrEmpty(requestJson) ? JsonSerializer.Serialize(reqDat) : requestJson;
                    requestJson = Regex.Unescape(requestJson);
                    resp = await _repoClientIndividual.UpdateClientIndividual(requestJson!, cancellationToken);
                    if (resp is null)
                    {
                        logLevel = LogLevel.Error;
                        resp = new ResponseDetail<string>
                        {
                            ResponseCode = "APIEX96",
                            ResponseMessage = "Empty response"
                        };
                        httpStatusCode = 400;
                    }
                    else
                    {
                        logLevel = LogLevel.Information;
                    }
                }
            }
            catch (Exception ex)
            {
                logLevel = LogLevel.Error;
                resp = new Response
                {
                    ResponseCode = "APIEX96",
                    ResponseMessage = ex.Message,
                };
                httpStatusCode = 500;
            }
            finally
            {
                _logger.Log(logLevel, "{@message}", new { MethodName = Request.Path.ToString(), Request = reqDat, Response = resp, RemoteIp = Request.HttpContext.Connection.RemoteIpAddress!.MapToIPv4().ToString() });
            }
            return StatusCode(httpStatusCode, resp);

        }



        [HttpPost("GetClientCorporate")]
        public async Task<IActionResult> GetClientCorporate([FromBody] InDataRequest<object?> reqDat, CancellationToken cancellationToken = default)
        {
            LogLevel logLevel = LogLevel.None;
            int httpStatusCode = 200;
            object? resp = null;
            try
            {
                if (reqDat is null)
                {
                    logLevel = LogLevel.Error;
                    resp = new ResponseDetail<string>
                    {
                        ResponseCode = "APIEX96",
                        ResponseMessage = "Empty or Invalid Body"
                    };
                    httpStatusCode = 400;
                }
                else
                {
                    string? requestJson = await Utils.GetRequestBody(Request);
                    //reqDat.RequestData = Regex.Unescape(JsonSerializer.Serialize(reqDat.RequestData));
                    requestJson = string.IsNullOrEmpty(requestJson) ? JsonSerializer.Serialize(reqDat) : requestJson;
                    requestJson = Regex.Unescape(requestJson);
                    resp = await _repoClientCorporate.GetClientCorporate(requestJson!, cancellationToken);
                    if (resp is null)
                    {
                        logLevel = LogLevel.Error;
                        resp = new ResponseDetail<string>
                        {
                            ResponseCode = "APIEX96",
                            ResponseMessage = "Empty response"
                        };
                        httpStatusCode = 400;
                    }
                    else
                    {
                        logLevel = LogLevel.Information;
                    }
                }
            }
            catch (Exception ex)
            {
                logLevel = LogLevel.Error;
                resp = new Response
                {
                    ResponseCode = "APIEX96",
                    ResponseMessage = ex.Message,
                };
            }
            finally
            {
                _logger.Log(logLevel, "{@message}", new { MethodName = Request.Path.ToString(), Request = reqDat, Response = resp, RemoteIp = Request.HttpContext.Connection.RemoteIpAddress!.MapToIPv4().ToString() });
            }
            return StatusCode(httpStatusCode, resp);

        }
        [HttpPost("CreateClientCorporate")]
        public async Task<IActionResult> CreateClientCorporate([FromBody] InDataRequest<ClientCorporate?> reqDat, CancellationToken cancellationToken = default)
        {
            LogLevel logLevel = LogLevel.None;
            int httpStatusCode = 200;
            object? resp = null;
            try
            {
                if (reqDat is null)
                {
                    logLevel = LogLevel.Error;
                    resp = new ResponseDetail<string>
                    {
                        ResponseCode = "APIEX96",
                        ResponseMessage = "Empty Body"
                    };
                    httpStatusCode = 400;
                }
                else
                {
                    string? requestJson = await Utils.GetRequestBody(Request);
                    requestJson = string.IsNullOrEmpty(requestJson) ? JsonSerializer.Serialize(reqDat) : requestJson;
                    requestJson = Regex.Unescape(requestJson);
                    resp = await _repoClientCorporate.CreateClientCorporate(requestJson!, cancellationToken);
                    if (resp is null)
                    {
                        logLevel = LogLevel.Error;
                        resp = new ResponseDetail<string>
                        {
                            ResponseCode = "96",
                            ResponseMessage = "Empty response"
                        };
                        httpStatusCode = 400;
                    }
                    logLevel = LogLevel.Information;
                }
            }
            catch (Exception ex)
            {
                logLevel = LogLevel.Error;
                resp = new Response
                {
                    ResponseCode = "96",
                    ResponseMessage = ex.Message,
                };
            }
            finally
            {
                _logger.Log(logLevel, "{@message}", new { MethodName = Request.Path!.ToString(), Request = reqDat, Response = resp, RemoteIp = Request.HttpContext.Connection.RemoteIpAddress!.MapToIPv4().ToString() });
            }
            return StatusCode(httpStatusCode, resp);

        }
        [HttpPost("EditClientCorporate")]
        public async Task<IActionResult> UpdateClientCorporate([FromBody] InDataRequest<ClientCorporate?> reqDat, CancellationToken cancellationToken = default)
        {
            LogLevel logLevel = LogLevel.None;
            int httpStatusCode = 200;
            object? resp = null;
            try
            {
                if (reqDat is null)
                {
                    logLevel = LogLevel.Error;
                    resp = new ResponseDetail<string>
                    {
                        ResponseCode = "APIEX96",
                        ResponseMessage = "Empty Body"
                    };
                    httpStatusCode = 400;
                }
                else
                {
                    string? requestJson = await Utils.GetRequestBody(Request);
                    requestJson = string.IsNullOrEmpty(requestJson) ? JsonSerializer.Serialize(reqDat) : requestJson;
                    requestJson = Regex.Unescape(requestJson);
                    resp = await _repoClientCorporate.UpdateClientCorporate(requestJson!, cancellationToken);
                    if (resp is null)
                    {
                        logLevel = LogLevel.Error;
                        resp = new ResponseDetail<string>
                        {
                            ResponseCode = "APIEX96",
                            ResponseMessage = "Empty response"
                        };
                        httpStatusCode = 400;
                    }
                    else
                    {
                        logLevel = LogLevel.Information;
                    }
                }
            }
            catch (Exception ex)
            {
                logLevel = LogLevel.Error;
                resp = new Response
                {
                    ResponseCode = "APIEX96",
                    ResponseMessage = ex.Message,
                };
                httpStatusCode = 500;
            }
            finally
            {
                _logger.Log(logLevel, "{@message}", new { MethodName = Request.Path.ToString(), Request = reqDat, Response = resp, RemoteIp = Request.HttpContext.Connection.RemoteIpAddress!.MapToIPv4().ToString() });
            }
            return StatusCode(httpStatusCode, resp);

        }

        [HttpPost("GetClientProductAndServices")]
        public async Task<IActionResult> GetClientProductAndServices([FromBody] InDataRequest<object?> reqDat, CancellationToken cancellationToken = default)
        {
            LogLevel logLevel = LogLevel.None;
            int httpStatusCode = 200;
            object? resp = null;
            try
            {
                if (reqDat is null)
                {
                    logLevel = LogLevel.Error;
                    resp = new ResponseDetail<string>
                    {
                        ResponseCode = "APIEX96",
                        ResponseMessage = "Empty or Invalid Body"
                    };
                    httpStatusCode = 400;
                }
                else
                {
                    string? requestJson = await Utils.GetRequestBody(Request);
                    requestJson = string.IsNullOrEmpty(requestJson) ? JsonSerializer.Serialize(reqDat) : requestJson;
                    requestJson = Regex.Unescape(requestJson);
                    resp = await _repoClientProductAndServices.GetClientProductAndServices(requestJson!, cancellationToken);
                    if (resp is null)
                    {
                        logLevel = LogLevel.Error;
                        resp = new ResponseDetail<string>
                        {
                            ResponseCode = "APIEX96",
                            ResponseMessage = "Empty response"
                        };
                        httpStatusCode = 400;
                    }
                    else
                    {
                        logLevel = LogLevel.Information;
                    }
                }
            }
            catch (Exception ex)
            {
                logLevel = LogLevel.Error;
                resp = new Response
                {
                    ResponseCode = "APIEX96",
                    ResponseMessage = ex.Message,
                };
            }
            finally
            {
                _logger.Log(logLevel, "{@message}", new { MethodName = Request.Path.ToString(), Request = reqDat, Response = resp, RemoteIp = Request.HttpContext.Connection.RemoteIpAddress!.MapToIPv4().ToString() });
            }
            return StatusCode(httpStatusCode, resp);

        }

        [HttpPost("GetClientOtherDetails")]
        public async Task<IActionResult> GetClientOtherDetails([FromBody] InDataRequest<object?> reqDat, CancellationToken cancellationToken = default)
        {
            LogLevel logLevel = LogLevel.None;
            int httpStatusCode = 200;
            object? resp = null;
            try
            {
                if (reqDat is null)
                {
                    logLevel = LogLevel.Error;
                    resp = new ResponseDetail<string>
                    {
                        ResponseCode = "APIEX96",
                        ResponseMessage = "Empty or Invalid Body"
                    };
                    httpStatusCode = 400;
                }
                else
                {
                    string? requestJson = await Utils.GetRequestBody(Request);
                    requestJson = string.IsNullOrEmpty(requestJson) ? JsonSerializer.Serialize(reqDat) : requestJson;
                    requestJson = Regex.Unescape(requestJson);
                    resp = await _repoClientOtherDetails.GetClientOtherDetails(requestJson!, cancellationToken);
                    if (resp is null)
                    {
                        logLevel = LogLevel.Error;
                        resp = new ResponseDetail<string>
                        {
                            ResponseCode = "APIEX96",
                            ResponseMessage = "Empty response"
                        };
                        httpStatusCode = 400;
                    }
                    else
                    {
                        logLevel = LogLevel.Information;
                    }
                }
            }
            catch (Exception ex)
            {
                logLevel = LogLevel.Error;
                resp = new Response
                {
                    ResponseCode = "APIEX96",
                    ResponseMessage = ex.Message,
                };
            }
            finally
            {
                _logger.Log(logLevel, "{@message}", new { MethodName = Request.Path.ToString(), Request = reqDat, Response = resp, RemoteIp = Request.HttpContext.Connection.RemoteIpAddress!.MapToIPv4().ToString() });
            }
            return StatusCode(httpStatusCode, resp);

        }

        [HttpPost("GetClientSpecialOffers")]
        public async Task<IActionResult> GetClientSpecialOffers([FromBody] InDataRequest<object?> reqDat, CancellationToken cancellationToken = default)
        {
            LogLevel logLevel = LogLevel.None;
            int httpStatusCode = 200;
            object? resp = null;
            try
            {
                if (reqDat is null)
                {
                    logLevel = LogLevel.Error;
                    resp = new ResponseDetail<string>
                    {
                        ResponseCode = "APIEX96",
                        ResponseMessage = "Empty or Invalid Body"
                    };
                    httpStatusCode = 400;
                }
                else
                {
                    string? requestJson = await Utils.GetRequestBody(Request);
                    requestJson = string.IsNullOrEmpty(requestJson) ? JsonSerializer.Serialize(reqDat) : requestJson;
                    requestJson = Regex.Unescape(requestJson);
                    resp = await _repoClientSpecialOffers.GetClientSpecialOffers(requestJson!, cancellationToken);
                    if (resp is null)
                    {
                        logLevel = LogLevel.Error;
                        resp = new ResponseDetail<string>
                        {
                            ResponseCode = "APIEX96",
                            ResponseMessage = "Empty response"
                        };
                        httpStatusCode = 400;
                    }
                    else
                    {
                        logLevel = LogLevel.Information;
                    }
                }
            }
            catch (Exception ex)
            {
                logLevel = LogLevel.Error;
                resp = new Response
                {
                    ResponseCode = "APIEX96",
                    ResponseMessage = ex.Message,
                };
            }
            finally
            {
                _logger.Log(logLevel, "{@message}", new { MethodName = Request.Path.ToString(), Request = reqDat, Response = resp, RemoteIp = Request.HttpContext.Connection.RemoteIpAddress!.MapToIPv4().ToString() });
            }
            return StatusCode(httpStatusCode, resp);

        }

        [HttpPost("CreateClientProductAndServices")]
        public async Task<IActionResult> CreateClientProductAndServices([FromBody] InDataRequest<object?> reqDat, CancellationToken cancellationToken = default)
        {
            LogLevel logLevel = LogLevel.None;
            int httpStatusCode = 200;
            object? resp = null;
            try
            {
                if (reqDat is null)
                {
                    logLevel = LogLevel.Error;
                    resp = new ResponseDetail<string>
                    {
                        ResponseCode = "APIEX96",
                        ResponseMessage = "Empty Body"
                    };
                    httpStatusCode = 400;
                }
                else
                {
                    string? requestJson = await Utils.GetRequestBody(Request);
                    requestJson = string.IsNullOrEmpty(requestJson) ? JsonSerializer.Serialize(reqDat) : requestJson;
                    requestJson = Regex.Unescape(requestJson);
                    resp = await _repoClientProductAndServices.CreateClientProductAndServices(requestJson!, cancellationToken);
                    if (resp is null)
                    {
                        logLevel = LogLevel.Error;
                        resp = new ResponseDetail<string>
                        {
                            ResponseCode = "96",
                            ResponseMessage = "Empty response"
                        };
                        httpStatusCode = 400;
                    }
                    logLevel = LogLevel.Information;
                }
            }
            catch (Exception ex)
            {
                logLevel = LogLevel.Error;
                resp = new Response
                {
                    ResponseCode = "96",
                    ResponseMessage = ex.Message,
                };
            }
            finally
            {
                _logger.Log(logLevel, "{@message}", new { MethodName = Request.Path!.ToString(), Request = reqDat, Response = resp, RemoteIp = Request.HttpContext.Connection.RemoteIpAddress!.MapToIPv4().ToString() });
            }
            return StatusCode(httpStatusCode, resp);

        }

        [HttpPost("EditClientProductAndServices")]
        public async Task<IActionResult> UpdateClientProductAndServices([FromBody] InDataRequest<object?> reqDat, CancellationToken cancellationToken = default)
        {
            LogLevel logLevel = LogLevel.None;
            int httpStatusCode = 200;
            object? resp = null;
            try
            {
                if (reqDat is null)
                {
                    logLevel = LogLevel.Error;
                    resp = new ResponseDetail<string>
                    {
                        ResponseCode = "APIEX96",
                        ResponseMessage = "Empty Body"
                    };
                    httpStatusCode = 400;
                }
                else
                {
                    string? requestJson = await Utils.GetRequestBody(Request);
                    requestJson = string.IsNullOrEmpty(requestJson) ? JsonSerializer.Serialize(reqDat) : requestJson;
                    requestJson = Regex.Unescape(requestJson);
                    resp = await _repoClientProductAndServices.UpdateClientProductAndServices(requestJson!, cancellationToken);
                    if (resp is null)
                    {
                        logLevel = LogLevel.Error;
                        resp = new ResponseDetail<string>
                        {
                            ResponseCode = "APIEX96",
                            ResponseMessage = "Empty response"
                        };
                        httpStatusCode = 400;
                    }
                    else
                    {
                        logLevel = LogLevel.Information;
                    }
                }
            }
            catch (Exception ex)
            {
                logLevel = LogLevel.Error;
                resp = new Response
                {
                    ResponseCode = "APIEX96",
                    ResponseMessage = ex.Message,
                };
                httpStatusCode = 500;
            }
            finally
            {
                _logger.Log(logLevel, "{@message}", new { MethodName = Request.Path.ToString(), Request = reqDat, Response = resp, RemoteIp = Request.HttpContext.Connection.RemoteIpAddress!.MapToIPv4().ToString() });
            }
            return StatusCode(httpStatusCode, resp);

        }

        [HttpPost("CreateClientOtherDetails")]
        public async Task<IActionResult> CreateClientOtherDetails([FromBody] InDataRequest<object?> reqDat, CancellationToken cancellationToken = default)
        {
            LogLevel logLevel = LogLevel.None;
            int httpStatusCode = 200;
            object? resp = null;
            try
            {
                if (reqDat is null)
                {
                    logLevel = LogLevel.Error;
                    resp = new ResponseDetail<string>
                    {
                        ResponseCode = "APIEX96",
                        ResponseMessage = "Empty Body"
                    };
                    httpStatusCode = 400;
                }
                else
                {
                    string? requestJson = await Utils.GetRequestBody(Request);
                    requestJson = string.IsNullOrEmpty(requestJson) ? JsonSerializer.Serialize(reqDat) : requestJson;
                    requestJson = Regex.Unescape(requestJson);
                    resp = await _repoClientOtherDetails.CreateClientOtherDetails(requestJson!, cancellationToken);
                    if (resp is null)
                    {
                        logLevel = LogLevel.Error;
                        resp = new ResponseDetail<string>
                        {
                            ResponseCode = "96",
                            ResponseMessage = "Empty response"
                        };
                        httpStatusCode = 400;
                    }
                    logLevel = LogLevel.Information;
                }
            }
            catch (Exception ex)
            {
                logLevel = LogLevel.Error;
                resp = new Response
                {
                    ResponseCode = "96",
                    ResponseMessage = ex.Message,
                };
            }
            finally
            {
                _logger.Log(logLevel, "{@message}", new { MethodName = Request.Path!.ToString(), Request = reqDat, Response = resp, RemoteIp = Request.HttpContext.Connection.RemoteIpAddress!.MapToIPv4().ToString() });
            }
            return StatusCode(httpStatusCode, resp);

        }

        [HttpPost("EditClientOtherDetails")]
        public async Task<IActionResult> UpdateClientOtherDetails([FromBody] InDataRequest<object?> reqDat, CancellationToken cancellationToken = default)
        {
            LogLevel logLevel = LogLevel.None;
            int httpStatusCode = 200;
            object? resp = null;
            try
            {
                if (reqDat is null)
                {
                    logLevel = LogLevel.Error;
                    resp = new ResponseDetail<string>
                    {
                        ResponseCode = "APIEX96",
                        ResponseMessage = "Empty Body"
                    };
                    httpStatusCode = 400;
                }
                else
                {
                    string? requestJson = await Utils.GetRequestBody(Request);
                    requestJson = string.IsNullOrEmpty(requestJson) ? JsonSerializer.Serialize(reqDat) : requestJson;
                    requestJson = Regex.Unescape(requestJson);
                    resp = await _repoClientOtherDetails.UpdateClientOtherDetails(requestJson!, cancellationToken);
                    if (resp is null)
                    {
                        logLevel = LogLevel.Error;
                        resp = new ResponseDetail<string>
                        {
                            ResponseCode = "APIEX96",
                            ResponseMessage = "Empty response"
                        };
                        httpStatusCode = 400;
                    }
                    else
                    {
                        logLevel = LogLevel.Information;
                    }
                }
            }
            catch (Exception ex)
            {
                logLevel = LogLevel.Error;
                resp = new Response
                {
                    ResponseCode = "APIEX96",
                    ResponseMessage = ex.Message,
                };
                httpStatusCode = 500;
            }
            finally
            {
                _logger.Log(logLevel, "{@message}", new { MethodName = Request.Path.ToString(), Request = reqDat, Response = resp, RemoteIp = Request.HttpContext.Connection.RemoteIpAddress!.MapToIPv4().ToString() });
            }
            return StatusCode(httpStatusCode, resp);

        }

        [HttpPost("CreateClientSpecialOffers")]
        public async Task<IActionResult> CreateClientSpecialOffers([FromBody] InDataRequest<object?> reqDat, CancellationToken cancellationToken = default)
        {
            LogLevel logLevel = LogLevel.None;
            int httpStatusCode = 200;
            object? resp = null;
            try
            {
                if (reqDat is null)
                {
                    logLevel = LogLevel.Error;
                    resp = new ResponseDetail<string>
                    {
                        ResponseCode = "APIEX96",
                        ResponseMessage = "Empty Body"
                    };
                    httpStatusCode = 400;
                }
                else
                {
                    string? requestJson = await Utils.GetRequestBody(Request);
                    requestJson = string.IsNullOrEmpty(requestJson) ? JsonSerializer.Serialize(reqDat) : requestJson;
                    requestJson = Regex.Unescape(requestJson);
                    resp = await _repoClientSpecialOffers.CreateClientSpecialOffers(requestJson!, cancellationToken);
                    if (resp is null)
                    {
                        logLevel = LogLevel.Error;
                        resp = new ResponseDetail<string>
                        {
                            ResponseCode = "96",
                            ResponseMessage = "Empty response"
                        };
                        httpStatusCode = 400;
                    }
                    logLevel = LogLevel.Information;
                }
            }
            catch (Exception ex)
            {
                logLevel = LogLevel.Error;
                resp = new Response
                {
                    ResponseCode = "96",
                    ResponseMessage = ex.Message,
                };
            }
            finally
            {
                _logger.Log(logLevel, "{@message}", new { MethodName = Request.Path!.ToString(), Request = reqDat, Response = resp, RemoteIp = Request.HttpContext.Connection.RemoteIpAddress!.MapToIPv4().ToString() });
            }
            return StatusCode(httpStatusCode, resp);

        }

        [HttpPost("EditClientSpecialOffers")]
        public async Task<IActionResult> UpdateClientSpecialOffers([FromBody] InDataRequest<object?> reqDat, CancellationToken cancellationToken = default)
        {
            LogLevel logLevel = LogLevel.None;
            int httpStatusCode = 200;
            object? resp = null;
            try
            {
                if (reqDat is null)
                {
                    logLevel = LogLevel.Error;
                    resp = new ResponseDetail<string>
                    {
                        ResponseCode = "APIEX96",
                        ResponseMessage = "Empty Body"
                    };
                    httpStatusCode = 400;
                }
                else
                {
                    string? requestJson = await Utils.GetRequestBody(Request);
                    requestJson = string.IsNullOrEmpty(requestJson) ? JsonSerializer.Serialize(reqDat) : requestJson;
                    requestJson = Regex.Unescape(requestJson);
                    resp = await _repoClientSpecialOffers.UpdateClientSpecialOffers(requestJson!, cancellationToken);
                    if (resp is null)
                    {
                        logLevel = LogLevel.Error;
                        resp = new ResponseDetail<string>
                        {
                            ResponseCode = "APIEX96",
                            ResponseMessage = "Empty response"
                        };
                        httpStatusCode = 400;
                    }
                    else
                    {
                        logLevel = LogLevel.Information;
                    }
                }
            }
            catch (Exception ex)
            {
                logLevel = LogLevel.Error;
                resp = new Response
                {
                    ResponseCode = "APIEX96",
                    ResponseMessage = ex.Message,
                };
                httpStatusCode = 500;
            }
            finally
            {
                _logger.Log(logLevel, "{@message}", new { MethodName = Request.Path.ToString(), Request = reqDat, Response = resp, RemoteIp = Request.HttpContext.Connection.RemoteIpAddress!.MapToIPv4().ToString() });
            }
            return StatusCode(httpStatusCode, resp);

        }
    }
}


