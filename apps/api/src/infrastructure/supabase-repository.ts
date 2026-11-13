import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { FleetRepository, Maintenance, MaintenanceRule, Role, UserContext, Vehicle } from '../domain/types.js';

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null) throw new Error('Registro no encontrado');
  return result.data;
}

export class SupabaseFleetRepository implements FleetRepository {
  private readonly db: SupabaseClient;

  constructor(url: string, serviceRoleKey: string) {
    this.db = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  }

  async profile(userId: string): Promise<UserContext | null> {
    const { data, error } = await this.db.from('profiles').select('id, role, company_id, full_name').eq('id', userId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data?.company_id || (data.role !== 'admin' && data.role !== 'driver')) return null;
    return { id: data.id, role: data.role as Role, companyId: data.company_id, fullName: data.full_name ?? '' };
  }

  async listVehicles(companyId: string, userId: string, role: Role): Promise<Vehicle[]> {
    if (role === 'admin') {
      const { data, error } = await this.db.from('vehicles').select('*').eq('company_id', companyId).order('plate');
      if (error) throw new Error(error.message);
      return data ?? [];
    }
    const { data: assignments, error: assignmentError } = await this.db.from('vehicle_assignments').select('vehicle_id').eq('user_id', userId);
    if (assignmentError) throw new Error(assignmentError.message);
    const ids = (assignments ?? []).map((row) => row.vehicle_id);
    if (!ids.length) return [];
    const { data, error } = await this.db.from('vehicles').select('*').eq('company_id', companyId).in('id', ids).order('plate');
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async getVehicle(companyId: string, vehicleId: string): Promise<Vehicle | null> {
    const { data, error } = await this.db.from('vehicles').select('*').eq('company_id', companyId).eq('id', vehicleId).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }

  async createVehicle(companyId: string, input: Omit<Vehicle, 'id' | 'company_id' | 'created_at'>): Promise<Vehicle> {
    return unwrap(await this.db.from('vehicles').insert({ ...input, company_id: companyId }).select('*').single());
  }

  async updateVehicle(companyId: string, vehicleId: string, input: Partial<Pick<Vehicle, 'plate' | 'make' | 'model' | 'year' | 'mileage' | 'status'>>): Promise<Vehicle> {
    return unwrap(await this.db.from('vehicles').update(input).eq('company_id', companyId).eq('id', vehicleId).select('*').single());
  }

  async deleteVehicle(companyId: string, vehicleId: string): Promise<void> {
    const result = await this.db.from('vehicles').delete().eq('company_id', companyId).eq('id', vehicleId);
    if (result.error) throw new Error(result.error.message);
  }

  async listMaintenances(companyId: string, vehicleId?: string): Promise<Maintenance[]> {
    let query = this.db.from('maintenances').select('*').eq('company_id', companyId).order('service_date', { ascending: false });
    if (vehicleId) query = query.eq('vehicle_id', vehicleId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async createMaintenance(input: Omit<Maintenance, 'id'>): Promise<Maintenance> {
    return unwrap(await this.db.from('maintenances').insert(input).select('*').single());
  }

  async updateMaintenance(companyId: string, id: string, input: Partial<Omit<Maintenance, 'id' | 'vehicle_id'>>): Promise<Maintenance> {
    return unwrap(await this.db.from('maintenances').update(input).eq('company_id', companyId).eq('id', id).select('*').single());
  }

  async deleteMaintenance(companyId: string, id: string): Promise<void> {
    const result = await this.db.from('maintenances').delete().eq('company_id', companyId).eq('id', id).select('id');
    if (result.error) throw new Error(result.error.message);
    if (!result.data?.length) throw new Error('Registro no encontrado');
  }

  async listRules(companyId: string): Promise<MaintenanceRule[]> {
    const { data, error } = await this.db.from('maintenance_rules').select('*').eq('company_id', companyId).order('type');
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async updateRule(companyId: string, id: string, input: Partial<Pick<MaintenanceRule, 'interval_km' | 'interval_days' | 'lead_km' | 'lead_days' | 'active'>>): Promise<MaintenanceRule> {
    return unwrap(await this.db.from('maintenance_rules').update(input).eq('company_id', companyId).eq('id', id).select('*').single());
  }

  async isAssigned(userId: string, vehicleId: string): Promise<boolean> {
    const { data, error } = await this.db.from('vehicle_assignments').select('vehicle_id').eq('user_id', userId).eq('vehicle_id', vehicleId).maybeSingle();
    if (error) throw new Error(error.message);
    return Boolean(data);
  }
}
