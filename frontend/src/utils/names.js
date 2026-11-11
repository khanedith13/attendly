// "Delfin Octobre" -> { firstName: "Delfin", lastName: "Octobre" }
export function splitName(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const lastName = parts.length > 1 ? parts.pop() : "";
  return { firstName: parts.join(" "), lastName };
}

export function joinName(firstName, lastName) {
  return `${firstName.trim()} ${lastName.trim()}`.trim();
}
