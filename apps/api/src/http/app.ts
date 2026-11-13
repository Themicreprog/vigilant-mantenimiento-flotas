import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import type { ZodError } from 'zod';
import openapi from '../openapi.json' with { type: 'json' };
import { getCompanyAlerts } from '../application/alerts-service.js';
import { canReadVehicle, canRecordMileage } from '../application/permissions.js';
import { costsByVehicle, frequencyByType, summarizeFleet } from '../domain/reports.js';
import type { FleetRepository, MaintenanceType, UserContext } from '../domain/types.js';
import { requireAdmin, requireAuth, type TokenVerifier } from '../infrastructure/auth.js';
import { maintenanceDto, maintenanceRuleUpdateDto, maintenanceUpdateDto, mileageDto, vehicleDto } from './dtos.js';

type AppDependencies = { repo: FleetRepository; verifyToken: TokenVerifier; allowedOrigins?: string[] };
const userOf = (req: Request): UserContext => req.user!;
const pathParam = (req: Request, name: string): string => { const value = req.params[name]; return Array.isArray(value) ? value[0] ?? '' : value ?? ''; };
const asyncRoute = (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => { Promise.resolve(fn(req, res)).catch(next); };
const validationError = (error: ZodError) => ({ error: 'Revisa los campos enviados.', fields: error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })) });

export function createApp({ repo, verifyToken, allowedOrigins = ['http://localhost:4200'] }: AppDependencies) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: allowedOrigins, credentials: false }));
  app.use(express.json({ limit: '1mb' }));
  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'vigilant-api' }));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi));
  app.use('/api', requireAuth(repo, verifyToken));

  app.get('/api/me', (req, res) => res.json(userOf(req)));

  app.get('/api/vehicles', asyncRoute(async (req, res) => res.json(await repo.listVehicles(userOf(req).companyId, userOf(req).id, userOf(req).role))));
  app.post('/api/vehicles', requireAdmin, asyncRoute(async (req, res) => {
    const parsed = vehicleDto.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(validationError(parsed.error));
    res.status(201).json(await repo.createVehicle(userOf(req).companyId, parsed.data));
  }));
  app.patch('/api/vehicles/:id', requireAdmin, asyncRoute(async (req, res) => {
    const parsed = vehicleDto.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json(validationError(parsed.error));
    res.json(await repo.updateVehicle(userOf(req).companyId, pathParam(req, 'id'), parsed.data));
  }));
  app.delete('/api/vehicles/:id', requireAdmin, asyncRoute(async (req, res) => { await repo.deleteVehicle(userOf(req).companyId, pathParam(req, 'id')); res.status(204).end(); }));
  app.post('/api/vehicles/:id/mileage', asyncRoute(async (req, res) => {
    const parsed = mileageDto.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(validationError(parsed.error));
    const user = userOf(req);
    const vehicle = await repo.getVehicle(user.companyId, pathParam(req, 'id'));
    if (!vehicle) return res.status(404).json({ error: 'Vehículo no encontrado.' });
    const assigned = user.role === 'driver' ? await repo.isAssigned(user.id, vehicle.id) : false;
    if (!canRecordMileage(user.role, assigned)) return res.status(403).json({ error: 'Solo puedes registrar kilometraje en vehículos asignados a tu usuario.' });
    if (parsed.data.mileage < vehicle.mileage) return res.status(400).json({ error: 'El kilometraje nuevo no puede ser menor al registrado.' });
    res.json(await repo.updateVehicle(user.companyId, vehicle.id, parsed.data));
  }));

  app.get('/api/maintenances', asyncRoute(async (req, res) => {
    const user = userOf(req);
    const rows = await repo.listMaintenances(user.companyId, typeof req.query.vehicleId === 'string' ? req.query.vehicleId : undefined);
    if (user.role === 'driver') {
      const assignments = await repo.listVehicles(user.companyId, user.id, user.role);
      const ids = new Set(assignments.map((item) => item.id));
      return res.json(rows.filter((item) => ids.has(item.vehicle_id)).map(({ cost: _cost, ...item }) => item));
    }
    res.json(rows);
  }));
  app.post('/api/maintenances', requireAdmin, asyncRoute(async (req, res) => {
    const parsed = maintenanceDto.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(validationError(parsed.error));
    if (!await repo.getVehicle(userOf(req).companyId, parsed.data.vehicle_id)) return res.status(404).json({ error: 'Vehículo no encontrado en esta flota.' });
    res.status(201).json(await repo.createMaintenance({ ...parsed.data, company_id: userOf(req).companyId, type: parsed.data.type as MaintenanceType, notes: parsed.data.notes ?? null }));
  }));
  app.patch('/api/maintenances/:id', requireAdmin, asyncRoute(async (req, res) => {
    const parsed = maintenanceUpdateDto.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(validationError(parsed.error));
    res.json(await repo.updateMaintenance(userOf(req).companyId, pathParam(req, 'id'), parsed.data));
  }));
  app.delete('/api/maintenances/:id', requireAdmin, asyncRoute(async (req, res) => { await repo.deleteMaintenance(userOf(req).companyId, pathParam(req, 'id')); res.status(204).end(); }));

  app.get('/api/rules', asyncRoute(async (req, res) => res.json(await repo.listRules(userOf(req).companyId))));
  app.patch('/api/rules/:id', requireAdmin, asyncRoute(async (req, res) => {
    const parsed = maintenanceRuleUpdateDto.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(validationError(parsed.error));
    res.json(await repo.updateRule(userOf(req).companyId, pathParam(req, 'id'), parsed.data));
  }));
  app.get('/api/alerts', asyncRoute(async (req, res) => {
    const alerts = await getCompanyAlerts(repo, userOf(req).companyId);
    if (userOf(req).role === 'driver') {
      const assignments = await repo.listVehicles(userOf(req).companyId, userOf(req).id, 'driver');
      const ids = new Set(assignments.map((item) => item.id));
      return res.json(alerts.filter((alert) => ids.has(alert.vehicleId)));
    }
    res.json(alerts);
  }));

  app.get('/api/reports/fleet-summary', asyncRoute(async (req, res) => {
    const [vehicles, maintenances, alerts] = await Promise.all([repo.listVehicles(userOf(req).companyId, userOf(req).id, userOf(req).role), repo.listMaintenances(userOf(req).companyId), getCompanyAlerts(repo, userOf(req).companyId)]);
    const allowed = new Set(vehicles.map((item) => item.id));
    const scopedMaintenances = userOf(req).role === 'admin' ? maintenances : maintenances.filter((item) => allowed.has(item.vehicle_id));
    const summary = summarizeFleet(vehicles, scopedMaintenances);
    if (userOf(req).role === 'driver') {
      const { totalCosts: _totalCosts, annualCosts: _annualCosts, ...safeSummary } = summary;
      return res.json({ ...safeSummary, alerts: alerts.filter((alert) => allowed.has(alert.vehicleId)).length });
    }
    return res.json({ ...summary, alerts: alerts.filter((alert) => allowed.has(alert.vehicleId)).length });
  }));
  app.get('/api/reports/vehicle-history/:id', asyncRoute(async (req, res) => {
    const user = userOf(req);
    const vehicle = await repo.getVehicle(user.companyId, pathParam(req, 'id'));
    if (!vehicle) return res.status(404).json({ error: 'Vehículo no encontrado.' });
    const assigned = user.role === 'driver' ? await repo.isAssigned(user.id, vehicle.id) : false;
    if (!canReadVehicle(user.role, assigned)) return res.status(403).json({ error: 'Este vehículo no está asignado a tu usuario.' });
    const history = await repo.listMaintenances(user.companyId, vehicle.id);
    return res.json(user.role === 'driver' ? history.map(({ cost: _cost, ...item }) => item) : history);
  }));
  app.get('/api/reports/costs', requireAdmin, asyncRoute(async (req, res) => {
    const [vehicles, rows] = await Promise.all([repo.listVehicles(userOf(req).companyId, userOf(req).id, 'admin'), repo.listMaintenances(userOf(req).companyId)]);
    return res.json(costsByVehicle(vehicles, rows, typeof req.query.from === 'string' ? req.query.from : undefined, typeof req.query.to === 'string' ? req.query.to : undefined));
  }));
  app.get('/api/reports/maintenance-due', asyncRoute(async (req, res) => {
    const [alerts, vehicles] = await Promise.all([getCompanyAlerts(repo, userOf(req).companyId), repo.listVehicles(userOf(req).companyId, userOf(req).id, userOf(req).role)]);
    const ids = new Set(vehicles.map((item) => item.id));
    return res.json(alerts.filter((alert) => ids.has(alert.vehicleId)));
  }));
  app.get('/api/reports/frequency', requireAdmin, asyncRoute(async (req, res) => {
    const rows = await repo.listMaintenances(userOf(req).companyId);
    return res.json(frequencyByType(rows, typeof req.query.from === 'string' ? req.query.from : undefined, typeof req.query.to === 'string' ? req.query.to : undefined));
  }));

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = error instanceof Error ? error.message : 'Error interno del servidor.';
    const status = message === 'Registro no encontrado' ? 404 : 500;
    if (status === 500) console.error(error);
    res.status(status).json({ error: status === 500 ? 'Ocurrió un error al procesar la solicitud.' : message });
  });
  return app;
}
