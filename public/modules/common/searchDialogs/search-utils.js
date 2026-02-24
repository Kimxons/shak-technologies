/**
 * Search Dialog Utilities
 * Common utilities for search dialogs
 */
(function() {
    // Check if loaded in iframe with noheader parameter - hide internal header
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('noheader') === '1') {
        document.body.classList.add('no-header');
    }
})();
