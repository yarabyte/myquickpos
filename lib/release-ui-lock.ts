/** Clear Radix UI scroll/pointer locks left behind after route changes. */
export function releaseUiLock() {
  if (typeof document === "undefined") return

  document.body.style.pointerEvents = ""
  document.body.style.overflow = ""
  document.body.removeAttribute("data-scroll-locked")

  document
    .querySelectorAll(
      "[data-radix-dialog-overlay], [data-radix-alert-dialog-overlay]"
    )
    .forEach((el) => el.remove())
}
