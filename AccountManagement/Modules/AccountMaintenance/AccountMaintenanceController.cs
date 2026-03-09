using Asp.Versioning;
using CBS.Entities.Common;
using AccountManagement.Helpers;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace AccountManagement.Modules.AccountMaintenance
{
    [Route("api/v{version:apiVersion}/[controller]")]
    [ApiController]
    [ApiVersion(1.0)]
    public class AccountMaintenanceController : ControllerBase
    {
        private readonly ILogger<AccountMaintenanceController> _logger;
        private readonly IAccountRepo _repo;
        public AccountMaintenanceController(ILogger<AccountMaintenanceController> logger, IAccountRepo repo)
        {
            _logger = logger;
            _repo = repo;
        }

        //    [HttpPost("ExecuteProcedure")]
        //    public async Task<IActionResult> ExecuteProcedure([FromBody] InData reqDat, CancellationToken cancellationToken = default)
        //    {
        //        LogLevel logLevel = LogLevel.None;
        //        int httpStatusCode = 200;
        //        object? resp = null;
        //        try
        //        {
        //            if (reqDat is null || Utils.IsValidJson(Convert.ToString(reqDat.RequestData)!) == false)
        //            {
        //                logLevel = LogLevel.Error;
        //                resp = new ResponseDetail<string>
        //                {
        //                    ResponseCode = "APIEX96",
        //                    ResponseMessage = "Empty or Invalid Body"
        //                };
        //                httpStatusCode = 400;
        //            }
        //            else
        //            {
        //                string? requestJson = await Utils.GetRequestBody(Request);
        //                requestJson = string.IsNullOrEmpty(requestJson) ? JsonSerializer.Serialize(reqDat) : requestJson;
        //                requestJson = Regex.Unescape(requestJson);
        //                resp = await _repo.ExecuteProcedure(requestJson!, cancellationToken);
        //                if (resp is null)
        //                {
        //                    logLevel = LogLevel.Error;
        //                    resp = new ResponseDetail<string>
        //                    {
        //                        ResponseCode = "APIEX96",
        //                        ResponseMessage = "Empty response"
        //                    };
        //                    httpStatusCode = 400;
        //                }
        //                else
        //                {
        //                    logLevel = LogLevel.Information;
        //                }
        //            }
        //        }
        //        catch (Exception ex)
        //        {
        //            logLevel = LogLevel.Error;
        //            resp = new Response
        //            {
        //                ResponseCode = "APIEX96",
        //                ResponseMessage = ex.Message,
        //            };
        //        }
        //        finally
        //        {
        //            _logger.Log(logLevel, "{@message}", new { MethodName = "ExecuteProcedure", Request = reqDat, Response = resp, RemoteIp = Request.HttpContext.Connection.RemoteIpAddress!.MapToIPv4().ToString() });
        //        }
        //        return StatusCode(httpStatusCode, resp);
        //    }

        [HttpPost("GetAccount")]
        public async Task<IActionResult> GetAccount([FromBody] CBS.Entities.Common.InData reqDat, CancellationToken cancellationToken = default)
        {
            LogLevel logLevel = LogLevel.None;
            int httpStatusCode = 200;
            object? resp = null;
            try
            {
                if (reqDat is null || AccountManagement.Helpers.Utils.IsValidJson(Convert.ToString(reqDat.RequestData)!) == false)
                {
                    logLevel = LogLevel.Error;
                    resp = new CBS.Entities.Common.ResponseDetail<string>
                    {
                        ResponseCode = "APIEX96",
                        ResponseMessage = "Empty or Invalid Body"
                    };
                    httpStatusCode = 400;
                }
                else
                {
                    string? requestJson = await AccountManagement.Helpers.Utils.GetRequestBody(Request);
                    requestJson = string.IsNullOrEmpty(requestJson) ? JsonSerializer.Serialize(reqDat) : requestJson;
                    requestJson = Regex.Unescape(requestJson);
                    resp = await _repo.GetAccount(requestJson!, cancellationToken);
                    if (resp is null)
                    {
                        logLevel = LogLevel.Error;
                        resp = new CBS.Entities.Common.ResponseDetail<string>
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
                resp = new CBS.Entities.Common.Response
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
        [HttpPost("CreateAccount")]
        public async Task<IActionResult> CreateAccount([FromBody] CBS.Entities.Common.InData reqDat, CancellationToken cancellationToken = default)
        {
            LogLevel logLevel = LogLevel.None;
            int httpStatusCode = 200;
            object? resp = null;
            try
            {
                if (reqDat is null || AccountManagement.Helpers.Utils.IsValidJson(Convert.ToString(reqDat.RequestData)!) == false)
                {
                    logLevel = LogLevel.Error;
                    resp = new CBS.Entities.Common.ResponseDetail<string>
                    {
                        ResponseCode = "APIEX96",
                        ResponseMessage = "Empty Body"
                    };
                    httpStatusCode = 400;
                }
                else
                {
                    string? requestJson = await AccountManagement.Helpers.Utils.GetRequestBody(Request);
                    requestJson = string.IsNullOrEmpty(requestJson) ? JsonSerializer.Serialize(reqDat) : requestJson;
                    requestJson = Regex.Unescape(requestJson);
                    resp = await _repo.CreateAccount(requestJson!, cancellationToken);
                    if (resp is null)
                    {
                        logLevel = LogLevel.Error;
                        resp = new CBS.Entities.Common.ResponseDetail<string>
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
                resp = new CBS.Entities.Common.Response
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
        [HttpPost("EditAccount")]
        public async Task<IActionResult> UpdateAccount([FromBody] CBS.Entities.Common.InData reqDat, CancellationToken cancellationToken = default)
        {
            LogLevel logLevel = LogLevel.None;
            int httpStatusCode = 200;
            object? resp = null;
            try
            {
                if (reqDat is null || AccountManagement.Helpers.Utils.IsValidJson(Convert.ToString(reqDat.RequestData)!) == false)
                {
                    logLevel = LogLevel.Error;
                    resp = new CBS.Entities.Common.ResponseDetail<string>
                    {
                        ResponseCode = "APIEX96",
                        ResponseMessage = "Empty Body"
                    };
                    httpStatusCode = 400;
                }
                else
                {
                    string? requestJson = await AccountManagement.Helpers.Utils.GetRequestBody(Request);
                    requestJson = string.IsNullOrEmpty(requestJson) ? JsonSerializer.Serialize(reqDat) : requestJson;
                    requestJson = Regex.Unescape(requestJson);
                    resp = await _repo.UpdateAccount(requestJson!, cancellationToken);
                    if (resp is null)
                    {
                        logLevel = LogLevel.Error;
                        resp = new CBS.Entities.Common.ResponseDetail<string>
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
                resp = new CBS.Entities.Common.Response
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

        [HttpPost("AddAccountDocument")]
        public async Task<IActionResult> AddAccountDocument([FromBody] InData reqDat, CancellationToken cancellationToken = default)
        {
            return await HandleRequest(reqDat, _repo.AddAccountDocument, "AddAccountDocument", cancellationToken);
        }

        [HttpPost("UpdateAccountDocument")]
        public async Task<IActionResult> UpdateAccountDocument([FromBody] InData reqDat, CancellationToken cancellationToken = default)
        {
            return await HandleRequest(reqDat, _repo.UpdateAccountDocument, "UpdateAccountDocument", cancellationToken);
        }

        [HttpPost("GetAccountDocument")]
        public async Task<IActionResult> GetAccountDocument([FromBody] InData reqDat, CancellationToken cancellationToken = default)
        {
            return await HandleRequest(reqDat, _repo.GetAccountDocument, "GetAccountDocument", cancellationToken);
        }

        [HttpPost("DeleteAccountDocument")]
        public async Task<IActionResult> DeleteAccountDocument([FromBody] InData reqDat, CancellationToken cancellationToken = default)
        {
            return await HandleRequest(reqDat, _repo.DeleteAccountDocument, "DeleteAccountDocument", cancellationToken);
        }

        [HttpPost("AddAccountSweeping")]
        public async Task<IActionResult> AddAccountSweeping([FromBody] InData reqDat, CancellationToken cancellationToken = default)
        {
            return await HandleRequest(reqDat, _repo.AddAccountSweeping, "AddAccountSweeping", cancellationToken);
        }

        [HttpPost("UpdateAccountSweeping")]
        public async Task<IActionResult> UpdateAccountSweeping([FromBody] InData reqDat, CancellationToken cancellationToken = default)
        {
            return await HandleRequest(reqDat, _repo.UpdateAccountSweeping, "UpdateAccountSweeping", cancellationToken);
        }

        [HttpPost("GetAccountSweeping")]
        public async Task<IActionResult> GetAccountSweeping([FromBody] InData reqDat, CancellationToken cancellationToken = default)
        {
            return await HandleRequest(reqDat, _repo.GetAccountSweeping, "GetAccountSweeping", cancellationToken);
        }

        [HttpPost("DeleteAccountSweeping")]
        public async Task<IActionResult> DeleteAccountSweeping([FromBody] InData reqDat, CancellationToken cancellationToken = default)
        {
            return await HandleRequest(reqDat, _repo.DeleteAccountSweeping, "DeleteAccountSweeping", cancellationToken);
        }

    //    // Account Nominee endpoints
        [HttpPost("AddAccountNominee")]
        public async Task<IActionResult> AddAccountNominee([FromBody] InData reqDat, CancellationToken cancellationToken = default)
        {
            return await HandleRequest(reqDat, _repo.AddAccountNominee, "AddAccountNominee", cancellationToken);
        }

        [HttpPost("UpdateAccountNominee")]
        public async Task<IActionResult> UpdateAccountNominee([FromBody] InData reqDat, CancellationToken cancellationToken = default)
        {
            return await HandleRequest(reqDat, _repo.UpdateAccountNominee, "UpdateAccountNominee", cancellationToken);
        }

        [HttpPost("CheckAccountNomineeOpening")]
        public async Task<IActionResult> GetAccountNomineeOpening([FromBody] InData reqDat, CancellationToken cancellationToken = default)
        {
            return await HandleRequest(reqDat, _repo.GetAccountNomineeOpening, "GetAccountNomineeOpening", cancellationToken);
        }

        [HttpPost("GetAccountNominee")]
        public async Task<IActionResult> GetAccountNominee([FromBody] InData reqDat, CancellationToken cancellationToken = default)
        {
            return await HandleRequest(reqDat, _repo.GetAccountNominee, "GetAccountNominee", cancellationToken);
        }

        [HttpPost("DeleteAccountNominee")]
        public async Task<IActionResult> DeleteAccountNominee([FromBody] InData reqDat, CancellationToken cancellationToken = default)
        {
            return await HandleRequest(reqDat, _repo.DeleteAccountNominee, "DeleteAccountNominee", cancellationToken);
        }

    //    // Account Closure endpoints
        [HttpPost("GetAccountClosingDetails")]
        public async Task<IActionResult> GetAccountClosingDetails([FromBody] InData reqDat, CancellationToken cancellationToken = default)
        {
            return await HandleRequest(reqDat, _repo.GetAccountClosingDetails, "GetAccountClosingDetails", cancellationToken);
        }

        [HttpPost("CloseAccount")]
        public async Task<IActionResult> CloseAccount([FromBody] InData reqDat, CancellationToken cancellationToken = default)
        {
            return await HandleRequest(reqDat, _repo.CloseAccount, "CloseAccount", cancellationToken);
        }

        [HttpPost("TransferAccount")]
        public async Task<IActionResult> TransferAccount([FromBody] InData reqDat, CancellationToken cancellationToken = default)
        {
            return await HandleRequest(reqDat, _repo.TransferAccount, "TransferAccount", cancellationToken);
        }

    //    // Account Charge Rate endpoints
        [HttpPost("AddAccountChargeRate")]
        public async Task<IActionResult> AddAccountChargeRate([FromBody] InData reqDat, CancellationToken cancellationToken = default)
        {
            return await HandleRequest(reqDat, _repo.AddAccountChargeRate, "AddAccountChargeRate", cancellationToken);
        }

        [HttpPost("UpdateAccountChargeRate")]
        public async Task<IActionResult> UpdateAccountChargeRate([FromBody] InData reqDat, CancellationToken cancellationToken = default)
        {
            return await HandleRequest(reqDat, _repo.UpdateAccountChargeRate, "UpdateAccountChargeRate", cancellationToken);
        }

        [HttpPost("GetAccountChargeRate")]
        public async Task<IActionResult> GetAccountChargeRate([FromBody] InData reqDat, CancellationToken cancellationToken = default)
        {
            return await HandleRequest(reqDat, _repo.GetAccountChargeRate, "GetAccountChargeRate", cancellationToken);
        }

        [HttpPost("DeleteAccountChargeRate")]
        public async Task<IActionResult> DeleteAccountChargeRate([FromBody] InData reqDat, CancellationToken cancellationToken = default)
        {
            return await HandleRequest(reqDat, _repo.DeleteAccountChargeRate, "DeleteAccountChargeRate", cancellationToken);
        }

    //    // Account Blocking/Unblocking endpoints
        [HttpPost("BlockEntity")]
        public async Task<IActionResult> BlockEntity([FromBody] InData reqDat, CancellationToken cancellationToken = default)
        {
            return await HandleRequest(reqDat, _repo.BlockEntity, "BlockEntity", cancellationToken);
        }

        [HttpPost("UnblockEntity")]
        public async Task<IActionResult> UnblockEntity([FromBody] InData reqDat, CancellationToken cancellationToken = default)
        {
            return await HandleRequest(reqDat, _repo.UnblockEntity, "UnblockEntity", cancellationToken);
        }

        [HttpPost("GetBlockedHistory")]
        public async Task<IActionResult> GetBlockedHistory([FromBody] InData reqDat, CancellationToken cancellationToken = default)
        {
            return await HandleRequest(reqDat, _repo.GetBlockedHistory, "GetBlockedHistory", cancellationToken);
        }

        [HttpPost("GetBlockedDetails")]
        public async Task<IActionResult> GetBlockedDetails([FromBody] InData reqDat, CancellationToken cancellationToken = default)
        {
            return await HandleRequest(reqDat, _repo.GetBlockedDetails, "GetBlockedDetails", cancellationToken);
        }

    //    // Account Classification endpoints
        [HttpPost("AddAccountClassification")]
        public async Task<IActionResult> AddAccountClassification([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.AddAccountClassification, "AddAccountClassification", cancellationToken);

        [HttpPost("UpdateAccountClassification")]
        public async Task<IActionResult> UpdateAccountClassification([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.UpdateAccountClassification, "UpdateAccountClassification", cancellationToken);

        [HttpPost("GetAccountClassification")]
        public async Task<IActionResult> GetAccountClassification([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.GetAccountClassification, "GetAccountClassification", cancellationToken);

        [HttpPost("DeleteAccountClassification")]
        public async Task<IActionResult> DeleteAccountClassification([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.DeleteAccountClassification, "DeleteAccountClassification", cancellationToken);

    //    // Account Special Conditions endpoints
        [HttpPost("AddAccountSpecialCondition")]
        public async Task<IActionResult> AddAccountSpecialCondition([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.AddAccountSpecialCondition, "AddAccountSpecialCondition", cancellationToken);

        [HttpPost("UpdateAccountSpecialCondition")]
        public async Task<IActionResult> UpdateAccountSpecialCondition([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.UpdateAccountSpecialCondition, "UpdateAccountSpecialCondition", cancellationToken);

        [HttpPost("DeleteAccountSpecialCondition")]
        public async Task<IActionResult> DeleteAccountSpecialCondition([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.DeleteAccountSpecialCondition, "DeleteAccountSpecialCondition", cancellationToken);

        [HttpPost("GetAccountSpecialConditions")]
        public async Task<IActionResult> GetAccountSpecialConditions([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.GetAccountSpecialConditions, "GetAccountSpecialConditions", cancellationToken);

        [HttpPost("GetSpecialConditionClasses")]
        public async Task<IActionResult> GetSpecialConditionClasses([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.GetSpecialConditionClasses, "GetSpecialConditionClasses", cancellationToken);

    //    // Account Interest Rate endpoints
        [HttpPost("AddAccountInterestRate")]
        public async Task<IActionResult> AddAccountInterestRate([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.AddAccountInterestRate, "AddAccountInterestRate", cancellationToken);

        [HttpPost("UpdateAccountInterestRate")]
        public async Task<IActionResult> UpdateAccountInterestRate([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.UpdateAccountInterestRate, "UpdateAccountInterestRate", cancellationToken);

        [HttpPost("GetAccountInterestRate")]
        public async Task<IActionResult> GetAccountInterestRate([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.GetAccountInterestRate, "GetAccountInterestRate", cancellationToken);

        [HttpPost("DeleteAccountInterestRate")]
        public async Task<IActionResult> DeleteAccountInterestRate([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.DeleteAccountInterestRate, "DeleteAccountInterestRate", cancellationToken);

    //    // Notes endpoints
        [HttpPost("UpdateNotes")]
        public async Task<IActionResult> UpdateNotes([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.UpdateNotes, "UpdateNotes", cancellationToken);

        [HttpPost("GetNotes")]
        public async Task<IActionResult> GetNotes([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.GetNotes, "GetNotes", cancellationToken);

    //    // Account Freeze endpoints
        [HttpPost("AddAccountFreeze")]
        public async Task<IActionResult> AddAccountFreeze([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.AddAccountFreeze, "AddAccountFreeze", cancellationToken);

        [HttpPost("UpdateAccountFreeze")]
        public async Task<IActionResult> UpdateAccountFreeze([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.UpdateAccountFreeze, "UpdateAccountFreeze", cancellationToken);

        [HttpPost("GetAccountFreeze")]
        public async Task<IActionResult> GetAccountFreeze([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.GetAccountFreeze, "GetAccountFreeze", cancellationToken);

        [HttpPost("ReleaseAccountFreeze")]
        public async Task<IActionResult> ReleaseAccountFreeze([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.ReleaseAccountFreeze, "ReleaseAccountFreeze", cancellationToken);

    //    // Cheque Book endpoints
        [HttpPost("AddChequeBook")]
        public async Task<IActionResult> AddChequeBook([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.AddChequeBook, "AddChequeBook", cancellationToken);

        [HttpPost("UpdateChequeBook")]
        public async Task<IActionResult> UpdateChequeBook([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.UpdateChequeBook, "UpdateChequeBook", cancellationToken);

        [HttpPost("AddChequeBookRequest")]
        public async Task<IActionResult> AddChequeBookRequest([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.AddChequeBookRequest, "AddChequeBookRequest", cancellationToken);

        [HttpPost("UpdateChequeBookRequest")]
        public async Task<IActionResult> UpdateChequeBookRequest([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.UpdateChequeBookRequest, "UpdateChequeBookRequest", cancellationToken);

        [HttpPost("AddChequeBookTransfer")]
        public async Task<IActionResult> AddChequeBookTransfer([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.AddChequeBookTransfer, "AddChequeBookTransfer", cancellationToken);

        [HttpPost("UpdateChequeBookTransfer")]
        public async Task<IActionResult> UpdateChequeBookTransfer([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.UpdateChequeBookTransfer, "UpdateChequeBookTransfer", cancellationToken);

        [HttpPost("GetChequeBooks")]
        public async Task<IActionResult> GetChequeBooks([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.GetChequeBooks, "GetChequeBooks", cancellationToken);

        [HttpPost("GetChequeBookRequests")]
        public async Task<IActionResult> GetChequeBookRequests([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.GetChequeBookRequests, "GetChequeBookRequests", cancellationToken);

        [HttpPost("GetChequeBookTransfers")]
        public async Task<IActionResult> GetChequeBookTransfers([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.GetChequeBookTransfers, "GetChequeBookTransfers", cancellationToken);

        [HttpPost("DeleteChequeBooks")]
        public async Task<IActionResult> DeleteChequeBooks([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.DeleteChequeBooks, "DeleteChequeBooks", cancellationToken);

    //    // Stop Payment endpoints
        [HttpPost("AddStopPayment")]
        public async Task<IActionResult> AddStopPayment([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.AddStopPayment, "AddStopPayment", cancellationToken);

        [HttpPost("UpdateStopPayment")]
        public async Task<IActionResult> UpdateStopPayment([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.UpdateStopPayment, "UpdateStopPayment", cancellationToken);

        [HttpPost("AddCancelStopPayment")]
        public async Task<IActionResult> AddCancelStopPayment([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.AddCancelStopPayment, "AddCancelStopPayment", cancellationToken);

        [HttpPost("UpdateCancelStopPayment")]
        public async Task<IActionResult> UpdateCancelStopPayment([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.UpdateCancelStopPayment, "UpdateCancelStopPayment", cancellationToken);

        [HttpPost("GetStopPayments")]
        public async Task<IActionResult> GetStopPayments([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.GetStopPayments, "GetStopPayments", cancellationToken);

        [HttpPost("GetCancelStopPayments")]
        public async Task<IActionResult> GetCancelStopPayments([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.GetCancelStopPayments, "GetCancelStopPayments", cancellationToken);

    //    // Account Dormant endpoints
        [HttpPost("GetAccountDormant")]
        public async Task<IActionResult> GetAccountDormant([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.GetAccountDormant, "GetAccountDormant", cancellationToken);

        [HttpPost("EditAccountDormant")]
        public async Task<IActionResult> EditAccountDormant([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.EditAccountDormant, "EditAccountDormant", cancellationToken);

    //    // Account Reminder (Notifications) endpoints
        [HttpPost("AddAccountReminder")]
        public async Task<IActionResult> AddAccountReminder([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.AddAccountReminder, "AddAccountReminder", cancellationToken);

        [HttpPost("UpdateAccountReminder")]
        public async Task<IActionResult> UpdateAccountReminder([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.UpdateAccountReminder, "UpdateAccountReminder", cancellationToken);

        [HttpPost("GetAccountReminders")]
        public async Task<IActionResult> GetAccountReminders([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.GetAccountReminders, "GetAccountReminders", cancellationToken);

        [HttpPost("DeleteAccountReminder")]
        public async Task<IActionResult> DeleteAccountReminder([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.DeleteAccountReminder, "DeleteAccountReminder", cancellationToken);

    //    // Account Activation endpoints
        [HttpPost("GetAccountActivation")]
        public async Task<IActionResult> GetAccountActivation([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.GetAccountActivation, "GetAccountActivation", cancellationToken);

        [HttpPost("UpdateAccountActivation")]
        public async Task<IActionResult> UpdateAccountActivation([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.UpdateAccountActivation, "UpdateAccountActivation", cancellationToken);

    //    // Account Transfer endpoints
        [HttpPost("AddAccountTransferDetails")]
        public async Task<IActionResult> AddAccountTransferDetails([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.AddAccountTransferDetails, "AddAccountTransferDetails", cancellationToken);

        [HttpPost("GetAccountTransferDetails")]
        public async Task<IActionResult> GetAccountTransferDetails([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.GetAccountTransferDetails, "GetAccountTransferDetails", cancellationToken);

        // Account Signatory (OperatedBy) endpoints
        [HttpPost("GetAccountSignatories")]
        public async Task<IActionResult> GetAccountSignatories([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.GetAccountSignatories, "GetAccountSignatories", cancellationToken);

        [HttpPost("AddAccountSignatories")]
        public async Task<IActionResult> AddAccountSignatories([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.AddAccountSignatories, "AddAccountSignatories", cancellationToken);

        [HttpPost("EditAccountSignatories")]
        public async Task<IActionResult> EditAccountSignatories([FromBody] InData reqDat, CancellationToken cancellationToken = default)
    => await HandleRequest(reqDat, _repo.EditAccountSignatories, "EditAccountSignatories", cancellationToken);

        private async Task<IActionResult> HandleRequest(InData reqDat, Func<string, CancellationToken, Task<ResponseDetail<object>>> operation, string methodName, CancellationToken cancellationToken)
        {
            LogLevel logLevel = LogLevel.None;
            int httpStatusCode = 200;
            object? resp = null;
            try
            {
                if (reqDat is null || Utils.IsValidJson(Convert.ToString(reqDat.RequestData)!) == false)
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
                    resp = await operation(requestJson!, cancellationToken);
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
                _logger.Log(logLevel, "{@message}", new { MethodName = methodName, Request = reqDat, Response = resp, RemoteIp = Request.HttpContext.Connection.RemoteIpAddress!.MapToIPv4().ToString() });
            }
            return StatusCode(httpStatusCode, resp);
        }
    }
}

