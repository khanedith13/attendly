import api from "../api/axios";
import { storage } from "../utils/storage";

export async function login({ email, password, remember = true }) {
  const { data } = await api.post("/auth/login", {
    email: email.trim().toLowerCase(),
    password,
    remember,
  });

  storage.setSession(
    {
      token: data.token,
      user: data.user,
    },
    { remember },
  );

  return data;
}

export async function register(data) {
  const { data: result } = await api.post("/auth/register", data);

  return result;
}

export async function logout() {
  try {
    await api.post("/auth/logout");
  } finally {
    storage.clearSession();
  }
}

export async function getCurrentUser() {
  const { token, user } = storage.getSession();

  if (!token) {
    return null;
  }

  try {
    const { data } = await api.get("/auth/me");

    return data.user;
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      storage.clearSession();

      return null;
    }

    // If the server is temporarily unreachable, retain the saved session.
    return user;
  }
}

// The server answers 202 for every email, so an error here is a real problem
// (offline, rate limited) and is shown to the person.
export async function requestPasswordReset(email) {
  await api.post("/auth/forgot-password", {
    email: email.trim().toLowerCase(),
  });
}

export async function resetPassword({
  token,
  email,
  password,
  password_confirmation,
}) {
  const { data } = await api.post("/auth/reset-password", {
    token,
    email: email.trim().toLowerCase(),
    password,
    password_confirmation,
  });

  return data;
}