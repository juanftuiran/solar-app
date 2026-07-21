-- Agrega columna para manejar el reinicio de lectura del inversor (cambio de equipo)
ALTER TABLE public.solar_readings ADD COLUMN IF NOT EXISTS inverter_reset BOOLEAN DEFAULT FALSE;
