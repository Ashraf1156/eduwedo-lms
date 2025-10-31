import Course from "../models/Course.js";

// Helper function for logging
const logInfo = (message, data = {}) => {
    console.log(`[${new Date().toISOString()}] ${message}`, data);
};

const logError = (message, error) => {
    console.error(`[${new Date().toISOString()}] ${message}:`, error);
};

// Get All Courses
export const getAllCourse = async (req, res) => {
    try {
        logInfo('Fetching all published courses');
        const courses = await Course.find({ isPublished: true })
            .select(['-courseContent', '-enrolledStudents', '-accessCode'])
            .populate({ path: 'educator', select: '-password' });

        logInfo(`Found ${courses.length} courses`);
        res.json({ success: true, courses });
    } catch (error) {
        logError('Error fetching courses', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get Course by Id
export const getCourseId = async (req, res) => {
    try {
        const { id } = req.params;
        logInfo('Fetching course by ID', { courseId: id, userId: req.user._id });

        const courseData = await Course.findById(id)
            .populate({ path: 'educator', select: '-password' });

        if (!courseData) {
            logInfo('Course not found', { courseId: id });
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        const courseResponse = courseData.toObject();

        // Remove sensitive data based on user role
        if (courseResponse.educator._id.toString() !== req.user._id.toString()) {
            logInfo('Removing access code for non-educator user');
            delete courseResponse.accessCode;
        }

        // Handle preview content
        if (!courseResponse.enrolledStudents.includes(req.user._id)) {
            logInfo('Filtering content for non-enrolled user');
            courseResponse.courseContent.forEach(chapter => {
                chapter.chapterContent.forEach(lecture => {
                    if (!lecture.isPreviewFree) {
                        lecture.lectureUrl = "";
                    }
                });
            });
        }

        res.json({ success: true, courseData: courseResponse });
    } catch (error) {
        logError('Error fetching course by ID', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Create Course
export const createCourse = async (req, res) => {
    try {
        logInfo('Creating new course', { educator: req.user._id });

        const {
            courseTitle,
            courseDescription,
            courseThumbnail,
            accessCode,
            courseContent,
            isPublished
        } = req.body;

        // Validate required fields
        if (!courseTitle || !courseDescription || !accessCode) {
            logInfo('Missing required fields');
            return res.status(400).json({
                success: false,
                message: 'Please provide courseTitle, courseDescription, and accessCode'
            });
        }

        // Create course object
        const courseData = {
            courseTitle,
            courseDescription,
            courseThumbnail,
            accessCode,
            courseContent: courseContent || [],
            isPublished: isPublished !== undefined ? isPublished : true,
            educator: req.user._id
        };

        logInfo('Creating course with data', courseData);

        const newCourse = new Course(courseData);
        await newCourse.save();

        logInfo('Course created successfully', { courseId: newCourse._id });

        res.status(201).json({
            success: true,
            message: 'Course created successfully',
            courseId: newCourse._id
        });
    } catch (error) {
        logError('Error creating course', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to create course. Please try again.'
        });
    }
};

// Enroll in Course
export const enrollCourse = async (req, res) => {
    try {
        const { courseId, accessCode } = req.body;
        const userId = req.user._id;

        logInfo('Processing course enrollment', { courseId, userId });

        // Validate input
        if (!courseId || !accessCode) {
            return res.status(400).json({
                success: false,
                message: 'Please provide courseId and access code'
            });
        }

        // Find course
        const course = await Course.findById(courseId);
        if (!course) {
            logInfo('Course not found during enrollment', { courseId });
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Verify access code
        if (course.accessCode !== accessCode) {
            logInfo('Invalid access code attempt', { courseId });
            return res.status(403).json({
                success: false,
                message: 'Invalid access code'
            });
        }

        // Check enrollment
        if (course.enrolledStudents.includes(userId)) {
            logInfo('User already enrolled', { courseId, userId });
            return res.status(400).json({
                success: false,
                message: 'Already enrolled in this course'
            });
        }

        // Enroll student
        course.enrolledStudents.push(userId);
        await course.save();

        logInfo('Enrollment successful', { courseId, userId });
        res.json({
            success: true,
            message: 'Successfully enrolled in the course'
        });
    } catch (error) {
        logError('Error during course enrollment', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get Enrolled Course
export const getEnrolledCourse = async (req, res) => {
    try {
        const { id: courseId } = req.params;
        const userId = req.user._id;

        logInfo('Fetching enrolled course', { courseId, userId });

        const course = await Course.findOne({
            _id: courseId,
            enrolledStudents: userId
        }).populate({ path: 'educator', select: '-password' });

        if (!course) {
            logInfo('Course not found or user not enrolled', { courseId, userId });
            return res.status(404).json({
                success: false,
                message: 'Course not found or not enrolled'
            });
        }

        res.json({ success: true, courseData: course });
    } catch (error) {
        logError('Error fetching enrolled course', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get My Courses (as educator)
export const getMyCourses = async (req, res) => {
    try {
        logInfo('Fetching educator courses', { educatorId: req.user._id });

        const courses = await Course.find({ educator: req.user._id })
            .populate({ path: 'educator', select: '-password' });

        logInfo(`Found ${courses.length} courses for educator`);
        res.json({ success: true, courses });
    } catch (error) {
        logError('Error fetching educator courses', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get Enrolled Courses
export const getEnrolledCourses = async (req, res) => {
    try {
        logInfo('Fetching user enrolled courses', { userId: req.user._id });

        const courses = await Course.find({
            enrolledStudents: req.user._id,
            isPublished: true
        })
        .select('-accessCode')
        .populate({ path: 'educator', select: '-password' });

        logInfo(`Found ${courses.length} enrolled courses`);
        res.json({ success: true, courses });
    } catch (error) {
        logError('Error fetching enrolled courses', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update Course
export const updateCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const updates = req.body;
        const educator = req.user._id;

        logInfo('Updating course', { courseId, educator });

        const course = await Course.findOne({ _id: courseId, educator });
        if (!course) {
            logInfo('Course not found or unauthorized update attempt', { courseId, educator });
            return res.status(404).json({
                success: false,
                message: 'Course not found or unauthorized'
            });
        }

        Object.assign(course, updates);
        await course.save();

        logInfo('Course updated successfully', { courseId });
        res.json({
            success: true,
            message: 'Course updated successfully'
        });
    } catch (error) {
        logError('Error updating course', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete Course
export const deleteCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const educator = req.user._id;

        logInfo('Deleting course', { courseId, educator });

        const result = await Course.findOneAndDelete({
            _id: courseId,
            educator
        });

        if (!result) {
            logInfo('Course not found or unauthorized deletion attempt', { courseId, educator });
            return res.status(404).json({
                success: false,
                message: 'Course not found or unauthorized'
            });
        }

        logInfo('Course deleted successfully', { courseId });
        res.json({
            success: true,
            message: 'Course deleted successfully'
        });
    } catch (error) {
        logError('Error deleting course', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get Students by Access Code
export const getStudentsByAccessCode = async (req, res) => {
    try {
        const { accessCode } = req.query;
        const educator = req.user._id;

        logInfo('Fetching students by access code', { educator });

        const course = await Course.findOne({
            educator,
            accessCode
        }).populate({
            path: 'enrolledStudents',
            select: '-password'
        });

        if (!course) {
            logInfo('Course not found for access code', { educator });
            return res.status(404).json({
                success: false,
                message: 'Course not found or unauthorized'
            });
        }

        logInfo(`Found ${course.enrolledStudents.length} students`);
        res.json({
            success: true,
            students: course.enrolledStudents,
            courseTitle: course.courseTitle
        });
    } catch (error) {
        logError('Error fetching students by access code', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export default {
    getAllCourse,
    getCourseId,
    createCourse,
    enrollCourse,
    getEnrolledCourse,
    getMyCourses,
    getEnrolledCourses,
    updateCourse,
    deleteCourse,
    getStudentsByAccessCode
};