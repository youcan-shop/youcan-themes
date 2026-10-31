import { mediaQueries } from "@theme/utilities";

const SHEETS = "dialog[open], .drawer--sheet-mobile:popover-open, .select-popup--drawer:popover-open";
const DRAG_ZONES = ".sheet-handle, .drawer__header, .account-dialog__header, .review-form__header, .popup-link__header, .select-popup__header";
const SPRING = "translate 360ms cubic-bezier(0.32, 0.72, 0, 1)";

/** @param {Element} sheet */
function closeSheet(sheet) {
  if (sheet instanceof HTMLDialogElement) sheet.close();
  else if (sheet.matches(":popover-open")) /** @type {HTMLElement} */ (sheet).hidePopover();
}

/** @param {ParentNode} [root] */
function addSheetHandles(root = document) {
  root.querySelectorAll("dialog, .drawer--sheet-mobile").forEach((sheet) => {
    if (sheet.querySelector(":scope > .sheet-handle")) return;
    const handle = document.createElement("div");
    handle.className = "sheet-handle";
    handle.setAttribute("aria-hidden", "true");
    sheet.prepend(handle);
  });
}

document.addEventListener("click", (event) => {
  const target = /** @type {HTMLElement} */ (event.target);

  const opener = /** @type {HTMLElement | null} */ (target.closest("[data-open-dialog]"));
  if (opener) /** @type {HTMLDialogElement | null} */ (document.getElementById(opener.dataset.openDialog ?? ""))?.showModal();

  if (target.closest("[data-close-dialog]")) target.closest("dialog")?.close();
  if (target instanceof HTMLDialogElement) target.close();
});

document.querySelectorAll("[data-form-has-errors]").forEach((alert) => {
  const sheet = alert.closest("dialog, [popover]");
  if (sheet instanceof HTMLDialogElement) sheet.showModal();
  else /** @type {HTMLElement | null} */ (sheet)?.showPopover();
});

addSheetHandles();
new MutationObserver((mutations) =>
  mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => node instanceof Element && addSheetHandles(node.parentElement ?? node))),
).observe(document.body, { childList: true, subtree: true });

/**
 * Bottom sheets on mobile: drag the handle or header down to close. A fast flick or a drag past
 * 30% of the height closes the sheet, otherwise it springs back.
 * @type {{ sheet: HTMLElement, startY: number, startTime: number, height: number, offset: number, pointerId: number } | null}
 */
let drag = null;

/** @param {HTMLElement} sheet */
function resetSheet(sheet) {
  sheet.style.removeProperty("translate");
  sheet.style.removeProperty("transition");
  sheet.style.removeProperty("--sheet-backdrop");
}

document.addEventListener("pointerdown", (event) => {
  if (!mediaQueries.mobile.matches || event.button !== 0) return;

  const target = /** @type {HTMLElement} */ (event.target);
  const zone = target.closest(DRAG_ZONES);
  const sheet = /** @type {HTMLElement | null} */ (zone?.closest(SHEETS) ?? null);
  if (!zone || !sheet || target.closest("button, a, input, select, textarea, label")) return;

  drag = { sheet, startY: event.clientY, startTime: performance.now(), height: sheet.getBoundingClientRect().height, offset: 0, pointerId: event.pointerId };
  zone.setPointerCapture(event.pointerId);
  sheet.setAttribute("data-sheet-dragging", "");
});

document.addEventListener("pointermove", (event) => {
  if (!drag || event.pointerId !== drag.pointerId) return;

  const distance = event.clientY - drag.startY;
  drag.offset = distance < 0 ? -Math.sqrt(-distance) * 2 : distance;
  drag.sheet.style.translate = `0 ${drag.offset}px`;
  drag.sheet.style.setProperty("--sheet-backdrop", String(Math.max(0, 1 - Math.max(0, drag.offset) / drag.height)));
});

/** @param {PointerEvent} event */
function endDrag(event) {
  if (!drag || event.pointerId !== drag.pointerId) return;

  const { sheet, offset, height, startTime } = drag;
  const velocity = offset / Math.max(1, performance.now() - startTime);
  const dismiss = offset > height * 0.3 || (offset > 24 && velocity > 0.5);
  drag = null;

  sheet.removeAttribute("data-sheet-dragging");
  sheet.style.transition = SPRING;
  sheet.style.translate = dismiss ? "0 100%" : "0 0";
  if (dismiss) sheet.style.setProperty("--sheet-backdrop", "0");
  else sheet.style.removeProperty("--sheet-backdrop");

  sheet.addEventListener(
    "transitionend",
    () => {
      if (dismiss) closeSheet(sheet);
      requestAnimationFrame(() => resetSheet(sheet));
    },
    { once: true },
  );
}

document.addEventListener("pointerup", endDrag);
document.addEventListener("pointercancel", endDrag);
