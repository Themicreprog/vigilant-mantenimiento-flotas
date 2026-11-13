# Requisitos y casos de uso de Vigilant

## Propósito y alcance

Vigilant centraliza vehículos, kilometrajes e historial de mantenimiento de una flota. El alcance incluye autenticación, roles, reglas de servicio, alertas calculadas por fecha o kilometraje, panel de flota y cinco consultas de reporte. Las alertas son determinísticas y transparentes; no estiman averías ni usan inteligencia artificial.

## Actores

| Actor | Responsabilidad |
| --- | --- |
| Administrador | Gestiona vehículos, servicios, costos y reglas de la empresa. |
| Conductor | Consulta las unidades asignadas, el historial disponible y registra el odómetro. |
| Supabase Auth | Verifica la identidad y emite la sesión JWT. |

## Requisitos funcionales

| ID | Requisito |
| --- | --- |
| RF-01 | Iniciar y cerrar sesión con Supabase Auth; resolver el rol desde el perfil persistido. |
| RF-02 | Crear, consultar, editar y eliminar vehículos con placa, marca, modelo, año, kilometraje y estado. |
| RF-03 | Crear, consultar, editar y eliminar mantenimientos con vehículo, fecha, kilometraje, tipo, costo, taller y notas. |
| RF-04 | Permitir que un conductor solo consulte vehículos asignados y registre un kilometraje que no retroceda. |
| RF-05 | Configurar por empresa el intervalo y margen por kilometraje, tiempo o ambos para cada tipo de servicio. |
| RF-06 | Mostrar alertas próximas y vencidas desde el último servicio del mismo tipo y el odómetro vigente. |
| RF-07 | Mostrar resumen de disponibilidad, servicios, costos y alertas según el rol. |
| RF-08 | Consultar cinco reportes: resumen de flota, historial por vehículo, costos por vehículo/período, servicios próximos/vencidos y frecuencia por tipo/período. |
| RF-09 | Ofrecer una demostración local identificada con datos ficticios y al menos cinco registros de servicio. |

## Requisitos de calidad y seguridad

- La interfaz se adapta a pantallas móviles y de escritorio.
- La API valida entrada, autentica JWT y aplica permisos por rol, empresa y asignación.
- Las tablas tienen RLS; los permisos de navegador no incluyen la clave privilegiada.
- El kilometraje es un entero no negativo y no puede disminuir.
- Los importes no pueden ser negativos. Las fechas de servicio usan formato ISO.
- La API publica su contrato OpenAPI/Swagger en `/api/docs`.

## Casos de uso principales

### CU-01 Iniciar sesión

1. El usuario ingresa correo y contraseña de Supabase Auth.
2. Supabase valida la cuenta y entrega un JWT.
3. La API valida el JWT y recupera el perfil, rol y empresa.
4. Si el perfil carece de rol válido o empresa, el acceso operativo se rechaza.

### CU-02 Registrar un vehículo

1. Un administrador abre **Vehículos → Agregar vehículo**.
2. Completa placa, marca, modelo, año, kilometraje y estado.
3. La interfaz valida los campos y envía la solicitud autenticada.
4. La API limita el registro a la empresa de la sesión y responde con el vehículo creado.

### CU-03 Registrar un mantenimiento

1. Un administrador selecciona vehículo, fecha, odómetro, tipo, costo y taller.
2. Puede añadir notas del servicio.
3. La API confirma que el vehículo pertenece a la empresa y guarda el historial.
4. PostgreSQL avanza el odómetro del vehículo si el odómetro del servicio es mayor.
5. Vigilant vuelve a calcular las alertas con las reglas de esa empresa.

### CU-04 Registrar kilometraje de una unidad asignada

1. El conductor abre **Vehículos** y elige una unidad visible.
2. Ingresa la lectura actual del tablero.
3. La API verifica la asignación y que la lectura no sea menor a la última.
4. Se actualiza el odómetro y se recalculan las alertas.

### CU-05 Revisar un aviso

1. El usuario abre **Alertas**.
2. Vigilant muestra tipo de servicio, unidad, estado y si el umbral aplica por fecha o kilometraje.
3. El administrador puede iniciar el registro de un servicio desde el aviso.
4. Si el intervalo o margen no corresponde a la operación, un administrador cambia la regla en **Reglas de alerta**.

### CU-06 Consultar reportes

- **Resumen:** unidades activas, actividad, costos permitidos por rol y alertas.
- **Historial:** servicios de una unidad; un conductor solo accede a su asignación.
- **Costos:** suma por vehículo entre fechas; solo administrador.
- **Próximos/vencidos:** alertas calculadas por las reglas activas.
- **Frecuencia:** cantidad de servicios por tipo y período; solo administrador.
