(function (global) {
  const core = global.StaticDataCore;
  if (!core) {
    console.error('StaticDataCore is not loaded. Ensure staticDataCore.js is included before breftBinsStaticDataService.js.');
    return;
  }

  const svc = (global.StaticDataService = global.StaticDataService || {});
  const breftBinsService = (global.BreftBinsStaticDataService = global.BreftBinsStaticDataService || {});

  breftBinsService.getBreftBins = function getBreftBins(payload) {
    return core.postOldApi('dbo.p_GetBreftBins', payload || {}, core.APP_NAME);
  };

  breftBinsService.addEditBreftBins = function addEditBreftBins(payload) {
    return core.postOldApi('dbo.p_AddEditBreftBins', payload || {}, core.APP_NAME);
  };

  breftBinsService.searchBreftBins = function searchBreftBins(params) {
    return core.postOldApi('dbo.p_GetSearchResult', {
      TableID: 'BinID',
      SearchID: 'BinID',
      SearchKey: params?.SearchKey || '',
      WhereStmt: params?.WhereStmt || '',
      AdvFilterString: '',
      PrevOrNext: 1,
      PageSize: params?.PageSize || 20
    }, core.APP_NAME);
  };

  Object.assign(svc, {
    getBreftBins: breftBinsService.getBreftBins,
    addEditBreftBins: breftBinsService.addEditBreftBins,
    searchBreftBins: breftBinsService.searchBreftBins
  });
})(window);