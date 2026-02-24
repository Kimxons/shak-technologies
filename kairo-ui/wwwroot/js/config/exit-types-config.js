(function (global) {
  // Centralized, easy-to-edit fallback options for Exit Types level dropdowns
  // If Environment.exitLevelOptions is present, this config is ignored.
  // Values used are codes expected by backend (SAME, NEXT, FIRST).
  const defaultLevelOptions = [
    { value: 'SAME', label: 'Same Level' },
    { value: 'NEXT', label: 'From Next Level' },
    { value: 'FIRST', label: 'From First Level' }
  ];

  global.ExitTypesConfig = global.ExitTypesConfig || {};
  global.ExitTypesConfig.levelOptions = global.ExitTypesConfig.levelOptions || defaultLevelOptions;
})(window);
