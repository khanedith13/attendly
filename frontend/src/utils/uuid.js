// crypto.randomUUID only exists on https:// and localhost. This fallback keeps the
// app working when it is opened over plain http (for example from a phone on your Wi-Fi).
export function uuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    return (char === "x" ? random : (random & 0x3) | 0x8).toString(16);
  });
}
