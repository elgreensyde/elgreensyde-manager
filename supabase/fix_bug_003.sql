-- BUG-003 FIX: Add tray_id column to tasks table to support automated propagation tracking
-- This resolves the foreign key violation when creating new trays.

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tray_id UUID REFERENCES trays(tray_id) ON DELETE CASCADE;

-- Update RLS if necessary (though existing policies are broad)
-- Assuming "Allow all access" policy covers new columns automatically in Supabase.
