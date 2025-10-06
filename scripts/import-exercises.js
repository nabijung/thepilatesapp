#!/usr/bin/env node

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs").promises;
const path = require("path");
const winston = require("winston");
const dotenv = require("dotenv");

// Parse command-line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Please provide a JSON file path");
  console.error("Usage: node import-exercises.js <path_to_json_file>");
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
      filename: path.join(logDir, "exercise-import.log"),
      level: "info",
    }),
    new winston.transports.File({
      filename: path.join(logDir, "exercise-import-error.log"),
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
  if (!data.exerciseDataLists) {
    throw new Error(
      'Invalid JSON structure: missing "exerciseDataLists" property'
    );
  }

  Object.values(data.exerciseDataLists).forEach((list) => {
    if (!list.title) {
      throw new Error(
        'Invalid JSON structure: missing "title" in exercise list'
      );
    }

    if (!Array.isArray(list.data)) {
      throw new Error(
        'Invalid JSON structure: "data" property is not an array'
      );
    }

    list.data.forEach((exercise) => {
      if (!exercise.name) {
        throw new Error('Invalid JSON structure: missing "name" in exercise');
      }
    });
  });

  logger.info("JSON structure validated successfully");
  logger.info(
    "Note: Importing only required fields to match existing database schema"
  );
};

// Helper function to examine table structure
async function examineTableStructure(supabase, tableName) {
  try {
    logger.info(`Examining structure of ${tableName} table...`);

    // Get a single row to examine the structure
    const { data, error } = await supabase.from(tableName).select("*").limit(1);

    if (error) {
      logger.error(`Error examining ${tableName} table:`, error);
      return null;
    }

    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      logger.info(`${tableName} table columns: ${columns.join(", ")}`);
      return columns;
    } else {
      logger.info(
        `\n${tableName}: table has no current data to use in determining column structure\n`
      );
      logger.info(
        `Proceeding with default column assumptions for ${tableName}`
      );

      // Default column assumptions based on table name
      if (tableName === "exercise_lists") {
        return ["exercise_list_id", "name"];
      } else if (tableName === "exercises") {
        return ["exercise_id", "exercise_name", "exercise_list_id"];
      }
      return null;
    }

    // logger.warn(`Could not determine columns for ${tableName} table`);
    return null;
  } catch (err) {
    logger.error(`Error in examineTableStructure for ${tableName}:`, err);
    return null;
  }
}

// Main import function
async function importExercises(jsonFilePath) {
  logger.info(`Starting exercise import process from ${jsonFilePath}`);
  const supabase = initSupabase();

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

    let exerciseData;
    try {
      exerciseData = JSON.parse(rawData);
      logger.info("JSON file parsed successfully");
    } catch (parseError) {
      logger.error("Failed to parse JSON:", parseError);
      throw new Error("Invalid JSON format");
    }

    // Validate JSON structure
    validateJsonStructure(exerciseData);

    // Examine table structure to determine correct field names
    const exerciseListColumns = await examineTableStructure(
      supabase,
      "exercise_lists"
    );
    const exercisesColumns = await examineTableStructure(supabase, "exercises");

    // Determine ID column names
    const listIdColumn =
      exerciseListColumns?.find((col) => col.includes("_id")) ||
      "exercise_list_id";
    const exerciseNameColumn =
      exercisesColumns?.find((col) => col.includes("name")) || "exercise_name";
    const exerciseListIdFKColumn =
      exercisesColumns?.find((col) => col.includes("list_id")) ||
      "exercise_list_id";

    logger.info(`Using ${listIdColumn} as list ID column`);
    logger.info(`Using ${exerciseNameColumn} as exercise name column`);
    logger.info(
      `Using ${exerciseListIdFKColumn} as exercise list foreign key column`
    );

    logger.info(
      `Found ${
        Object.keys(exerciseData.exerciseDataLists).length
      } exercise lists to import`
    );

    // Get total number of exercises
    const totalExercises = Object.values(exerciseData.exerciseDataLists).reduce(
      (acc, list) => acc + list.data.length,
      0
    );
    logger.info(`Total exercises to import: ${totalExercises}`);

    // Process each exercise list
    let importedLists = 0;
    let importedExercises = 0;

    for (const [listKey, listData] of Object.entries(
      exerciseData.exerciseDataLists
    )) {
      logger.info(`Processing exercise list: ${listKey} - "${listData.title}"`);

      // Insert exercise list with only the name field
      const listInsertObj = { name: listData.title };

      const { data: listInsertData, error: listInsertError } = await supabase
        .from("exercise_lists")
        .insert(listInsertObj)
        .select();

      if (listInsertError) {
        logger.error(
          `Failed to insert exercise list ${listKey}:`,
          listInsertError
        );
        throw listInsertError;
      }

      importedLists++;
      const exerciseListId = listInsertData[0][listIdColumn];
      logger.info(`Created exercise list with ID ${exerciseListId}`);

      // Prepare exercises for batch insert
      const exerciseBatch = listData.data.map((exercise) => {
        // Create a basic object with only the name and list id
        const exerciseObj = {};
        exerciseObj[exerciseNameColumn] = exercise.name;
        exerciseObj[exerciseListIdFKColumn] = exerciseListId;
        return exerciseObj;
      });

      // Batch insert exercises
      const { data: exerciseInsertData, error: exerciseInsertError } =
        await supabase.from("exercises").insert(exerciseBatch);

      if (exerciseInsertError) {
        logger.error(
          `Failed to insert exercises for list ${listKey}:`,
          exerciseInsertError
        );
        throw exerciseInsertError;
      }

      importedExercises += exerciseBatch.length;
      logger.info(
        `Successfully imported ${exerciseBatch.length} exercises for ${listKey}`
      );
    }

    logger.info("---------------------------------------");
    logger.info("Exercise import process completed successfully");
    logger.info(`Summary:`);
    logger.info(`- Imported ${importedLists} exercise lists`);
    logger.info(`- Imported ${importedExercises} exercises`);
    logger.info("---------------------------------------");
  } catch (error) {
    logger.error("Critical error during import:", error);
    process.exit(1);
  }
}

// Run the import
importExercises(jsonPath).catch((err) => {
  logger.error("Unhandled error:", err);
  process.exit(1);
});
