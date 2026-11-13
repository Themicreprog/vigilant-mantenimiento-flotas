import { createClient } from '@supabase/supabase-js';
import type { NextFunction, Request, Response } from 'express';
import type { FleetRepository, UserContext } from '../domain/types.js';

declare global {
  namespace Express { interface Request { user?: UserContext } }
}

export function createTokenVerifier(url: string, anonKey: string) {
  const authClient = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  return async (token: string) => {
    const { data, error } = await authClient.auth.getUser(token);
    if (error || !data.user) return null;
    return data.user.id;
  };
}

export type TokenVerifier = (token: string) => Promise<string | null>;

export function requireAuth(repo: FleetRepository, verifyToken: TokenVerifier) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authorization = req.header('authorization');
      if (!authorization?.startsWith('Bearer ')) return res.status(401).json({ error: 'Inicia sesión para continuar.' });
      const userId = await verifyToken(authorization.slice(7));
      if (!userId) return res.status(401).json({ error: 'La sesión no es válida o ha vencido.' });
      const user = await repo.profile(userId);
      if (!user) return res.status(403).json({ error: 'Tu perfil no tiene una empresa o un rol activo.' });
      req.user = user;
      next();
    } catch (error) { next(error); }
  };
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Esta acción requiere el rol de administrador.' });
  next();
}
