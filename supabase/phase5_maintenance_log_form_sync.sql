-- Sync maintenance_logs schema with Maintenance.jsx form payload

ALTER TABLE public.maintenance_logs
ADD COLUMN IF NOT EXISTS action_reason TEXT;

ALTER TABLE public.maintenance_logs
ADD COLUMN IF NOT EXISTS target_type TEXT;

ALTER TABLE public.maintenance_logs
DROP CONSTRAINT IF EXISTS maintenance_logs_target_type_check;

ALTER TABLE public.maintenance_logs
ADD CONSTRAINT maintenance_logs_target_type_check
CHECK (target_type IN ('plot', 'batch', 'tray') OR target_type IS NULL);
