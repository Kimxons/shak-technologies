using CBS.Entities.Common;

namespace AccountManagement.Modules.StandingInstructionEFT
{
    public interface ISIEFTRepo
    {
        Task<ResponseDetail<object>> GetSIEFT(string requestJson, CancellationToken cancellationToken = default);
        Task<ResponseDetail<object>> CreateSIEFT(string requestJson, CancellationToken cancellationToken = default);
        Task<ResponseDetail<object>> UpdateSIEFT(string requestJson, CancellationToken cancellationToken = default);
        Task<ResponseDetail<object>> DeleteSIEFT(string requestJson, CancellationToken cancellationToken = default);
        Task<ResponseDetail<object>> StopResumeSIEFT(string requestJson, CancellationToken cancellationToken = default);
    }
}
