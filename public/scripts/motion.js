const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

export const measure = (element, dimension) => element.getBoundingClientRect()[dimension];

export function animateResize(element, dimension, from) {
  element.getAnimations().forEach((animation) => animation.cancel());
  const to = measure(element, dimension);
  if (from === to || !from || !to || reducedMotion.matches) return;
  const easing = getComputedStyle(document.documentElement).getPropertyValue("--spring");
  element.animate({ [dimension]: [from + "px", to + "px"] }, { duration: 350, easing });
}
