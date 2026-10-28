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

export const storage = {
  getSession: () => read(SESSION_KEY, { token: null, user: null }),
  setSession: (session) => localStorage.setItem(SESSION_KEY, JSON.stringify(session)),
  clearSession: () => localStorage.removeItem(SESSION_KEY),

  // Mock only: accounts created through the Register form
  getMockUsers: () => read(MOCK_USERS_KEY, []),
  setMockUsers: (users) => localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users)),
};
