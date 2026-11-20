import { Component } from "@theme/component";

/**
 * Login page: switches between the login and password recovery forms without a reload.
 * Refs: `views[]` (with `data-auth-view`), `switchLinks[]` (with `data-auth-switch`, the view to show).
 */
class AuthComponent extends Component {
  connectedCallback() {
    super.connectedCallback();
    if (window.location.pathname.includes("/account/recover")) this.dataset.view = "recover";

    (this.refs.switchLinks ?? []).forEach((/** @type {HTMLAnchorElement} */ link) =>
      link.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          this.show(link.dataset.authSwitch ?? "login");
          history.replaceState(null, "", link.href);
        },
        { signal: this.signal },
      ),
    );
  }

  /** @param {string} view */
  show(view) {
    this.dataset.view = view;
    const card = (this.refs.views ?? []).find((/** @type {HTMLElement} */ element) => element.dataset.authView === view);
    card?.querySelector("input")?.focus();
  }
}

if (!customElements.get("ui-auth")) customElements.define("ui-auth", AuthComponent);
