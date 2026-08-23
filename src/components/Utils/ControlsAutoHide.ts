const IDLE_MS = 2000;
const VISIBLE_CLASS = "ControlsVisible";

let page: HTMLElement | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let abort: AbortController | null = null;

function hide(): void {
  timer = null;
  if (!page) return;
  if (page.querySelector(".ViewControls:hover")) {
    timer = setTimeout(hide, IDLE_MS);
    return;
  }
  page.classList.remove(VISIBLE_CLASS);
}

function show(): void {
  if (!page) return;
  page.classList.add(VISIBLE_CLASS);
  if (timer) clearTimeout(timer);
  timer = setTimeout(hide, IDLE_MS);
}

export function EnableControlsAutoHide(target: HTMLElement): void {
  DisableControlsAutoHide();
  page = target;
  abort = new AbortController();
  const { signal } = abort;
  target.addEventListener("mousemove", show, { signal });
  target.addEventListener("mousedown", show, { signal });
  target.addEventListener("mouseleave", () => {
    if (timer) clearTimeout(timer);
    timer = null;
    page?.classList.remove(VISIBLE_CLASS);
  }, { signal });
  target.classList.remove(VISIBLE_CLASS);
}

export function DisableControlsAutoHide(): void {
  abort?.abort();
  abort = null;
  if (timer) clearTimeout(timer);
  timer = null;
  page?.classList.remove(VISIBLE_CLASS);
  page = null;
}
