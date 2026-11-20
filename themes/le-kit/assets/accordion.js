import { mediaQueries } from "@theme/utilities";

const SELECTOR = "details.accordion, details.menu-drawer__details";
const TIMING = { duration: 280, easing: "cubic-bezier(0.4, 0, 0.2, 1)" };

/**
 * Animates a `<details>` between its summary height and its full height, content clipped.
 * @param {HTMLDetailsElement} details
 * @param {boolean} open
 */
export function animateDetails(details, open) {
  const summary = /** @type {HTMLElement} */ (details.querySelector(":scope > summary"));
  const content = [...details.children].filter((child) => child !== summary);
  const from = details.getBoundingClientRect().height;

  [details, ...content].forEach((element) => element.getAnimations().forEach((animation) => animation.cancel()));

  if (open) details.open = true;
  const to = open ? details.scrollHeight : summary.getBoundingClientRect().height;

  details.style.overflow = "hidden";
  const animation = details.animate([{ height: `${from}px` }, { height: `${to}px` }], TIMING);

  content.forEach((child) =>
    child.animate(open ? [{ opacity: 0, translate: "0 -4px" }, { opacity: 1, translate: "0 0" }] : [{ opacity: 1 }, { opacity: 0 }], {
      ...TIMING,
      duration: open ? TIMING.duration : TIMING.duration * 0.6,
      fill: "forwards",
    }),
  );

  animation.onfinish = () => {
    if (!open) details.open = false;
    details.style.overflow = "";
    content.forEach((child) => child.getAnimations().forEach((childAnimation) => childAnimation.cancel()));
  };
}

document.addEventListener("click", (event) => {
  const summary = /** @type {HTMLElement} */ (event.target).closest("summary");
  const details = /** @type {HTMLDetailsElement | null} */ (summary?.parentElement ?? null);
  if (!details?.matches(SELECTOR) || summary !== details.querySelector(":scope > summary") || mediaQueries.reducedMotion.matches) return;

  event.preventDefault();

  // The target state, so a second click while animating reverses it
  const isOpen = details.dataset.state ? details.dataset.state === "open" : details.open;
  details.dataset.state = isOpen ? "closed" : "open";
  animateDetails(details, !isOpen);
});
