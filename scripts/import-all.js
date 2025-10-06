#!/usr/bin/env node

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs").promises;
const path = require("path");
const winston = require("winston");
const dotenv = require("dotenv");
const { v4: uuidv4 } = require("uuid");

// Parse command-line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Please provide a JSON file path");
  console.error("Usage: node import-all.js <path_to_json_file>");
  process.exit(1);
}

const jsonPath = path.resolve(process.cwd(), args[0]);

// Create log directory if it doesn't exist
const logDir = path.join(process.cwd(), "logs");
fs.mkdir(logDir, { recursive: true }).catch((err) => {
  console.error("Error creating log directory:", err);
});

// Configure Winston logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} ${level}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new winston.transports.File({
      filename: path.join(logDir, "import-all.log"),
      level: "info",
    }),
    new winston.transports.File({
      filename: path.join(logDir, "import-all-error.log"),
      level: "error",
    }),
  ],
});

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// Validate configuration
const validateConfig = () => {
  const requiredEnvVars = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];

  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );

  if (missingVars.length > 0) {
    logger.error(`Missing environment variables: ${missingVars.join(", ")}`);
    logger.error(
      "Please ensure these variables are defined in your .env.local file"
    );
    process.exit(1);
  }

  logger.info("Environment variables validated successfully");
};

// Initialize Supabase client
const initSupabase = () => {
  validateConfig();

  logger.info(`Connecting to Supabase at ${process.env.SUPABASE_URL}`);
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
};

// Helper function to validate JSON structure
const validateJsonStructure = (data) => {
  if (
    !data.studios ||
    !data.students ||
    !data.instructors ||
    !data.lessons ||
    !data.notebooks ||
    !data.entries
  ) {
    throw new Error(
      "Invalid JSON structure: missing required top-level properties (studios, students, instructors, lessons, notebooks, entries)"
    );
  }

  logger.info("JSON structure validated successfully");
};

const exportMappings = async (idMappings) => {
  // Save ID mappings to file for cleanup script
  const mappingsFilePath = path.join(process.cwd(), "id-mappings.json");
  await fs.writeFile(mappingsFilePath, JSON.stringify(idMappings, null, 2));
  logger.info(`ID mappings saved to ${mappingsFilePath}`);
};

// Main import function
async function importAll(jsonFilePath) {
  logger.info(`Starting import process from ${jsonFilePath}`);
  const supabase = initSupabase();

  // ID mappings to track original IDs to new IDs
  const idMappings = {
    studios: {},
    instructors: {},
    students: {},
    lessons: {},
    notebooks: {},
    entries: {},
  };

  // Statistics for final report
  const stats = {
    studios: 0,
    instructors: 0,
    students: 0,
    studioInstructors: 0,
    studioStudents: 0,
    lessons: 0,
    studentLessons: 0,
    notebooks: 0,
    entries: 0,
    exerciseLists: 0,
    exercises: 0,
  };

  try {
    // Check if file exists
    try {
      await fs.access(jsonFilePath);
      logger.info(`File found: ${jsonFilePath}`);
    } catch (fileError) {
      logger.error(`File not found: ${jsonFilePath}`);
      throw new Error(`File not found: ${jsonFilePath}`);
    }

    // Read the JSON file
    logger.info("Reading JSON file...");
    const rawData = await fs.readFile(jsonFilePath, "utf8");

    let data;
    try {
      data = JSON.parse(rawData);
      logger.info("JSON file parsed successfully");
    } catch (parseError) {
      logger.error("Failed to parse JSON:", parseError);
      throw new Error("Invalid JSON format");
    }

    // Validate JSON structure
    validateJsonStructure(data);

    // 1. Import Studios
    logger.info("Importing studios...");

    // Function to generate a random short ID (10 chars)
    const generateShortId = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let result = '';
      for (let i = 0; i < 10; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    // Keep track of used short IDs to avoid duplicates
    const usedShortIds = new Set();

    for (const studioId in data.studios) {
      const studio = data.studios[studioId];

      // Generate a new UUID for the studio
      const newStudioId = uuidv4();

      // Generate a unique short ID
      let shortId = generateShortId();
      while (usedShortIds.has(shortId)) {
        shortId = generateShortId();
      }
      usedShortIds.add(shortId);

      const { error: studioError } = await supabase.from("studio").insert({
        studio_id: newStudioId,
        name: studio.studio_name,
        location: studio.location || "",
        created_date: new Date(
          parseFloat(studio.created_date) * 1000
        ).toISOString(),
        short_id: shortId // Add the short ID field
      });

      if (studioError) {
        logger.error(`Error inserting studio ${studioId}:`, studioError);
        continue;
      }

      // Store mapping from old ID to new UUID
      idMappings.studios[studioId] = newStudioId;
      stats.studios++;
    }
    exportMappings(idMappings);
    logger.info(`Imported ${stats.studios} studios successfully`);

    // 2. Import Instructors
    logger.info("Importing instructors...");
    for (const instructorId in data.instructors) {
      const instructor = data.instructors[instructorId];

      // Check if instructor already exists (by email)
      const { data: existingInstructors, error: checkError } = await supabase
        .from("instructor")
        .select("id, email")
        .eq("email", instructor.email?.toLowerCase());

      if (checkError) {
        logger.error(`Error checking instructor ${instructorId}:`, checkError);
        continue;
      }

      let newInstructorId;

      if (existingInstructors && existingInstructors.length > 0) {
        // Use existing instructor
        newInstructorId = existingInstructors[0].id;
        logger.info(
          `Using existing instructor with ID ${newInstructorId} for ${instructorId}`
        );
      } else {
        if (!instructor.user_id || !instructor.created_date) {
          logger.info(
            `Skipping instructor ${newInstructorId} ----- Instructor has invalid data`
          );
          continue;
        }

        // Create new instructor
        const { data: newInstructor, error: instructorError } = await supabase
          .from("instructor")
          .insert({
            first_name: instructor.first_name,
            last_name: instructor.last_name,
            email: instructor.email?.toLowerCase(),
            password: "$2b$10$temporaryHashedPasswordXYZ", // This would normally be properly hashed
            created_at: new Date(
              parseFloat(instructor.created_date) * 1000
            ).toISOString(),
            updated_at: new Date().toISOString(),
            temp_password: true,
          })
          .select();

        if (instructorError) {
          logger.error(
            `Error inserting instructor ${instructorId}:`,
            instructorError
          );
          continue;
        }

        newInstructorId = newInstructor[0].id;
        stats.instructors++;
      }

      // Store mapping
      idMappings.instructors[instructorId] = newInstructorId;
    }
    exportMappings(idMappings);
    logger.info(`Imported ${stats.instructors} instructors successfully`);

    // 3. Import Students
    logger.info("Importing students...");
    for (const studentId in data.students) {
      const student = data.students[studentId];

      // Check if student already exists (by email)
      const { data: existingStudents, error: checkError } = await supabase
        .from("student")
        .select("id, email")
        .eq("email", student.email?.toLowerCase());

      if (checkError) {
        logger.error(`Error checking student ${studentId}:`, checkError);
        continue;
      }

      let newStudentId;

      if (existingStudents && existingStudents.length > 0) {
        // Use existing student
        newStudentId = existingStudents[0].id;
        logger.info(
          `Using existing student with ID ${newStudentId} for ${studentId}`
        );
      } else {
        if (!student.user_id || !student.created_date) {
          logger.info(
            `Skipping student ${newStudentId} ----- Student has invalid data`
          );
          continue;
        }
        // Create new student with available fields
        const studentData = {
          first_name: student.first_name,
          last_name: student.last_name,
          password: "$2b$10$temporaryHashedPasswordXYZ", // This would normally be properly hashed
          created_at: new Date(
            parseFloat(student.created_date) * 1000
          ).toISOString(),
          updated_at: new Date().toISOString(),
          temp_password: true,
          ...(student.email && { email: student.email?.toLowerCase() }),
        };

        // Add optional fields if present
        if (student.birthday) {
          studentData.birthday = new Date(student.birthday * 1000)
            .toISOString()
            .split("T")[0];
        }
        if (student.height) {
          studentData.height = student.height;
        }
        if (student.weight) {
          studentData.weight = student.weight;
        }
        if (student.pathologies) {
          studentData.pathologies = student.pathologies;
        }
        if (student.job) {
          studentData.occupation = student.job;
        }

        const { data: newStudent, error: studentError } = await supabase
          .from("student")
          .insert(studentData)
          .select();

        if (studentError) {
          logger.error(`Error inserting student ${studentId}:`, studentError);
          continue;
        }

        newStudentId = newStudent[0].id;
        stats.students++;
      }

      // Store mapping
      idMappings.students[studentId] = newStudentId;
    }

    exportMappings(idMappings);
    logger.info(`Imported ${stats.students} students successfully`);

    // 4. Create Studio-Instructor Relationships
    logger.info("Creating studio-instructor relationships...");

    // Process studios -> instructors
    for (const studioId in data.studios) {
      const studio = data.studios[studioId];
      const newStudioId = idMappings.studios[studioId];

      if (!newStudioId) {
        logger.warn(
          `Skipping studio-instructor relationships for missing studio ${studioId}`
        );
        continue;
      }

      if (studio.instructors) {
        // Sort instructors by creation date (oldest first)
        const sortedInstructors = Object.keys(studio.instructors)
          .map(instructorId => ({
            instructorId,
            createdDate: data.instructors[instructorId]?.created_date || 0
          }))
          .sort((a, b) => a.createdDate - b.createdDate);

        // Track if we've assigned an admin yet
        let adminAssigned = false;

        for (const { instructorId } of sortedInstructors) {
          const newInstructorId = idMappings.instructors[instructorId];

          if (!newInstructorId) {
            logger.warn(
              `Skipping studio-instructor relationship for missing instructor ${instructorId}`
            );
            continue;
          }

          // Check if relationship already exists
          const { data: existingRelation, error: checkError } = await supabase
            .from("studio_instructor")
            .select("studio_instructor_id")
            .eq("studio_id", newStudioId)
            .eq("instructor_id", newInstructorId);

          if (checkError) {
            logger.error(
              `Error checking studio-instructor relationship:`,
              checkError
            );
            continue;
          }

          if (existingRelation && existingRelation.length > 0) {
            logger.info(
              `Skipping existing studio-instructor relationship: ${studioId} -> ${instructorId}`
            );
            continue;
          }

          // The first instructor (by creation date) becomes the admin
          const isAdmin = !adminAssigned;
          // Mark as assigned for subsequent iterations
          if (isAdmin) {
            adminAssigned = true;
          }

          const { error: relationError } = await supabase
            .from("studio_instructor")
            .insert({
              studio_id: newStudioId,
              instructor_id: newInstructorId,
              is_approved: true, // All imported relationships are approved
              is_admin: isAdmin,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

          if (relationError) {
            logger.error(
              `Error creating studio-instructor relationship:`,
              relationError
            );
            continue;
          }

          stats.studioInstructors++;
        }
      }
    }

    // Process instructors -> studios
    for (const instructorId in data.instructors) {
      const instructor = data.instructors[instructorId];
      const newInstructorId = idMappings.instructors[instructorId];

      if (!newInstructorId || !instructor.studios) {
        continue;
      }

      for (const studioId in instructor.studios) {
        const newStudioId = idMappings.studios[studioId];

        if (!newStudioId) {
          continue;
        }

        // Check if relationship already exists
        const { data: existingRelation, error: checkError } = await supabase
          .from("studio_instructor")
          .select("studio_instructor_id")
          .eq("studio_id", newStudioId)
          .eq("instructor_id", newInstructorId);

        if (checkError) {
          logger.error(
            `Error checking studio-instructor relationship:`,
            checkError
          );
          continue;
        }

        if (existingRelation && existingRelation.length > 0) {
          logger.info(
            `Skipping existing studio-instructor relationship: ${studioId} -> ${instructorId}`
          );
          continue;
        }

        // Before assigning admin status, find all instructors for this studio and get the oldest one
        const { data: studioInstructors, error: adminCheckError } = await supabase
          .from("studio_instructor")
          .select("instructor_id, is_admin")
          .eq("studio_id", newStudioId);

        // Check if an admin already exists
        const existingAdmin = studioInstructors?.some(si => si.is_admin);

        // If no admin exists, find all instructors associated with this studio in the original data
        let isAdmin = false;

        if (!existingAdmin) {
          // Get all instructors for this studio with creation dates
          const studioInstructorDates = Object.keys(data.instructors)
            .filter(id => data.instructors[id].studios && data.instructors[id].studios[studioId])
            .map(id => ({
              id,
              createdDate: parseFloat(data.instructors[id].created_date || 0)
            }))
            .sort((a, b) => a.createdDate - b.createdDate);

          // Check if this instructor is the oldest one
          isAdmin = studioInstructorDates.length > 0 &&
                    studioInstructorDates[0].id === instructorId;
        }

        // Insert the relationship
        const { error: relationError } = await supabase
          .from("studio_instructor")
          .insert({
            studio_id: newStudioId,
            instructor_id: newInstructorId,
            is_approved: true,
            is_admin: isAdmin,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (relationError) {
          logger.error(
            `Error creating studio-instructor relationship:`,
            relationError
          );
          continue;
        }

        stats.studioInstructors++;
      }
    }

    logger.info(
      `Created ${stats.studioInstructors} studio-instructor relationships`
    );

    // 5. Create Studio-Student Relationships
    logger.info("Creating studio-student relationships...");

    // Process studios -> students
    for (const studioId in data.studios) {
      const studio = data.studios[studioId];
      const newStudioId = idMappings.studios[studioId];

      if (!newStudioId || !studio.students) {
        continue;
      }

      for (const studentId in studio.students) {
        const newStudentId = idMappings.students[studentId];

        if (!newStudentId) {
          continue;
        }

        // Check if relationship already exists
        const { data: existingRelation, error: checkError } = await supabase
          .from("studio_student")
          .select("studio_student_id")
          .eq("studio_id", newStudioId)
          .eq("student_id", newStudentId);

        if (checkError) {
          logger.error(
            `Error checking studio-student relationship:`,
            checkError
          );
          continue;
        }

        if (existingRelation && existingRelation.length > 0) {
          logger.info(
            `Skipping existing studio-student relationship: ${studioId} -> ${studentId}`
          );
          continue;
        }

        const { error: relationError } = await supabase
          .from("studio_student")
          .insert({
            studio_id: newStudioId,
            student_id: newStudentId,
            is_approved: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (relationError) {
          logger.error(
            `Error creating studio-student relationship:`,
            relationError
          );
          continue;
        }

        stats.studioStudents++;
      }
    }

    // Process students -> studios_attending
    for (const studentId in data.students) {
      const student = data.students[studentId];
      const newStudentId = idMappings.students[studentId];

      if (!newStudentId || !student.studios_attending) {
        continue;
      }

      for (const studioId in student.studios_attending) {
        const studioData = student.studios_attending[studioId];
        const newStudioId = idMappings.studios[studioId];

        if (!newStudioId) {
          continue;
        }

        // Check if relationship already exists
        const { data: existingRelation, error: checkError } = await supabase
          .from("studio_student")
          .select("studio_student_id")
          .eq("studio_id", newStudioId)
          .eq("student_id", newStudentId);

        if (checkError) {
          logger.error(
            `Error checking studio-student relationship:`,
            checkError
          );
          continue;
        }

        if (existingRelation && existingRelation.length > 0) {
          const updateData = {};

          if (studioData.goals?.goal) {
            updateData.goals = studioData.goals.goal;
          }

          if (studioData.about?.about) {
            updateData.instructor_notes = studioData.about.about;
          }

          // Only perform update if there are fields to update
          if (Object.keys(updateData).length > 0) {
            updateData.updated_at = new Date().toISOString();

            const { error: updateError } = await supabase
              .from("studio_student")
              .update(updateData)
              .eq("studio_student_id", existingRelation[0].studio_student_id);

            if (updateError) {
              logger.error(`Error updating studio-student data:`, updateError);
            }
          }

          continue;
        }

        // Create new relationship
        const relationData = {
          studio_id: newStudioId,
          student_id: newStudentId,
          is_approved: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Add goals if present
        if (studioData.goals && studioData.goals.goal) {
          relationData.goals = studioData.goals.goal;
        }
        //add about
        if (studioData.about && studioData.about.about) {
          relationData.instructor_notes = studioData.about.about;
        }

        const { error: relationError } = await supabase
          .from("studio_student")
          .insert(relationData);

        if (relationError) {
          logger.error(
            `Error creating studio-student relationship:`,
            relationError
          );
          continue;
        }

        stats.studioStudents++;
      }
    }
    logger.info(`Created ${stats.studioStudents} studio-student relationships`);

    // 6. Import Lessons
    logger.info("Importing lessons...");
    for (const studioId in data.lessons) {
      const studioLessons = data.lessons[studioId];
      const newStudioId = idMappings.studios[studioId];

      if (!newStudioId) {
        logger.warn(`Skipping lessons for missing studio ${studioId}`);
        continue;
      }

      for (const lessonId in studioLessons) {
        const lesson = studioLessons[lessonId];

        const { data: newLesson, error: lessonError } = await supabase
          .from("lessons")
          .insert({
            title: lesson.title,
            instructions: lesson.instructions || "",
            level: lesson.level || "",
            reps: lesson.reps || "",
            studio_id: newStudioId,
            video_url: lesson.video_url || "",
            created_at: new Date(
              parseFloat(lesson.created_date) * 1000
            ).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select();

        if (lessonError) {
          logger.error(`Error inserting lesson ${lessonId}:`, lessonError);
          continue;
        }

        idMappings.lessons[lessonId] = newLesson[0].lesson_id;
        stats.lessons++;
      }
    }

    exportMappings(idMappings);
    logger.info(`Imported ${stats.lessons} lessons successfully`);

    // 7. Create Student-Lesson Assignments
    logger.info("Creating student-lesson assignments...");
    for (const studentId in data.students) {
      const student = data.students[studentId];
      const newStudentId = idMappings.students[studentId];

      if (!newStudentId || !student.studios_attending) {
        continue;
      }

      for (const studioId in student.studios_attending) {
        const studioData = student.studios_attending[studioId];

        if (!studioData.lessons) {
          continue;
        }

        for (const lessonId in studioData.lessons) {
          const lessonData = studioData.lessons[lessonId];
          const newLessonId = idMappings.lessons[lessonId];

          if (!newLessonId) {
            logger.warn(`Skipping assignment for missing lesson ${lessonId}`);
            continue;
          }

          // Check if assignment already exists
          const { data: existingAssignment, error: checkError } = await supabase
            .from("student_lessons")
            .select("student_lesson_id")
            .eq("student_id", newStudentId)
            .eq("lesson_id", newLessonId);

          if (checkError) {
            logger.error(
              `Error checking student-lesson assignment:`,
              checkError
            );
            continue;
          }

          if (existingAssignment && existingAssignment.length > 0) {
            logger.info(
              `Skipping existing student-lesson assignment: ${studentId} -> ${lessonId}`
            );
            continue;
          }

          const { error: assignmentError } = await supabase
            .from("student_lessons")
            .insert({
              student_id: newStudentId,
              lesson_id: newLessonId,
              is_completed: lessonData.completed === true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

          if (assignmentError) {
            logger.error(
              `Error creating student-lesson assignment:`,
              assignmentError
            );
            continue;
          }

          stats.studentLessons++;
        }
      }
    }
    logger.info(`Created ${stats.studentLessons} student-lesson assignments`);

    // 8. Import Notebooks
    logger.info("Importing notebooks...");
    for (const studentId in data.notebooks) {
      const studentNotebooks = data.notebooks[studentId];
      const newStudentId = idMappings.students[studentId];

      if (!newStudentId) {
        logger.warn(`Skipping notebooks for missing student ${studentId}`);
        continue;
      }

      for (const notebookId in studentNotebooks) {
        const notebook = studentNotebooks[notebookId];
        const newStudioId = idMappings.studios[notebook.studio_id];

        if (!newStudioId) {
          logger.warn(
            `Skipping notebook for missing studio ${notebook.studio_id}`
          );
          continue;
        }

        // Check if notebook already exists
        const { data: existingNotebooks, error: checkError } = await supabase
          .from("notebooks")
          .select("notebook_id")
          .eq("student_id", newStudentId)
          .eq("studio_id", newStudioId);

        if (checkError) {
          logger.error(`Error checking notebook:`, checkError);
          continue;
        }

        let newNotebookId;

        if (existingNotebooks && existingNotebooks.length > 0) {
          newNotebookId = existingNotebooks[0].notebook_id;
          logger.info(
            `Using existing notebook with ID ${newNotebookId} for ${notebookId}`
          );
        } else {
          const { data: newNotebook, error: notebookError } = await supabase
            .from("notebooks")
            .insert({
              student_id: newStudentId,
              studio_id: newStudioId,
              created_at: new Date(
                parseFloat(notebook.created_date) * 1000
              ).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select();

          if (notebookError) {
            logger.error(
              `Error inserting notebook ${notebookId}:`,
              notebookError
            );
            continue;
          }

          newNotebookId = newNotebook[0].notebook_id;
          stats.notebooks++;
        }

        idMappings.notebooks[notebookId] = newNotebookId;
      }
    }

    exportMappings(idMappings);
    logger.info(`Imported ${stats.notebooks} notebooks successfully`);

    // 9. Import Entries
    logger.info("Importing entries...");
    const notebookEntryMap = new Map(); // To track which notebook each entry belongs to

    // First, create a map of entries to notebooks
    for (const studentId in data.notebooks) {
      const studentNotebooks = data.notebooks[studentId];

      for (const notebookId in studentNotebooks) {
        const notebook = studentNotebooks[notebookId];

        if (notebook.entries) {
          for (const entryId in notebook.entries) {
            notebookEntryMap.set(entryId, notebookId);
          }
        }
      }
    }

    // Now process all entries
    for (const entryId in data.entries) {
      const entry = data.entries[entryId];

      // Find the notebook this entry belongs to
      const notebookId = notebookEntryMap.get(entryId);

      if (!notebookId) {
        logger.warn(`Skipping entry ${entryId} with no notebook reference`);
        continue;
      }

      const newNotebookId = idMappings.notebooks[notebookId];

      if (!newNotebookId) {
        logger.warn(`Skipping entry ${entryId} with missing notebook mapping`);
        continue;
      }

      // Get studio_id from entry or from notebook
      let studioId = entry.studio_id;

      if (!studioId || studioId === "") {
        // Find the notebook to get its studio_id
        for (const studentId in data.notebooks) {
          const studentNotebooks = data.notebooks[studentId];

          for (const nbId in studentNotebooks) {
            if (nbId === notebookId) {
              studioId = studentNotebooks[nbId].studio_id;
              break;
            }
          }
        }
      }

      const newStudioId = idMappings.studios[studioId];

      if (!newStudioId) {
        logger.warn(`Skipping entry ${entryId} with missing studio mapping`);
        continue;
      }

      const { data: newEntry, error: entryError } = await supabase
        .from("entries")
        .insert({
          title: entry.title || "",
          contents: entry.contents || "",
          notebook_id: newNotebookId,
          studio_id: newStudioId,
          created_at: new Date(
            parseFloat(entry.created_date) * 1000
          ).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select();

      if (entryError) {
        logger.error(`Error inserting entry ${entryId}:`, entryError);
        continue;
      }

      const newEntryId = newEntry[0]?.entry_id;

      idMappings.entries[entryId] = newEntryId;

      stats.entries++;
    }

    exportMappings(idMappings);
    logger.info(`Imported ${stats.entries} entries successfully`);

    // 10. Import Exercise Data Lists and Exercises
    logger.info("Importing exercise data lists and exercises...");
    if (data.exerciseDataLists) {
      for (const listKey in data.exerciseDataLists) {
        const list = data.exerciseDataLists[listKey];

        // Create exercise list
        const { data: newList, error: listError } = await supabase
          .from("exercise_lists")
          .insert({
            name: list.title,
          })
          .select();

        if (listError) {
          logger.error(`Error inserting exercise list ${listKey}:`, listError);
          continue;
        }

        const exerciseListId = newList[0].exercise_list_id;
        stats.exerciseLists++;

        // Insert exercises
        if (list.data && Array.isArray(list.data)) {
          for (const exercise of list.data) {
            const { error: exerciseError } = await supabase
              .from("exercises")
              .insert({
                exercise_list_id: exerciseListId,
                exercise_name: exercise.name,
              });

            if (exerciseError) {
              logger.error(
                `Error inserting exercise ${exercise.name}:`,
                exerciseError
              );
              continue;
            }

            stats.exercises++;
          }
        }
      }
    }

    exportMappings(idMappings);
    logger.info(
      `Imported ${stats.exerciseLists} exercise lists and ${stats.exercises} exercises`
    );

    exportMappings(idMappings);

    // Generate summary report
    logger.info("---------------------------------------");
    logger.info("Import process completed successfully");
    logger.info(`Summary:`);
    logger.info(`- Imported ${stats.studios} studios`);
    logger.info(`- Imported ${stats.instructors} instructors`);
    logger.info(`- Imported ${stats.students} students`);
    logger.info(
      `- Created ${stats.studioInstructors} studio-instructor relationships`
    );
    logger.info(
      `- Created ${stats.studioStudents} studio-student relationships`
    );
    logger.info(`- Imported ${stats.lessons} lessons`);
    logger.info(`- Created ${stats.studentLessons} student-lesson assignments`);
    logger.info(`- Imported ${stats.notebooks} notebooks`);
    logger.info(`- Imported ${stats.entries} entries`);
    logger.info(
      `- Imported ${stats.exerciseLists} exercise lists and ${stats.exercises} exercises`
    );
    logger.info("---------------------------------------");
  } catch (error) {
    logger.error("Critical error during import:", error);
    process.exit(1);
  }
}

// Run the import
importAll(jsonPath).catch((err) => {
  logger.error("Unhandled error:", err);
  process.exit(1);
});
