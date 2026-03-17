using CBS.Entities.Common;

namespace AccountManagement.Modules.StaticData
{
    public interface IStaticDataRepo
    {
        Task<ResponseDetail<object>> GetLocation(string requestJson, CancellationToken cancellationToken = default);
        Task<ResponseDetail<object>> AddEditLocation(string requestJson, CancellationToken cancellationToken = default);
        Task<ResponseDetail<object>> DeleteLocation(string requestJson, CancellationToken cancellationToken = default);

        Task<ResponseDetail<object>> GetContactPerson(string requestJson, CancellationToken cancellationToken = default);
        Task<ResponseDetail<object>> AddEditContactPerson(string requestJson, CancellationToken cancellationToken = default);
        Task<ResponseDetail<object>> DeleteContactPerson(string requestJson, CancellationToken cancellationToken = default);

        Task<ResponseDetail<object>> GetCustodian(string requestJson, CancellationToken cancellationToken = default);
        Task<ResponseDetail<object>> AddEditCustodian(string requestJson, CancellationToken cancellationToken = default);
        Task<ResponseDetail<object>> DeleteCustodian(string requestJson, CancellationToken cancellationToken = default);
    }
}
