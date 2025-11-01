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
import { requireAuth, extractUser } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/all', getAllCourse);

// Protected routes - More specific routes first
router.post('/create', requireAuth, extractUser, createCourse);
router.get('/enrolled', requireAuth, extractUser, getEnrolledCourses);
router.get('/enrolled/:courseId', requireAuth, extractUser, getEnrolledCourse);
router.get('/my-courses', requireAuth, extractUser, getMyCourses);
router.get('/students/:accessCode', requireAuth, extractUser, getStudentsByAccessCode);
router.post('/enroll', requireAuth, extractUser, enrollCourse);

// Protected routes with courseId parameter
router.get('/:courseId', requireAuth, extractUser, getCourseId);
router.put('/:courseId', requireAuth, extractUser, updateCourse);
router.delete('/:courseId', requireAuth, extractUser, deleteCourse);

export default router;