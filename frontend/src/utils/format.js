export function getGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function isToday(iso) {
  return new Date(iso).toDateString() === new Date().toDateString();
}

export function formatShortDateTime(iso) {
  const date = new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${date}, ${formatTime(iso)}`;
}

export function formatDuration(ms) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}