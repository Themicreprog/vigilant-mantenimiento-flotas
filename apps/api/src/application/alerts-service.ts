import { buildAlerts } from '../domain/alerts.js';
import type { FleetRepository } from '../domain/types.js';

export async function getCompanyAlerts(repo: FleetRepository, companyId: string) {
  const [vehicles, maintenances, rules] = await Promise.all([repo.listVehicles(companyId, '', 'admin'), repo.listMaintenances(companyId), repo.listRules(companyId)]);
  return buildAlerts(vehicles, maintenances, rules);
}
