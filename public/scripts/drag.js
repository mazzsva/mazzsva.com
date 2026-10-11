const threshold = 6;
const flickWindow = 100;

export function dragToDismiss(element, dismiss) {
  let drag = null;

  element.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse") return;
    drag = { id: event.pointerId, start: event.clientY, y: event.clientY, time: event.timeStamp, velocity: 0, moving: false };
  });

  element.addEventListener("pointermove", (event) => {
    if (drag?.id !== event.pointerId) return;
    const offset = event.clientY - drag.start;
    if (!drag.moving && Math.abs(offset) < threshold) return;
    if (!drag.moving) {
      drag.moving = true;
      element.setPointerCapture(event.pointerId);
      element.style.transition = "none";
    }
    drag.velocity = (event.clientY - drag.y) / Math.max(1, event.timeStamp - drag.time);
    drag.y = event.clientY;
    drag.time = event.timeStamp;
    element.style.transform = `translateY(${offset > 0 ? offset : offset / 8}px)`;
  });

  const release = (event) => {
    if (drag?.id !== event.pointerId) return;
    const { moving, start, velocity, time } = drag;
    drag = null;
    if (!moving) return;
    element.removeAttribute("style");
    const flicked = event.timeStamp - time < flickWindow && velocity > 0.8;
    if (event.clientY - start > element.offsetHeight / 3 || flicked) dismiss();
  };

  element.addEventListener("pointerup", release);
  element.addEventListener("pointercancel", release);
}
