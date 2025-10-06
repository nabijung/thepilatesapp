-- Migration to change height and weight columns from INTEGER to TEXT
DO $$
BEGIN
    -- Alter height column to TEXT
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'student'
        AND column_name = 'height'
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE student
        ALTER COLUMN height TYPE TEXT USING height::TEXT;
    END IF;

    -- Alter weight column to TEXT
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'student'
        AND column_name = 'weight'
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE student
        ALTER COLUMN weight TYPE TEXT USING weight::TEXT;
    END IF;
END
$$;

-- Optional: Add a comment to explain the migration
COMMENT ON COLUMN student.height IS 'Height stored as a text field to allow for more flexible input (e.g., "5''10"", 178 cm")';
COMMENT ON COLUMN student.weight IS 'Weight stored as a text field to allow for more flexible input (e.g., "150 lbs", "68 kg")';