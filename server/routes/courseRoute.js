// ========== courseRoutes.js ==========
import express from "express";
import {
  getAllCourses,
  getCourseById,
  enrollCourse,
  getEnrolledCourses,
  updateProgress,
  createCourse, // ADDED
  getSingleEnrolledCourse // ADDED
} from "../controllers/courseController.js";
// FIX: Import auth middleware
import { requireAuth, extractUser } from "../middlewares/authMiddleware.js"; 

const router = express.Router();

// ✅ ORDER IS IMPORTANT: more specific routes first

// 🟢 Get all published courses
router.get("/all", getAllCourses);

// 🟢 Get single enrolled course (for Player)
// This must come before /details/:courseId
router.get("/enrolled/:id", requireAuth, extractUser, getSingleEnrolledCourse);

// 🟢 Get enrolled courses for a specific user (This is NOT used by client)
router.get("/user/:userId/enrolled", requireAuth, extractUser, getEnrolledCourses);

// 🟢 Enroll in a course
router.post("/:courseId/enroll", requireAuth, extractUser, enrollCourse);

// 🟢 Update progress in a course (This is NOT used by client)
router.put("/:courseId/progress", requireAuth, extractUser, updateProgress);

// 🟢 Get single course by ID (for public CourseDetails page)
router.get("/details/:courseId", getCourseById);

// 🟢 Create a new course
router.post("/create", requireAuth, extractUser, createCourse);

export default router;
