(function alignMoneyTransferActions() {
      const actionsSpacer = document.getElementById('mt-actions-spacer');
      const secondaryGroup = document.getElementById('mt-actions-secondary');
      const receivingCard = document.getElementById('receiving-branch');

      if (!actionsSpacer || !secondaryGroup || !receivingCard) return;

      function update() {
        // Compute positions relative to the document so alignment works regardless of scroll.
        const receivingTop = receivingCard.getBoundingClientRect().top + window.scrollY;
        const secondaryTop = secondaryGroup.getBoundingClientRect().top + window.scrollY;

        const delta = Math.max(0, Math.round(receivingTop - secondaryTop));
        actionsSpacer.style.height = delta + 'px';
      }

      window.addEventListener('load', update);
      window.addEventListener('resize', update);

      // Run once immediately as well.
      update();
    })();
