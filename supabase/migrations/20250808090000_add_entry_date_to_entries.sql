-- Add entry_date column to entries table and backfill from created_at
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'entries' AND column_name = 'entry_date'
    ) THEN
        ALTER TABLE entries
        ADD COLUMN entry_date DATE DEFAULT CURRENT_DATE;

        -- Backfill existing rows using created_at date part
        UPDATE entries
        SET entry_date = COALESCE(entry_date, created_at::date);
    END IF;
END
$$;
