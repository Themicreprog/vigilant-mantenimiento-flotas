import type { Role } from '../domain/types.js';

export function canManageFleet(role: Role): boolean { return role === 'admin'; }
export function canRecordMileage(role: Role, assigned: boolean): boolean { return role === 'admin' || (role === 'driver' && assigned); }
export function canReadVehicle(role: Role, assigned: boolean): boolean { return role === 'admin' || (role === 'driver' && assigned); }
