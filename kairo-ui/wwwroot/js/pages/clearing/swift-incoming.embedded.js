// Tab switching functionality
    document.querySelectorAll('.tab-button').forEach(button => {
      button.addEventListener('click', function (e) {
        if (e.target.type === 'checkbox') return;
        
        const tabId = this.getAttribute('data-tab');
        
        // Remove active class from all tabs and contents
        document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        // Add active class to current tab and content
        this.classList.add('active');
        if (tabId) {
          document.getElementById(tabId)?.classList.add('active');
        }
      });
    });
