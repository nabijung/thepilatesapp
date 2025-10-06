-- Add birthday column to student table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'student' AND column_name = 'birthday'
    ) THEN
        ALTER TABLE student ADD COLUMN birthday DATE;
    END IF;
END
$$;