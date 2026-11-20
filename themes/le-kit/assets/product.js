import { Component } from "@theme/component";
import { showToast } from "@theme/toast";
import { formatMoney, readJson, translate } from "@theme/utilities";

const MAX_UPLOAD_MB = 2;

/**
 * Product form state: selected variant, price, inventory, media, add-ons, bundles and the
 * customer's uploaded image. Shop buttons inside receive the result as attributes.
 *
 * Refs: `variants` (JSON), `options[]`, `media`, `addOns[]`, `bundles[]`, `skus[]`.
 * Price, inventory and bundle notes are found by data attributes because they can sit
 * inside nested components (sticky bar).
 */
class ProductComponent extends Component {
  /** @type {Array<any>} */
  variants = [];

  connectedCallback() {
    super.connectedCallback();
    this.variants = readJson(this.refs.variants, []);

    this.addEventListener(
      "change",
      (event) => {
        const target = /** @type {HTMLInputElement} */ (event.target);
        if (target.closest("[data-variant-option]")) this.#onVariantChange(true);
        if (target.matches("[ref='addOns[]']")) this.updateAddOns();
        if (target.matches("[ref='bundles[]']")) this.#onBundleChange(target);
      },
      { signal: this.signal },
    );

    if (this.variants.length) {
      this.#restoreVariantFromUrl();
      this.#onVariantChange();
    }
  }

  /** The product page keeps the selected variant in `?variant=`. */
  get #syncsUrl() {
    return this.hasAttribute("data-product-main") && !this.closest("#quick-add");
  }

  #restoreVariantFromUrl() {
    if (!this.#syncsUrl) return;
    const id = new URL(window.location.href).searchParams.get("variant");
    const variant = id && this.variants.find((item) => String(item.id) === id);
    if (!variant) return;

    this.options.forEach((option) => {
      const value = variant.variations?.[option.dataset.optionName ?? ""];
      if (value == null) return;

      const select = option.querySelector("select");
      if (select) {
        select.value = value;
        select.dispatchEvent(new Event("change"));
      } else {
        option.querySelectorAll("input[type='radio']").forEach((input) => {
          /** @type {HTMLInputElement} */ (input).checked = /** @type {HTMLInputElement} */ (input).value === value;
        });
      }
    });
  }

  /** @returns {HTMLElement[]} */
  get shopButtons() {
    return [...this.querySelectorAll("ui-shop-button")];
  }

  /** @returns {HTMLElement[]} */
  get options() {
    return this.refs.options ?? [];
  }

  /** @returns {HTMLInputElement[]} */
  get bundles() {
    return this.refs.bundles ?? [];
  }

  /** @returns {Record<string, string | undefined>} */
  get selectedOptions() {
    return Object.fromEntries(
      this.options.map((option) => {
        const input = /** @type {HTMLInputElement | null} */ (option.querySelector("input:checked, select, input[type='file']"));
        if (!input) return [option.dataset.optionName, undefined];
        return [option.dataset.optionName, input.type === "file" ? "upload-zone" : input.value];
      }),
    );
  }

  /** @param {Record<string, string | undefined>} options */
  findVariant(options) {
    const key = JSON.stringify(options);
    return this.variants.find((variant) => JSON.stringify(variant.variations) === key);
  }

  /** @param {boolean} [updateUrl] */
  async #onVariantChange(updateUrl = false) {
    this.options.forEach((option) => {
      const label = option.querySelector("[data-selected-value]");
      const checked = /** @type {HTMLInputElement | null} */ (option.querySelector("input:checked"));
      if (label && checked) label.textContent = checked.value;
    });

    const variant = this.findVariant(this.selectedOptions);
    if (variant) await this.#selectVariant(variant);
    if (variant && updateUrl && this.#syncsUrl) {
      const url = new URL(window.location.href);
      url.searchParams.set("variant", String(variant.id));
      window.history.replaceState(window.history.state, "", url);
    }

    this.#disableUnavailableOptions();
  }

  /** @param {any} variant */
  async #selectVariant({ id, available, inventory, price, compare_at_price, image, sku }) {
    (this.refs.skus ?? []).forEach((/** @type {HTMLElement} */ element) => {
      element.textContent = sku ?? "";
      /** @type {HTMLElement} */ (element.parentElement).hidden = !sku;
    });

    this.shopButtons.forEach((button) => {
      button.setAttribute("variant-id", id);
      button.toggleAttribute("not-available", !available);
    });

    const attachedImage = await this.#readUploadedImage();
    if (attachedImage) this.shopButtons.forEach((button) => button.setAttribute("attached-image", attachedImage));

    if (image) this.#showMedia(image);
    this.#updatePrice(price, compare_at_price, available);
    this.#updateInventory(inventory);
    this.updateAddOns();
  }

  /** @param {number} price @param {number | null} compareAtPrice @param {boolean} available */
  #updatePrice(price, compareAtPrice, available) {
    const onSale = Boolean(compareAtPrice && compareAtPrice > price);

    this.querySelectorAll("[data-price]").forEach((container) => {
      container.classList.toggle("price--on-sale", onSale);

      const current = container.querySelector("[data-product-price]");
      const compare = /** @type {HTMLElement | null} */ (container.querySelector("[data-product-compare-price]"));
      const save = /** @type {HTMLElement | null} */ (container.querySelector("[data-product-save]"));
      const soldOut = /** @type {HTMLElement | null} */ (container.querySelector("[data-product-sold-out]"));

      if (current) current.textContent = formatMoney(price);
      if (compare) {
        compare.textContent = onSale && compareAtPrice ? formatMoney(compareAtPrice) : "";
        compare.hidden = !onSale;
      }
      // Sold out wins over the discount badge
      if (soldOut) soldOut.hidden = available;
      if (save) {
        save.hidden = !onSale || !available;
        const value = save.querySelector("[data-product-save-value]");
        if (value && onSale && compareAtPrice) value.textContent = String(Math.round(((compareAtPrice - price) * 100) / compareAtPrice));
      }
    });
  }

  /** @param {number | null} inventory */
  #updateInventory(inventory) {
    this.querySelectorAll(".inventory").forEach((container) => {
      const threshold = Number(/** @type {HTMLElement} */ (container).dataset.threshold) || 0;
      let status = "high-stock";
      if (inventory == null || inventory === 0) status = "sold-out";
      else if (inventory === 1) status = "last-item";
      else if (inventory <= threshold) status = "low-stock";

      container.querySelectorAll("[data-inventory-status]").forEach((element) => {
        /** @type {HTMLElement} */ (element).hidden = /** @type {HTMLElement} */ (element).dataset.inventoryStatus !== status;
        const text = /** @type {HTMLElement | null} */ (element.querySelector("[data-template]"));
        if (text) text.textContent = (text.dataset.template ?? "").replace("[count]", String(inventory));
      });
    });
  }

  /** @param {string} image */
  #showMedia(image) {
    const media = this.refs.media;
    if (!media?.goTo) return;

    const path = (/** @type {string} */ url) => String(url).split("?")[0].replace(/^https?:\/\/[^/]+/, "");
    const target = path(image);
    const index = [...media.querySelectorAll("[data-carousel-item]")].findIndex((item) => {
      const source = path(item.dataset.image ?? "");
      return source && target && (source.endsWith(target) || target.endsWith(source));
    });

    if (index !== -1) media.goTo(index);
  }

  updateAddOns() {
    const checked = (this.refs.addOns ?? []).filter((/** @type {HTMLInputElement} */ input) => input.checked).map((/** @type {HTMLInputElement} */ input) => input.value);

    this.shopButtons.forEach((button) => {
      const mainId = (button.getAttribute("variant-id") ?? "").split(",")[0];
      const ids = [...new Set([mainId, ...checked].filter(Boolean))];
      button.setAttribute("variant-id", ids.join(","));
      button.toggleAttribute("bulk", ids.length > 1);
    });
  }

  clearAddOns() {
    (this.refs.addOns ?? [])
      .filter((/** @type {HTMLInputElement} */ input) => input.checked)
      .forEach((/** @type {HTMLInputElement} */ input) => {
        input.checked = false;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      });
  }

  /** @param {HTMLInputElement} changed */
  #onBundleChange(changed) {
    this.bundles.filter((bundle) => bundle !== changed).forEach((bundle) => (bundle.checked = false));
    const bundleId = changed.checked ? changed.value : null;

    this.shopButtons.forEach((button) => (bundleId ? button.setAttribute("bundle-id", bundleId) : button.removeAttribute("bundle-id")));
    this.querySelectorAll("ui-quantity:not([item])").forEach((quantity) => {
      quantity.toggleAttribute("data-disabled", Boolean(bundleId));
      /** @type {any} */ (quantity).updateButtons?.();
    });
    this.querySelectorAll("[data-bundle-selected]").forEach((note) => (/** @type {HTMLElement} */ (note).hidden = !bundleId));

    this.#disableUnavailableOptions();
  }

  #disableUnavailableOptions() {
    const lastOption = this.options.filter((option) => option.dataset.variantOption !== "upload_image_zone").at(-1);
    if (!lastOption || !this.variants.length) return;

    const inputs = /** @type {Array<HTMLInputElement & HTMLOptionElement>} */ ([...lastOption.querySelectorAll("input, option")]);
    const name = lastOption.dataset.optionName ?? "";

    inputs.forEach((input) => {
      const variant = this.findVariant({ ...this.selectedOptions, [name]: input.value });
      const unavailable = Boolean(variant && !variant.available);
      input.disabled = unavailable;
      if (unavailable && input.checked) input.checked = false;
    });

    const hasBundle = this.bundles.some((bundle) => bundle.checked);
    const hasSelection = inputs.some((input) => (input.checked || input.selected) && !input.disabled);
    const allUnavailable = inputs.every((input) => input.disabled);

    this.shopButtons.forEach((button) => {
      if (hasBundle) {
        button.removeAttribute("not-available");
        return;
      }
      if (allUnavailable) button.setAttribute("not-available", "");
      button.querySelector("button")?.toggleAttribute("disabled", !hasSelection);
    });
  }

  /** @returns {Promise<string | null>} */
  async #readUploadedImage() {
    const input = /** @type {HTMLInputElement | undefined} */ (
      this.options.flatMap((option) => [...option.querySelectorAll("input[type='file']")]).filter((field) => /** @type {HTMLInputElement} */ (field).files?.length).pop()
    );
    const file = input?.files?.[0];
    if (!input || !file) return null;

    if (file.size / 1024 / 1024 > MAX_UPLOAD_MB) {
      showToast(translate("largeFile", { file: `"${file.name}"` }), "error");
      input.value = "";
      return null;
    }

    const result = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(/** @type {string} */ (reader.result));
      reader.readAsDataURL(file);
    });

    const preview = /** @type {HTMLElement | null} */ (input.closest("[data-variant-option]")?.querySelector("[data-upload-preview]") ?? null);
    if (preview) {
      const img = /** @type {HTMLImageElement} */ (preview.querySelector("img"));
      preview.hidden = false;
      img.src = result;
      img.alt = file.name;
      /** @type {HTMLButtonElement} */ (preview.querySelector("button")).onclick = () => {
        this.shopButtons.forEach((button) => button.removeAttribute("attached-image"));
        preview.hidden = true;
        input.value = "";
      };
    }

    return result;
  }
}

if (!customElements.get("ui-product")) customElements.define("ui-product", ProductComponent);
