-- =============================================
-- ELGREENSYDE PHASE 4: NOTIFICATIONS & AWAY MODE
-- =============================================

-- 1. Away Management (Absent tracking with acknowledgment)
CREATE TABLE IF NOT EXISTS public.away_periods (
    period_id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    start_date date NOT NULL,
    end_date date NOT NULL,
    recurring_days text[] DEFAULT '{}', -- e.g. ARRAY['Saturday', 'Sunday']
    is_active boolean DEFAULT true,
    is_acknowledged boolean DEFAULT false, -- Guard for Return Summary Screen
    created_at timestamptz DEFAULT now()
);

-- 2. Persistent Notifications (Critical/Digest alerts)
CREATE TABLE IF NOT EXISTS public.notifications (
    notification_id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    type text NOT NULL CHECK (type IN ('Urgent', 'Digest', 'Info')),
    title text NOT NULL,
    message text,
    is_read boolean DEFAULT false,
    fired_during_away boolean DEFAULT false,
    relevant_id uuid, -- Link to batch_id or plot_id
    created_at timestamptz DEFAULT now()
);

-- Enable RLS for absolute operator control
ALTER TABLE public.away_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for solo" ON public.away_periods;
CREATE POLICY "Allow all for solo" ON public.away_periods FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for solo" ON public.notifications;
CREATE POLICY "Allow all for solo" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_away_dates ON public.away_periods (start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_notif_unread ON public.notifications (is_read);
