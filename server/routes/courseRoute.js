// ========== courseRoutes.js ==========
import express from "express";
import {
  getAllCourses,
  getCourseById,
  enrollCourse,
  getEnrolledCourses,
  updateProgress,
} from "../controllers/courseController.js";
import { requireAuth } from "@clerk/express";

const router = express.Router();

// ✅ ORDER IS IMPORTANT: more specific routes first

// 🟢 Get all published courses
router.get("/all", getAllCourses);

// 🟢 Get enrolled courses for a specific user
router.get("/user/:userId/enrolled", requireAuth(), getEnrolledCourses);

// 🟢 Enroll in a course
router.post("/:courseId/enroll", requireAuth(), enrollCourse);

// 🟢 Update progress in a course
router.put("/:courseId/progress", requireAuth(), updateProgress);

// 🟢 Get single course by ID (keep this LAST to avoid conflicts)
router.get("/details/:courseId", getCourseById);

export default router;
