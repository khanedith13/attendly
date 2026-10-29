import { useEffect } from "react";
import { useOutletContext } from "react-router-dom";

// A page calls this to show a status pill in the topbar. Empty text removes it.
export function useTopbarBadge(tone, text) {
  const { setBadge } = useOutletContext();

  useEffect(() => {
    setBadge(text ? { tone, text } : null);
    return () => setBadge(null);
  }, [setBadge, tone, text]);
}