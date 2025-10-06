-- Add additional columns to existing tables

-- Add studio_student_id to studio_student (if needed)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'studio_student' AND column_name = 'studio_student_id'
    ) THEN
        ALTER TABLE studio_student
        ADD COLUMN studio_student_id BIGINT GENERATED ALWAYS AS IDENTITY;
    END IF;
END
$$;

-- Drop existing primary key and create a new one
ALTER TABLE studio_student
DROP CONSTRAINT studio_student_pkey,
ADD PRIMARY KEY (studio_student_id);

-- Add studio_instructor_id and is_admin to studio_instructor
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'studio_instructor' AND column_name = 'studio_instructor_id'
    ) THEN
        ALTER TABLE studio_instructor
        ADD COLUMN studio_instructor_id BIGINT GENERATED ALWAYS AS IDENTITY,
        ADD COLUMN is_admin BOOLEAN DEFAULT false;
    END IF;
END
$$;

-- Drop existing primary key and create a new one
ALTER TABLE studio_instructor
DROP CONSTRAINT studio_instructor_pkey,
ADD PRIMARY KEY (studio_instructor_id);

-- Update entries table to add instructor_id and notebook_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'entries' AND column_name = 'instructor_id'
    ) THEN
        ALTER TABLE entries
        ADD COLUMN instructor_id BIGINT REFERENCES instructor(id),
        ADD COLUMN notebook_id BIGINT REFERENCES notebooks(notebook_id);
    END IF;
END
$$;

-- Add student_lesson_id to student_lessons
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'student_lessons' AND column_name = 'student_lesson_id'
    ) THEN
        ALTER TABLE student_lessons
        ADD COLUMN student_lesson_id BIGINT GENERATED ALWAYS AS IDENTITY;
    END IF;
END
$$;

-- Drop existing primary key and create a new one
ALTER TABLE student_lessons
DROP CONSTRAINT student_lessons_pkey,
ADD PRIMARY KEY (student_lesson_id);