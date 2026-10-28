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

const allUsers = () => [...seedUsers, ...storage.getMockUsers()];

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