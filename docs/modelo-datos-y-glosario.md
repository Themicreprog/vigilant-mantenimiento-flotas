# Modelo de datos y glosario

## Relaciones

```mermaid
erDiagram
  COMPANIES ||--o{ PROFILES : incluye
  COMPANIES ||--o{ VEHICLES : opera
  PROFILES ||--o{ VEHICLE_ASSIGNMENTS : recibe
  VEHICLES ||--o{ VEHICLE_ASSIGNMENTS : asigna
  VEHICLES ||--o{ MAINTENANCES : registra
  COMPANIES ||--o{ MAINTENANCES : posee
  COMPANIES ||--o{ MAINTENANCE_RULES : configura

  COMPANIES { uuid id PK; text name }
  PROFILES { uuid id PK; uuid company_id FK; text full_name; text role }
  VEHICLES { uuid id PK; uuid company_id FK; text plate; text make; text model; int year; int mileage; text status }
  VEHICLE_ASSIGNMENTS { uuid id PK; uuid company_id FK; uuid vehicle_id FK; uuid user_id FK }
  MAINTENANCES { uuid id PK; uuid company_id FK; uuid vehicle_id FK; date service_date; int mileage; text type; numeric cost; text workshop; text notes }
  MAINTENANCE_RULES { uuid id PK; uuid company_id FK; text type; int interval_km; int interval_days; int lead_km; int lead_days; boolean active }
```

El esquema ejecutable, sus índices, claves foráneas, disparadores y políticas viven en `supabase/migrations/202611120001_vigilant_schema.sql`.

## Reglas e integridad

- La placa es única dentro de una empresa.
- Las filas de mantenimiento contienen `company_id` y una clave foránea compuesta vehículo/empresa para impedir asociaciones entre empresas.
- El kilometraje actual y el de servicio son enteros no negativos. La base de datos impide reducir la lectura actual y avanza el odómetro al insertar o actualizar un mantenimiento con una lectura mayor.
- El costo es numérico no negativo. Los intervalos y márgenes de regla validan valores positivos o cero según su significado.
- Los perfiles nuevos nacen como `driver`; la asignación de empresa y la promoción a `admin` se realizan desde un flujo administrativo de Supabase.

## Acceso por rol

| Recurso | Administrador de la empresa | Conductor |
| --- | --- | --- |
| Vehículos | Lee y gestiona todos | Lee los asignados; actualiza su kilometraje por API |
| Asignaciones | Gestiona por políticas SQL de empresa | Lee sus propias asignaciones |
| Mantenimientos | Lee, crea, actualiza y elimina | Lee historial asignado sin costo |
| Reglas | Lee y modifica | Lee reglas de su empresa |
| Costos y frecuencia | Consulta reportes | Sin acceso a reportes de costos |

La API comprueba sesión, rol, empresa y asignación antes de usar la conexión `service_role`, que por definición omite RLS. El navegador usa solo la clave publicable/anon, protegida por RLS.

La tabla de mantenimientos no es legible directamente por usuarios autenticados. El acceso de lectura se publica mediante `maintenance_history`, una vista con `security_invoker` que conserva las políticas RLS y omite la columna de costo. La API usa la tabla completa solo en el servidor para los reportes permitidos.

## Glosario

| Término | Definición |
| --- | --- |
| Odómetro | Lectura acumulada del kilometraje actual del vehículo. |
| Mantenimiento | Servicio realizado a una unidad, con fecha, lectura, tipo, taller, costo y notas. |
| Intervalo | Distancia o cantidad de días entre servicios del mismo tipo. |
| Margen de aviso | Distancia o cantidad de días antes del vencimiento en que se muestra una alerta próxima. |
| Alerta vencida | Aviso cuando la lectura o fecha ya superó el intervalo configurado. |
| RLS | Seguridad a nivel de fila de PostgreSQL; restringe qué registros devuelve o modifica cada sesión. |
| JWT | Token firmado de Supabase Auth que la API valida en cada solicitud protegida. |
| Empresa | Límite de pertenencia para perfiles, vehículos, historial y reglas. |
