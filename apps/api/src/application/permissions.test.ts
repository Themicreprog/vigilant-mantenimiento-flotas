import { describe, expect, it } from 'vitest';
import { canManageFleet, canReadVehicle, canRecordMileage } from './permissions.js';

describe('permisos por rol', () => {
  it('reserva la gestión de vehículos, mantenimientos y reglas al administrador', () => {
    expect(canManageFleet('admin')).toBe(true);
    expect(canManageFleet('driver')).toBe(false);
  });
  it('permite al conductor consultar y actualizar el kilometraje de sus asignaciones', () => {
    expect(canReadVehicle('driver', true)).toBe(true);
    expect(canReadVehicle('driver', false)).toBe(false);
    expect(canRecordMileage('driver', true)).toBe(true);
    expect(canRecordMileage('driver', false)).toBe(false);
    expect(canRecordMileage('admin', false)).toBe(true);
  });
});
