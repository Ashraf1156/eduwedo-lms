import express from 'express';
import { 
    createCourse, 
    getAllCourse, 
    getCourseId, 
    enrollCourse,
    getEnrolledCourses,
    getEnrolledCourse,
    getMyCourses,
    updateCourse,
    deleteCourse,
    getStudentsByAccessCode
} from '../controllers/courseController.js';
import { requireAuth, extractUser } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/all', getAllCourse);

// Protected routes
router.post('/create', requireAuth, extractUser, createCourse);
router.get('/enrolled', requireAuth, extractUser, getEnrolledCourses);
router.get('/enrolled/:id', requireAuth, extractUser, getEnrolledCourse);
router.get('/my-courses', requireAuth, extractUser, getMyCourses);
router.get('/:id', requireAuth, extractUser, getCourseId);
router.post('/enroll', requireAuth, extractUser, enrollCourse);
router.put('/:courseId', requireAuth, extractUser, updateCourse);
router.delete('/:courseId', requireAuth, extractUser, deleteCourse);
router.get('/students', requireAuth, extractUser, getStudentsByAccessCode);

export default router;