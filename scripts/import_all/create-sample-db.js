#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the full export file
const fullExportPath = path.join(__dirname, 'arnold-89303-export-final.json');
const sampleDbPath = path.join(__dirname, 'sample_db.json');

console.log('Loading full export data...');
const fullData = JSON.parse(fs.readFileSync(fullExportPath, 'utf8'));

console.log('Full data statistics:');
console.log('- Studios:', Object.keys(fullData.studios || {}).length);
console.log('- Instructors:', Object.keys(fullData.instructors || {}).length);
console.log('- Students:', Object.keys(fullData.students || {}).length);
console.log('- Conversations:', Object.keys(fullData.conversations || {}).length);
console.log('- Photos:', Object.keys(fullData.photos || {}).length);
console.log('- Entries:', Object.keys(fullData.entries || {}).length);
console.log('- Notebooks:', Object.keys(fullData.notebooks || {}).length);
console.log('- Lessons:', Object.keys(fullData.lessons || {}).length);

// Helper function to get random items from an object
function getRandomItems(obj, count) {
    const keys = Object.keys(obj);
    const selectedKeys = [];
    const maxCount = Math.min(count, keys.length);
    
    // Shuffle and take the first n items
    const shuffled = keys.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, maxCount);
}

// Helper function to find studios with good relationships
function findStudiosWithRelationships() {
    const studioStats = [];
    
    for (const [studioId, studio] of Object.entries(fullData.studios)) {
        const instructorCount = Object.keys(studio.instructors || {}).length;
        const studentCount = Object.keys(studio.students || {}).length;
        
        studioStats.push({
            id: studioId,
            instructorCount,
            studentCount,
            totalUsers: instructorCount + studentCount,
            studio
        });
    }
    
    // Sort by total users and select studios with good relationships
    studioStats.sort((a, b) => b.totalUsers - a.totalUsers);
    
    return studioStats.slice(0, 15); // Get top 15 studios with most relationships
}

// Start building the sample database
const sampleData = {
    conversations: {},
    entries: {},
    exerciseDataLists: {},
    instructors: {},
    lessons: {},
    notebooks: {},
    photos: {},
    students: {},
    studios: {},
    videos: {}
};

console.log('\nFinding studios with good relationships...');
const selectedStudios = findStudiosWithRelationships();

// Take the first 12 studios (or less if not available)
const studioCount = Math.min(12, selectedStudios.length);
const studiesToUse = selectedStudios.slice(0, studioCount);

console.log(`Selected ${studiesToUse.length} studios`);

// Collect all related user IDs
const allInstructorIds = new Set();
const allStudentIds = new Set();
const allStudioIds = new Set();

// Add studios and collect related user IDs (limit students per studio)
for (const studioInfo of studiesToUse) {
    const studioId = studioInfo.id;
    const studio = studioInfo.studio;
    
    allStudioIds.add(studioId);
    
    // Create a copy of the studio and limit students
    const studioCopy = { ...studio };
    
    // Collect instructor IDs from this studio
    if (studio.instructors) {
        Object.keys(studio.instructors).forEach(id => allInstructorIds.add(id));
    }
    
    // Limit students per studio to max 5 for a more manageable sample
    if (studio.students) {
        const studentIds = Object.keys(studio.students);
        const maxStudentsPerStudio = 5;
        const selectedStudentIds = studentIds.slice(0, maxStudentsPerStudio);
        
        // Update the studio copy with limited students
        studioCopy.students = {};
        selectedStudentIds.forEach(id => {
            studioCopy.students[id] = studio.students[id];
            allStudentIds.add(id);
        });
    }
    
    sampleData.studios[studioId] = studioCopy;
}

console.log(`Found ${allInstructorIds.size} unique instructors and ${allStudentIds.size} unique students from selected studios`);

// Add instructors
for (const instructorId of allInstructorIds) {
    if (fullData.instructors[instructorId]) {
        sampleData.instructors[instructorId] = fullData.instructors[instructorId];
    }
}

// Add students
for (const studentId of allStudentIds) {
    if (fullData.students[studentId]) {
        sampleData.students[studentId] = fullData.students[studentId];
    }
}

// Collect all user IDs for conversation filtering
const allUserIds = new Set([...allInstructorIds, ...allStudentIds]);

console.log('Selecting conversations with messages from our users...');
// Add conversations that involve our selected users
let conversationCount = 0;
const maxConversations = 15;
const conversationUserIds = new Set(); // Track all users in selected conversations

for (const [conversationId, conversation] of Object.entries(fullData.conversations)) {
    if (conversationCount >= maxConversations) break;
    
    // Check if any message in this conversation is from our selected users
    if (conversation.messages && conversation.messages.some(msg => allUserIds.has(msg.sender))) {
        sampleData.conversations[conversationId] = conversation;
        conversationCount++;
        
        // Collect all senders from this conversation
        conversation.messages.forEach(msg => {
            if (msg.sender) {
                conversationUserIds.add(msg.sender);
            }
        });
    }
}

// Add any missing users that appear in conversations
console.log('Adding missing users from conversations...');
for (const userId of conversationUserIds) {
    if (!sampleData.students[userId] && !sampleData.instructors[userId]) {
        // Check if this user exists in the full data
        if (fullData.students[userId]) {
            sampleData.students[userId] = fullData.students[userId];
            allStudentIds.add(userId);
        } else if (fullData.instructors[userId]) {
            sampleData.instructors[userId] = fullData.instructors[userId];
            allInstructorIds.add(userId);
        }
    }
}

console.log(`Selected ${conversationCount} conversations`);

// Add photos related to our studios
console.log('Selecting photos from our studios...');
let photoCount = 0;
const maxPhotos = 20;

for (const [photoId, photo] of Object.entries(fullData.photos)) {
    if (photoCount >= maxPhotos) break;
    
    if (allStudioIds.has(photo.studio)) {
        sampleData.photos[photoId] = photo;
        photoCount++;
    }
}

console.log(`Selected ${photoCount} photos`);

// Add entries (notebook entries) related to our users
console.log('Selecting entries related to our users...');
let entryCount = 0;
const maxEntries = 25;

for (const [entryId, entry] of Object.entries(fullData.entries)) {
    if (entryCount >= maxEntries) break;
    
    // Check if entry is related to our users or studios
    if ((entry.student_id && allStudentIds.has(entry.student_id)) ||
        (entry.instructor_id && allInstructorIds.has(entry.instructor_id)) ||
        (entry.studio_id && allStudioIds.has(entry.studio_id))) {
        sampleData.entries[entryId] = entry;
        entryCount++;
    }
}

console.log(`Selected ${entryCount} entries`);

// Add notebooks related to our users
console.log('Selecting notebooks related to our users...');
let notebookCount = 0;
const maxNotebooks = 20;

for (const [notebookId, notebook] of Object.entries(fullData.notebooks)) {
    if (notebookCount >= maxNotebooks) break;
    
    // Check if notebook is related to our users or studios
    if ((notebook.student_id && allStudentIds.has(notebook.student_id)) ||
        (notebook.instructor_id && allInstructorIds.has(notebook.instructor_id)) ||
        (notebook.studio_id && allStudioIds.has(notebook.studio_id))) {
        sampleData.notebooks[notebookId] = notebook;
        notebookCount++;
    }
}

console.log(`Selected ${notebookCount} notebooks`);

// Add lessons related to our studios/users
console.log('Selecting lessons related to our studios...');
let lessonCount = 0;
const maxLessons = 15;

for (const [lessonId, lesson] of Object.entries(fullData.lessons)) {
    if (lessonCount >= maxLessons) break;
    
    // Check if lesson is related to our studios or users
    if ((lesson.studio_id && allStudioIds.has(lesson.studio_id)) ||
        (lesson.instructor_id && allInstructorIds.has(lesson.instructor_id))) {
        sampleData.lessons[lessonId] = lesson;
        lessonCount++;
    }
}

console.log(`Selected ${lessonCount} lessons`);

// Add all exerciseDataLists (they're general data)
sampleData.exerciseDataLists = fullData.exerciseDataLists;

// Add a few videos if they exist
const videoKeys = getRandomItems(fullData.videos || {}, 5);
for (const videoId of videoKeys) {
    sampleData.videos[videoId] = fullData.videos[videoId];
}

// Write the sample database
console.log('\nFinal sample database statistics:');
console.log('- Studios:', Object.keys(sampleData.studios).length);
console.log('- Instructors:', Object.keys(sampleData.instructors).length);
console.log('- Students:', Object.keys(sampleData.students).length);
console.log('- Conversations:', Object.keys(sampleData.conversations).length);
console.log('- Photos:', Object.keys(sampleData.photos).length);
console.log('- Entries:', Object.keys(sampleData.entries).length);
console.log('- Notebooks:', Object.keys(sampleData.notebooks).length);
console.log('- Lessons:', Object.keys(sampleData.lessons).length);
console.log('- Exercise Data Lists:', Object.keys(sampleData.exerciseDataLists).length);
console.log('- Videos:', Object.keys(sampleData.videos).length);

console.log(`\nWriting sample database to ${sampleDbPath}...`);
fs.writeFileSync(sampleDbPath, JSON.stringify(sampleData, null, 2));

console.log('Sample database created successfully!');

// Verify relationships
console.log('\nVerifying relationships...');
let relationshipIssues = 0;

// Check if students in studios exist in students collection
for (const [studioId, studio] of Object.entries(sampleData.studios)) {
    if (studio.students) {
        for (const studentId of Object.keys(studio.students)) {
            if (!sampleData.students[studentId]) {
                console.log(`⚠️  Studio ${studioId} references missing student ${studentId}`);
                relationshipIssues++;
            }
        }
    }
    
    if (studio.instructors) {
        for (const instructorId of Object.keys(studio.instructors)) {
            if (!sampleData.instructors[instructorId]) {
                console.log(`⚠️  Studio ${studioId} references missing instructor ${instructorId}`);
                relationshipIssues++;
            }
        }
    }
}

// Check conversation senders
for (const [conversationId, conversation] of Object.entries(sampleData.conversations)) {
    if (conversation.messages) {
        for (const message of conversation.messages) {
            const senderId = message.sender;
            if (!sampleData.students[senderId] && !sampleData.instructors[senderId]) {
                console.log(`⚠️  Conversation ${conversationId} has message from unknown sender ${senderId}`);
                relationshipIssues++;
            }
        }
    }
}

// Check photo studios
for (const [photoId, photo] of Object.entries(sampleData.photos)) {
    if (photo.studio && !sampleData.studios[photo.studio]) {
        console.log(`⚠️  Photo ${photoId} references missing studio ${photo.studio}`);
        relationshipIssues++;
    }
}

if (relationshipIssues === 0) {
    console.log('✅ All relationships verified successfully!');
} else {
    console.log(`❌ Found ${relationshipIssues} relationship issues`);
}

console.log('\nScript completed!');