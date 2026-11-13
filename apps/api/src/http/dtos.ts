import { z } from 'zod';

export const vehicleDto = z.object({
  plate: z.string().trim().min(2).max(16),
  make: z.string().trim().min(1).max(60),
  model: z.string().trim().min(1).max(60),
  year: z.number().int().min(1950).max(new Date().getFullYear() + 2),
  mileage: z.number().int().nonnegative(),
  status: z.enum(['active', 'maintenance', 'inactive']).default('active'),
});

export const mileageDto = z.object({ mileage: z.number().int().nonnegative() });

export const maintenanceDto = z.object({
  vehicle_id: z.string().uuid(),
  service_date: z.iso.date(),
  mileage: z.number().int().nonnegative(),
  type: z.enum(['Aceite', 'Frenos', 'Llantas', 'Inspección', 'Batería', 'Otro']),
  cost: z.number().nonnegative(),
  workshop: z.string().trim().min(1).max(120),
  notes: z.string().max(2000).nullable().optional(),
});

export const maintenanceUpdateDto = maintenanceDto.omit({ vehicle_id: true }).partial();

export const maintenanceRuleUpdateDto = z.object({
  interval_km: z.number().int().positive().nullable().optional(),
  interval_days: z.number().int().positive().nullable().optional(),
  lead_km: z.number().int().nonnegative().optional(),
  lead_days: z.number().int().nonnegative().optional(),
  active: z.boolean().optional(),
});
