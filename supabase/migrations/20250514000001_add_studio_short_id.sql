-- Migration to add short_id column to studio table

-- Step 1: Add the column (nullable at first)
ALTER TABLE studio ADD COLUMN short_id VARCHAR(10);

-- Step 2: Create a function to generate short IDs
CREATE OR REPLACE FUNCTION generate_short_id()
RETURNS VARCHAR(10) AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    result VARCHAR(10) := '';
    i INT;
    random_index INT;
BEGIN
    -- Generate a random 10-character string
    FOR i IN 1..10 LOOP
        random_index := floor(random() * length(chars) + 1);
        result := result || substr(chars, random_index, 1);
    END LOOP;

    -- Check if it already exists
    WHILE EXISTS (SELECT 1 FROM studio WHERE short_id = result) LOOP
        -- If exists, regenerate
        result := '';
        FOR i IN 1..10 LOOP
            random_index := floor(random() * length(chars) + 1);
            result := result || substr(chars, random_index, 1);
        END LOOP;
    END LOOP;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Fill in short_ids for all existing studios
DO $$
DECLARE
    studio_rec RECORD;
BEGIN
    FOR studio_rec IN SELECT studio_id FROM studio WHERE short_id IS NULL LOOP
        UPDATE studio
        SET short_id = generate_short_id()
        WHERE studio_id = studio_rec.studio_id;
    END LOOP;
END;
$$;

-- Step 4: Add uniqueness constraint and not null constraint
ALTER TABLE studio ALTER COLUMN short_id SET NOT NULL;
CREATE UNIQUE INDEX idx_studio_short_id ON studio(short_id);