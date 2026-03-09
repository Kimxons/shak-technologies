using CBS.Entities.Common;

namespace ClientManagement.Modules.ClientMaintenance
{
    public interface IClientSpecialOffersRepo
    {
        public Task<ResponseDetail<object>> GetClientSpecialOffers(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> CreateClientSpecialOffers(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> UpdateClientSpecialOffers(string requestJson, CancellationToken cancellationToken = default);
    }
}
