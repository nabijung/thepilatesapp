-- Create a stored procedure to handle instructor creation and studio association in a transaction
CREATE OR REPLACE FUNCTION create_instructor_with_studio(
  p_first_name TEXT,
  p_last_name TEXT,
  p_email TEXT,
  p_password TEXT,
  p_studio_id BIGINT DEFAULT NULL,
  p_studio_name TEXT DEFAULT NULL,
  p_studio_location TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_instructor_id BIGINT;
  v_studio_id BIGINT;
  v_instructor_data JSONB;
BEGIN
  -- Validate that either studio ID or studio name is provided
  IF p_studio_id IS NULL AND p_studio_name IS NULL THEN
    RAISE EXCEPTION 'Instructors must provide either a Studio ID or Studio details';
  END IF;

  -- Start transaction
  BEGIN
    -- Insert instructor
    INSERT INTO instructor (first_name, last_name, email, password)
    VALUES (p_first_name, p_last_name, p_email, p_password)
    RETURNING id INTO v_instructor_id;

    -- Get the instructor data as JSON
    SELECT row_to_json(i) INTO v_instructor_data
    FROM instructor i
    WHERE id = v_instructor_id;

    -- Process studio association
    IF p_studio_name IS NOT NULL THEN
      -- Create new studio
      INSERT INTO studio (name, location)
      VALUES (p_studio_name, COALESCE(p_studio_location, ''))
      RETURNING studio_id INTO v_studio_id;

      -- Associate instructor with new studio as owner
      INSERT INTO studio_instructor (studio_id, instructor_id, is_approved)
      VALUES (v_studio_id, v_instructor_id, TRUE);
    ELSIF p_studio_id IS NOT NULL THEN
      -- Associate instructor with existing studio (pending approval)
      INSERT INTO studio_instructor (studio_id, instructor_id, is_approved)
      VALUES (p_studio_id, v_instructor_id, FALSE);
    END IF;

    -- Return instructor data
    RETURN v_instructor_data;
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback transaction in case of any error
      RAISE;
  END;
END;
$$ LANGUAGE plpgsql;