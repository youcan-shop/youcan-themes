// Constants
const CURRENCY_SYMBOL = window.Dotshop?.currency ?? "";
const CUSTOMER_LOCALE = window.Dotshop?.customer_locale || "en-US";
const CUSTOMER_COUNTRY_CODE = new Intl.Locale(CUSTOMER_LOCALE).region;
const ON_CHANGE_DEBOUNCE_TIMER = 300;
const STORE_LANGUAGE = document.documentElement.lang || "en";

const PUB_SUB_EVENTS = {
  cartUpdate: "cart/update",
  cartError: "cart/error",
  couponUpdate: "coupon/update",
};

// Pub/sub
const subscribers = {};

function subscribe(eventName, callback) {
  subscribers[eventName] = [...(subscribers[eventName] ?? []), callback];

  return function unsubscribe() {
    subscribers[eventName] = subscribers[eventName].filter((cb) => cb !== callback);
  };
}

function publish(eventName, data) {
  subscribers[eventName]?.forEach((callback) => callback(data));
}

// Utilities
function debounce(func, wait) {
  let time;
  return (...args) => {
    clearTimeout(time);
    time = setTimeout(() => func.apply(this, args), wait);
  };
}

function shouldUsePrecision(amount) {
  const { isMulticurrencyActive, usePrecision } = window.Dotshop?.store?.multicurrency_settings ?? {};

  if (!isMulticurrencyActive) {
    return !Number.isInteger(amount);
  }

  return Boolean(usePrecision);
}

function formatNumber(amount, withPrecision = false) {
  const formatter = new Intl.NumberFormat(CUSTOMER_LOCALE, {
    style: "decimal",
    roundingMode: "floor",
    maximumFractionDigits: withPrecision ? 2 : 0,
    minimumFractionDigits: withPrecision ? 2 : 0,
  });

  return formatter.format(amount);
}

function formatCurrency(amount) {
  const formattedValue = formatNumber(amount, shouldUsePrecision(amount));

  const symbolPositionFormatter = new Intl.NumberFormat(CUSTOMER_LOCALE, {
    style: "currency",
    currency: "USD",
    currencyDisplay: "symbol",
  });

  // Format 1 USD only to find where the locale puts the currency symbol
  const parts = symbolPositionFormatter.formatToParts(1);
  const symbolIndex = parts.findIndex((part) => part.type === "currency");

  return symbolIndex === 0 ? `${CURRENCY_SYMBOL} ${formattedValue}` : `${formattedValue} ${CURRENCY_SYMBOL}`;
}

// Toast
if (!customElements.get("ui-toast")) {
  class Toast extends HTMLElement {
    static CLOSE_DURATION = 4000;

    connectedCallback() {
      this.message = this.querySelector("[data-toast-message]");
      this.querySelector("[data-toast-close]")?.addEventListener("click", () => this.hide());
    }

    show(message, status = "info") {
      clearTimeout(this.timeout);

      this.message.textContent = message;
      this.dataset.type = status;
      if (!this.matches(":popover-open")) this.showPopover();

      this.timeout = setTimeout(() => this.hide(), Toast.CLOSE_DURATION);
    }

    hide() {
      clearTimeout(this.timeout);
      if (this.matches(":popover-open")) this.hidePopover();
    }
  }

  customElements.define("ui-toast", Toast);
}

const toast = document.querySelector("ui-toast");

if (window.errorStrings?.checkout) {
  toast?.show(window.errorStrings.checkout, "error");
}

// Store market countries (phone validation + linked location fields)
if (window.theme?.loadMarketCountries && !window.storeMarketCountries) {
  window.storeMarketCountries = window.youcanjs ? youcanjs.misc.getStoreMarketCountries() : Promise.resolve({ countries: [] });
  window.storeRegions = {};
  window.storeCities = {};
}

// Translated validation messages
const TRANSLATED_MESSAGES = {
  en: {
    required: "Please fill out this field.",
    email: "Please enter a valid email address.",
    short: (min) => `Please enter at least ${min} characters.`,
  },
  fr: {
    required: "Veuillez remplir ce champ.",
    email: "Veuillez entrer une adresse e-mail valide.",
    short: (min) => `Veuillez entrer au moins ${min} caractères.`,
  },
  ar: {
    required: "يرجى ملء هذه الخانة.",
    email: "يرجى إدخال عنوان بريد إلكتروني صالح.",
    short: (min) => `يرجى إدخال ما لا يقل عن ${min} حرفًا.`,
  },
};

function setCustomMessage(input) {
  input.setCustomValidity("");

  const { validity, type, minLength } = input;
  const messages = TRANSLATED_MESSAGES[STORE_LANGUAGE] ?? TRANSLATED_MESSAGES.en;

  if (validity.valueMissing) {
    input.setCustomValidity(messages.required);
  } else if (type === "email" && validity.typeMismatch) {
    input.setCustomValidity(messages.email);
  } else if (validity.tooShort) {
    input.setCustomValidity(messages.short(minLength));
  }
}

for (const event of ["invalid", "input"]) {
  document.addEventListener(
    event,
    (e) => {
      if (e.target.matches?.("input[required], input[type='email'], textarea[required], select[required]")) {
        setCustomMessage(e.target);
      }
    },
    true,
  );
}

// Smooth open / close for accordions and menu drawer sub menus.
// The <details> height is animated between the summary height and the full height,
// with overflow clipped so the content never spills out while closing.
const ANIMATED_DETAILS = "details.accordion, details.menu-drawer__details";
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const DETAILS_TIMING = { duration: 280, easing: "cubic-bezier(0.4, 0, 0.2, 1)" };

function animateDetails(details, summary, open) {
  const content = [...details.children].filter((child) => child !== summary);
  const from = details.getBoundingClientRect().height;

  details.getAnimations().forEach((animation) => animation.cancel());
  content.forEach((child) => child.getAnimations().forEach((animation) => animation.cancel()));

  if (open) details.open = true;
  const to = open ? details.scrollHeight : summary.getBoundingClientRect().height;

  details.style.overflow = "hidden";
  details.toggleAttribute("data-animating", true);

  const animation = details.animate([{ height: `${from}px` }, { height: `${to}px` }], DETAILS_TIMING);
  content.forEach((child) =>
    child.animate(open ? [{ opacity: 0, translate: "0 -4px" }, { opacity: 1, translate: "0 0" }] : [{ opacity: 1 }, { opacity: 0 }], {
      ...DETAILS_TIMING,
      duration: open ? DETAILS_TIMING.duration : DETAILS_TIMING.duration * 0.6,
      fill: "forwards",
    }),
  );

  animation.onfinish = () => {
    if (!open) details.open = false;
    details.style.overflow = "";
    details.removeAttribute("data-animating");
    content.forEach((child) => child.getAnimations().forEach((a) => a.cancel()));
  };
}

document.addEventListener("click", (event) => {
  const summary = event.target.closest("summary");
  const details = summary?.parentElement;

  if (!details?.matches(ANIMATED_DETAILS) || summary !== details.querySelector(":scope > summary")) return;
  if (reduceMotion.matches) return;

  event.preventDefault();

  // data-state holds the target state, so quick double clicks reverse the running animation
  const isOpen = details.dataset.state ? details.dataset.state === "open" : details.open;
  details.dataset.state = isOpen ? "closed" : "open";
  animateDetails(details, summary, !isOpen);
});

// Reveal sections on scroll
if (document.body.hasAttribute("data-reveal") && "IntersectionObserver" in window && !reduceMotion.matches) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.setAttribute("data-revealed", "");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -10% 0px" },
  );

  document.querySelectorAll("main .youcan-section").forEach((section) => {
    if (section.getBoundingClientRect().top < window.innerHeight) return;

    section.setAttribute("data-reveal-pending", "");
    observer.observe(section);
  });
}

// Close a <dialog> from any [data-close-dialog] button inside it, or by clicking the backdrop
document.addEventListener("click", (event) => {
  const closer = event.target.closest("[data-close-dialog]");
  if (closer) closer.closest("dialog")?.close();

  if (event.target instanceof HTMLDialogElement) event.target.close();
});

// Sort select (collection + search pages)
document.addEventListener("change", (event) => {
  const select = event.target.closest("[data-sort-select]");
  if (!select) return;

  const url = new URL(window.location.href);
  const [field, order] = select.value.split(":");

  [...url.searchParams.keys()].filter((key) => key.startsWith("page")).forEach((key) => url.searchParams.delete(key));

  if (field) {
    url.searchParams.set("sort_field", field);
    url.searchParams.set("sort_order", order);
  } else {
    url.searchParams.delete("sort_field");
    url.searchParams.delete("sort_order");
  }

  if (select.dataset.terms) url.searchParams.set("q", select.dataset.terms);

  window.location.href = url.toString();
});

// Header: sticky "on scroll up" + desktop dropdowns close on outside click / when another opens
if (!customElements.get("ui-header")) {
  class Header extends HTMLElement {
    connectedCallback() {
      this.lastScroll = window.scrollY;
      this.dropdowns = [...this.querySelectorAll("[data-menu-dropdown]")];

      this.dropdowns.forEach((dropdown) => {
        dropdown.addEventListener("toggle", () => {
          if (!dropdown.open) return;
          this.dropdowns.filter((other) => other !== dropdown).forEach((other) => (other.open = false));
        });
      });

      this.onDocumentClick = (event) => {
        if (!this.contains(event.target)) this.dropdowns.forEach((dropdown) => (dropdown.open = false));
      };
      this.onKeyUp = (event) => {
        if (event.key === "Escape") this.dropdowns.forEach((dropdown) => (dropdown.open = false));
      };
      this.onScroll = () => this.handleScroll();

      document.addEventListener("click", this.onDocumentClick);
      document.addEventListener("keyup", this.onKeyUp);
      if (this.dataset.sticky === "scroll-up" || this.hasAttribute("data-transparent")) {
        window.addEventListener("scroll", this.onScroll, { passive: true });
        this.handleScroll();
      }

      // Keep the header solid while a dropdown is open over a transparent header
      this.dropdowns.forEach((dropdown) => dropdown.addEventListener("toggle", () => this.updateTransparency()));
    }

    disconnectedCallback() {
      document.removeEventListener("click", this.onDocumentClick);
      document.removeEventListener("keyup", this.onKeyUp);
      window.removeEventListener("scroll", this.onScroll);
    }

    handleScroll() {
      const current = window.scrollY;

      if (this.dataset.sticky === "scroll-up") {
        const isScrollingDown = current > this.lastScroll && current > this.offsetHeight;

        this.toggleAttribute("data-hidden", isScrollingDown);
        if (isScrollingDown) this.dropdowns.forEach((dropdown) => (dropdown.open = false));
      }

      this.lastScroll = current;
      this.updateTransparency();
    }

    updateTransparency() {
      if (!this.hasAttribute("data-transparent")) return;

      const solid = window.scrollY > 8 || this.dropdowns.some((dropdown) => dropdown.open);
      const { schemeClass, transparentClass } = this.dataset;

      this.toggleAttribute("data-transparent-active", !solid);
      this.classList.toggle(schemeClass, solid);
      this.classList.toggle(transparentClass, !solid);
    }
  }

  customElements.define("ui-header", Header);
}

// Countdown: counts down to the "end" attribute (YYYY-MM-DDTHH:MM, visitor's local time)
if (!customElements.get("ui-countdown")) {
  class Countdown extends HTMLElement {
    static UNITS = [
      ["days", 86400000],
      ["hours", 3600000],
      ["minutes", 60000],
      ["seconds", 1000],
    ];

    connectedCallback() {
      this.end = new Date(this.getAttribute("end"));
      if (isNaN(this.end)) return;

      this.tick();
      this.timer = setInterval(() => this.tick(), 1000);
    }

    disconnectedCallback() {
      clearInterval(this.timer);
    }

    tick() {
      let remaining = Math.max(0, this.end - Date.now());

      Countdown.UNITS.forEach(([unit, ms]) => {
        const value = Math.floor(remaining / ms);
        remaining -= value * ms;

        const element = this.querySelector(`[data-${unit}]`);
        if (element) element.textContent = String(value).padStart(2, "0");
      });

      if (this.end - Date.now() <= 0) {
        clearInterval(this.timer);
        if (this.hasAttribute("hide-when-expired")) this.hidden = true;
      }
    }
  }

  customElements.define("ui-countdown", Countdown);
}

// Video card (video reviews): tap to play with sound, tap again to pause
if (!customElements.get("ui-video-card")) {
  class VideoCard extends HTMLElement {
    connectedCallback() {
      this.video = this.querySelector("video");
      this.querySelector("button")?.addEventListener("click", () => this.toggle());
    }

    toggle() {
      if (!this.video) return;

      if (this.video.paused) {
        document.querySelectorAll("ui-video-card[data-playing]").forEach((card) => card !== this && card.pause());
        this.video.muted = false;
        this.video.play();
        this.setAttribute("data-playing", "");
      } else {
        this.pause();
      }
    }

    pause() {
      this.video?.pause();
      this.removeAttribute("data-playing");
    }
  }

  customElements.define("ui-video-card", VideoCard);
}

// Video: replace the poster with the embed on click
if (!customElements.get("ui-video")) {
  class Video extends HTMLElement {
    connectedCallback() {
      this.querySelector("button")?.addEventListener("click", () => this.play(), { once: true });
    }

    play() {
      if (!this.dataset.embed) return;

      const iframe = document.createElement("iframe");
      iframe.src = this.dataset.embed;
      iframe.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      iframe.allowFullscreen = true;
      iframe.title = this.querySelector("img")?.alt || "Video";

      this.replaceChildren(iframe);
    }
  }

  customElements.define("ui-video", Video);
}

// Marquee: repeat the items until the track is wide enough to loop seamlessly
if (!customElements.get("ui-marquee")) {
  class Marquee extends HTMLElement {
    connectedCallback() {
      this.track = this.querySelector(".marquee__track");
      this.group = this.querySelector("[data-marquee-group]");
      if (!this.track || !this.group) return;

      requestAnimationFrame(() => this.fill());
    }

    fill() {
      const groupWidth = this.group.scrollWidth;
      if (!groupWidth) return;

      const copies = Math.max(1, Math.ceil((this.offsetWidth * 2) / groupWidth));

      for (let i = 0; i < copies; i++) {
        const clone = this.group.cloneNode(true);
        clone.setAttribute("aria-hidden", "true");
        clone.removeAttribute("data-marquee-group");
        clone.querySelectorAll("[data-youcan-block-id], [id]").forEach((el) => {
          el.removeAttribute("id");
          el.removeAttribute("data-youcan-block-id");
        });
        this.track.append(clone);
      }
    }
  }

  customElements.define("ui-marquee", Marquee);
}

// Open a <dialog> by id from any [data-open-dialog] trigger (popup link block)
document.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-open-dialog]");
  if (!trigger) return;

  document.getElementById(trigger.dataset.openDialog)?.showModal();
});

// Layered slideshow: one panel expanded at a time
if (!customElements.get("ui-layered")) {
  class Layered extends HTMLElement {
    connectedCallback() {
      this.layers = [...this.querySelectorAll("[data-layer]")];
      if (!this.layers.length) return;

      this.activate(0);

      this.layers.forEach((layer, index) => {
        layer.addEventListener("click", () => this.activate(index));
        if (this.dataset.trigger === "hover") layer.addEventListener("mouseenter", () => this.activate(index));
      });

      if (this.hasAttribute("autoplay") && this.layers.length > 1) {
        const interval = parseInt(this.getAttribute("interval"), 10) || 6000;
        const play = () => (this.timer = setInterval(() => this.activate((this.index + 1) % this.layers.length), interval));
        play();
        this.addEventListener("mouseenter", () => clearInterval(this.timer));
        this.addEventListener("mouseleave", play);
      }
    }

    disconnectedCallback() {
      clearInterval(this.timer);
    }

    activate(index) {
      this.index = index;
      this.layers.forEach((layer, i) => {
        layer.toggleAttribute("data-active", i === index);
        layer.querySelector("[data-layer-tab]")?.setAttribute("aria-expanded", String(i === index));
      });
    }
  }

  customElements.define("ui-layered", Layered);
}

// Collection links: the hovered / focused link drives the spotlight image
if (!customElements.get("ui-collection-links")) {
  class CollectionLinks extends HTMLElement {
    connectedCallback() {
      const activate = (event) => {
        const link = event.target.closest("[data-index]");
        if (!link || !this.contains(link) || link.classList.contains("collection-links__image")) return;

        this.querySelectorAll("[data-index]").forEach((element) => element.toggleAttribute("data-active", element.dataset.index === link.dataset.index));
      };

      this.addEventListener("mouseover", activate);
      this.addEventListener("focusin", activate);
    }
  }

  customElements.define("ui-collection-links", CollectionLinks);
}

// Before / after comparison slider
if (!customElements.get("ui-comparison")) {
  class Comparison extends HTMLElement {
    connectedCallback() {
      const range = this.querySelector("input[type='range']");
      range?.addEventListener("input", () => this.style.setProperty("--position", `${range.value}%`));
    }
  }

  customElements.define("ui-comparison", Comparison);
}

// Jumbo text: scales the font so one line fills the available width
if (!customElements.get("ui-jumbo-text")) {
  class JumboText extends HTMLElement {
    connectedCallback() {
      if (!this.hasAttribute("data-fit")) return;

      this.fit = (force = false) => {
        if (!force && this.clientWidth === this.lastWidth) return;
        this.lastWidth = this.clientWidth;
        this.style.fontSize = "100px";
        const ratio = this.clientWidth / this.scrollWidth;
        this.style.fontSize = `${Math.floor(100 * ratio * 0.98)}px`;
        this.setAttribute("data-fitted", "");
      };

      this.observer = new ResizeObserver(() => this.fit());
      this.observer.observe(this);
      document.fonts?.ready.then(() => this.fit(true));
    }

    disconnectedCallback() {
      this.observer?.disconnect();
    }
  }

  customElements.define("ui-jumbo-text", JumboText);
}

// Forms inside dialogs (account profile, addresses): reopen the dialog when the server returned errors
document.querySelectorAll("dialog [data-form-has-errors]").forEach((alert) => alert.closest("dialog")?.showModal());

// Ask for confirmation before submitting destructive forms (remove an address)
document.addEventListener("submit", (event) => {
  const button = event.submitter?.closest("[data-confirm-message]");
  if (button && !window.confirm(button.dataset.confirmMessage)) event.preventDefault();
});

// Login page: switch between the login and the password recovery forms without a reload
if (!customElements.get("ui-auth")) {
  class Auth extends HTMLElement {
    connectedCallback() {
      if (window.location.pathname.includes("/account/recover")) this.dataset.view = "recover";

      this.addEventListener("click", (event) => {
        const link = event.target.closest("[data-auth-switch]");
        if (!link) return;

        event.preventDefault();
        this.dataset.view = link.dataset.authSwitch;
        history.replaceState(null, "", link.href);
        this.querySelector(`[data-auth-view="${this.dataset.view}"] input`)?.focus();
      });
    }
  }

  customElements.define("ui-auth", Auth);
}

// Read more: clamps long content and reveals it on demand
if (!customElements.get("ui-read-more")) {
  class ReadMore extends HTMLElement {
    connectedCallback() {
      this.content = this.querySelector("[data-read-more-content]");
      this.toggle = this.querySelector("[data-read-more-toggle]");
      if (!this.content || !this.toggle) return;

      requestAnimationFrame(() => {
        const limit = parseFloat(getComputedStyle(this).getPropertyValue("--read-more-height")) || 160;
        if (this.content.scrollHeight <= limit + 24) return;

        this.setAttribute("data-clamped", "");
        this.toggle.hidden = false;
        this.toggle.addEventListener("click", () => this.setOpen(!this.hasAttribute("data-open")));
      });
    }

    setOpen(open) {
      const from = this.content.getBoundingClientRect().height;
      this.toggleAttribute("data-open", open);
      const to = open ? this.content.scrollHeight : parseFloat(getComputedStyle(this).getPropertyValue("--read-more-height"));

      this.content.animate([{ height: `${from}px` }, { height: `${to}px` }], { duration: 280, easing: "cubic-bezier(0.4, 0, 0.2, 1)" });
      this.toggle.setAttribute("aria-expanded", String(open));
      this.toggle.querySelector("[data-label-more]").hidden = open;
      this.toggle.querySelector("[data-label-less]").hidden = !open;
    }
  }

  customElements.define("ui-read-more", ReadMore);
}

// Share links (product page share block)
if (!customElements.get("ui-share")) {
  class Share extends HTMLElement {
    connectedCallback() {
      const url = encodeURIComponent(window.location.href.split("?")[0]);
      const text = encodeURIComponent(this.dataset.title ?? document.title);
      const links = {
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
        x: `https://x.com/intent/post?url=${url}&text=${text}`,
        whatsapp: `https://wa.me/?text=${text}%20${url}`,
      };

      this.querySelectorAll("a[data-share]").forEach((link) => (link.href = links[link.dataset.share]));

      this.querySelector("[data-share='copy']")?.addEventListener("click", async (event) => {
        const button = event.currentTarget;
        try {
          await navigator.clipboard.writeText(window.location.href.split("?")[0]);
          const label = button.querySelector("span");
          const original = label.textContent;
          label.textContent = button.dataset.copiedLabel;
          setTimeout(() => (label.textContent = original), 2000);
        } catch (error) {
          console.error(error);
        }
      });
    }
  }

  customElements.define("ui-share", Share);
}

/*
 * Bottom sheets on mobile: drag the handle (or header) down to close.
 * Applies to <dialog>s, .drawer--sheet-mobile popovers and the mobile select drawer.
 * The sheet follows the finger; a fast flick or a drag past 30% of its height closes it,
 * otherwise it springs back.
 */
(() => {
  const MOBILE = window.matchMedia("(max-width: 749px)");
  const SHEETS = "dialog[open], .drawer--sheet-mobile:popover-open, .select-popup--drawer:popover-open";
  const ZONES = ".sheet-handle, .drawer__header, .account-dialog__header, .review-form__header, .popup-link__header, .select-popup__header";
  const SPRING = "translate 360ms cubic-bezier(0.32, 0.72, 0, 1)";

  // Every dialog and mobile sheet drawer gets a handle (hidden on desktop by CSS)
  const addHandles = (root = document) =>
    root.querySelectorAll?.("dialog, .drawer--sheet-mobile").forEach((sheet) => {
      if (sheet.querySelector(":scope > .sheet-handle")) return;
      const handle = document.createElement("div");
      handle.className = "sheet-handle";
      handle.setAttribute("aria-hidden", "true");
      sheet.prepend(handle);
    });

  addHandles();
  new MutationObserver((mutations) =>
    mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => node.nodeType === 1 && addHandles(node.parentElement ?? node))),
  ).observe(document.body, { childList: true, subtree: true });

  let drag = null;

  const close = (sheet) => {
    if (sheet instanceof HTMLDialogElement) sheet.close();
    else if (sheet.matches(":popover-open")) sheet.hidePopover();
  };

  const reset = (sheet) => {
    sheet.style.removeProperty("translate");
    sheet.style.removeProperty("transition");
    sheet.style.removeProperty("--sheet-backdrop");
  };

  document.addEventListener("pointerdown", (event) => {
    if (!MOBILE.matches || event.button !== 0) return;

    const zone = event.target.closest(ZONES);
    const sheet = zone?.closest(SHEETS);
    if (!sheet || event.target.closest("button, a, input, select, textarea, label")) return;

    drag = { sheet, startY: event.clientY, startTime: performance.now(), height: sheet.getBoundingClientRect().height, dy: 0, pointerId: event.pointerId };
    zone.setPointerCapture?.(event.pointerId);
    sheet.setAttribute("data-sheet-dragging", "");
  });

  document.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;

    const raw = event.clientY - drag.startY;
    // Rubber band when pulling up, 1:1 when pulling down
    drag.dy = raw < 0 ? -Math.sqrt(-raw) * 2 : raw;
    drag.sheet.style.translate = `0 ${drag.dy}px`;
    drag.sheet.style.setProperty("--sheet-backdrop", String(Math.max(0, 1 - Math.max(0, drag.dy) / drag.height)));
  });

  const end = (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;

    const { sheet, dy, height, startTime } = drag;
    const velocity = dy / Math.max(1, performance.now() - startTime);
    drag = null;
    sheet.removeAttribute("data-sheet-dragging");

    if (dy > height * 0.3 || (dy > 24 && velocity > 0.5)) {
      sheet.style.transition = SPRING;
      sheet.style.translate = "0 100%";
      sheet.style.setProperty("--sheet-backdrop", "0");
      sheet.addEventListener(
        "transitionend",
        () => {
          close(sheet);
          requestAnimationFrame(() => reset(sheet));
        },
        { once: true },
      );
    } else {
      sheet.style.transition = SPRING;
      sheet.style.translate = "0 0";
      sheet.style.removeProperty("--sheet-backdrop");
      sheet.addEventListener("transitionend", () => reset(sheet), { once: true });
    }
  };

  document.addEventListener("pointerup", end);
  document.addEventListener("pointercancel", end);
})();
