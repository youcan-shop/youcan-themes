import { mediaQueries } from "@theme/utilities";

/** Fades sections in as they enter the viewport (Theme settings > Animations). */
if (document.body.hasAttribute("data-reveal") && !mediaQueries.reducedMotion.matches) {
  const observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.setAttribute("data-revealed", "");
        observer.unobserve(entry.target);
      }),
    { rootMargin: "0px 0px -10% 0px" },
  );

  document.querySelectorAll("main .youcan-section").forEach((section) => {
    if (section.getBoundingClientRect().top < window.innerHeight) return;
    section.setAttribute("data-reveal-pending", "");
    observer.observe(section);
  });
}
