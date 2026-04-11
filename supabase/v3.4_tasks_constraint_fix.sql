-- =============================================
-- ELGREENSYDE v3.4 — Tasks Constraint Fix
-- Fix: Allows 'Critical' priority to be inserted
-- Run in Supabase SQL Editor
-- =============================================

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_priority_check;

ALTER TABLE tasks ADD CONSTRAINT tasks_priority_check 
  CHECK (priority IN ('Critical', 'High', 'Medium', 'Low'));
