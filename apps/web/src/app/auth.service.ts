import { Injectable } from '@angular/core';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AppConfig, UserProfile } from './models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private client: SupabaseClient | null = null;
  private configValue: AppConfig | null = null;
  private profileValue: UserProfile | null = null;

  get profile(): UserProfile | null { return this.profileValue; }
  get isConfigured(): boolean { return Boolean(this.client); }
  get apiBaseUrl(): string { return this.configValue?.apiBaseUrl || '/api'; }

  async initialize(): Promise<UserProfile | null> {
    if (!this.configValue) {
      try {
        this.configValue = await fetch('/config.json').then((response) => response.json() as Promise<AppConfig>);
      } catch { this.configValue = { apiBaseUrl: '/api', supabaseUrl: '', supabaseAnonKey: '' }; }
      const config = this.configValue ?? { apiBaseUrl: '/api', supabaseUrl: '', supabaseAnonKey: '' };
      if (config.supabaseUrl && config.supabaseAnonKey) {
        this.client = createClient(config.supabaseUrl, config.supabaseAnonKey);
        const { data } = await this.client.auth.getSession();
        if (data.session) await this.fetchProfile();
      }
    }
    return this.profileValue;
  }

  async signIn(email: string, password: string): Promise<UserProfile> {
    if (!this.client) throw new Error('Configura la URL y la clave pública de Supabase en apps/web/public/config.json.');
    const { error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    const profile = await this.fetchProfile();
    if (!profile) throw new Error('La cuenta no tiene empresa o rol configurado. Contacta al administrador de flota.');
    return profile;
  }

  async signOut(): Promise<void> {
    await this.client?.auth.signOut();
    this.profileValue = null;
  }

  async token(): Promise<string | null> {
    const { data } = await this.client?.auth.getSession() ?? { data: { session: null } };
    return data.session?.access_token ?? null;
  }

  private async fetchProfile(): Promise<UserProfile | null> {
    const token = await this.token();
    if (!token) return null;
    const base = this.configValue?.apiBaseUrl || '/api';
    const response = await fetch(`${base}/me`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) return null;
    this.profileValue = await response.json() as UserProfile;
    return this.profileValue;
  }
}
