import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import type { Alert, Maintenance, Role, Rule, ServiceType, UserProfile, Vehicle, ViewName } from './models';

const DEMO_KEY = 'vigilant-demo-v1';
const today = new Date();
const daysAgo = (days: number) => { const date = new Date(); date.setDate(date.getDate() - days); return date.toISOString().slice(0, 10); };
const DEMO_VEHICLES: Vehicle[] = [
  { id: 'v1', plate: 'PAA-1842', make: 'Toyota', model: 'Hilux', year: 2022, mileage: 68420, status: 'active', assignedTo: 'Carlos M.' },
  { id: 'v2', plate: 'PBB-2916', make: 'Isuzu', model: 'D-Max', year: 2021, mileage: 91380, status: 'active', assignedTo: 'Ana L.' },
  { id: 'v3', plate: 'PCC-3705', make: 'Nissan', model: 'Frontier', year: 2023, mileage: 42110, status: 'maintenance', assignedTo: 'Carlos M.' },
  { id: 'v4', plate: 'PDD-4488', make: 'Hyundai', model: 'H-1', year: 2020, mileage: 127500, status: 'active', assignedTo: 'Luis R.' },
  { id: 'v5', plate: 'PEE-5021', make: 'Mitsubishi', model: 'L200', year: 2024, mileage: 26860, status: 'active', assignedTo: 'Ana L.' },
];
const DEMO_MAINTENANCE: Maintenance[] = [
  { id: 'm1', vehicle_id: 'v1', service_date: daysAgo(155), mileage: 58400, type: 'Aceite', cost: 2450, workshop: 'Taller Central', notes: 'Servicio preventivo y cambio de filtro.' },
  { id: 'm2', vehicle_id: 'v1', service_date: daysAgo(92), mileage: 61200, type: 'Frenos', cost: 6800, workshop: 'Frenos del Norte', notes: 'Pastillas delanteras.' },
  { id: 'm3', vehicle_id: 'v2', service_date: daysAgo(202), mileage: 81380, type: 'Aceite', cost: 2720, workshop: 'Taller Rivera', notes: 'Cambio de aceite y revisión general.' },
  { id: 'm4', vehicle_id: 'v2', service_date: daysAgo(45), mileage: 89400, type: 'Llantas', cost: 12800, workshop: 'Llantas Express', notes: 'Reemplazo de dos llantas.' },
  { id: 'm5', vehicle_id: 'v3', service_date: daysAgo(100), mileage: 38110, type: 'Aceite', cost: 2300, workshop: 'Servicio Oriente', notes: 'Mantenimiento periódico.' },
  { id: 'm6', vehicle_id: 'v3', service_date: daysAgo(25), mileage: 40800, type: 'Inspección', cost: 950, workshop: 'Servicio Oriente', notes: 'Diagnóstico de vibración en rueda.' },
  { id: 'm7', vehicle_id: 'v4', service_date: daysAgo(196), mileage: 117500, type: 'Aceite', cost: 2950, workshop: 'Taller Central', notes: 'Servicio preventivo.' },
  { id: 'm8', vehicle_id: 'v5', service_date: daysAgo(72), mileage: 19860, type: 'Aceite', cost: 2350, workshop: 'Autocentro Valle', notes: 'Servicio de rutina.' },
];
const DEFAULT_RULES: Rule[] = [
  { id: 'r1', type: 'Aceite', interval_km: 10000, interval_days: 180, lead_km: 1200, lead_days: 21, active: true },
  { id: 'r2', type: 'Frenos', interval_km: 30000, interval_days: 365, lead_km: 2500, lead_days: 30, active: true },
  { id: 'r3', type: 'Llantas', interval_km: 45000, interval_days: 730, lead_km: 3000, lead_days: 45, active: true },
  { id: 'r4', type: 'Inspección', interval_km: null, interval_days: 90, lead_km: 0, lead_days: 14, active: true },
  { id: 'r5', type: 'Batería', interval_km: 50000, interval_days: 1095, lead_km: 3000, lead_days: 60, active: true },
];

@Component({
  selector: 'vg-root', standalone: true, imports: [CommonModule, FormsModule], templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  readonly today = new Date();
  readonly yearMax = new Date().getFullYear() + 2;
  view: ViewName = 'overview';
  role: Role = 'admin';
  userName = 'Equipo de flota';
  realSession = false;
  vehicles: Vehicle[] = [];
  maintenances: Maintenance[] = [];
  rules: Rule[] = [];
  alerts: Alert[] = [];
  search = '';
  activeModal: 'vehicle' | 'maintenance' | 'mileage' | 'login' | null = null;
  editingId = '';
  selectedVehicleId = '';
  mobileMenu = false;
  toast = '';
  busy = false;
  error = '';
  loginEmail = '';
  loginPassword = '';
  dateFrom = '';
  dateTo = '';
  vehicleDraft: Partial<Vehicle> = {};
  maintenanceDraft: Partial<Maintenance> = {};
  mileageDraft = 0;

  constructor(private readonly api: ApiService, readonly auth: AuthService) {}

  async ngOnInit() {
    const profile = await this.auth.initialize();
    if (profile) await this.useProfile(profile);
    else this.loadDemo();
  }

  get isAdmin() { return this.role === 'admin'; }
  get roleVehicles() { return this.realSession || this.isAdmin ? this.vehicles : this.vehicles.filter((v) => ['v1', 'v2'].includes(v.id)); }
  get visibleVehicles() {
    const term = this.search.toLowerCase().trim();
    return this.roleVehicles.filter((v) => !term || `${v.plate} ${v.make} ${v.model} ${v.assignedTo ?? ''}`.toLowerCase().includes(term));
  }
  get visibleMaintenances() {
    const rows = this.realSession && this.role === 'driver' ? this.maintenances : !this.realSession && this.role === 'driver' ? this.maintenances.filter((m) => ['v1', 'v2'].includes(m.vehicle_id)).map(({ cost: _cost, ...m }) => ({ ...m, cost: 0 })) : this.maintenances;
    return [...rows].sort((a, b) => b.service_date.localeCompare(a.service_date));
  }
  get totalCosts() { return this.isAdmin ? this.maintenances.reduce((sum, item) => sum + Number(item.cost), 0) : 0; }
  get yearCosts() { const year = new Date().getFullYear(); return this.isAdmin ? this.maintenances.filter((m) => new Date(`${m.service_date}T00:00:00`).getFullYear() === year).reduce((sum, item) => sum + Number(item.cost), 0) : 0; }
  get activeCount() { return this.roleVehicles.filter((item) => item.status === 'active').length; }
  get inactiveCount() { return this.roleVehicles.filter((item) => item.status === 'inactive').length; }
  get activeRules() { return this.rules.filter((item) => item.active).length; }
  get overdueAlerts() { return this.alerts.filter((item) => item.status === 'Vencido'); }
  get upcomingAlerts() { return this.alerts.filter((item) => item.status === 'Próximo'); }
  get totalSpend() { return this.totalCosts; }
  get recentMaintenances() { return this.visibleMaintenances.slice(0, 5); }
  get searchedMaintenances() { const term = this.search.toLowerCase().trim(); return this.visibleMaintenances.filter((m) => !term || `${m.type} ${m.workshop} ${this.vehiclePlate(m.vehicle_id)} ${this.vehicleName(m.vehicle_id)}`.toLowerCase().includes(term)); }
  get periodMaintenance() { return this.visibleMaintenances.filter((m) => (!this.dateFrom || m.service_date >= this.dateFrom) && (!this.dateTo || m.service_date <= this.dateTo)); }
  get periodCosts() { return this.isAdmin ? this.periodMaintenance.reduce((sum, item) => sum + Number(item.cost), 0) : 0; }
  get periodCostsByVehicle() { return this.roleVehicles.map((vehicle) => ({ vehicle, total: this.periodMaintenance.filter((m) => m.vehicle_id === vehicle.id).reduce((sum, item) => sum + Number(item.cost), 0) })).sort((a, b) => b.total - a.total); }
  get periodFrequency() { const counts = new Map<ServiceType, number>(); for (const item of this.periodMaintenance) counts.set(item.type, (counts.get(item.type) ?? 0) + 1); return [...counts].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count); }
  get maxFrequency() { return Math.max(0, ...this.periodFrequency.map((item) => item.count)); }
  get maxMonthly() { return Math.max(0, ...this.monthlySpend.map((month) => month.total)); }
  get costsByVehicle() { return this.vehicles.map((v) => ({ vehicle: v, total: this.maintenances.filter((m) => m.vehicle_id === v.id).reduce((sum, m) => sum + Number(m.cost), 0) })).sort((a, b) => b.total - a.total); }
  get monthlySpend() {
    const months = Array.from({ length: 6 }, (_, index) => { const date = new Date(); date.setMonth(date.getMonth() - (5 - index)); return { key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`, label: date.toLocaleDateString('es-HN', { month: 'short' }).replace('.', '') }; });
    const totals = months.map((month) => this.maintenances.filter((m) => m.service_date.startsWith(month.key)).reduce((sum, item) => sum + Number(item.cost), 0));
    const max = Math.max(1, ...totals);
    return months.map((month, index) => ({ ...month, total: totals[index], height: Math.max(8, Math.round((totals[index] / max) * 100)) }));
  }
  get frequency() { const map = new Map<ServiceType, number>(); for (const item of this.maintenances) if ((!this.dateFrom || item.service_date >= this.dateFrom) && (!this.dateTo || item.service_date <= this.dateTo)) map.set(item.type, (map.get(item.type) ?? 0) + 1); return [...map].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count); }
  get selectedVehicle() { return this.vehicles.find((item) => item.id === this.selectedVehicleId); }
  get filteredAlerts() { return this.role === 'driver' && !this.realSession ? this.alerts.filter((a) => ['v1', 'v2'].includes(a.vehicleId)) : this.alerts; }

  async setView(view: ViewName) { this.view = view; this.mobileMenu = false; }
  async switchDemoRole(role: Role) { if (this.realSession) return; this.role = role; this.userName = role === 'admin' ? 'Equipo de flota' : 'Carlos Martínez'; await this.refreshAlerts(); }
  async reload() { if (this.realSession) { this.busy = true; try { await this.loadRemote(); } catch (error) { this.notify(this.message(error)); } finally { this.busy = false; } } else this.loadDemo(); }
  openVehicle(vehicle?: Vehicle) { this.editingId = vehicle?.id ?? ''; this.vehicleDraft = vehicle ? { ...vehicle } : { plate: '', make: '', model: '', year: new Date().getFullYear(), mileage: 0, status: 'active' }; this.activeModal = 'vehicle'; }
  openMaintenance(item?: Maintenance) { this.editingId = item?.id ?? ''; this.maintenanceDraft = item ? { ...item } : { vehicle_id: this.vehicles[0]?.id, service_date: today.toISOString().slice(0, 10), mileage: this.vehicles[0]?.mileage ?? 0, type: 'Aceite', cost: 0, workshop: '', notes: '' }; this.activeModal = 'maintenance'; }
  setMaintenanceVehicle(id: string) { this.maintenanceDraft.mileage = this.vehicles.find((item) => item.id === id)?.mileage ?? 0; }
  openMaintenanceForAlert(alert: Alert) { const vehicle = this.vehicles.find((item) => item.id === alert.vehicleId); this.openMaintenance(); this.maintenanceDraft.vehicle_id = alert.vehicleId; this.maintenanceDraft.mileage = vehicle?.mileage ?? 0; this.maintenanceDraft.type = alert.type; }
  openMileage(vehicle: Vehicle) { this.selectedVehicleId = vehicle.id; this.mileageDraft = vehicle.mileage; this.activeModal = 'mileage'; }
  closeModal() { this.activeModal = null; this.error = ''; }
  async saveVehicle() {
    const draft = this.vehicleDraft;
    if (!draft.plate?.trim() || !draft.make?.trim() || !draft.model?.trim() || Number(draft.mileage) < 0) return this.fail('Completa placa, marca, modelo y kilometraje válido.');
    if (this.realSession) {
      try { await this.api.request(`/vehicles${this.editingId ? `/${this.editingId}` : ''}`, { method: this.editingId ? 'PATCH' : 'POST', body: JSON.stringify(draft) }); await this.loadRemote(); }
      catch (error) { return this.fail(this.message(error)); }
    } else if (this.editingId) this.vehicles = this.vehicles.map((v) => v.id === this.editingId ? { ...v, ...draft } as Vehicle : v);
    else this.vehicles = [{ id: crypto.randomUUID(), plate: draft.plate!.toUpperCase(), make: draft.make!, model: draft.model!, year: Number(draft.year), mileage: Number(draft.mileage), status: (draft.status as Vehicle['status']) ?? 'active', assignedTo: 'Sin asignar' }, ...this.vehicles];
    this.persistDemo(); this.closeModal(); this.notify(this.editingId ? 'Vehículo actualizado' : 'Vehículo agregado');
  }
  async deleteVehicle(vehicle: Vehicle) {
    if (!confirm(`¿Eliminar ${vehicle.plate} y su historial de mantenimiento?`)) return;
    if (this.realSession) { try { await this.api.request(`/vehicles/${vehicle.id}`, { method: 'DELETE' }); await this.loadRemote(); } catch (error) { return this.notify(this.message(error)); } }
    else { this.vehicles = this.vehicles.filter((v) => v.id !== vehicle.id); this.maintenances = this.maintenances.filter((m) => m.vehicle_id !== vehicle.id); }
    this.persistDemo(); this.notify('Vehículo eliminado');
  }
  async saveMaintenance() {
    const draft = this.maintenanceDraft;
    if (!draft.vehicle_id || !draft.service_date || !draft.workshop?.trim() || Number(draft.cost) < 0) return this.fail('Completa vehículo, fecha, taller y costo válido.');
    const payload = { ...draft, vehicle_id: draft.vehicle_id, service_date: draft.service_date, mileage: Number(draft.mileage), type: draft.type, cost: Number(draft.cost), workshop: draft.workshop.trim(), notes: draft.notes || null };
    if (this.realSession) {
      try { await this.api.request(`/maintenances${this.editingId ? `/${this.editingId}` : ''}`, { method: this.editingId ? 'PATCH' : 'POST', body: JSON.stringify(payload) }); await this.loadRemote(); }
      catch (error) { return this.fail(this.message(error)); }
    } else if (this.editingId) this.maintenances = this.maintenances.map((m) => m.id === this.editingId ? { ...m, ...payload } as Maintenance : m);
    else this.maintenances = [{ id: crypto.randomUUID(), ...payload } as Maintenance, ...this.maintenances];
    const vehicle = this.vehicles.find((v) => v.id === payload.vehicle_id);
    if (vehicle && payload.mileage > vehicle.mileage) this.vehicles = this.vehicles.map((v) => v.id === vehicle.id ? { ...v, mileage: payload.mileage } : v);
    this.persistDemo(); await this.refreshAlerts(); this.closeModal(); this.notify('Mantenimiento registrado');
  }
  async deleteMaintenance(item: Maintenance) {
    if (!confirm('¿Eliminar este registro de mantenimiento?')) return;
    if (this.realSession) { try { await this.api.request(`/maintenances/${item.id}`, { method: 'DELETE' }); await this.loadRemote(); } catch (error) { return this.notify(this.message(error)); } }
    else this.maintenances = this.maintenances.filter((m) => m.id !== item.id);
    this.persistDemo(); await this.refreshAlerts(); this.notify('Registro eliminado');
  }
  async saveMileage() {
    const vehicle = this.selectedVehicle; if (!vehicle) return;
    if (this.mileageDraft < vehicle.mileage) return this.fail('El kilometraje debe ser igual o mayor al actual.');
    if (this.realSession) { try { await this.api.request(`/vehicles/${vehicle.id}/mileage`, { method: 'POST', body: JSON.stringify({ mileage: Number(this.mileageDraft) }) }); await this.loadRemote(); } catch (error) { return this.fail(this.message(error)); } }
    else this.vehicles = this.vehicles.map((v) => v.id === vehicle.id ? { ...v, mileage: Number(this.mileageDraft) } : v);
    this.persistDemo(); await this.refreshAlerts(); this.closeModal(); this.notify('Kilometraje actualizado');
  }
  async saveRule(rule: Rule) {
    if (this.realSession) { try { await this.api.request(`/rules/${rule.id}`, { method: 'PATCH', body: JSON.stringify(rule) }); await this.loadRemote(); } catch (error) { return this.notify(this.message(error)); } }
    this.persistDemo(); await this.refreshAlerts(); this.notify('Regla de alerta guardada');
  }
  async signIn() {
    this.busy = true; this.error = '';
    try { const profile = await this.auth.signIn(this.loginEmail, this.loginPassword); await this.useProfile(profile); this.closeModal(); this.notify('Sesión iniciada'); }
    catch (error) { this.error = this.message(error); }
    finally { this.busy = false; }
  }
  async signOut() { await this.auth.signOut(); this.realSession = false; this.role = 'admin'; this.userName = 'Equipo de flota'; this.loadDemo(); this.notify('Sesión cerrada'); }
  async chooseDemo() { await this.auth.signOut(); this.realSession = false; this.role = 'admin'; this.userName = 'Equipo de flota'; this.loadDemo(); this.closeModal(); this.notify('Abriendo datos de demostración'); }
  openReports() { this.view = 'reports'; }
  formatMoney(value: number) { return new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL', maximumFractionDigits: 0 }).format(value || 0); }
  formatNumber(value: number) { return new Intl.NumberFormat('es-HN').format(value || 0); }
  formatCompact(value: number) { if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`; return String(Math.round(value)); }
  daysSince(date?: string) { return date ? Math.max(0, Math.floor((Date.now() - new Date(`${date}T00:00:00`).getTime()) / 86400000)) : '—'; }
  lastServiceDate(vehicleId: string, type: ServiceType) { return this.maintenances.filter((item) => item.vehicle_id === vehicleId && item.type === type).sort((a, b) => b.service_date.localeCompare(a.service_date))[0]?.service_date ?? ''; }
  vehicleName(id: string) { const v = this.vehicles.find((item) => item.id === id); return v ? `${v.make} ${v.model}` : 'Vehículo'; }
  vehiclePlate(id: string) { return this.vehicles.find((item) => item.id === id)?.plate ?? '—'; }
  statusLabel(status: Vehicle['status']) { return status === 'active' ? 'En operación' : status === 'maintenance' ? 'En taller' : 'Inactivo'; }
  icon(name: ViewName | 'truck' | 'wrench' | 'alert' | 'money' | 'arrow' | 'plus' | 'search' | 'calendar' | 'clock' | 'download' | 'settings' | 'logout' | 'close' | 'check' | 'chevron' | 'route' | 'fuel' | 'menu' | 'external' | 'refresh' | 'chart' | 'edit' | 'trash' | 'user' | 'lock' | 'sparkle' | 'pin' | 'file' | 'filter' | 'bell') {
    const paths: Record<string, string> = { overview: '<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="10" width="8" height="11" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/>', vehicles: '<path d="m5 11 1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11"/><path d="M3 11h18v7H3z"/><circle cx="7.5" cy="18" r="1.5"/><circle cx="16.5" cy="18" r="1.5"/><path d="M5 14h2m10 0h2"/>', maintenance: '<path d="M14.7 6.3a5 5 0 0 0-6.9 6.9L3 18l3 3 4.8-4.8a5 5 0 0 0 6.9-6.9L14 13l-3-3z"/>', alerts: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>', reports: '<path d="M4 19V5m0 14h17"/><path d="m7 15 4-5 3 2 5-7"/>', settings: '<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.8 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.8-1l-1.7.6-1.4-2.4L7.9 15a7.5 7.5 0 0 1 0-2l-.1-.1-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.8-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.8 1l1.7-.6 1.4 2.4-1.4 1.1a7.5 7.5 0 0 1 0 2Z"/>', truck: '<path d="M3 7h11v10H3z"/><path d="M14 10h4l3 3v4h-7z"/><circle cx="7.5" cy="18" r="1.7"/><circle cx="17.5" cy="18" r="1.7"/>', wrench: '<path d="M14.7 6.3a5 5 0 0 0-6.9 6.9L3 18l3 3 4.8-4.8a5 5 0 0 0 6.9-6.9L14 13l-3-3z"/>', alert: '<path d="M10.3 3.8 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 4h.01"/>', money: '<path d="M12 2v20m5-16H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>', arrow: '<path d="M5 12h14m-7-7 7 7-7 7"/>', plus: '<path d="M12 5v14m-7-7h14"/>', search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>', calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m4-5 5 5 5-5m-5 5V3"/>', logout: '<path d="M10 17l5-5-5-5m5 5H3m9-9h6a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-6"/>', close: '<path d="m18 6-12 12M6 6l12 12"/>', check: '<path d="m5 12 4 4L19 6"/>', chevron: '<path d="m9 18 6-6-6-6"/>', route: '<circle cx="6" cy="19" r="2"/><path d="M8 19h8a4 4 0 0 0 0-8h-8a4 4 0 0 1 0-8h8"/><circle cx="18" cy="3" r="2"/>', fuel: '<path d="M3 22h14M5 22V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v17M5 7h10m3 2h2l2 3v7a2 2 0 0 1-4 0v-5"/>', menu: '<path d="M4 6h16M4 12h16M4 18h16"/>', external: '<path d="M15 3h6v6m-11 5L21 3M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6"/>', refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.6 9A7 7 0 0 1 18 6.5L20 12M4 12l2 5.5A7 7 0 0 0 18.4 15"/>', chart: '<path d="M4 19V5m0 14h17"/><path d="m7 15 4-5 3 2 5-7"/>', edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L9 17l-4 1 1-4Z"/>', trash: '<path d="M3 6h18m-2 0-.9 14H5.9L5 6m4 0V4h6v2m-5 4v6m4-6v6"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M5 21a7 7 0 0 1 14 0"/>', lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3"/>', sparkle: '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3ZM19 15l1 2.5 2.5 1-2.5 1L19 22l-1-2.5-2.5-1 2.5-1L19 15Z"/>', pin: '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2"/>', file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8m-8 4h8"/>', filter: '<path d="M4 7h16M7 12h10m-6 5h2"/>', bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>' };
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] ?? paths.overview}</svg>`;
  }
  iconPath(name: string) {
    if (name === 'lock') return 'M4 10h16v11H4z M8 10V7a4 4 0 1 1 8 0v3';
    return Array.from(this.icon(name as Parameters<AppComponent['icon']>[0]).matchAll(/<path[^>]*d="([^"]+)"/g), (match) => match[1]).join(' ');
  }

  async saveReportCsv() {
    const rows = this.isAdmin ? [['Vehículo', 'Placa', 'Mantenimientos', 'Costo HNL'], ...this.periodCostsByVehicle.map((item) => [item.vehicle.make + ' ' + item.vehicle.model, item.vehicle.plate, String(this.periodMaintenance.filter((m) => m.vehicle_id === item.vehicle.id).length), String(item.total)])] : [['Vehículo', 'Placa', 'Estado'], ...this.roleVehicles.map((v) => [v.make + ' ' + v.model, v.plate, this.statusLabel(v.status)])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })); link.download = 'vigilant-reporte-flota.csv'; link.click(); URL.revokeObjectURL(link.href);
  }

  private loadDemo() {
    try { const stored = localStorage.getItem(DEMO_KEY); if (stored) { const data = JSON.parse(stored) as { vehicles: Vehicle[]; maintenances: Maintenance[]; rules: Rule[] }; this.vehicles = data.vehicles; this.maintenances = data.maintenances; this.rules = data.rules; } else { this.vehicles = DEMO_VEHICLES.map((v) => ({ ...v })); this.maintenances = DEMO_MAINTENANCE.map((m) => ({ ...m })); this.rules = DEFAULT_RULES.map((r) => ({ ...r })); this.persistDemo(); } }
    catch { this.vehicles = DEMO_VEHICLES.map((v) => ({ ...v })); this.maintenances = DEMO_MAINTENANCE.map((m) => ({ ...m })); this.rules = DEFAULT_RULES.map((r) => ({ ...r })); }
    this.refreshAlerts();
  }
  private persistDemo() { if (!this.realSession) localStorage.setItem(DEMO_KEY, JSON.stringify({ vehicles: this.vehicles, maintenances: this.maintenances, rules: this.rules })); }
  private async refreshAlerts() { if (this.realSession) return; this.alerts = this.calculateAlerts(); }
  private calculateAlerts(): Alert[] {
    const output: Alert[] = [];
    for (const vehicle of this.vehicles) for (const rule of this.rules.filter((r) => r.active)) {
      const prior = this.maintenances.filter((m) => m.vehicle_id === vehicle.id && m.type === rule.type).sort((a, b) => b.service_date.localeCompare(a.service_date))[0];
      if (!prior) continue;
      if (rule.interval_km) { const remaining = prior.mileage + rule.interval_km - vehicle.mileage; if (remaining <= rule.lead_km) output.push({ vehicleId: vehicle.id, plate: vehicle.plate, vehicleName: `${vehicle.make} ${vehicle.model}`, type: rule.type, status: remaining <= 0 ? 'Vencido' : 'Próximo', dueBy: 'kilometraje', remaining, dueLabel: remaining <= 0 ? `${this.formatNumber(Math.abs(remaining))} km vencido` : `En ${this.formatNumber(remaining)} km` }); }
      if (rule.interval_days) { const due = new Date(`${prior.service_date}T00:00:00`); due.setDate(due.getDate() + rule.interval_days); const remaining = Math.ceil((due.getTime() - new Date(new Date().toDateString()).getTime()) / 86400000); if (remaining <= rule.lead_days) output.push({ vehicleId: vehicle.id, plate: vehicle.plate, vehicleName: `${vehicle.make} ${vehicle.model}`, type: rule.type, status: remaining <= 0 ? 'Vencido' : 'Próximo', dueBy: 'fecha', remaining, dueLabel: remaining <= 0 ? `Hace ${Math.abs(remaining)} días` : `En ${remaining} días` }); }
    }
    return output.sort((a, b) => Number(a.status !== 'Vencido') - Number(b.status !== 'Vencido') || a.remaining - b.remaining);
  }
  private async useProfile(profile: UserProfile) { this.role = profile.role; this.userName = profile.fullName || (profile.role === 'admin' ? 'Administrador' : 'Conductor'); this.realSession = true; await this.loadRemote(); }
  private async loadRemote() { const data = await this.api.loadFleet(); this.vehicles = data.vehicles; this.maintenances = data.maintenances; this.rules = data.rules; this.alerts = data.alerts; }
  private fail(message: string) { this.error = message; }
  private notify(message: string) { this.toast = message; setTimeout(() => { this.toast = ''; }, 2800); }
  private message(error: unknown) { return error instanceof Error ? error.message : 'No fue posible completar la acción.'; }
}
