import type { Role } from './roles'

// Zrkadlí RLS policies v supabase/migrations — tu iba kvôli skrytiu ovládacích prvkov.
// Platí rovnako pre techniku aj cases.

export function canEditInventory(role: Role) {
  return role !== 'viewer'
}

export function canDeleteInventory(role: Role) {
  return role === 'admin' || role === 'skladnik'
}

/** Objednávky a nákupné ceny. */
export function canManageOrders(role: Role) {
  return role === 'admin' || role === 'skladnik'
}

export function canDeleteOrders(role: Role) {
  return role === 'admin'
}

/** Vozidlá a ich termíny upravuje admin a skladník; mazať smie iba admin. */
export function canManageVehicles(role: Role) {
  return role === 'admin' || role === 'skladnik'
}

export function canDeleteVehicles(role: Role) {
  return role === 'admin'
}

/** Záznam o prevádzke (tankovanie, servis) môže pridať každý okrem viewera. */
export function canLogVehicle(role: Role) {
  return role !== 'viewer'
}
