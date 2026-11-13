-- Datos sintéticos de demostración. No corresponden a una empresa ni a personas reales.
-- Se pueden insertar en un proyecto local después de aplicar las migraciones.
begin;

insert into public.companies (id, name) values ('10000000-0000-4000-8000-000000000001', 'DEMO · Flota del Valle')
on conflict (id) do nothing;

insert into public.vehicles (id, company_id, plate, make, model, year, mileage, status) values
('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'PAA-1842', 'Toyota', 'Hilux', 2022, 68420, 'active'),
('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'PBB-2916', 'Isuzu', 'D-Max', 2021, 91380, 'active'),
('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'PCC-3705', 'Nissan', 'Frontier', 2023, 42110, 'maintenance'),
('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'PDD-4488', 'Hyundai', 'H-1', 2020, 127500, 'active')
on conflict (id) do nothing;

insert into public.maintenance_rules (id, company_id, type, interval_km, interval_days, lead_km, lead_days, active) values
('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Aceite', 10000, 180, 1200, 21, true),
('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Frenos', 30000, 365, 2500, 30, true),
('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Llantas', 45000, 730, 3000, 45, true),
('30000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'Inspección', null, 90, 0, 14, true),
('30000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', 'Batería', 50000, 1095, 3000, 60, true)
on conflict (id) do nothing;

insert into public.maintenances (id, company_id, vehicle_id, service_date, mileage, type, cost, workshop, notes) values
('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', current_date - 155, 58400, 'Aceite', 2450.00, 'Taller Central', 'Servicio preventivo y cambio de filtro.'),
('40000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', current_date - 92, 61200, 'Frenos', 6800.00, 'Frenos del Norte', 'Pastillas delanteras.'),
('40000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', current_date - 202, 81380, 'Aceite', 2720.00, 'Taller Rivera', 'Cambio de aceite y revisión general.'),
('40000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', current_date - 45, 89400, 'Llantas', 12800.00, 'Llantas Express', 'Reemplazo de dos llantas.'),
('40000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', current_date - 100, 38110, 'Aceite', 2300.00, 'Servicio Oriente', 'Mantenimiento periódico.'),
('40000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', current_date - 25, 40800, 'Inspección', 950.00, 'Servicio Oriente', 'Diagnóstico de vibración en rueda.'),
('40000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000004', current_date - 196, 117500, 'Aceite', 2950.00, 'Taller Central', 'Servicio preventivo.')
on conflict (id) do nothing;
commit;
