-- Migration: Add status column to staff_users table
-- Default to 'active' for all existing and new accounts.
ALTER TABLE public.staff_users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- Ensure existing null records are marked active
UPDATE public.staff_users SET status = 'active' WHERE status IS NULL;
