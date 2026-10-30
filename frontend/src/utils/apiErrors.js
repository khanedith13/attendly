export function firstErrors(errors = {}) {
  return Object.fromEntries(
    Object.entries(errors).map(([field, messages]) => [field, messages[0]]),
  );
}

// { title: "Required." } -> { title: ["Required."] }  (the shape Laravel sends)
export function toApiErrors(errors) {
  return Object.fromEntries(Object.entries(errors).map(([field, message]) => [field, [message]]));
}