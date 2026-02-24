/**
 * Group Collection Allocation Page
 * This is a reference implementation showing the service layer pattern
 * The actual implementation is in: /modules/group-collection-allocation/group-collection-allocation.js
 * 
 * Use this pattern for creating new transaction pages
 */
(async function() {
  'use strict';

  const { ServiceLoader } = window;

  // Load dependencies
  await ServiceLoader.loadCore();
  await ServiceLoader.loadTransactionService();
  await ServiceLoader.loadLookupService();
  await ServiceLoader.loadSearchService();

  // Get services
  const TransactionService = window.TransactionService;
  const LookupService = window.LookupService;
  const SearchService = window.SearchService;

  console.log('✅ Group Collection Allocation page services loaded');
  
  // Your page implementation goes here...

})();
