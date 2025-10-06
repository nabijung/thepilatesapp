
-- Create a function to create the bucket using the Admin API
DO $$
DECLARE
  bucket_exists BOOLEAN;
BEGIN
  -- Check if bucket exists
  SELECT EXISTS (
    SELECT 1
    FROM storage.buckets
    WHERE name = 'images'
  ) INTO bucket_exists;

  -- Create bucket if it doesn't exist
  IF NOT bucket_exists THEN
    INSERT INTO storage.buckets (id, name, public, avif_autodetection)
    VALUES ('images', 'images', true, false);
  END IF;
END $$;