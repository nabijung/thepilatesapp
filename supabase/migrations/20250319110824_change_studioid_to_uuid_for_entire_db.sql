-- Extension needed for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create a temporary table to map old IDs to new UUIDs
CREATE TEMPORARY TABLE studio_id_mapping (
    old_id BIGINT PRIMARY KEY,
    new_id UUID UNIQUE DEFAULT uuid_generate_v4()
);

-- Populate the mapping table with consistent UUIDs
INSERT INTO studio_id_mapping (old_id)
SELECT studio_id FROM studio;

-- Track and drop foreign key constraints to studio
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tc.table_schema, tc.table_name, tc.constraint_name, tc.constraint_type
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE (tc.constraint_type = 'FOREIGN KEY' AND kcu.column_name = 'studio_id')
    ) LOOP
        EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT %I',
                       r.table_schema, r.table_name, r.constraint_name);
        RAISE NOTICE 'Dropped constraint: %', r.constraint_name;
    END LOOP;
END $$;

-- Also drop primary key constraints from tables that reference studio
ALTER TABLE studio DROP CONSTRAINT IF EXISTS studio_pkey;
ALTER TABLE studio_student DROP CONSTRAINT IF EXISTS studio_student_pkey;
ALTER TABLE studio_instructor DROP CONSTRAINT IF EXISTS studio_instructor_pkey;

-- Create a new studio table with UUID
CREATE TABLE studio_new (
    studio_id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT,
    created_date TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Copy data to the new table
INSERT INTO studio_new (studio_id, name, location, created_date, updated_at)
SELECT m.new_id, s.name, s.location, s.created_date, s.updated_at
FROM studio s
JOIN studio_id_mapping m ON s.studio_id = m.old_id;

-- Create new tables for each related table, preserving all existing columns
-- studio_student
CREATE TABLE studio_student_new (
    studio_student_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    studio_id UUID,
    student_id BIGINT,
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Copy data to the new table
INSERT INTO studio_student_new (studio_id, student_id, is_approved, created_at, updated_at)
SELECT m.new_id, ss.student_id, ss.is_approved, ss.created_at, ss.updated_at
FROM studio_student ss
JOIN studio_id_mapping m ON ss.studio_id = m.old_id;

-- studio_instructor
CREATE TABLE studio_instructor_new (
    studio_instructor_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    studio_id UUID,
    instructor_id BIGINT,
    is_approved BOOLEAN DEFAULT false,
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Copy data to the new table
INSERT INTO studio_instructor_new (studio_id, instructor_id, is_approved, is_admin, created_at, updated_at)
SELECT m.new_id, si.instructor_id, si.is_approved,
       COALESCE(si.is_admin, false),  -- Handle missing column
       si.created_at, si.updated_at
FROM studio_instructor si
JOIN studio_id_mapping m ON si.studio_id = m.old_id;

-- Create a temporary sequence for tracking notebooks
CREATE TEMPORARY SEQUENCE temp_notebook_seq;
SELECT setval('temp_notebook_seq', (SELECT max(notebook_id) FROM notebooks));

-- notebooks - create before entries since entries references notebooks
CREATE TABLE notebooks_new (
    notebook_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id BIGINT,
    studio_id UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Copy data to the new table - without specifying notebook_id
INSERT INTO notebooks_new (student_id, studio_id, created_at, updated_at)
SELECT n.student_id, m.new_id, n.created_at, n.updated_at
FROM notebooks n
JOIN studio_id_mapping m ON n.studio_id = m.old_id;

-- Create a mapping for notebooks
CREATE TEMPORARY TABLE notebook_id_mapping AS
SELECT n.notebook_id AS old_id, nn.notebook_id AS new_id
FROM notebooks n
JOIN studio_id_mapping m ON n.studio_id = m.old_id
JOIN notebooks_new nn ON nn.studio_id = m.new_id AND nn.student_id = n.student_id;

-- entries
CREATE TABLE entries_new (
    entry_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    studio_id UUID,
    title TEXT NOT NULL,
    contents TEXT,
    instructor_id BIGINT,
    notebook_id BIGINT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Copy data to the new table
INSERT INTO entries_new (studio_id, title, contents, instructor_id, created_at, updated_at)
SELECT
    m.new_id,
    e.title,
    e.contents,
    e.instructor_id,
    e.created_at,
    e.updated_at
FROM entries e
JOIN studio_id_mapping m ON e.studio_id = m.old_id;

-- Update notebook_id in entries if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'entries' AND column_name = 'notebook_id'
    ) THEN
        UPDATE entries_new e
        SET notebook_id = nm.new_id
        FROM entries old_e
        JOIN notebook_id_mapping nm ON old_e.notebook_id = nm.old_id
        WHERE e.title = old_e.title AND e.contents = old_e.contents;
    END IF;
END
$$;

-- lessons
CREATE TABLE lessons_new (
    lesson_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    instructions TEXT,
    level TEXT,
    reps TEXT,
    studio_id UUID,
    title TEXT NOT NULL,
    video_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Copy data to the new table - without specifying lesson_id
INSERT INTO lessons_new (instructions, level, reps, studio_id, title, video_url, created_at, updated_at)
SELECT l.instructions, l.level, l.reps, m.new_id, l.title, l.video_url, l.created_at, l.updated_at
FROM lessons l
JOIN studio_id_mapping m ON l.studio_id = m.old_id;

-- Create a mapping for lessons
CREATE TEMPORARY TABLE lesson_id_mapping AS
SELECT l.lesson_id AS old_id, ln.lesson_id AS new_id
FROM lessons l
JOIN lessons_new ln ON ln.title = l.title AND ln.instructions = l.instructions;

-- student_lessons - this doesn't directly reference studio
CREATE TABLE student_lessons_new (
    student_lesson_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id BIGINT,
    lesson_id BIGINT,
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Copy data to the new table with mapped lesson_id
INSERT INTO student_lessons_new (student_id, lesson_id, is_completed, created_at, updated_at)
SELECT sl.student_id, lm.new_id, sl.is_completed, sl.created_at, sl.updated_at
FROM student_lessons sl
JOIN lesson_id_mapping lm ON sl.lesson_id = lm.old_id;

-- Define timestamp trigger function
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing tables - be careful with foreign key constraints!
DROP TABLE IF EXISTS student_lessons;
DROP TABLE IF EXISTS lessons;
DROP TABLE IF EXISTS entries;
DROP TABLE IF EXISTS notebooks;
DROP TABLE IF EXISTS studio_instructor;
DROP TABLE IF EXISTS studio_student;
DROP TABLE IF EXISTS studio;

-- Rename new tables
ALTER TABLE studio_new RENAME TO studio;
ALTER TABLE studio_student_new RENAME TO studio_student;
ALTER TABLE studio_instructor_new RENAME TO studio_instructor;
ALTER TABLE notebooks_new RENAME TO notebooks;
ALTER TABLE entries_new RENAME TO entries;
ALTER TABLE lessons_new RENAME TO lessons;
ALTER TABLE student_lessons_new RENAME TO student_lessons;

-- Add unique constraints
ALTER TABLE studio_student ADD CONSTRAINT uk_studio_student UNIQUE (studio_id, student_id);
ALTER TABLE studio_instructor ADD CONSTRAINT uk_studio_instructor UNIQUE (studio_id, instructor_id);

-- Add foreign key constraints
ALTER TABLE studio_student ADD CONSTRAINT fk_studio_student_studio
  FOREIGN KEY (studio_id) REFERENCES studio(studio_id) ON DELETE CASCADE;
ALTER TABLE studio_student ADD CONSTRAINT fk_studio_student_student
  FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE CASCADE;

ALTER TABLE studio_instructor ADD CONSTRAINT fk_studio_instructor_studio
  FOREIGN KEY (studio_id) REFERENCES studio(studio_id) ON DELETE CASCADE;
ALTER TABLE studio_instructor ADD CONSTRAINT fk_studio_instructor_instructor
  FOREIGN KEY (instructor_id) REFERENCES instructor(id) ON DELETE CASCADE;

ALTER TABLE entries ADD CONSTRAINT fk_entries_studio
  FOREIGN KEY (studio_id) REFERENCES studio(studio_id) ON DELETE CASCADE;
ALTER TABLE entries ADD CONSTRAINT fk_entries_instructor
  FOREIGN KEY (instructor_id) REFERENCES instructor(id) ON DELETE SET NULL;
ALTER TABLE entries ADD CONSTRAINT fk_entries_notebook
  FOREIGN KEY (notebook_id) REFERENCES notebooks(notebook_id) ON DELETE CASCADE;

ALTER TABLE notebooks ADD CONSTRAINT fk_notebooks_studio
  FOREIGN KEY (studio_id) REFERENCES studio(studio_id) ON DELETE CASCADE;
ALTER TABLE notebooks ADD CONSTRAINT fk_notebooks_student
  FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE CASCADE;

ALTER TABLE lessons ADD CONSTRAINT fk_lessons_studio
  FOREIGN KEY (studio_id) REFERENCES studio(studio_id) ON DELETE CASCADE;

ALTER TABLE student_lessons ADD CONSTRAINT fk_student_lessons_student
  FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE CASCADE;
ALTER TABLE student_lessons ADD CONSTRAINT fk_student_lessons_lesson
  FOREIGN KEY (lesson_id) REFERENCES lessons(lesson_id) ON DELETE CASCADE;

-- Create triggers
CREATE TRIGGER set_timestamp_studio
BEFORE UPDATE ON studio
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_studio_student
BEFORE UPDATE ON studio_student
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_studio_instructor
BEFORE UPDATE ON studio_instructor
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_entries
BEFORE UPDATE ON entries
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_notebooks
BEFORE UPDATE ON notebooks
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_lessons
BEFORE UPDATE ON lessons
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_student_lessons
BEFORE UPDATE ON student_lessons
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Drop the temporary mapping tables
DROP TABLE IF EXISTS studio_id_mapping;
DROP TABLE IF EXISTS notebook_id_mapping;
DROP TABLE IF EXISTS lesson_id_mapping;
DROP SEQUENCE IF EXISTS temp_notebook_seq;