if (!customElements.get("ui-account-view")) {
  class AccountView extends HTMLElement {
    connectedCallback() {
      if (window.location.pathname.includes("/account/recover")) {
        this.dataset.view = "recover";
      }

      const current = this.dataset.view;
      const target = [...this.querySelectorAll("[data-auth-view]")].find(
        (view) =>
          view.dataset.authView !== current &&
          view.querySelector('[data-form-has-errors], [role="status"]'),
      );
      if (target) this.dataset.view = target.dataset.authView;

      this.querySelectorAll("[data-auth-switch]").forEach((link) => {
        link.addEventListener("click", (event) => {
          event.preventDefault();
          this.dataset.view = link.dataset.authSwitch;
          this.querySelector(
            `[data-auth-view="${link.dataset.authSwitch}"] input:not([type="hidden"])`,
          )?.focus();
          history.replaceState(null, "", link.href);
        });
      });
    }
  }

  customElements.define("ui-account-view", AccountView);
}

if (!customElements.get("ui-account-tabs")) {
  class AccountTabs extends HTMLElement {
    connectedCallback() {
      this.links = [...this.querySelectorAll("[data-account-tab]")];

      this.links.forEach((link) => {
        link.addEventListener("click", (event) => {
          if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
          event.preventDefault();
          this.show(link.dataset.accountTab);
          history.replaceState(null, "", link.getAttribute("href"));
        });
      });

      window.addEventListener("hashchange", () => this.show(this.fromLocation()));
      this.show(this.fromLocation());
    }

    fromLocation() {
      if (window.location.hash === "#account") return "account";
      if (window.location.hash === "#orders") return "orders";
      return new URLSearchParams(window.location.search).has("page") ? "orders" : "account";
    }

    show(tab) {
      this.dataset.tab = tab;
      this.links.forEach((link) => {
        if (link.dataset.accountTab === tab) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      });
    }
  }

  customElements.define("ui-account-tabs", AccountTabs);
}

if (!window.uiAccountFormsReady) {
  window.uiAccountFormsReady = true;

  const revealFormFeedback = () => {
    const feedback = document.querySelector(
      '[data-form-has-errors], .drawer-content [role="status"]',
    );
    if (!feedback) return;

    feedback.closest(".drawer-content")?.setAttribute("data-state", "open");
    requestAnimationFrame(() => feedback.focus());
  };

  document.addEventListener("submit", (event) => {
    const trigger = event.submitter?.closest("[data-confirm-message]");
    if (trigger && !window.confirm(trigger.dataset.confirmMessage)) event.preventDefault();
  });

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!form.closest?.('[section="account"]')) return;

    if (form.closest(".profile-edit")) {
      form.querySelectorAll('input[type="password"]').forEach((input) => {
        if (input.name !== "current_password" && input.value === "") input.disabled = true;
      });
    }

    const hidden = form.querySelector("input[ui-phone-hidden-input]");
    const typed = form.querySelector("input[ui-phone-number]");
    if (hidden && typed && hidden.value === "" && typed.value !== "") hidden.disabled = true;
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", revealFormFeedback);
  } else {
    revealFormFeedback();
  }
}
