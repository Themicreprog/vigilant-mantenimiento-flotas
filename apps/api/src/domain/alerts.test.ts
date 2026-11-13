import { describe, expect, it } from 'vitest';
import { buildAlerts } from './alerts.js';
import type { Maintenance, MaintenanceRule, Vehicle } from './types.js';

const vehicle: Vehicle = { id: 'v1', company_id: 'c1', plate: 'P-100', make: 'Toyota', model: 'Hilux', year: 2022, mileage: 12_400, status: 'active', created_at: '2026-01-01' };
const rule: MaintenanceRule = { id: 'r1', company_id: 'c1', type: 'Aceite', interval_km: 10_000, interval_days: 180, lead_km: 1_000, lead_days: 14, active: true };
const lastService: Maintenance = { id: 'm1', company_id: 'c1', vehicle_id: 'v1', service_date: '2026-01-01', mileage: 3_000, type: 'Aceite', cost: 1200, workshop: 'Demo', notes: null };

describe('buildAlerts', () => {
  it('marca como próximo cuando el vehículo entra en el margen configurado', () => {
    expect(buildAlerts([vehicle], [lastService], [rule], new Date('2026-06-01')).map((alert) => alert.status)).toContain('Próximo');
  });

  it('marca como vencido cuando supera el intervalo de kilometraje', () => {
    const beyond = { ...vehicle, mileage: 14_500 };
    expect(buildAlerts([beyond], [lastService], [{ ...rule, interval_days: null }], new Date('2026-06-01'))[0]?.status).toBe('Vencido');
  });

  it('omite reglas desactivadas o mantenimientos sin antecedente', () => {
    expect(buildAlerts([vehicle], [], [rule], new Date('2026-06-01'))).toHaveLength(0);
    expect(buildAlerts([vehicle], [lastService], [{ ...rule, active: false }], new Date('2026-06-01'))).toHaveLength(0);
  });
});
