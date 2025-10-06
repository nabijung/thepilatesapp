-- Create a function and trigger for handling studio_student deletion
CREATE OR REPLACE FUNCTION handle_studio_student_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete related student_lessons for this student and studio
    DELETE FROM student_lessons
    WHERE student_id = OLD.student_id
    AND lesson_id IN (
        SELECT lesson_id FROM lessons WHERE studio_id = OLD.studio_id
    );

    -- Find and delete notebooks for this student and studio
    DELETE FROM entries
    WHERE notebook_id IN (
        SELECT notebook_id FROM notebooks
        WHERE student_id = OLD.student_id AND studio_id = OLD.studio_id
    );

    -- Delete notebooks for this student and studio
    DELETE FROM notebooks
    WHERE student_id = OLD.student_id AND studio_id = OLD.studio_id;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_studio_student_deletion
BEFORE DELETE ON studio_student
FOR EACH ROW
EXECUTE FUNCTION handle_studio_student_deletion();