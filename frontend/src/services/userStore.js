import { storage } from "../utils/storage";
import { FIRST, LAST } from "./names";

const USERS_KEY = "attendly_users_v1";
const DAY = 86400000;
const ago = (days) => new Date(Date.now() - days * DAY).toISOString();
const clean = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, "");

// Fake organizer accounts (they cannot log in). `org` holds the numbers shown
// on the admin Organizers screen.
const ORGS = [
  {
    name: "Computer Science Society",
    phone: "+63 918 555 0142",
    status: "active",
    events: 6,
    registrations: 940,
  },
  {
    name: "Business Student Council",
    phone: "+63 919 777 0231",
    status: "pending",
    events: 0,
    registrations: 0,
  },
  {
    name: "Photography Club",
    phone: "+63 915 222 0178",
    status: "pending",
    events: 0,
    registrations: 0,
  },
  {
    name: "Open Mic Collective",
    phone: "+63 917 303 0099",
    status: "suspended",
    events: 2,
    registrations: 120,
  },
  {
    name: "Toastmasters Club",
    phone: "+63 916 410 7788",
    status: "active",
    events: 4,
    registrations: 512,
  },
  {
    name: "Student Council",
    phone: "+63 917 220 4410",
    status: "active",
    events: 9,
    registrations: 1430,
  },
  {
    name: "Career Services",
    phone: "+63 918 600 1200",
    status: "pending",
    events: 0,
    registrations: 0,
  },
];

function seed() {
  // The three demo accounts you can log in with.
  const demo = [
    {
      id: 1,
      name: "Admin",
      email: "admin@school.edu.ph",
      password: "password123",
      role: "admin",
      status: "active",
      joinedAt: ago(120),
    },
    {
      id: 2,
      name: "Delfin Octobre",
      email: "student@school.edu.ph",
      password: "password123",
      role: "student",
      status: "active",
      joinedAt: ago(60),
    },
    {
      id: 3,
      name: "Events Team",
      email: "organizer@school.edu.ph",
      password: "password123",
      role: "organizer",
      status: "active",
      joinedAt: ago(90),
    },
  ];

  const admins = [
    {
      id: 4,
      name: "Paolo Reyes",
      email: "paolo.reyes@school.edu.ph",
      password: null,
      role: "admin",
      status: "active",
      joinedAt: ago(110),
    },
    {
      id: 5,
      name: "Mika Dizon",
      email: "mika.dizon@school.edu.ph",
      password: null,
      role: "admin",
      status: "active",
      joinedAt: ago(100),
    },
  ];

  const students = Array.from({ length: 40 }, (_, i) => {
    const first = FIRST[(i * 7) % FIRST.length];
    const last = LAST[(i * 11 + 3) % LAST.length];
    let status = "active";
    if (i % 9 === 4) status = "pending";
    else if (i % 17 === 8) status = "suspended";

    return {
      id: 1000 + i,
      name: `${first} ${last}`,
      email: `${clean(first)}.${clean(last)}${i}@school.edu.ph`,
      password: null,
      role: "student",
      status,
      joinedAt: ago(1 + ((i * 7) % 90)),
    };
  });

  const organizers = ORGS.map((org, i) => ({
    id: 2000 + i,
    name: `${FIRST[(i * 5) % FIRST.length]} ${LAST[(i * 9) % LAST.length]}`,
    email: `${clean(org.name)}@school.edu.ph`,
    password: null,
    role: "organizer",
    status: org.status,
    joinedAt: ago(10 + i * 7),
    org,
  }));

  return [...demo, ...admins, ...students, ...organizers];
}

export function readUsers() {
  const saved = storage.getJSON(USERS_KEY, null);
  if (saved) return saved;

  const fresh = seed();
  storage.setJSON(USERS_KEY, fresh);
  return fresh;
}

export function saveUsers(users) {
  storage.setJSON(USERS_KEY, users);
}

export const findUserByEmail = (email) => readUsers().find((user) => user.email === email) ?? null;
export const findUserById = (id) => readUsers().find((user) => user.id === id) ?? null;
