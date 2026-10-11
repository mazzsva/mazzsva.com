import { dragToDismiss } from "./drag.js";
import { alignToGrid } from "./grid.js";
import { animateResize, measure } from "./motion.js";
import { initialState, modes, reduce } from "./store.js";
import { render, visibleResults } from "./view.js";

const dialog = document.querySelector(".sheet");

const view = {
  stage: document.querySelector(".stage"),
  panel: document.querySelector(".panel"),
  list: document.querySelector(".results"),
  sections: [...document.querySelectorAll(".section")],
  symbols: [...document.querySelectorAll(".bar-symbol")],
  filters: [...document.querySelectorAll(".filter")],
  results: [...document.querySelectorAll(".result")],
  actions: [...document.querySelectorAll(".hint-open")],
  sheet: {
    dialog,
    body: dialog.querySelector(".sheet-body"),
    icon: dialog.querySelector(".sheet-icon"),
    title: dialog.querySelector(".sheet-title"),
    detail: dialog.querySelector(".sheet-detail"),
    open: dialog.querySelector(".sheet-open"),
    action: dialog.querySelector(".sheet-action"),
    link: dialog.querySelector(".sheet-link"),
  },
};

const counts = Object.fromEntries(modes.map((mode) => [mode, visibleResults(view, mode).length]));

const keys = {
  ArrowDown: { type: "move", step: 1 },
  ArrowUp: { type: "move", step: -1 },
  ArrowRight: { type: "switch", step: 1 },
  ArrowLeft: { type: "switch", step: -1 },
};

const opensSheet = () => getComputedStyle(view.list).getPropertyValue("--opens").trim() === "sheet";

let state = initialState;
let pointer = null;

function send(action) {
  const next = reduce(state, action, counts);
  if (next === state) return;
  const height = next.mode === state.mode ? null : measure(view.panel, "height");
  state = next;
  render(view, state);
  if (height) animateResize(view.panel, "height", height);
}

const dismiss = () => send({ type: "dismiss" });

const selected = () => visibleResults(view, state.mode)[state.selection];

view.filters.forEach((filter) =>
  filter.addEventListener("click", (event) => {
    if (event.detail) filter.blur();
    send({ type: "show", mode: filter.dataset.mode });
  }),
);

const indexOf = (result) => visibleResults(view, state.mode).indexOf(result);

view.results.forEach((result) => {
  result.addEventListener("focus", () => result.matches(":focus-visible") && send({ type: "select", index: indexOf(result) }));
  result.addEventListener("click", (event) => {
    if (!opensSheet()) return;
    event.preventDefault();
    if (event.detail) result.blur();
    send({ type: "present", index: indexOf(result) });
  });
});

addEventListener("pointermove", (event) => {
  const moved = event.screenX !== pointer?.screenX || event.screenY !== pointer?.screenY;
  pointer = event;
  const result = event.target.closest(".result");
  if (event.pointerType === "mouse" && moved && result) send({ type: "select", index: indexOf(result) });
});

function selectUnderPointer() {
  if (pointer?.pointerType !== "mouse") return;
  const result = document.elementFromPoint(pointer.clientX, pointer.clientY)?.closest(".result");
  if (result) send({ type: "select", index: indexOf(result) });
}

dialog.addEventListener("close", selectUnderPointer);
dialog.addEventListener("click", (event) => event.target === dialog && dismiss());
dialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  dismiss();
});
view.sheet.open.addEventListener("click", dismiss);
dragToDismiss(view.sheet.body, dismiss);

addEventListener("keydown", (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;

  if (keys[event.key]) {
    event.preventDefault();
    send(keys[event.key]);
    return;
  }

  if (event.key === "Enter" && event.repeat) {
    event.preventDefault();
    return;
  }

  const href = selected()?.href;
  if (event.key === "Enter" && href && !event.target.closest("a, button")) {
    event.preventDefault();
    window.open(href, "_blank", "noopener");
    dismiss();
  }
});

addEventListener("resize", () => {
  if (state.presented && !opensSheet()) dismiss();
  const height = view.panel.getAnimations().length ? measure(view.panel, "height") : null;
  alignToGrid(view);
  if (height) animateResize(view.panel, "height", height);
});
document.fonts.ready.then(() => alignToGrid(view));

render(view, state);
alignToGrid(view);

const decoded = [...document.images].filter((image) => image.src).map((image) => image.decode());
const timeout = new Promise((resolve) => setTimeout(resolve, 1000));

Promise.race([Promise.allSettled([document.fonts.ready, ...decoded]), timeout]).then(() => {
  alignToGrid(view);
  document.documentElement.classList.add("is-ready");
});
