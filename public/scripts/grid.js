const roundUp = (value, grid) => Math.ceil(value / grid) * grid;

function measureFullHeight({ panel, sections }) {
  const hidden = sections.filter((section) => section.hidden);
  hidden.forEach((section) => (section.hidden = false));
  const { height } = panel.getBoundingClientRect();
  hidden.forEach((section) => (section.hidden = true));
  return height;
}

export function alignToGrid(view) {
  const { stage, panel, list, sections } = view;
  const grid = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--grid"));

  panel.getAnimations().forEach((animation) => animation.finish());
  [stage, list].forEach((element) => element.removeAttribute("style"));

  const { width } = stage.getBoundingClientRect();
  const gap = (roundUp(width + grid, grid) - width) / 2;
  const height = measureFullHeight(view);
  const fitted = roundUp(height + 2 * gap, grid) - 2 * gap;

  const share = Math.floor(((fitted - height) / sections.length) * 64) / 64;
  list.style.setProperty("--spacer", share + "px");
  list.style.paddingBottom = `calc(var(--list-inset) + ${fitted - height - share * sections.length}px)`;
  stage.style.height = fitted + "px";

  const offset = panel.getBoundingClientRect();
  stage.style.left = Math.round(offset.left) - offset.left + "px";
  stage.style.top = Math.round(offset.top) - offset.top + "px";

  const origin = document.body.getBoundingClientRect();
  const { left, top } = panel.getBoundingClientRect();
  document.body.style.setProperty("--grid-x", left - origin.left - gap - grid / 2 + "px");
  document.body.style.setProperty("--grid-y", top - origin.top - gap - grid / 2 + "px");
}
