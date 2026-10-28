import "./RoleTabs.css";

const roles = [
  { value: "student", label: "Student" },
  { value: "organizer", label: "Organizer" },
  { value: "admin", label: "Admin" },
];

export default function RoleTabs({ value, onChange }) {
  return (
    <div className="role-tabs">
      {roles.map((role) => (
        <button
          key={role.value}
          type="button"
          aria-pressed={value === role.value}
          className={value === role.value ? "role-tab role-tab--active" : "role-tab"}
          onClick={() => onChange(role.value)}
        >
          {role.label}
        </button>
      ))}
    </div>
  );
}
