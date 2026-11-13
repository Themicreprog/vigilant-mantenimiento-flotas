import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import type { FleetRepository, UserContext, Vehicle } from '../domain/types.js';

const admin: UserContext = { id: 'admin-user', role: 'admin', companyId: 'company-1', fullName: 'Admin' };
const driver: UserContext = { id: 'driver-user', role: 'driver', companyId: 'company-1', fullName: 'Driver' };
const vehicle: Vehicle = { id: 'vehicle-1', company_id: 'company-1', plate: 'P-100', make: 'Toyota', model: 'Hilux', year: 2022, mileage: 1000, status: 'active', created_at: '2026-01-01' };

function fixture() {
  const repo = {
    profile: vi.fn(async (userId: string) => userId === admin.id ? admin : userId === driver.id ? driver : null),
    createVehicle: vi.fn(async (_company: string, input: Omit<Vehicle, 'id' | 'company_id' | 'created_at'>) => ({ ...vehicle, ...input })),
    getVehicle: vi.fn(async () => vehicle),
    isAssigned: vi.fn(async () => false),
    updateVehicle: vi.fn(async () => vehicle),
    listVehicles: vi.fn(async () => []),
    listMaintenances: vi.fn(async () => []),
    listRules: vi.fn(async () => []),
  } as unknown as FleetRepository;
  const app = createApp({ repo, verifyToken: async (token) => token === 'admin-token' ? admin.id : token === 'driver-token' ? driver.id : null });
  return { app, repo };
}

describe('autorización de rutas', () => {
  it('rechaza cambios de flota cuando la sesión pertenece a un conductor', async () => {
    const { app, repo } = fixture();
    await request(app).post('/api/vehicles').set('Authorization', 'Bearer driver-token').send({ plate: 'P-200', make: 'Toyota', model: 'Hilux', year: 2024, mileage: 0 }).expect(403);
    expect(repo.createVehicle).not.toHaveBeenCalled();
  });

  it('permite al administrador crear un vehículo en su empresa', async () => {
    const { app, repo } = fixture();
    await request(app).post('/api/vehicles').set('Authorization', 'Bearer admin-token').send({ plate: 'P-200', make: 'Toyota', model: 'Hilux', year: 2024, mileage: 0 }).expect(201);
    expect(repo.createVehicle).toHaveBeenCalledWith(admin.companyId, expect.objectContaining({ plate: 'P-200' }));
  });

  it('impide que el conductor actualice kilometraje de una unidad no asignada', async () => {
    const { app, repo } = fixture();
    await request(app).post('/api/vehicles/vehicle-1/mileage').set('Authorization', 'Bearer driver-token').send({ mileage: 1200 }).expect(403);
    expect(repo.isAssigned).toHaveBeenCalledWith(driver.id, vehicle.id);
    expect(repo.updateVehicle).not.toHaveBeenCalled();
  });

  it('rechaza solicitudes sin sesión válida', async () => {
    const { app } = fixture();
    await request(app).get('/api/vehicles').expect(401);
    await request(app).get('/api/vehicles').set('Authorization', 'Bearer inválido').expect(401);
  });
});
