const SESSION_KEY = "attendly_session";
const MOCK_USERS_KEY = "attendly_mock_users";

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

// "Remember me" keeps the session after the browser closes (localStorage).
// Without it the session lives only in this tab (sessionStorage).
function readSession() {
  for (const store of [localStorage, sessionStorage]) {
    try {
      const raw = store.getItem(SESSION_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore broken data
    }
  }
  return { token: null, user: null };
}

export const storage = {
  getSession: readSession,
  setSession: (session, { remember = true } = {}) => {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(session));
  },
  clearSession: () => {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  }
}