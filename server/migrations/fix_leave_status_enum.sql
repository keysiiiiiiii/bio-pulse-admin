-- Fix leave_status_enum to use correct lowercase values
-- This migration will:
-- 1. Update all existing records to use new format
-- 2. Drop and recreate the enum with correct values
-- 3. Restore the column with the new enum

-- Step 1: Add a temporary column
ALTER TABLE leave_requests ADD COLUMN status_temp text;

-- Step 2: Copy and normalize all existing status values
UPDATE leave_requests
SET status_temp = CASE
  WHEN LOWER(status::text) LIKE 'pending%' THEN 'pending-admin'
  WHEN LOWER(status::text) = 'approved' THEN 'approved'
  WHEN LOWER(status::text) IN ('denied', 'rejected', 'disapproved') THEN 'disapproved'
  WHEN LOWER(status::text) IN ('cancelled', 'canceled') THEN 'cancelled'
  ELSE 'pending-admin'
END;

-- Step 3: Drop the old status column
ALTER TABLE leave_requests DROP COLUMN status;

-- Step 4: Drop the old enum type (if it exists)
DROP TYPE IF EXISTS leave_status_enum CASCADE;

-- Step 5: Create the new enum with correct lowercase values
CREATE TYPE leave_status_enum AS ENUM (
  'pending-admin',
  'approved', 
  'disapproved',
  'cancelled'
);

-- Step 6: Recreate status column with the new enum
ALTER TABLE leave_requests ADD COLUMN status leave_status_enum DEFAULT 'pending-admin';

-- Step 7: Copy data from temp column to new status column
UPDATE leave_requests
SET status = status_temp::leave_status_enum;

-- Step 8: Drop the temporary column
ALTER TABLE leave_requests DROP COLUMN status_temp;

-- Step 9: Make status NOT NULL with default
ALTER TABLE leave_requests ALTER COLUMN status SET NOT NULL;
ALTER TABLE leave_requests ALTER COLUMN status SET DEFAULT 'pending-admin';

-- Verify the changes
SELECT DISTINCT status FROM leave_requests ORDER BY status;
