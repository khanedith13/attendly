const pad = (number) => String(number).padStart(2, "0");

// "2026-10-07T16:30:00.000Z" -> "2026-10-07" (in the user's own timezone)
export function toDateInput(iso) {
  const date = new Date(iso);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// -> "16:30"
export function toTimeInput(iso) {
  const date = new Date(iso);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// ("2026-10-07", "16:30") -> ISO string
export function toIso(date, time) {
  return new Date(`${date}T${time}`).toISOString();
}

export function todayInput() {
  return toDateInput(new Date().toISOString());
}
