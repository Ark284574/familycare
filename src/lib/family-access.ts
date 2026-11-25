export type FamilyRole = "owner" | "member";

export function canManageMedicines(role: FamilyRole) {
  return role === "owner";
}

export function canRespondToSos(role: FamilyRole) {
  return role === "owner" || role === "member";
}