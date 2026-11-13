import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import type { Alert, Maintenance, Rule, Vehicle } from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private readonly auth: AuthService) {}

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = await this.auth.token();
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(`${this.auth.apiBaseUrl}${path}`, { ...options, headers });
    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error || `Solicitud fallida (${response.status}).`);
    }
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }

  async loadFleet() {
    const [vehicles, maintenances, rules, alerts] = await Promise.all([
      this.request<Vehicle[]>('/vehicles'), this.request<Maintenance[]>('/maintenances'),
      this.request<Rule[]>('/rules'), this.request<Alert[]>('/alerts'),
    ]);
    return { vehicles, maintenances, rules, alerts };
  }
}
