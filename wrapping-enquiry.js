(function () {
  var forms = document.querySelectorAll('form[data-wf-enquiry]');
  forms.forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var status = form.querySelector('.wf-form-status');
      var button = form.querySelector('button[type="submit"]');
      var successMsg = form.getAttribute('data-success-msg') || 'Thank you! We have received your enquiry and will reply soon.';
      if (button) { button.disabled = true; button.textContent = 'Sending...'; }
      if (status) { status.style.color = 'rgba(250,250,250,0.6)'; status.textContent = 'Sending your enquiry...'; }

      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.success) {
          form.reset();
          if (status) { status.style.color = '#7CCB8E'; status.textContent = successMsg; }
          if (button) { button.textContent = 'Sent ✓'; }
        } else {
          if (status) { status.style.color = '#E0928A'; status.textContent = (data.message || 'Something went wrong. Please WhatsApp us instead.'); }
          if (button) { button.disabled = false; button.textContent = 'Send Enquiry'; }
        }
      })
      .catch(function () {
        if (status) { status.style.color = '#E0928A'; status.textContent = 'Network error. Please WhatsApp us at +91 95716 28921.'; }
        if (button) { button.disabled = false; button.textContent = 'Send Enquiry'; }
      });
    });
  });
})();
