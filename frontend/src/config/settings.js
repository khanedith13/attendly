// live: true = takes effect now. live: false = saved, enforced once the backend exists.
export const settingsTabs = [
  {
    id: "general",
    label: "General",
    sections: [
      {
        title: "General",
        fields: [
          { key: "platformName", type: "text", label: "Platform name", live: false },
          {
            key: "schoolDomain",
            type: "text",
            label: "Allowed school domain",
            hint: "Emails must end with this domain to sign up (without the @).",
            live: true,
          },
        ],
      },
    ],
  },
  {
    id: "registration",
    label: "Registration",
    sections: [
      {
        title: "Registration rules",
        fields: [
          {
            key: "requireSchoolGmail",
            type: "switch",
            label: "Require school Gmail",
            description: "Only verified campus accounts can register",
            live: true,
          },
          {
            key: "allowOrganizerSignup",
            type: "switch",
            label: "Allow organizer sign-ups",
            description: "People can apply for an organizer account themselves",
            live: true,
          },
          {
            key: "requireEventApproval",
            type: "switch",
            label: "Event approval required",
            description: "Admins approve events before students can see them",
            live: true,
          },
        ],
      },
    ],
  },
  {
    id: "attendance",
    label: "Attendance rules",
    sections: [
      {
        title: "Attendance rules",
        fields: [
          {
            key: "lateGraceMinutes",
            type: "number",
            label: "Late grace period (minutes)",
            hint: "Check-ins later than this after the start time are marked late.",
            live: true,
          },
          {
            key: "autoMarkAbsent",
            type: "switch",
            label: "Auto-mark absent",
            description: "Mark no-shows when an event completes",
            live: false,
          },
        ],
      },
    ],
  },
  {
    id: "security",
    label: "Security",
    sections: [
      {
        title: "Security",
        fields: [
          {
            key: "sessionTimeoutMinutes",
            type: "number",
            label: "Session timeout (minutes)",
            hint: "People are signed out after this long without activity.",
            live: false,
          },
          {
            key: "twoFactorAdmins",
            type: "switch",
            label: "Two-factor for admins",
            description: "Require a second step at login",
            live: false,
          },
        ],
      },
    ],
  },
  {
    id: "notifications",
    label: "Notifications",
    sections: [
      {
        title: "Email alerts to admins",
        fields: [
          {
            key: "emailNewOrganizer",
            type: "switch",
            label: "New organizer application",
            description: "Email me when someone applies",
            live: false,
          },
          {
            key: "emailFlaggedEvent",
            type: "switch",
            label: "Flagged event",
            description: "Email me when an event is flagged",
            live: false,
          },
        ],
      },
    ],
  },
];

export const settingFields = settingsTabs.flatMap((tab) =>
  tab.sections.flatMap((section) => section.fields),
);