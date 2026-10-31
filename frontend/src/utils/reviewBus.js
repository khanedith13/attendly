const listeners = new Set();

export function notifyReviewsChanged() {
  listeners.forEach((listener) => listener());
}

export function subscribeReviews(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
