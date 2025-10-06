-- Create studio table if it doesn't exist
CREATE TABLE IF NOT EXISTS studio (
    studio_id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL,
    location TEXT,
    created_date TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create junction table for studio-student relationship
CREATE TABLE IF NOT EXISTS studio_student (
    studio_id BIGINT REFERENCES studio(studio_id) ON DELETE CASCADE,
    student_id BIGINT REFERENCES student(id) ON DELETE CASCADE,
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (studio_id, student_id)
);

-- Create junction table for studio-instructor relationship
CREATE TABLE IF NOT EXISTS studio_instructor (
    studio_id BIGINT REFERENCES studio(studio_id) ON DELETE CASCADE,
    instructor_id BIGINT REFERENCES instructor(id) ON DELETE CASCADE,
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (studio_id, instructor_id)
);

-- Create entries table
CREATE TABLE entries (
    entry_id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    studio_id BIGINT REFERENCES studio(studio_id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    contents TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create exercise lists table
CREATE TABLE exercise_lists (
    exercise_list_id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL
);

-- Create exercises table
CREATE TABLE exercises (
    exercise_id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    exercise_list_id BIGINT REFERENCES exercise_lists(exercise_list_id) ON DELETE CASCADE,
    exercise_name TEXT NOT NULL
);

-- Create notebooks table
CREATE TABLE notebooks (
    notebook_id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    student_id BIGINT REFERENCES student(id) ON DELETE CASCADE,
    studio_id BIGINT REFERENCES studio(studio_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create notebook entries junction table
CREATE TABLE notebook_entries (
    notebook_id BIGINT REFERENCES notebooks(notebook_id) ON DELETE CASCADE,
    entry_id BIGINT REFERENCES entries(entry_id) ON DELETE CASCADE,
    instructor_id BIGINT REFERENCES instructor(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (notebook_id, entry_id)
);

-- Create lessons table
CREATE TABLE lessons (
    lesson_id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    instructions TEXT,
    level TEXT,
    reps TEXT,
    studio_id BIGINT REFERENCES studio(studio_id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    video_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create student-lessons junction table
CREATE TABLE student_lessons (
    student_id BIGINT REFERENCES student(id) ON DELETE CASCADE,
    lesson_id BIGINT REFERENCES lessons(lesson_id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (student_id, lesson_id)
);

-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers only for new tables
DO $$
BEGIN
    -- Skip triggers for instructor and student as they should be in previous migration

    -- For studio
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_studio') THEN
        CREATE TRIGGER set_timestamp_studio
        BEFORE UPDATE ON studio
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_timestamp();
    END IF;

    -- For studio_student
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_studio_student') THEN
        CREATE TRIGGER set_timestamp_studio_student
        BEFORE UPDATE ON studio_student
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_timestamp();
    END IF;

    -- For studio_instructor
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_studio_instructor') THEN
        CREATE TRIGGER set_timestamp_studio_instructor
        BEFORE UPDATE ON studio_instructor
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_timestamp();
    END IF;

    -- For entries
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_entries') THEN
        CREATE TRIGGER set_timestamp_entries
        BEFORE UPDATE ON entries
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_timestamp();
    END IF;

    -- For notebooks
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_notebooks') THEN
        CREATE TRIGGER set_timestamp_notebooks
        BEFORE UPDATE ON notebooks
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_timestamp();
    END IF;

    -- For notebook_entries
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_notebook_entries') THEN
        CREATE TRIGGER set_timestamp_notebook_entries
        BEFORE UPDATE ON notebook_entries
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_timestamp();
    END IF;

    -- For lessons
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_lessons') THEN
        CREATE TRIGGER set_timestamp_lessons
        BEFORE UPDATE ON lessons
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_timestamp();
    END IF;

    -- For student_lessons
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_student_lessons') THEN
        CREATE TRIGGER set_timestamp_student_lessons
        BEFORE UPDATE ON student_lessons
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_timestamp();
    END IF;
END
$$;