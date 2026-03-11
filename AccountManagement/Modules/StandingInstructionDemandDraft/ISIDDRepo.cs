using CBS.Entities.Common;

namespace AccountManagement.Modules.StandingInstructionDemandDraft
{
    public interface ISIDDRepo
    {
        Task<ResponseDetail<object>> GetSIDemandDraft(string requestJson, CancellationToken cancellationToken = default);
        Task<ResponseDetail<object>> CreateSIDemandDraft(string requestJson, CancellationToken cancellationToken = default);
        Task<ResponseDetail<object>> UpdateSIDemandDraft(string requestJson, CancellationToken cancellationToken = default);
        Task<ResponseDetail<object>> DeleteSIDemandDraft(string requestJson, CancellationToken cancellationToken = default);
        Task<ResponseDetail<object>> StopSIDemandDraft(string requestJson, CancellationToken cancellationToken = default);
    }
}
