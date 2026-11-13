import type { Maintenance, Vehicle } from './types.js';

export function summarizeFleet(vehicles: Vehicle[], maintenances: Maintenance[]) {
  const costs = maintenances.reduce((sum, item) => sum + Number(item.cost), 0);
  const year = new Date().getFullYear();
  const annualCosts = maintenances.filter((item) => new Date(`${item.service_date}T00:00:00`).getFullYear() === year).reduce((sum, item) => sum + Number(item.cost), 0);
  return { totalVehicles: vehicles.length, activeVehicles: vehicles.filter((v) => v.status === 'active').length, maintenanceEvents: maintenances.length, totalCosts: costs, annualCosts };
}

export function costsByVehicle(vehicles: Vehicle[], maintenances: Maintenance[], from?: string, to?: string) {
  return vehicles.map((vehicle) => {
    const items = maintenances.filter((item) => item.vehicle_id === vehicle.id && (!from || item.service_date >= from) && (!to || item.service_date <= to));
    return { vehicleId: vehicle.id, plate: vehicle.plate, vehicle: `${vehicle.make} ${vehicle.model}`, count: items.length, total: items.reduce((sum, item) => sum + Number(item.cost), 0) };
  });
}

export function frequencyByType(maintenances: Maintenance[], from?: string, to?: string) {
  const counts = new Map<string, number>();
  for (const item of maintenances) {
    if ((from && item.service_date < from) || (to && item.service_date > to)) continue;
    counts.set(item.type, (counts.get(item.type) ?? 0) + 1);
  }
  return [...counts].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
}
