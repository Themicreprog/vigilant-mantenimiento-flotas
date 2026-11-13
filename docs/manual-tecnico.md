# Manual técnico

## Componentes

- `apps/web`: Angular 22 y TypeScript; cliente Supabase Auth con clave publicable y cliente HTTP de la API.
- `apps/api`: Express 5 y TypeScript; DTOs Zod, middleware de autenticación y control de roles, casos de uso de alertas/reportes y repositorio Supabase.
- `supabase/migrations`: PostgreSQL, relaciones, restricciones, índices, disparadores y RLS.
- `apps/api/src/openapi.json`: contrato OpenAPI 3.1, presentado por Swagger UI en `/api/docs`.

## Inicio local

Sigue **Configuración local** en el [README](../README.md): crea el proyecto Supabase, aplica la migración, crea perfiles y asignaciones, completa `.env` y `apps/web/public/config.json`, instala con `npm ci` e inicia `npm run dev:api` y `npm run dev:web` en dos terminales.

La API carga `.env` desde la raíz del repositorio. El frontend usa el proxy de desarrollo `apps/web/proxy.conf.json` para reenviar `/api` a Express.

## Autenticación y autorización

1. Supabase Auth emite un JWT tras inicio de sesión.
2. El middleware de API valida ese token con Supabase Auth.
3. La API lee `profiles` en servidor y obtiene empresa y rol.
4. Los controladores restringen operaciones administrativas y comprueban asignación del conductor.
5. El repositorio usa la clave de servicio solo en el servidor y filtra consultas por empresa. Las políticas RLS también se aplican a accesos con clave de usuario.

No se debe incluir `SUPABASE_SERVICE_ROLE_KEY` en `apps/web/public/config.json`, HTML, el bundle o un repositorio público.

## Contenedores y validaciones

- `docker compose up --build` compila ambos paquetes, sirve Angular con Nginx en el puerto 8080 y envía `/api` al contenedor Express. Supabase queda bajo la cuenta que configure el operador.
- `npm run build` compila la API y el frontend.
- `npm test` ejecuta las pruebas de reglas de alertas, permisos y autorización HTTP.
- `npm audit --audit-level=moderate` verifica el lockfile.
- GitHub Actions ejecuta instalación reproducible, auditoría, compilación y pruebas en push a `main` y pull requests.

## Mantenimiento del esquema

Aplica las migraciones en orden desde Supabase. Para una actualización futura, agrega una migración numerada nueva; no edites ni vuelvas a ejecutar una migración que ya haya aplicado una base productiva. El archivo `supabase/seed.sql` contiene filas ficticias para un proyecto local de demostración.
