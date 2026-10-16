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
