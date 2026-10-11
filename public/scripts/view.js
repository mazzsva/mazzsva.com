export const visibleResults = (view, mode) =>
  view.results.filter((result) => mode === "all" || result.closest(".section").dataset.mode === mode);

const text = (result, part) => result.querySelector(part).textContent;

const address = (href) => {
  const url = new URL(href);
  return url.hostname.replace(/^www\./, "") + url.pathname.replace(/\/$/, "");
};

const settled = (element) => Promise.allSettled(element.getAnimations({ subtree: true }).map((animation) => animation.finished));

function presentSheet(sheet, result) {
  sheet.icon.src = result.querySelector(".result-icon").src;
  sheet.title.textContent = text(result, ".result-title");
  sheet.detail.textContent = text(result, ".result-detail");
  sheet.action.textContent = result.href ? `Open on ${text(result, ".result-action")}` : text(result, ".result-action");
  sheet.link.textContent = result.href ? address(result.href) : "";
  if (result.href) sheet.open.href = result.href;
  else sheet.open.removeAttribute("href");
  sheet.dialog.classList.remove("is-closing");
  if (!sheet.dialog.open) sheet.dialog.showModal();
}

function dismissSheet({ dialog }) {
  if (!dialog.open || dialog.classList.contains("is-closing")) return;
  dialog.classList.add("is-closing");
  settled(dialog).then(() => {
    if (!dialog.classList.contains("is-closing")) return;
    dialog.classList.remove("is-closing");
    dialog.close();
  });
}

export function render(view, state) {
  view.sections.forEach((section) => (section.hidden = state.mode !== "all" && section.dataset.mode !== state.mode));
  view.symbols.forEach((symbol) => symbol.classList.toggle("is-active", symbol.dataset.mode === state.mode));
  view.filters.forEach((filter) => filter.setAttribute("aria-pressed", filter.dataset.mode === state.mode));
  const pressed = view.filters.find((filter) => filter.dataset.mode === state.mode);
  if (view.filters.includes(document.activeElement)) pressed.focus({ preventScroll: true });
  const selected = visibleResults(view, state.mode)[state.selection];
  view.results.forEach((result) => result.classList.toggle("is-selected", result === selected));
  if (selected && view.results.includes(document.activeElement)) selected.focus({ preventScroll: true });
  view.actions.forEach((action) => action.classList.toggle("is-disabled", !selected?.href));
  if (state.presented) presentSheet(view.sheet, selected);
  else dismissSheet(view.sheet);
}
