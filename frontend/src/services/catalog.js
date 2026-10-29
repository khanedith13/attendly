// offsetDays: 0 = today, 3 = three days from now
export function dayAt(offsetDays, hour, minute) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

const base = [
  {
    id: 101,
    title: "AI & Future Skills Summit",
    venue: "Innovation Hall",
    campus: "Main Campus",
    day: 0,
    time: [16, 30],
    capacity: 300,
    registered: 118,
    category: "Technology",
    organizer: "Computer Science Society",
    tone: "violet",
  },
  {
    id: 102,
    title: "Toastmasters Leadership Lab",
    venue: "Room 204",
    campus: "Business Building",
    day: 3,
    time: [9, 0],
    capacity: 120,
    registered: 96,
    category: "Leadership",
    organizer: "Toastmasters Club",
    tone: "green",
  },
  {
    id: 103,
    title: "Talent Acquisition 101",
    venue: "Career Center",
    campus: "Main Campus",
    day: 5,
    time: [13, 0],
    capacity: 200,
    registered: 150,
    category: "Career",
    organizer: "Career Services",
    tone: "amber",
  },
  {
    id: 104,
    title: "Student Innovation Expo",
    venue: "Grand Atrium",
    campus: "Main Campus",
    day: 8,
    time: [10, 30],
    capacity: 500,
    registered: 320,
    category: "Technology",
    organizer: "Events Team",
    tone: "blue",
  },
  {
    id: 105,
    title: "Campus Volunteer Day",
    venue: "Community Hall",
    campus: "South Campus",
    day: 11,
    time: [14, 0],
    capacity: 160,
    registered: 88,
    category: "Community",
    organizer: "Student Council",
    tone: "green",
  },
  {
    id: 106,
    title: "Digital Skills Bootcamp",
    venue: "Computer Lab 3",
    campus: "Tech Building",
    day: 14,
    time: [8, 30],
    capacity: 80,
    registered: 52,
    category: "Technology",
    organizer: "Computer Science Society",
    tone: "violet",
  },
];

export function getCatalog() {
  return base.map(({ day, time, ...event }) => ({
    ...event,
    startsAt: dayAt(day, time[0], time[1]),
  }));
}

export function getCatalogEvent(id) {
  return getCatalog().find((event) => event.id === id) ?? null;
}
