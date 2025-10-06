#!/usr/bin/env node

/**
 * Prospire Image Import Script
 * 
 * This script imports student profile images and studio progress photos from Firebase Storage
 * to Supabase Storage. It processes data from a Firebase export JSON file.
 * 
 * Features:
 * - Downloads profile images for students
 * - Downloads progress photos linked to students and studios
 * - Uploads images to Supabase Storage with proper organization
 * - Comprehensive error handling and retry logic
 * - Detailed logging and progress tracking
 * - Resume capability (skips already imported images)
 * 
 * Usage: node import-images.js <path_to_json_file>
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs").promises;
const path = require("path");
const winston = require("winston");
const dotenv = require("dotenv");
const https = require("https");
const http = require("http");
const { URL } = require("url");

// Parse command-line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Please provide a JSON file path");
  console.error("Usage: node import-images.js <path_to_json_file>");
  process.exit(1);
}

const jsonPath = path.resolve(process.cwd(), args[0]);

// Configuration
const CONFIG = {
  FIREBASE_STORAGE_BASE: "https://firebasestorage.googleapis.com/v0/b/arnold-89303.appspot.com/o/",
  IMAGES_BUCKET: "images", // Main bucket for all images (matches app pattern)
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000, // 2 seconds
  DOWNLOAD_TIMEOUT: 30000, // 30 seconds
  CONCURRENT_DOWNLOADS: 5, // Process 5 images at a time
  SUPPORTED_FORMATS: ['.jpg', '.jpeg', '.png', '.gif', '.webp']
};

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
      filename: path.join(logDir, "import-images.log"),
      level: "info",
    }),
    new winston.transports.File({
      filename: path.join(logDir, "import-images-error.log"),
      level: "error",
    }),
  ],
});

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

/**
 * Validates required environment variables
 */
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

/**
 * Initialize Supabase client
 */
const initSupabase = () => {
  validateConfig();

  logger.info(`Connecting to Supabase at ${process.env.SUPABASE_URL}`);
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
};

/**
 * Sleep for specified milliseconds
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * URL encode a Firebase Storage path
 */
const encodeFirebasePath = (path) => {
  return encodeURIComponent(path);
};

/**
 * Generate Firebase Storage download URL
 */
const generateFirebaseUrl = (path) => {
  const encodedPath = encodeFirebasePath(path);
  return `${CONFIG.FIREBASE_STORAGE_BASE}${encodedPath}?alt=media`;
};

/**
 * Download image from URL with retry logic
 */
const downloadImage = async (url, retries = CONFIG.MAX_RETRIES) => {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const timeout = setTimeout(() => {
      req.destroy();
      reject(new Error(`Download timeout after ${CONFIG.DOWNLOAD_TIMEOUT}ms`));
    }, CONFIG.DOWNLOAD_TIMEOUT);

    const req = client.get(url, (res) => {
      clearTimeout(timeout);
      
      if (res.statusCode !== 200) {
        if (retries > 0 && res.statusCode >= 500) {
          logger.warn(`Download failed with status ${res.statusCode}, retrying... (${retries} retries left)`);
          setTimeout(() => {
            downloadImage(url, retries - 1)
              .then(resolve)
              .catch(reject);
          }, CONFIG.RETRY_DELAY);
          return;
        }
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        return;
      }

      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer);
      });
      res.on('error', reject);
    });

    req.on('error', (err) => {
      clearTimeout(timeout);
      if (retries > 0) {
        logger.warn(`Download error: ${err.message}, retrying... (${retries} retries left)`);
        setTimeout(() => {
          downloadImage(url, retries - 1)
            .then(resolve)
            .catch(reject);
        }, CONFIG.RETRY_DELAY);
      } else {
        reject(err);
      }
    });
  });
};

/**
 * Check if file already exists in Supabase Storage
 */
const fileExists = async (supabase, bucketName, filePath) => {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list(path.dirname(filePath), {
        search: path.basename(filePath)
      });

    if (error) {
      logger.debug(`Error checking file existence: ${error.message}`);
      return false;
    }

    return data && data.length > 0;
  } catch (error) {
    logger.debug(`Error checking file existence: ${error.message}`);
    return false;
  }
};

/**
 * Upload image buffer to Supabase Storage
 */
const uploadToSupabase = async (supabase, bucketName, filePath, buffer, contentType = 'image/png') => {
  try {
    // Check if file already exists
    if (await fileExists(supabase, bucketName, filePath)) {
      logger.info(`File already exists, skipping: ${filePath}`);
      return { success: true, skipped: true };
    }

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, buffer, {
        contentType,
        upsert: false // Don't overwrite existing files
      });

    if (error) {
      throw error;
    }

    logger.info(`Successfully uploaded: ${filePath}`);
    return { success: true, data, skipped: false };
  } catch (error) {
    logger.error(`Failed to upload ${filePath}: ${error.message}`);
    throw error;
  }
};

/**
 * Process a single image (download and upload)
 */
const processImage = async (supabase, firebasePath, supabasePath, bucketName, imageType = 'unknown') => {
  try {
    logger.info(`Processing ${imageType}: ${firebasePath} -> ${bucketName}/${supabasePath}`);
    
    // Generate Firebase download URL
    const downloadUrl = generateFirebaseUrl(firebasePath);
    logger.debug(`Download URL: ${downloadUrl}`);
    
    // Download image
    logger.debug(`Downloading image from Firebase...`);
    const imageBuffer = await downloadImage(downloadUrl);
    logger.debug(`Downloaded ${imageBuffer.length} bytes`);
    
    // Upload to Supabase
    const result = await uploadToSupabase(
      supabase, 
      bucketName, 
      supabasePath, 
      imageBuffer,
      'image/png' // Convert all images to PNG for consistency
    );
    
    return {
      success: true,
      firebasePath,
      supabasePath,
      bucketName,
      size: imageBuffer.length,
      skipped: result.skipped
    };
  } catch (error) {
    logger.error(`Failed to process ${imageType} ${firebasePath}: ${error.message}`);
    return {
      success: false,
      firebasePath,
      supabasePath,
      bucketName,
      error: error.message
    };
  }
};

/**
 * Process images in batches to avoid overwhelming the servers
 */
const processBatch = async (supabase, imageBatch) => {
  const promises = imageBatch.map(({ firebasePath, supabasePath, bucketName, imageType }) =>
    processImage(supabase, firebasePath, supabasePath, bucketName, imageType)
  );
  
  return await Promise.all(promises);
};

/**
 * Import student profile images
 */
const importProfileImages = async (supabase, data, mappings) => {
  logger.info("Starting profile image import...");
  
  const students = data.students || {};
  const studentIds = Object.keys(students);
  
  // Find students with profile images
  const studentsWithImages = studentIds.filter(id => {
    const student = students[id];
    return student.profile_image && student.profile_image.trim() !== '';
  });
  
  logger.info(`Found ${studentsWithImages.length} students with profile images out of ${studentIds.length} total students`);
  
  if (studentsWithImages.length === 0) {
    logger.info("No profile images to import");
    return { processed: 0, successful: 0, skipped: 0, failed: 0, dbUpdated: 0 };
  }
  
  const imagesToProcess = studentsWithImages.map(studentId => {
    const student = students[studentId];
    const firebasePath = student.profile_image;
    
    // Create path matching app pattern: profile_pictures/{userId}/{filename}
    // Use the new student ID from mappings if available, otherwise old ID
    const newStudentId = mappings.students[studentId] || studentId;
    const fileName = path.basename(firebasePath);
    const supabasePath = `profile_pictures/${newStudentId}/${fileName}.png`;
    
    return {
      firebasePath,
      supabasePath,
      bucketName: CONFIG.IMAGES_BUCKET,
      imageType: `profile image for student ${studentId}`,
      studentId
    };
  });
  
  // Process in batches and update database immediately after each batch
  const results = [];
  let dbUpdated = 0;
  
  for (let i = 0; i < imagesToProcess.length; i += CONFIG.CONCURRENT_DOWNLOADS) {
    const batch = imagesToProcess.slice(i, i + CONFIG.CONCURRENT_DOWNLOADS);
    const batchImages = imagesToProcess.slice(i, i + CONFIG.CONCURRENT_DOWNLOADS);
    logger.info(`Processing profile image batch ${Math.floor(i / CONFIG.CONCURRENT_DOWNLOADS) + 1}/${Math.ceil(imagesToProcess.length / CONFIG.CONCURRENT_DOWNLOADS)}`);
    
    const batchResults = await processBatch(supabase, batch);
    results.push(...batchResults);
    
    // Update database with successful uploads from this batch immediately (only new uploads, not skipped)
    logger.info(`Updating batch ${Math.floor(i / CONFIG.CONCURRENT_DOWNLOADS) + 1} profile images in database...`);
    for (const result of batchResults) {
      if (result.success && !result.skipped) { // Only new uploads, not skipped files
        const imageInfo = batchImages.find(img => img.supabasePath === result.supabasePath);
        if (imageInfo && imageInfo.studentId) {
          // Create full Supabase storage URL
          const supabaseUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/${result.bucketName}/${result.supabasePath}`;
          const updated = await updateStudentProfileImage(supabase, imageInfo.studentId, supabaseUrl, mappings);
          if (updated) {
            dbUpdated++;
          }
        }
      }
    }
    
    // Small delay between batches
    if (i + CONFIG.CONCURRENT_DOWNLOADS < imagesToProcess.length) {
      await sleep(1000);
    }
  }
  
  const successful = results.filter(r => r.success && !r.skipped).length;
  const skipped = results.filter(r => r.success && r.skipped).length;
  const failed = results.filter(r => !r.success).length;
  
  logger.info(`Profile image import completed: ${successful} successful, ${skipped} skipped, ${failed} failed, ${dbUpdated} database records updated`);
  
  // Log failures
  const failures = results.filter(r => !r.success);
  if (failures.length > 0) {
    logger.error("Failed profile image imports:");
    failures.forEach(failure => {
      logger.error(`  ${failure.firebasePath}: ${failure.error}`);
    });
  }
  
  return {
    processed: results.length,
    successful,
    skipped,
    failed,
    dbUpdated
  };
};

/**
 * Import progress photos
 */
const importProgressPhotos = async (supabase, data, mappings) => {
  logger.info("Starting progress photo import...");
  
  const photos = data.photos || {};
  const students = data.students || {};
  
  // Find all progress photos
  const progressPhotos = Object.entries(photos).filter(([photoId, photo]) => {
    return photo.path && photo.path.includes('progress_photos');
  });
  
  logger.info(`Found ${progressPhotos.length} progress photos in total`);
  
  if (progressPhotos.length === 0) {
    logger.info("No progress photos to import");
    return { processed: 0, successful: 0, skipped: 0, failed: 0, dbInserted: 0 };
  }
  
  // Organize photos by student ID (extracted from path)
  const photosByStudent = {};
  const orphanedPhotos = [];
  
  progressPhotos.forEach(([photoId, photo]) => {
    // Extract student ID from path: progress_photos/-M80o5_xyi-TUSv2RUjM/F61193745083
    const pathParts = photo.path.split('/');
    if (pathParts.length >= 2 && pathParts[0] === 'progress_photos') {
      const studentId = pathParts[1];
      
      // Verify this student exists in our data
      if (students[studentId]) {
        if (!photosByStudent[studentId]) {
          photosByStudent[studentId] = [];
        }
        photosByStudent[studentId].push({ photoId, photo });
      } else {
        logger.warn(`Progress photo ${photoId} references unknown student: ${studentId}`);
        orphanedPhotos.push({ photoId, photo, extractedStudentId: studentId });
      }
    } else {
      logger.warn(`Progress photo ${photoId} has unexpected path format: ${photo.path}`);
      orphanedPhotos.push({ photoId, photo });
    }
  });
  
  logger.info(`Organized photos: ${Object.keys(photosByStudent).length} students have progress photos`);
  if (orphanedPhotos.length > 0) {
    logger.warn(`Found ${orphanedPhotos.length} orphaned progress photos`);
  }
  
  // Prepare images for processing - need to find studioStudentId first
  const imagesToProcess = [];
  
  // Pre-fetch all studio-student relationships to get the correct studioStudentId
  const studioStudentMap = {};
  
  for (const [studentId, studentPhotos] of Object.entries(photosByStudent)) {
    for (const { photoId, photo } of studentPhotos) {
      const newStudentId = mappings.students[studentId];
      const newStudioId = mappings.studios[photo.studio];
      
      if (!newStudentId || !newStudioId) {
        logger.warn(`Skipping photo ${photoId}: missing mapping for student ${studentId} or studio ${photo.studio}`);
        continue;
      }
      
      // Get studioStudentId for this combination
      const mapKey = `${newStudentId}_${newStudioId}`;
      if (!studioStudentMap[mapKey]) {
        try {
          const { data: studioStudent } = await supabase
            .from('studio_student')
            .select('studio_student_id')
            .eq('student_id', newStudentId)
            .eq('studio_id', newStudioId)
            .single();
          
          if (studioStudent) {
            studioStudentMap[mapKey] = studioStudent.studio_student_id;
          }
        } catch (error) {
          logger.warn(`Could not find studio_student for student ${newStudentId} and studio ${newStudioId}`);
          continue;
        }
      }
      
      const studioStudentId = studioStudentMap[mapKey];
      if (!studioStudentId) {
        logger.warn(`No studioStudentId found for student ${studentId} and studio ${photo.studio}`);
        continue;
      }
      
      const firebasePath = photo.path;
      const fileName = path.basename(firebasePath);
      
      // Create path matching app pattern: progress_photos/{studioStudentId}/{filename}
      const supabasePath = `progress_photos/${studioStudentId}/${fileName}.png`;
      
      imagesToProcess.push({
        firebasePath,
        supabasePath,
        bucketName: CONFIG.IMAGES_BUCKET,
        imageType: `progress photo ${photoId} for student ${studentId}`,
        studentId,
        photoId,
        studioId: photo.studio,
        studioStudentId
      });
    }
  }
  
  logger.info(`Prepared ${imagesToProcess.length} progress photos for import`);
  
  // Process in batches and insert into database immediately after each batch
  const results = [];
  let dbInserted = 0;
  
  for (let i = 0; i < imagesToProcess.length; i += CONFIG.CONCURRENT_DOWNLOADS) {
    const batch = imagesToProcess.slice(i, i + CONFIG.CONCURRENT_DOWNLOADS);
    const batchImages = imagesToProcess.slice(i, i + CONFIG.CONCURRENT_DOWNLOADS);
    logger.info(`Processing progress photo batch ${Math.floor(i / CONFIG.CONCURRENT_DOWNLOADS) + 1}/${Math.ceil(imagesToProcess.length / CONFIG.CONCURRENT_DOWNLOADS)}`);
    
    const batchResults = await processBatch(supabase, batch);
    results.push(...batchResults);
    
    // Insert successful uploads from this batch into database immediately (only new uploads, not skipped)
    logger.info(`Inserting batch ${Math.floor(i / CONFIG.CONCURRENT_DOWNLOADS) + 1} progress photos into database...`);
    for (const result of batchResults) {
      if (result.success && !result.skipped) { // Only new uploads, not skipped files
        const imageInfo = batchImages.find(img => img.supabasePath === result.supabasePath);
        if (imageInfo && imageInfo.studioStudentId) {
          // Create full Supabase storage URL
          const supabaseUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/${result.bucketName}/${result.supabasePath}`;
          const inserted = await insertProgressPhotoDirectly(
            supabase, 
            imageInfo.studioStudentId,
            imageInfo.photoId, 
            supabaseUrl
          );
          if (inserted) {
            dbInserted++;
          }
        }
      }
    }
    
    // Small delay between batches
    if (i + CONFIG.CONCURRENT_DOWNLOADS < imagesToProcess.length) {
      await sleep(1000);
    }
  }
  
  const successful = results.filter(r => r.success && !r.skipped).length;
  const skipped = results.filter(r => r.success && r.skipped).length;
  const failed = results.filter(r => !r.success).length;
  
  logger.info(`Progress photo import completed: ${successful} successful, ${skipped} skipped, ${failed} failed, ${dbInserted} database records inserted`);
  
  // Log failures
  const failures = results.filter(r => !r.success);
  if (failures.length > 0) {
    logger.error("Failed progress photo imports:");
    failures.forEach(failure => {
      logger.error(`  ${failure.firebasePath}: ${failure.error}`);
    });
  }
  
  return {
    processed: results.length,
    successful,
    skipped,
    failed,
    orphaned: orphanedPhotos.length,
    dbInserted
  };
};

/**
 * Load and validate ID mappings
 */
const loadIdMappings = async () => {
  try {
    const mappingsPath = path.join(process.cwd(), "id-mappings.json");
    logger.info(`Loading ID mappings from: ${mappingsPath}`);
    
    const mappingsData = await fs.readFile(mappingsPath, 'utf8');
    const mappings = JSON.parse(mappingsData);
    
    logger.info(`Loaded ID mappings: ${Object.keys(mappings.students || {}).length} students, ${Object.keys(mappings.studios || {}).length} studios`);
    
    return mappings;
  } catch (error) {
    logger.error(`Failed to load ID mappings: ${error.message}`);
    throw error;
  }
};

/**
 * Ensure storage bucket exists
 */
const ensureBucketExists = async (supabase) => {
  try {
    logger.info(`Checking if bucket '${CONFIG.IMAGES_BUCKET}' exists...`);
    
    const { data: existingBuckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      throw error;
    }
    
    const bucketExists = existingBuckets.some(bucket => bucket.name === CONFIG.IMAGES_BUCKET);
    
    if (bucketExists) {
      logger.info(`Bucket '${CONFIG.IMAGES_BUCKET}' already exists`);
    } else {
      logger.info(`Creating bucket '${CONFIG.IMAGES_BUCKET}'...`);
      
      const { data, error: createError } = await supabase.storage.createBucket(CONFIG.IMAGES_BUCKET, {
        public: true // Make it public so storage URLs work
      });
      
      if (createError) {
        throw createError;
      }
      
      logger.info(`Successfully created bucket '${CONFIG.IMAGES_BUCKET}'`);
    }
  } catch (error) {
    logger.error(`Failed to ensure bucket exists: ${error.message}`);
    throw error;
  }
};

/**
 * Update student profile image in database
 */
const updateStudentProfileImage = async (supabase, oldStudentId, imagePath, mappings) => {
  try {
    const newStudentId = mappings.students[oldStudentId];
    if (!newStudentId) {
      logger.warn(`No mapping found for student ${oldStudentId}`);
      return false;
    }
    
    const { data, error } = await supabase
      .from('student')
      .update({ profile_picture_url: imagePath })
      .eq('id', newStudentId);
    
    if (error) {
      throw error;
    }
    
    logger.debug(`Updated student ${newStudentId} profile image: ${imagePath}`);
    return true;
  } catch (error) {
    logger.error(`Failed to update student profile image: ${error.message}`);
    return false;
  }
};

/**
 * Insert progress photo into database (simplified version with studioStudentId)
 */
const insertProgressPhotoDirectly = async (supabase, studioStudentId, photoId, imagePath) => {
  try {
    // Insert the progress photo with proper column names
    const filename = imagePath.split('/').pop();
    const { data, error } = await supabase
      .from('progress_photos')
      .insert({
        studio_student_id: studioStudentId,
        url: imagePath,
        filename: filename,
        content_type: 'image/png',
        size_bytes: 0, // We could track this but it's not critical
        date: new Date().toISOString()
      });
    
    if (error) {
      throw error;
    }
    
    logger.debug(`Inserted progress photo for studio_student ${studioStudentId}: ${imagePath}`);
    return true;
  } catch (error) {
    logger.error(`Failed to insert progress photo: ${error.message}`);
    return false;
  }
};

/**
 * Main execution function
 */
const main = async () => {
  try {
    logger.info("=".repeat(50));
    logger.info("Starting Prospire Image Import Process");
    logger.info("=".repeat(50));
    
    // Initialize Supabase
    const supabase = initSupabase();
    
    // Load ID mappings
    const mappings = await loadIdMappings();
    
    // Ensure storage bucket exists
    await ensureBucketExists(supabase);
    
    // Read and validate JSON file
    logger.info(`Reading JSON file: ${jsonPath}`);
    
    const jsonData = await fs.readFile(jsonPath, 'utf8');
    const data = JSON.parse(jsonData);
    
    logger.info("JSON file parsed successfully");
    
    // Validate data structure
    if (!data.students && !data.photos) {
      throw new Error("Invalid JSON structure: missing 'students' and 'photos' collections");
    }
    
    logger.info(`Data overview: ${Object.keys(data.students || {}).length} students, ${Object.keys(data.photos || {}).length} photos`);
    
    // Import profile images
    const profileResults = await importProfileImages(supabase, data, mappings);
    
    // Import progress photos
    const progressResults = await importProgressPhotos(supabase, data, mappings);
    
    // Final summary
    logger.info("=".repeat(50));
    logger.info("IMPORT SUMMARY");
    logger.info("=".repeat(50));
    logger.info("Profile Images:");
    logger.info(`  Processed: ${profileResults.processed}`);
    logger.info(`  Successful: ${profileResults.successful}`);
    logger.info(`  Skipped: ${profileResults.skipped}`);
    logger.info(`  Failed: ${profileResults.failed}`);
    logger.info(`  Database Updated: ${profileResults.dbUpdated}`);
    logger.info("");
    logger.info("Progress Photos:");
    logger.info(`  Processed: ${progressResults.processed}`);
    logger.info(`  Successful: ${progressResults.successful}`);
    logger.info(`  Skipped: ${progressResults.skipped}`);
    logger.info(`  Failed: ${progressResults.failed}`);
    logger.info(`  Database Inserted: ${progressResults.dbInserted}`);
    if (progressResults.orphaned) {
      logger.info(`  Orphaned: ${progressResults.orphaned}`);
    }
    logger.info("");
    
    const totalSuccessful = profileResults.successful + progressResults.successful;
    const totalFailed = profileResults.failed + progressResults.failed;
    const totalSkipped = profileResults.skipped + progressResults.skipped;
    const totalDbOperations = profileResults.dbUpdated + progressResults.dbInserted;
    
    logger.info(`TOTAL RESULTS: ${totalSuccessful} successful uploads, ${totalSkipped} skipped, ${totalFailed} failed, ${totalDbOperations} database operations`);
    
    if (totalFailed > 0) {
      logger.warn("Some images failed to import. Check the error log for details.");
      process.exit(1);
    } else {
      logger.info("All images processed successfully!");
      process.exit(0);
    }
    
  } catch (error) {
    logger.error(`Import process failed: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  }
};

// Run the main function
main();