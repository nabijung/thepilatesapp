-- Update all existing entry_date to match created_at field
-- This ensures consistency between entry_date (DATE) and created_at (TIMESTAMPTZ)

UPDATE entries 
SET entry_date = created_at::date 
WHERE entry_date IS NULL OR entry_date != created_at::date;

-- Log the number of updated rows
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % entries to match created_at date', updated_count;
END $$;
