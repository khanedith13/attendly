import { ApiError } from "../api/ApiError";
import { storage } from "../utils/storage";

const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

// Same demo accounts the backend seeder will create later.
const seedUsers = [
  { id: 1, name: "Admin", email: "admin@school.edu.ph", password: "password123", role: "admin" },
  {
    id: 2,
    name: "Delfin Octobre",
    email: "student@school.edu.ph",
    password: "password123",
    role: "student",
  },
  {
    id: 3,
    name: "Events Team",
    email: "organizer@school.edu.ph",
    password: "password123",
    role: "organizer",
  },
];

const OVERRIDES_KEY = "attendly_user_overrides";
const readOverrides = () => storage.getJSON(OVERRIDES_KEY, {});

// Edits made on My Account (name, password) are layered on top of the base users.
const allUsers = () => {
  const overrides = readOverrides();
  return [...seedUsers, ...storage.getMockUsers()].map((user) => ({
    ...user,
    ...overrides[user.id],
  }));
};

function publicUser({ id, name, email, role }) {
  return { id, name, email, role };
}

export async function login({ email, password }) {
  await delay();
  const found = allUsers().find((u) => u.email === email.trim().toLowerCase());

  if (!found || found.password !== password) {
    throw new ApiError("Invalid email or password.", 422, {
      email: ["Invalid email or password."],
    });
  }

  const user = publicUser(found);
  const token = `mock-token-${found.id}`;
  storage.setSession({ token, user });
  return { user, token };
}

export async function register(data) {
  await delay();
  const email = data.email.trim().toLowerCase();

  if (data.role === "admin") {
    throw new ApiError("Validation failed.", 422, {
      role: ["Admin accounts are created by the system administrator."],
    });
  }

  if (allUsers().some((u) => u.email === email)) {
    throw new ApiError("Validation failed.", 422, {
      email: ["An account with this email already exists."],
    });
  }

  const created = {
    id: Date.now(),
    name: `${data.firstName.trim()} ${data.lastName.trim()}`,
    email,
    password: data.password,
    role: data.role,
  };
  storage.setMockUsers([...storage.getMockUsers(), created]);
  return { user: publicUser(created) };
}

export async function logout() {
  await delay(100);
  storage.clearSession();
}

export async function getCurrentUser() {
  const { token, user } = storage.getSession();
  return token ? user : null;
}

export async function updateProfile(userId, { name }) {
  const overrides = readOverrides();
  storage.setJSON(OVERRIDES_KEY, { ...overrides, [userId]: { ...overrides[userId], name } });

  const session = storage.getSession();
  if (session.user?.id === userId) {
    storage.setSession({ ...session, user: { ...session.user, name } });
  }
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const found = allUsers().find((user) => user.id === userId);

  if (!found || found.password !== currentPassword) {
    throw new ApiError("Validation failed.", 422, {
      currentPassword: ["Current password is incorrect."],
    });
  }

  const overrides = readOverrides();
  storage.setJSON(OVERRIDES_KEY, {
    ...overrides,
    [userId]: { ...overrides[userId], password: newPassword },
  });
}
