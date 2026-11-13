export type Role = 'admin' | 'driver';
export type MaintenanceType = 'Aceite' | 'Frenos' | 'Llantas' | 'Inspección' | 'Batería' | 'Otro';

export interface UserContext {
  id: string;
  role: Role;
  companyId: string;
  fullName: string;
}

export interface Vehicle {
  id: string;
  company_id: string;
  plate: string;
  make: string;
  model: string;
  year: number;
  mileage: number;
  status: 'active' | 'maintenance' | 'inactive';
  created_at: string;
}

export interface Maintenance {
  id: string;
  company_id: string;
  vehicle_id: string;
  service_date: string;
  mileage: number;
  type: MaintenanceType;
  cost: number;
  workshop: string;
  notes: string | null;
}

export interface MaintenanceRule {
  id: string;
  company_id: string;
  type: MaintenanceType;
  interval_km: number | null;
  interval_days: number | null;
  lead_km: number;
  lead_days: number;
  active: boolean;
}

export interface MaintenanceAlert {
  vehicleId: string;
  plate: string;
  vehicleName: string;
  type: MaintenanceType;
  status: 'Vencido' | 'Próximo';
  dueBy: 'kilometraje' | 'fecha';
  remaining: number;
  dueLabel: string;
}

export interface FleetRepository {
  profile(userId: string): Promise<UserContext | null>;
  listVehicles(companyId: string, userId: string, role: Role): Promise<Vehicle[]>;
  getVehicle(companyId: string, vehicleId: string): Promise<Vehicle | null>;
  createVehicle(companyId: string, input: Omit<Vehicle, 'id' | 'company_id' | 'created_at'>): Promise<Vehicle>;
  updateVehicle(companyId: string, vehicleId: string, input: Partial<Pick<Vehicle, 'plate' | 'make' | 'model' | 'year' | 'mileage' | 'status'>>): Promise<Vehicle>;
  deleteVehicle(companyId: string, vehicleId: string): Promise<void>;
  listMaintenances(companyId: string, vehicleId?: string): Promise<Maintenance[]>;
  createMaintenance(input: Omit<Maintenance, 'id'>): Promise<Maintenance>;
  updateMaintenance(companyId: string, id: string, input: Partial<Omit<Maintenance, 'id' | 'vehicle_id'>>): Promise<Maintenance>;
  deleteMaintenance(companyId: string, id: string): Promise<void>;
  listRules(companyId: string): Promise<MaintenanceRule[]>;
  updateRule(companyId: string, id: string, input: Partial<Pick<MaintenanceRule, 'interval_km' | 'interval_days' | 'lead_km' | 'lead_days' | 'active'>>): Promise<MaintenanceRule>;
  isAssigned(userId: string, vehicleId: string): Promise<boolean>;
}
