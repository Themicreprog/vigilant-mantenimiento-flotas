# Vigilant

Vigilant es una aplicación web responsive para administrar una flota, registrar mantenimientos y calcular alertas configurables por kilometraje o tiempo. Las alertas son reglas explícitas que comparan el último servicio con la lectura actual; el sistema no afirma usar inteligencia artificial ni predicción estadística.

La aplicación incluye un modo de demostración local con datos sintéticos, una API REST en capas y persistencia en Supabase PostgreSQL. El modo demo se guarda solo en el navegador y no sustituye autenticación ni almacenamiento de producción.

## Funciones

- Inicio y cierre de sesión con Supabase Auth y perfiles `admin` y `driver`.
- CRUD de vehículos y mantenimientos para administradores.
- Conductores limitados a vehículos asignados y al registro de su kilometraje.
- Historial de servicios, costos, talleres, notas y odómetro.
- Alertas próximas y vencidas por intervalo de fecha, kilometraje o ambos.
- Resumen de flota y reportes de historial, costos por vehículo/período, servicios pendientes y frecuencia por tipo.
- Reglas de mantenimiento editables por empresa.
- Datos demo sintéticos: 5 vehículos y 8 mantenimientos.

## Requisitos

- Node.js 22.22.3 o posterior y npm 10.9 o posterior.
- Un proyecto Supabase PostgreSQL con Auth habilitado.
- Docker Compose v2 (opcional, para ejecutar los contenedores).

La integración usa Angular 22, TypeScript, Express 5, Supabase Auth y PostgreSQL.

## Configuración local

1. Instala dependencias en la raíz:

   ```bash
   npm ci
   ```

2. En Supabase, ejecuta en orden los archivos `supabase/migrations/*.sql`. La migración activa RLS en todas las tablas y crea perfiles con rol `driver` de forma predeterminada al crear usuarios de Auth.

3. Crea la empresa y asigna los perfiles. Tras registrar usuarios desde Supabase Auth, el trigger crea su fila en `profiles`. Asigna `company_id` a cada perfil y promueve únicamente las cuentas autorizadas. Ejemplo para una instalación propia:

   ```sql
   insert into public.companies (name) values ('Mi empresa') returning id;
   update public.profiles set company_id = 'UUID_DE_LA_EMPRESA' where id = 'UUID_DEL_USUARIO';
   update public.profiles set role = 'admin' where id = 'UUID_DEL_ADMIN_AUTORIZADO';
   ```

   Asigna vehículos a conductores. Ejemplo:

   ```sql
   insert into public.vehicle_assignments (company_id, vehicle_id, user_id)
   values ('UUID_DE_LA_EMPRESA', 'UUID_DEL_VEHICULO', 'UUID_DEL_CONDUCTOR');
   ```

4. Copia `.env.example` a `.env` y completa la URL, la clave pública y la clave privilegiada de Supabase. La clave privilegiada se usa únicamente por la API y nunca se debe copiar al frontend.

5. Edita `apps/web/public/config.json` con la URL del proyecto y su clave **publicable/anon**. Esa clave está diseñada para el navegador; RLS y los controles de la API limitan el acceso. No pongas la clave `service_role` aquí.

6. Inicia API y frontend en terminales separadas:

   ```bash
   npm run dev:api
   npm run dev:web
   ```

   Angular queda en `http://localhost:4200`, la API en `http://localhost:3000` y Swagger UI en `http://localhost:3000/api/docs`. El modo demo abre sin credenciales y usa `localStorage`.

## Variables de entorno

| Variable | Uso |
| --- | --- |
| `SUPABASE_URL` | URL del proyecto; servidor |
| `SUPABASE_ANON_KEY` | Clave pública para verificar tokens; servidor |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave privilegiada, solo en el servidor |
| `PORT` | Puerto de la API; predeterminado `3000` |
| `CORS_ORIGINS` | Orígenes permitidos separados por coma |

La configuración del navegador se mantiene por separado en `apps/web/public/config.json`: `apiBaseUrl`, `supabaseUrl` y `supabaseAnonKey`. Ninguno de esos tres campos es una clave privilegiada.

## Docker

Después de configurar `.env` y `apps/web/public/config.json`:

```bash
docker compose up --build
```

La interfaz se sirve en `http://localhost:8080`; Nginx envía las solicitudes `/api` al contenedor Express. Supabase permanece como servicio externo que tú controlas; este repositorio no crea ni publica servicios.

## Comandos de desarrollo

```bash
npm run dev:api   # Express con recarga
npm run dev:web   # Angular CLI
npm run build     # compila API y Angular
npm test          # lógica de alertas y permisos
npm run lint      # validación TypeScript y compilación Angular
```

## Estructura

```text
apps/
  api/src/domain/          # entidades, reglas de alertas y reportes
  api/src/application/     # permisos y casos de uso
  api/src/infrastructure/  # repositorio Supabase y verificación Auth
  api/src/http/            # controladores REST, validación y middleware
  web/src/app/             # aplicación Angular y cliente de API
supabase/migrations/       # esquema, RLS, permisos y trigger de perfiles
supabase/seed.sql          # datos sintéticos para una empresa demo
```

La documentación OpenAPI se sirve con Swagger UI en `/api/docs` y está definida en `apps/api/src/openapi.json`.

La pauta del curso se complementa con [requisitos y casos de uso](docs/requisitos-y-casos-de-uso.md), [modelo de datos y glosario](docs/modelo-datos-y-glosario.md), [manual de usuario](docs/manual-usuario.md) y [manual técnico](docs/manual-tecnico.md).

## Supuestos

- Una base de datos atiende varias empresas; cada perfil pertenece a una empresa y todos los registros se filtran por ese identificador.
- Los usuarios nuevos empiezan como conductores sin empresa asignada. Un administrador de Supabase debe asignar empresa, rol y vehículo antes del primer acceso operativo.
- Solo administradores crean, editan o eliminan vehículos, mantenimientos y reglas. Los conductores consultan asignaciones e historial sin costos y registran kilometraje que no retrocede.
- Una alerta por tipo de servicio se calcula desde el registro más reciente de ese tipo. Un umbral de kilometraje y uno de tiempo son independientes; se genera aviso si se alcanza cualquiera dentro de su margen configurado.
- Los reportes usan la fecha del servicio y los importes se muestran en lempiras hondureños (HNL); cambia la moneda de presentación si tu operación requiere otra.
- La demo local es independiente de Supabase y sus cambios permanecen en `localStorage` del navegador.
- La clave `service_role` omite RLS; por eso la API verifica el JWT, el perfil, el rol, la empresa y las asignaciones antes de usar el repositorio privilegiado.
