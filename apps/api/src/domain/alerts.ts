import type { Maintenance, MaintenanceAlert, MaintenanceRule, Vehicle } from './types.js';

export function buildAlerts(
  vehicles: Vehicle[],
  maintenances: Maintenance[],
  rules: MaintenanceRule[],
  today = new Date(),
): MaintenanceAlert[] {
  const alerts: MaintenanceAlert[] = [];
  const activeRules = rules.filter((rule) => rule.active && (rule.interval_km || rule.interval_days));

  for (const vehicle of vehicles) {
    for (const rule of activeRules) {
      const previous = maintenances
        .filter((item) => item.vehicle_id === vehicle.id && item.type === rule.type)
        .sort((a, b) => b.service_date.localeCompare(a.service_date))[0];
      if (!previous) continue;

      const candidates: MaintenanceAlert[] = [];
      if (rule.interval_km) {
        const kmLeft = previous.mileage + rule.interval_km - vehicle.mileage;
        if (kmLeft <= rule.lead_km) {
          candidates.push({ vehicleId: vehicle.id, plate: vehicle.plate, vehicleName: `${vehicle.make} ${vehicle.model}`, type: rule.type, status: kmLeft <= 0 ? 'Vencido' : 'Próximo', dueBy: 'kilometraje', remaining: kmLeft, dueLabel: kmLeft <= 0 ? `${Math.abs(kmLeft).toLocaleString('es-HN')} km vencido` : `En ${kmLeft.toLocaleString('es-HN')} km` });
        }
      }
      if (rule.interval_days) {
        const due = new Date(`${previous.service_date}T00:00:00`);
        due.setDate(due.getDate() + rule.interval_days);
        const daysLeft = Math.ceil((due.getTime() - new Date(today.toDateString()).getTime()) / 86_400_000);
        if (daysLeft <= rule.lead_days) {
          candidates.push({ vehicleId: vehicle.id, plate: vehicle.plate, vehicleName: `${vehicle.make} ${vehicle.model}`, type: rule.type, status: daysLeft <= 0 ? 'Vencido' : 'Próximo', dueBy: 'fecha', remaining: daysLeft, dueLabel: daysLeft <= 0 ? `Hace ${Math.abs(daysLeft)} días` : `En ${daysLeft} días` });
        }
      }
      alerts.push(...candidates);
    }
  }
  return alerts.sort((a, b) => Number(a.status !== 'Vencido') - Number(b.status !== 'Vencido') || a.remaining - b.remaining);
}
