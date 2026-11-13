# Manual de usuario

## Acceder al sistema

Vigilant abre en **Modo demo local** con registros sintéticos guardados en el almacenamiento del navegador. El distintivo `DEMO LOCAL` permanece visible. El selector permite probar la vista de administrador o conductor. Los cambios de demostración no llegan a Supabase.

Para acceder a una cuenta real, selecciona **Conectar cuenta**, configura `apps/web/public/config.json` con la URL y la clave publicable de tu Supabase y usa las credenciales de Auth. El cierre de sesión se encuentra en el botón del perfil.

## Administrador

1. En **Vehículos**, selecciona **Agregar vehículo** para crear una unidad. Usa editar para actualizar sus datos y el icono de papelera para eliminarla junto con su historial.
2. En **Mantenimientos**, selecciona **Registrar servicio** y completa vehículo, fecha, kilometraje, tipo, costo, taller y notas.
3. En **Alertas**, revisa avisos próximos y vencidos. El botón **Registrar** abre un formulario con unidad y tipo preseleccionados.
4. En **Reglas de alerta**, cambia el intervalo y el margen por kilometraje o días. **Guardar** aplica la regla. El interruptor pausa o reactiva el aviso.
5. En **Reportes**, define un período. Consulta flota, costos, alertas y frecuencia; **CSV** exporta una tabla de costos por unidad.

## Conductor

En **Vehículos** aparecen solo las unidades asignadas al usuario. Abre la acción de odómetro, introduce una lectura igual o mayor a la anterior y guarda. La lista de **Mantenimientos** y **Alertas** se limita a esas unidades; el conductor no ve costos ni puede modificar vehículos, mantenimientos o reglas.

## Interpretar las alertas

- **Próximo:** la distancia o fecha restante entró en el margen de aviso.
- **Vencido:** se alcanzó o superó el intervalo.
- El tipo y la unidad identifican el servicio y el vehículo afectados.
- Un servicio sin historial previo de ese tipo no genera una fecha de vencimiento estimada.

Los umbrales son reglas configurables; una alerta no es diagnóstico ni predicción de avería.
