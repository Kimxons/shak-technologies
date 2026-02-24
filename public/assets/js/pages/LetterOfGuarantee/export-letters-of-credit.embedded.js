// Tab switching functionality
    document.addEventListener('DOMContentLoaded', function() {
      const stepperNav = document.querySelector('[data-stepper-nav]');
      const stepPanels = document.querySelectorAll('[data-step-panel]');
      
      if (stepperNav) {
        stepperNav.addEventListener('click', function(e) {
          const trigger = e.target.closest('.cm-stepper__trigger');
          if (!trigger) return;
          
          e.preventDefault();
          
          // Remove active state from all triggers
          stepperNav.querySelectorAll('.cm-stepper__trigger').forEach(t => {
            t.classList.remove('is-active');
          });
          
          // Add active state to clicked trigger
          trigger.classList.add('is-active');
          
          // Get the step ID
          const stepId = trigger.dataset.stepId;
          
          // Hide all panels
          stepPanels.forEach(panel => {
            panel.classList.remove('is-active');
          });
          
          // Show the selected panel
          const targetPanel = document.querySelector(`[data-step-panel="${stepId}"]`);
          if (targetPanel) {
            targetPanel.classList.add('is-active');
          }
        });
      }
    });
