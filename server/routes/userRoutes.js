import express from 'express';
// Import enrollCourse instead of purchaseCourse
import { addUserRating, getUserCourseProgress, getUserData, /* enrollCourse, */ updateUserCourseProgress, userEnrolledCourses } from '../controllers/userController.js';
// Removed enrollCourse import
import { requireAuth, extractUser } from '../middlewares/authMiddleware.js'; // Import auth middleware

const userRouter = express.Router();

// Get user Data
userRouter.get('/data', requireAuth, extractUser, getUserData); // Added auth middleware

// REMOVED - using the one in courseRoute.js which checks access code
// userRouter.post('/enroll', requireAuth, extractUser, enrollCourse); 

userRouter.get('/enrolled-courses', requireAuth, extractUser, userEnrolledCourses); // Added auth middleware
userRouter.post('/update-course-progress', requireAuth, extractUser, updateUserCourseProgress); // Added auth middleware
userRouter.post('/get-course-progress', requireAuth, extractUser, getUserCourseProgress); // Added auth middleware
userRouter.post('/add-rating', requireAuth, extractUser, addUserRating); // Added auth middleware

export default userRouter;
