import { useEffect } from "react";
import { useOutletContext } from "react-router-dom";

// Show a status pill in the topbar. Empty text removes it.
export function useTopbarBadge(tone, text) {
  const { setBadge } = useOutletContext();

  useEffect(() => {
    setBadge(text ? { tone, text } : null);
    return () => setBadge(null);
  }, [setBadge, tone, text]);
}

// Show an icon button (instead of the bell) in the topbar.
export function useTopbarIcon(icon) {
  const { setBadge } = useOutletContext();

  useEffect(() => {
    setBadge({ icon });
    return () => setBadge(null);
  }, [setBadge, icon]);
}

// Hide the bell/pill so only the avatar shows.
export function useTopbarNone() {
  const { setBadge } = useOutletContext();

  useEffect(() => {
    setBadge({ hidden: true });
    return () => setBadge(null);
  }, [setBadge]);
}
