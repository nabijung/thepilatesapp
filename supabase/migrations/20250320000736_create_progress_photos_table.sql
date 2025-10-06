-- Create progress_photos table
CREATE TABLE IF NOT EXISTS progress_photos (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  studio_student_id BIGINT REFERENCES studio_student(studio_student_id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  date TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add trigger for updated_at
CREATE TRIGGER set_timestamp_progress_photos
BEFORE UPDATE ON progress_photos
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Create index for faster lookups
CREATE INDEX idx_progress_photos_studio_student ON progress_photos(studio_student_id);