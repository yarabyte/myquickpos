/** Safari < 14 and some WebViews only support MediaQueryList.addListener. */
export function subscribeMediaQuery(
  query: MediaQueryList,
  handler: () => void
): () => void {
  if (typeof query.addEventListener === "function") {
    query.addEventListener("change", handler)
    return () => query.removeEventListener("change", handler)
  }

  query.addListener(handler)
  return () => query.removeListener(handler)
}
