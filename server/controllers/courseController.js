import Course from "../models/Course.js";

// ========================== LOGGER HELPERS ==========================
const logInfo = (message, data = {}) => {
  console.log(`[INFO] ${new Date().toISOString()} - ${message}`, data);
};

const logError = (message, error) => {
  console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error);
};

// ========================== GET ALL COURSES ==========================
export const getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find({ isPublished: true })
      .select(["-courseContent", "-enrolledStudents", "-accessCode"])
      .populate("educator", "-password");

    res.status(200).json({ success: true, courses });
  } catch (error) {
    logError("Error fetching all courses", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================== GET COURSE BY ID ==========================
export const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user ? req.user._id : null;

    const course = await Course.findById(id).populate("educator", "-password");

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    let courseResponse = course.toObject();

    // Hide access code if requester isn’t the educator
    if (!userId || course.educator._id.toString() !== userId.toString()) {
      delete courseResponse.accessCode;
    }

    // For non-enrolled users: show only preview lectures
    if (!userId || !course.enrolledStudents.some(s => s.toString() === userId.toString())) {
      courseResponse.courseContent = courseResponse.courseContent.map(chapter => ({
        ...chapter,
        chapterContent: chapter.chapterContent.map(lecture => ({
          ...lecture,
          lectureUrl: lecture.isPreviewFree ? lecture.lectureUrl : "",
        })),
      }));
    }

    return res.status(200).json({ success: true, courseData: courseResponse });
  } catch (error) {
    logError("Error fetching course by ID", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================== CREATE COURSE ==========================
export const createCourse = async (req, res) => {
  try {
    const { courseTitle, courseDescription, courseThumbnail, accessCode, courseContent, isPublished } = req.body;

    if (!courseTitle || !courseDescription || !accessCode) {
      return res.status(400).json({
        success: false,
        message: "Please provide courseTitle, courseDescription, and accessCode",
      });
    }

    const newCourse = new Course({
      courseTitle,
      courseDescription,
      courseThumbnail,
      accessCode,
      courseContent: courseContent || [],
      isPublished: isPublished !== undefined ? isPublished : true,
      educator: req.user._id,
    });

    await newCourse.save();

    res.status(201).json({
      success: true,
      message: "Course created successfully",
      courseId: newCourse._id,
    });
  } catch (error) {
    logError("Error creating course", error);
    res.status(500).json({ success: false, message: "Failed to create course. Please try again." });
  }
};

// ========================== ENROLL COURSE ==========================
export const enrollCourse = async (req, res) => {
  try {
    const { courseId, accessCode } = req.body;
    const userId = req.user._id;

    if (!courseId || !accessCode) {
      return res.status(400).json({
        success: false,
        message: "Please provide courseId and access code",
      });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    if (course.accessCode !== accessCode) {
      return res.status(403).json({
        success: false,
        message: "Invalid access code",
      });
    }

    if (course.enrolledStudents.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: "Already enrolled in this course",
      });
    }

    course.enrolledStudents.push(userId);
    await course.save();

    res.status(200).json({
      success: true,
      message: "Successfully enrolled in the course",
    });
  } catch (error) {
    logError("Error enrolling in course", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================== GET SINGLE ENROLLED COURSE ==========================
export const getSingleEnrolledCourse = async (req, res) => {
  try {
    const { id: courseId } = req.params;
    const userId = req.user._id;

    const course = await Course.findOne({
      _id: courseId,
      enrolledStudents: userId,
    }).populate("educator", "-password");

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found or not enrolled",
      });
    }

    res.status(200).json({ success: true, courseData: course });
  } catch (error) {
    logError("Error fetching single enrolled course", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================== GET EDUCATOR COURSES ==========================
export const getMyCourses = async (req, res) => {
  try {
    const courses = await Course.find({ educator: req.user._id }).populate("educator", "-password");
    res.status(200).json({ success: true, courses });
  } catch (error) {
    logError("Error fetching educator courses", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================== GET ENROLLED COURSES (ALL) ==========================
export const getEnrolledCourses = async (req, res) => {
  try {
    const { userId } = req.params;

    const courses = await Course.find({
      enrolledStudents: userId,
      isPublished: true,
    })
      .select("-accessCode")
      .populate("educator", "-password");

    res.status(200).json({ success: true, courses });
  } catch (error) {
    logError("Error fetching enrolled courses", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================== UPDATE COURSE ==========================
export const updateCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const updates = req.body;
    const educator = req.user._id;

    const course = await Course.findOne({ _id: courseId, educator });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found or unauthorized",
      });
    }

    Object.assign(course, updates);
    await course.save();

    res.status(200).json({
      success: true,
      message: "Course updated successfully",
    });
  } catch (error) {
    logError("Error updating course", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================== DELETE COURSE ==========================
export const deleteCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const educator = req.user._id;

    const result = await Course.findOneAndDelete({
      _id: courseId,
      educator,
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Course not found or unauthorized",
      });
    }

    res.status(200).json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (error) {
    logError("Error deleting course", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================== GET STUDENTS BY ACCESS CODE ==========================
export const getStudentsByAccessCode = async (req, res) => {
  try {
    const { accessCode } = req.query;
    const educator = req.user._id;

    const course = await Course.findOne({
      educator,
      accessCode,
    }).populate("enrolledStudents", "-password");

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found or unauthorized",
      });
    }

    res.status(200).json({
      success: true,
      students: course.enrolledStudents,
      courseTitle: course.courseTitle,
    });
  } catch (error) {
    logError("Error fetching students by access code", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================== UPDATE PROGRESS (PLACEHOLDER) ==========================
export const updateProgress = async (req, res) => {
  try {
    res.status(200).json({ success: true, message: "Progress updated (placeholder)" });
  } catch (error) {
    logError("Error updating progress", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================== EXPORTS ==========================
export default {
  getAllCourses,
  getCourseById,
  createCourse,
  enrollCourse,
  getSingleEnrolledCourse,
  getMyCourses,
  getEnrolledCourses,
  updateCourse,
  deleteCourse,
  getStudentsByAccessCode,
  updateProgress,
};
