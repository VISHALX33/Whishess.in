// Client-side login gate for private admin pages (no backend/DB available).
(function () {
  var ADMIN_EMAIL = "admin@gmail.com";
  var ADMIN_PASSWORD = "Admin@2026";
  var SESSION_KEY = "wh_admin_authed";

  var overlay = document.getElementById("wh-auth-overlay");
  var form = document.getElementById("wh-auth-form");
  var errorEl = document.getElementById("wh-auth-error");
  if (!overlay || !form) return;

  function unlock() {
    sessionStorage.setItem(SESSION_KEY, "1");
    overlay.hidden = true;
  }

  if (sessionStorage.getItem(SESSION_KEY) === "1") {
    unlock();
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var email = form.querySelector("#wh-auth-email").value.trim();
    var password = form.querySelector("#wh-auth-password").value;
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      errorEl.textContent = "";
      unlock();
    } else {
      errorEl.textContent = "Invalid email or password.";
    }
  });
})();
