export type Role = 'admin' | 'driver';
export type ViewName = 'overview' | 'vehicles' | 'maintenance' | 'alerts' | 'reports' | 'settings';
export type ServiceType = 'Aceite' | 'Frenos' | 'Llantas' | 'Inspección' | 'Batería' | 'Otro';

export interface Vehicle {
  id: string; plate: string; make: string; model: string; year: number; mileage: number;
  status: 'active' | 'maintenance' | 'inactive'; assignedTo?: string;
}
export interface Maintenance {
  id: string; vehicle_id: string; service_date: string; mileage: number; type: ServiceType;
  cost: number; workshop: string; notes: string | null;
}
export interface Rule {
  id: string; type: ServiceType; interval_km: number | null; interval_days: number | null;
  lead_km: number; lead_days: number; active: boolean;
}
export interface Alert {
  vehicleId: string; plate: string; vehicleName: string; type: ServiceType;
  status: 'Vencido' | 'Próximo'; dueBy: 'kilometraje' | 'fecha'; remaining: number; dueLabel: string;
}
export interface AppConfig { apiBaseUrl: string; supabaseUrl: string; supabaseAnonKey: string; }
export interface UserProfile { id: string; role: Role; companyId: string; fullName: string; }
