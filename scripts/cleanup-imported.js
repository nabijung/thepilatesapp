#!/usr/bin/env node

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs").promises;
const path = require("path");
const winston = require("winston");
const dotenv = require("dotenv");
const readline = require("readline");

// Parse command-line arguments
const args = process.argv.slice(2);
const forceMode = args.includes("--force");
let mappingsPath = "id-mappings.json";

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--mappings" && i + 1 < args.length) {
    mappingsPath = args[i + 1];
    i++;
  }
}

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
      filename: path.join(logDir, "cleanup.log"),
      level: "info",
    }),
    new winston.transports.File({
      filename: path.join(logDir, "cleanup-error.log"),
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

// User confirmation prompt
const confirmAction = async (message) => {
  if (forceMode) {
    return true;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "yes" || answer.toLowerCase() === "y");
    });
  });
};

// Main cleanup function
async function cleanupImportedData(mappingsFilePath) {
  logger.info(
    `Starting cleanup process using mappings from ${mappingsFilePath}`
  );
  const supabase = initSupabase();

  try {
    // Check if mappings file exists
    try {
      await fs.access(mappingsFilePath);
      logger.info(`Mappings file found: ${mappingsFilePath}`);
    } catch (fileError) {
      logger.error(`Mappings file not found: ${mappingsFilePath}`);
      throw new Error(`Mappings file not found: ${mappingsFilePath}`);
    }

    // Read the mappings file
    logger.info("Reading mappings file...");
    const rawData = await fs.readFile(mappingsFilePath, "utf8");

    let idMappings;
    try {
      idMappings = JSON.parse(rawData);
      logger.info("Mappings file parsed successfully");
    } catch (parseError) {
      logger.error("Failed to parse mappings file:", parseError);
      throw new Error("Invalid JSON format in mappings file");
    }

    // Validate mappings structure
    if (
      !idMappings.studios ||
      !idMappings.instructors ||
      !idMappings.students ||
      !idMappings.lessons ||
      !idMappings.notebooks ||
      !idMappings.entries
    ) {
      throw new Error(
        "Invalid mappings structure: missing required mapping objects"
      );
    }

    // Count the number of items to delete
    const counts = {
      entries: Object.keys(idMappings.entries).length,
      notebooks: Object.keys(idMappings.notebooks).length,
      lessons: Object.keys(idMappings.lessons).length,
      students: Object.keys(idMappings.students).length,
      instructors: Object.keys(idMappings.instructors).length,
      studios: Object.keys(idMappings.studios).length,
    };

    logger.info("Items to be deleted:");
    logger.info(`- ${counts.entries} entries`);
    logger.info(`- ${counts.notebooks} notebooks`);
    logger.info(`- ${counts.lessons} lessons`);
    logger.info(`- ${counts.students} students`);
    logger.info(`- ${counts.instructors} instructors`);
    logger.info(`- ${counts.studios} studios`);

    // Get confirmation before proceeding
    const confirmed = await confirmAction(
      "Do you want to proceed with deletion?"
    );
    if (!confirmed) {
      logger.info("Cleanup cancelled by user");
      return;
    }

    // Statistics for final report
    const stats = {
      entries: 0,
      notebooks: 0,
      studentLessons: 0,
      lessons: 0,
      studioStudents: 0,
      studioInstructors: 0,
      students: 0,
      instructors: 0,
      studios: 0,
      exerciseLists: 0,
      exercises: 0,
    };

    logger.info("Starting deletion process...");

    // 1. Delete Entries
    logger.info("Deleting entries...");
    const entryIds = Object.values(idMappings.entries);
    if (entryIds.length > 0) {
      const { error: entriesError } = await supabase
        .from("entries")
        .delete()
        .in("entry_id", entryIds);

      if (entriesError) {
        logger.error("Error deleting entries:", entriesError);
      } else {
        stats.entries = entryIds.length;
        logger.info(`Deleted ${stats.entries} entries`);
      }
    }

    // 2. Delete Notebooks
    logger.info("Deleting notebooks...");
    const notebookIds = Object.values(idMappings.notebooks);
    if (notebookIds.length > 0) {
      const { error: notebooksError } = await supabase
        .from("notebooks")
        .delete()
        .in("notebook_id", notebookIds);

      if (notebooksError) {
        logger.error("Error deleting notebooks:", notebooksError);
      } else {
        stats.notebooks = notebookIds.length;
        logger.info(`Deleted ${stats.notebooks} notebooks`);
      }
    }

    // 3. Delete Student-Lesson assignments
    logger.info("Deleting student-lesson assignments...");
    const lessonIds = Object.values(idMappings.lessons);
    const studentIds = Object.values(idMappings.students);

    if (lessonIds.length > 0 && studentIds.length > 0) {
      // Get all student-lesson assignments that match our imported lessons and students
      const { data: studentLessons, error: slFetchError } = await supabase
        .from("student_lessons")
        .select("student_lesson_id")
        .in("lesson_id", lessonIds)
        .in("student_id", studentIds);

      if (slFetchError) {
        logger.error(
          "Error fetching student-lesson assignments:",
          slFetchError
        );
      } else if (studentLessons && studentLessons.length > 0) {
        const studentLessonIds = studentLessons.map(
          (sl) => sl.student_lesson_id
        );

        const { error: slDeleteError } = await supabase
          .from("student_lessons")
          .delete()
          .in("student_lesson_id", studentLessonIds);

        if (slDeleteError) {
          logger.error(
            "Error deleting student-lesson assignments:",
            slDeleteError
          );
        } else {
          stats.studentLessons = studentLessons.length;
          logger.info(
            `Deleted ${stats.studentLessons} student-lesson assignments`
          );
        }
      }
    }

    // 4. Delete Lessons
    logger.info("Deleting lessons...");
    if (lessonIds.length > 0) {
      const { error: lessonsError } = await supabase
        .from("lessons")
        .delete()
        .in("lesson_id", lessonIds);

      if (lessonsError) {
        logger.error("Error deleting lessons:", lessonsError);
      } else {
        stats.lessons = lessonIds.length;
        logger.info(`Deleted ${stats.lessons} lessons`);
      }
    }

    // 5. Delete Studio-Student relationships
    logger.info("Deleting studio-student relationships...");
    const studioIds = Object.values(idMappings.studios);

    if (studioIds.length > 0 && studentIds.length > 0) {
      const { data: studioStudents, error: ssFetchError } = await supabase
        .from("studio_student")
        .select("studio_student_id")
        .in("studio_id", studioIds)
        .in("student_id", studentIds);

      if (ssFetchError) {
        logger.error(
          "Error fetching studio-student relationships:",
          ssFetchError
        );
      } else if (studioStudents && studioStudents.length > 0) {
        const studioStudentIds = studioStudents.map(
          (ss) => ss.studio_student_id
        );

        const { error: ssDeleteError } = await supabase
          .from("studio_student")
          .delete()
          .in("studio_student_id", studioStudentIds);

        if (ssDeleteError) {
          logger.error(
            "Error deleting studio-student relationships:",
            ssDeleteError
          );
        } else {
          stats.studioStudents = studioStudents.length;
          logger.info(
            `Deleted ${stats.studioStudents} studio-student relationships`
          );
        }
      }
    }

    // 6. Delete Studio-Instructor relationships
    logger.info("Deleting studio-instructor relationships...");
    const instructorIds = Object.values(idMappings.instructors);

    if (studioIds.length > 0 && instructorIds.length > 0) {
      const { data: studioInstructors, error: siFetchError } = await supabase
        .from("studio_instructor")
        .select("studio_instructor_id")
        .in("studio_id", studioIds)
        .in("instructor_id", instructorIds);

      if (siFetchError) {
        logger.error(
          "Error fetching studio-instructor relationships:",
          siFetchError
        );
      } else if (studioInstructors && studioInstructors.length > 0) {
        const studioInstructorIds = studioInstructors.map(
          (si) => si.studio_instructor_id
        );

        const { error: siDeleteError } = await supabase
          .from("studio_instructor")
          .delete()
          .in("studio_instructor_id", studioInstructorIds);

        if (siDeleteError) {
          logger.error(
            "Error deleting studio-instructor relationships:",
            siDeleteError
          );
        } else {
          stats.studioInstructors = studioInstructors.length;
          logger.info(
            `Deleted ${stats.studioInstructors} studio-instructor relationships`
          );
        }
      }
    }

    // 7. Delete Students - be careful here!
    logger.info("Deleting students...");
    if (studentIds.length > 0) {
      // Get confirmation
      const confirmStudents = await confirmAction(
        `Are you sure you want to delete ${studentIds.length} students?`
      );

      if (confirmStudents) {
        const { error: studentsError } = await supabase
          .from("student")
          .delete()
          .in("id", studentIds);

        if (studentsError) {
          logger.error("Error deleting students:", studentsError);
        } else {
          stats.students = studentIds.length;
          logger.info(`Deleted ${stats.students} students`);
        }
      } else {
        logger.info("Student deletion skipped by user");
      }
    }

    // 8. Delete Instructors - be careful here!
    logger.info("Deleting instructors...");
    if (instructorIds.length > 0) {
      // Get confirmation
      const confirmInstructors = await confirmAction(
        `Are you sure you want to delete ${instructorIds.length} instructors?`
      );
      if (confirmInstructors) {
        const { error: instructorsError } = await supabase
          .from("instructor")
          .delete()
          .in("id", instructorIds);

        if (instructorsError) {
          logger.error("Error deleting instructors:", instructorsError);
        } else {
          stats.instructors = instructorIds.length;
          logger.info(`Deleted ${stats.instructors} instructors`);
        }
      } else {
        logger.info("Instructor deletion skipped by user");
      }
    }

    // 9. Delete Studios - be very careful here!
    logger.info("Deleting studios...");
    if (studioIds.length > 0) {
      // Get confirmation
      const confirmStudios = await confirmAction(
        `Are you sure you want to delete ${studioIds.length} studios?`
      );
      if (confirmStudios) {
        const { error: studiosError } = await supabase
          .from("studio")
          .delete()
          .in("studio_id", studioIds);

        if (studiosError) {
          logger.error("Error deleting studios:", studiosError);
        } else {
          stats.studios = studioIds.length;
          logger.info(`Deleted ${stats.studios} studios`);
        }
      } else {
        logger.info("Studio deletion skipped by user");
      }
    }

    // 10. Clean up exercise data
    // This is a bit more complex since we don't have direct mappings
    logger.info("Checking for imported exercise data...");

    // Check if we have any exercises that were imported (after a certain date)
    const importDate = new Date();
    importDate.setHours(importDate.getHours() - 24); // Look at data from last 24 hours

    // Get confirmation
    const confirmExercises = await confirmAction(
      "Do you want to check for and delete recently imported exercise data?"
    );
    if (confirmExercises) {
      // Get recently added exercise lists
      const { data: recentLists, error: listsError } = await supabase
        .from("exercise_lists")
        .select("exercise_list_id, name")
        .gt("created_at", importDate.toISOString());

      if (listsError) {
        logger.error("Error fetching recent exercise lists:", listsError);
      } else if (recentLists && recentLists.length > 0) {
        const listIds = recentLists.map((list) => list.exercise_list_id);

        // Get exercises from these lists
        const { data: exercises, error: exercisesError } = await supabase
          .from("exercises")
          .select("exercise_id")
          .in("exercise_list_id", listIds);

        if (exercisesError) {
          logger.error("Error fetching exercises:", exercisesError);
        } else if (exercises && exercises.length > 0) {
          // Delete exercises
          const exerciseIds = exercises.map((ex) => ex.exercise_id);

          const { error: exDeleteError } = await supabase
            .from("exercises")
            .delete()
            .in("exercise_id", exerciseIds);

          if (exDeleteError) {
            logger.error("Error deleting exercises:", exDeleteError);
          } else {
            stats.exercises = exerciseIds.length;
            logger.info(`Deleted ${stats.exercises} exercises`);
          }
        }

        // Delete exercise lists
        const { error: listDeleteError } = await supabase
          .from("exercise_lists")
          .delete()
          .in("exercise_list_id", listIds);

        if (listDeleteError) {
          logger.error("Error deleting exercise lists:", listDeleteError);
        } else {
          stats.exerciseLists = listIds.length;
          logger.info(`Deleted ${stats.exerciseLists} exercise lists`);
        }
      } else {
        logger.info("No recent exercise lists found");
      }
    } else {
      logger.info("Exercise data cleanup skipped by user");
    }

    // Generate summary report
    logger.info("---------------------------------------");
    logger.info("Cleanup process completed");
    logger.info(`Summary:`);
    logger.info(`- Deleted ${stats.entries} entries`);
    logger.info(`- Deleted ${stats.notebooks} notebooks`);
    logger.info(`- Deleted ${stats.studentLessons} student-lesson assignments`);
    logger.info(`- Deleted ${stats.lessons} lessons`);
    logger.info(
      `- Deleted ${stats.studioStudents} studio-student relationships`
    );
    logger.info(
      `- Deleted ${stats.studioInstructors} studio-instructor relationships`
    );
    logger.info(`- Deleted ${stats.students} students`);
    logger.info(`- Deleted ${stats.instructors} instructors`);
    logger.info(`- Deleted ${stats.studios} studios`);
    logger.info(
      `- Deleted ${stats.exercises} exercises and ${stats.exerciseLists} exercise lists`
    );
    logger.info("---------------------------------------");

    // Rename or backup the mappings file
    const backupPath = `${mappingsFilePath}_time_${Date.now()}.bak`;
    await fs.rename(mappingsFilePath, backupPath);
    logger.info(`Mappings file backed up to ${backupPath}`);
  } catch (error) {
    logger.error("Critical error during cleanup:", error);
    process.exit(1);
  }
}

// Run the cleanup with the specified mappings file
cleanupImportedData(mappingsPath).catch((err) => {
  logger.error("Unhandled error:", err);
  process.exit(1);
});
