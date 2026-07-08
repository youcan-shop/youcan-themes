if (!customElements.get("ui-product")) {
  class Product extends HTMLElement {
    static observedAttributes = ["product-id"];
    static MAXIMUM_FILE_SIZE = 2;
    static BYTES_IN_KB = 1024;
    static KB_IN_MB = 1024;

    constructor() {
      super();

      this.variants = [...this.querySelectorAll("[ui-variant]")];
      this.productForms = this.querySelectorAll("ui-shop-button");
      this.productVariants = window.productsVariants[this.getAttribute("product-id")];
      this.currentPrice = 0;
    }

    connectedCallback() {
      if (this.querySelectorAll("[ui-block='subtotal']").length) {
        this.addEventListener("change", (e) => {
          if (e.target.tagName === "UI-QUANTITY") this.updateSubtotal();
        });
        this.updateSubtotal();
      }

      this.setupImageUploads();

      if (!this.productVariants) return;

      this.onVariantChanged();
      this.variants.forEach((variant) => variant.addEventListener("change", () => this.onVariantChanged()));
    }

    setupImageUploads() {
      this.querySelectorAll("[ui-variant='upload_image_zone'] input[type='file']").forEach((fileInput) => {
        const preview = fileInput.parentElement.nextElementSibling;

        fileInput.addEventListener("change", () => this.onImageUpload(fileInput));

        preview?.querySelector("button")?.addEventListener("click", () => {
          delete fileInput.dataset.attachedImage;
          this.setAttachedImage(null);
          preview.setAttribute("hidden", "");
          fileInput.value = "";
        });
      });
    }

    async onImageUpload(fileInput) {
      delete fileInput.dataset.attachedImage;

      if (!fileInput.files.length) {
        this.renderFilePreview(fileInput);
        this.setAttachedImage(null);
        return;
      }

      const file = fileInput.files[0];
      const fileSizeInMB = file.size / Product.BYTES_IN_KB / Product.KB_IN_MB;

      if (fileSizeInMB > Product.MAXIMUM_FILE_SIZE) {
        toast?.show(window.errorStrings?.large_file ?? `Max file size is ${Product.MAXIMUM_FILE_SIZE}mb`, "error");
        fileInput.value = "";
        this.renderFilePreview(fileInput);
        this.setAttachedImage(null);
        return;
      }

      this.renderFilePreview(fileInput);

      // The cart expects a hosted image link (from youcanjs.product.upload), not a base64 blob.
      // Block checkout while the upload is in-flight so the item can't be added without the image.
      this.setUploadingState(true);

      try {
        const { link } = await youcanjs.product.upload(file);

        fileInput.dataset.attachedImage = link;
        this.setAttachedImage(link);
      } catch (error) {
        console.error(error);
        toast?.show(error.message, "error");
        this.setAttachedImage(null);
      } finally {
        this.setUploadingState(false);
      }
    }

    setUploadingState(isUploading) {
      this.productForms.forEach((productForm) => {
        const button = productForm.querySelector('[ui-slot="button"]');
        if (button) button.disabled = isUploading;
      });
      this.querySelectorAll("[data-express-checkout-trigger]").forEach((trigger) => (trigger.disabled = isUploading));
    }

    setAttachedImage(attachedImage) {
      this.productForms.forEach((productForm) =>
        attachedImage ? productForm.setAttribute("attached-image", attachedImage) : productForm.removeAttribute("attached-image"),
      );
    }

    renderFilePreview(fileInput) {
      const preview = fileInput.parentElement.nextElementSibling;
      if (!preview) return;

      if (!fileInput.files.length) {
        preview.setAttribute("hidden", "");
        return;
      }

      const file = fileInput.files[0];
      const fileSizeInKB = file.size / Product.BYTES_IN_KB;
      const fileSizeInMB = fileSizeInKB / Product.KB_IN_MB;

      const reader = new FileReader();
      reader.onload = () => {
        preview.removeAttribute("hidden");
        preview.querySelector("img").src = reader.result;
        preview.querySelector("img").alt = file.name;
        preview.querySelector('[ui-slot="file-upload-preview-name"]').textContent = file.name;
        preview.querySelector('[ui-slot="file-upload-preview-size"]').textContent =
          fileSizeInMB >= 1 ? `${fileSizeInMB.toFixed(1)}mb` : `${Math.round(fileSizeInKB)}kb`;
      };
      reader.readAsDataURL(file);
    }

    get selectedOptions() {
      return Object.fromEntries(
        this.variants.flatMap((variant) =>
          [...variant.querySelectorAll("input:checked, input[type='file'], select")].map((input) => [
            this.getBaseName(input.name),
            input.type === "file" ? "upload-zone" : input.value,
          ]),
        ),
      );
    }

    async onVariantChanged() {
      const matchedVariant = this.productVariants.find((variant) => JSON.stringify(variant.variations) === JSON.stringify(this.selectedOptions));

      if (matchedVariant) await this.updateVariant(matchedVariant);

      this.disableUnavailableOptions();

      if (!matchedVariant) {
        this.productForms.forEach((productForm) => (productForm.querySelector('[ui-slot="button"]').disabled = true));
        this.querySelectorAll("[data-express-checkout-trigger]").forEach((trigger) => (trigger.disabled = true));
      }
    }

    async updateVariant({ id, available, inventory, price, compare_at_price, image }) {
      this.productForms.forEach((productForm) => {
        productForm.setAttribute("variant-id", id);
        productForm.toggleAttribute("not-available", !available);
      });

      this.querySelectorAll("[data-express-checkout-trigger]").forEach((trigger) => {
        trigger.disabled = !available;
      });

      // Re-apply the already-uploaded image (if any); never clear it here, the upload may still be in-flight.
      const attachedImage = this.getAttachedImage();
      if (attachedImage) this.setAttachedImage(attachedImage);
      image && this.updateMainImage(image);

      this.currentPrice = price;
      this.updateProduct(price, compare_at_price);
      this.updateInventoryStatus(inventory);
      this.updateStatistics(price, compare_at_price, inventory);
      this.updateSubtotal();
    }

    updateStatistics(price, compare_at_price, inventory) {
      const savingBadge = this.querySelector("[ui-statistic='saving-badge']");
      if (savingBadge) {
        const hasSaving = compare_at_price && compare_at_price > price;
        savingBadge.hidden = !hasSaving;

        if (hasSaving) {
          const savingValue = savingBadge.querySelector("[ui-statistic='saving']");
          if (savingValue) savingValue.textContent = formatCurrency(compare_at_price - price);
        }
      }

      const inventoryBadge = this.querySelector("[ui-statistic='inventory']");
      if (inventoryBadge) {
        const threshold = Number(inventoryBadge.getAttribute("data-threshold")) || 0;
        const status = inventory === 0 ? "soldout" : inventory > threshold ? "instock" : "lowstock";
        const statusKey = inventory === 0 ? "out_of_stock" : inventory > threshold ? "in_stock" : "low_stock";

        inventoryBadge.dataset.status = status;

        const valueEl = inventoryBadge.querySelector(".value");
        if (valueEl) valueEl.textContent = window.inventoryStatuses[statusKey];
      }
    }

    updateSubtotal() {
      const subtotalEls = this.querySelectorAll("[ui-block='subtotal']");
      if (!subtotalEls.length) return;

      if (!this.currentPrice) {
        this.currentPrice = parseFloat(subtotalEls[0].dataset.price) || 0;
      }

      const qtyEl = this.querySelector("ui-quantity");
      const qty = qtyEl ? qtyEl.quantityValue : 1;

      subtotalEls.forEach((subtotalEl) => {
        subtotalEl.textContent = formatCurrency(this.currentPrice * qty);
      });
    }

    updateProduct(price, compare_at_price) {
      const priceElement = this.querySelector("[ui-product-item='price']");
      const compareAtPriceElement = this.querySelector("[ui-product-item='compare-at-price']");

      if (!priceElement) return;

      priceElement.textContent = formatCurrency(price);
      compareAtPriceElement.textContent = formatCurrency(compare_at_price);
      compareAtPriceElement.hidden = !compare_at_price;
    }

    updateInventoryStatus(inventory) {
      const inventoryElement = this.querySelector("[data-product-item='inventory']");

      if (!inventoryElement) return;

      const statuses = window.inventoryStatuses;
      const inventoryStatus = this.querySelector("[data-product-item='inventory']");

      const showCount = inventoryElement.getAttribute("data-show-count");
      const threshold = Number(inventoryElement.getAttribute("data-threshold")) || 0;

      const statusKey =
        inventory === 0
          ? "out_of_stock"
          : inventory > threshold
            ? showCount
              ? "in_stock_show_count"
              : "in_stock"
            : showCount
              ? "low_stock_show_count"
              : "low_stock";

      inventoryStatus.querySelector(".value").textContent = statuses[statusKey].replace("%", inventory);
      inventoryElement.dataset.inventory = statusKey.replace("_show_count", "").replaceAll("_", "-");

      inventoryStatus.dataset.status = inventory === 0 ? "soldout" : inventory > threshold ? "instock" : "lowstock";

      const progressBar = inventoryStatus.querySelector("[ui-slot='progress-bar']");
      if (progressBar) {
        let progressValue = 0;
        if (inventory > 0 && threshold > 0) {
          progressValue = inventory >= threshold ? 100 : Math.round((inventory / threshold) * 100);
        }
        progressBar.value = progressValue;
      }
    }

    updateMainImage(image_src) {
      if (!this.productMedia) return;

      this.productMedia.querySelectorAll("img").forEach((element, i) => {
        if (element.src === image_src) {
          // Add your logic
        }
      });
    }

    disableUnavailableOptions() {
      const lastVariant = this.variants.filter((variant) => variant.getAttribute("ui-variant") !== "upload_image_zone").at(-1);

      if (!lastVariant) return;

      const inputs = lastVariant.querySelectorAll("input, select");

      inputs.forEach((input) => {
        const compareOptions = {
          ...this.selectedOptions,
          [this.getBaseName(input.name)]: input.value,
        };
        const isUnavailable = this.productVariants.some(
          (variant) => JSON.stringify(variant.variations) === JSON.stringify(compareOptions) && !variant.available,
        );

        input.disabled = isUnavailable;

        if (isUnavailable) input.checked = false;
      });

      this.productForms.forEach((productForm) =>
        productForm.toggleAttribute(
          "not-available",
          [...inputs].every((input) => input.disabled),
        ),
      );

      const hasCheckedInput = [...inputs].some((input) => input.checked || input.value);
      const allUnavailable = [...inputs].every((input) => input.disabled);

      this.productForms.forEach((productForm) => (productForm.querySelector('[ui-slot="button"]').disabled = !hasCheckedInput));

      if (allUnavailable) {
        this.querySelectorAll("[data-express-checkout-trigger]").forEach((trigger) => {
          trigger.disabled = true;
        });
      }
    }

    getAttachedImage() {
      const fileInput = this.variants
        .flatMap((variant) => [...variant.querySelectorAll("input[type='file']")].filter((input) => input.files.length > 0))
        .pop();

      // Link produced by youcanjs.product.upload when the file was selected (see onImageUpload).
      return fileInput?.dataset.attachedImage || null;
    }

    getBaseName(name) {
      return name.split("_")[0];
    }
  }

  customElements.define("ui-product", Product);
}
