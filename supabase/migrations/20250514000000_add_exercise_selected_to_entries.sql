-- Add exercise_selected column to entries table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'entries' AND column_name = 'exercise_selected'
    ) THEN
        ALTER TABLE entries
        ADD COLUMN exercise_selected TEXT;

        -- Migrate existing checklist data from contents to exercise_selected
        UPDATE entries
        SET exercise_selected = contents
        WHERE contents IS NOT NULL AND contents != '' AND
              contents LIKE '[%' AND
              contents LIKE '%"checked"%' AND
              contents LIKE '%"text"%';

        -- Clear the contents field for entries that were migrated to exercise_selected
        -- This prevents JSON appearing in the notes textarea
        UPDATE entries
        SET contents = ''
        WHERE exercise_selected IS NOT NULL AND exercise_selected != '' AND
              contents LIKE '[%' AND
              contents LIKE '%"checked"%' AND
              contents LIKE '%"text"%';
    END IF;
END
$$;