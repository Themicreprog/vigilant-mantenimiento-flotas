import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { createApp } from './http/app.js';
import { createTokenVerifier } from './infrastructure/auth.js';
import { SupabaseFleetRepository } from './infrastructure/supabase-repository.js';

const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'] as const;
loadEnv({ path: path.resolve(process.cwd(), '../../.env') });
for (const key of required) if (!process.env[key]) throw new Error(`Falta la variable requerida ${key}. Revisa .env.example.`);

const url = process.env.SUPABASE_URL!;
const repository = new SupabaseFleetRepository(url, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const verifyToken = createTokenVerifier(url, process.env.SUPABASE_ANON_KEY!);
const app = createApp({ repo: repository, verifyToken, allowedOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:4200').split(',').map((value) => value.trim()) });
const port = Number(process.env.PORT ?? 3000);
app.listen(port, '0.0.0.0', () => console.info(`Vigilant API disponible en http://localhost:${port}`));
