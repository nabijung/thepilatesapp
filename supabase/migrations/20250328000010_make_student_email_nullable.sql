DO $$
BEGIN
  -- Check if the student table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'student' AND table_schema = 'public'
  ) THEN

    -- Check if the email column exists and is NOT NULL
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'student'
      AND column_name = 'email'
      AND is_nullable = 'NO'
    ) THEN
      -- Alter column to allow NULL values
      ALTER TABLE public.student
      ALTER COLUMN email DROP NOT NULL;
    END IF;

  END IF;
END $$;
