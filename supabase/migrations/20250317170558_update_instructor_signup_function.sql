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
  v_studio_count BIGINT;
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

    -- If creating a new studio, the instructor is automatically the admin
    IF p_studio_name IS NOT NULL THEN
      -- Create new studio
      INSERT INTO studio (name, location)
      VALUES (p_studio_name, COALESCE(p_studio_location, ''))
      RETURNING studio_id INTO v_studio_id;

      -- Associate instructor with new studio as admin (since they created it)
      INSERT INTO studio_instructor (
        studio_id,
        instructor_id,
        is_approved,
        is_admin
      ) VALUES (
        v_studio_id,
        v_instructor_id,
        TRUE,  -- Always approved when creating a new studio
        TRUE   -- Always admin when creating a new studio
      );

    -- If joining an existing studio, check if they should be admin
    ELSIF p_studio_id IS NOT NULL THEN
      -- Check the number of instructors in this studio
      SELECT COUNT(*) INTO v_studio_count FROM studio_instructor WHERE studio_id = p_studio_id;

      -- Associate instructor with existing studio
      INSERT INTO studio_instructor (
        studio_id,
        instructor_id,
        is_approved,
        is_admin
      ) VALUES (
        p_studio_id,
        v_instructor_id,
        FALSE,  -- Not automatically approved for existing studio
        CASE WHEN v_studio_count = 0 THEN TRUE ELSE FALSE END -- First instructor becomes admin
      );
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
