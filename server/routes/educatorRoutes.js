import express from 'express';
import {
  addCourse,
  educatorDashboardData,
  getEducatorCourses,
  getEnrolledStudentsData,
  updateRoleToEducator
} from '../controllers/educatorController.js';
import upload from '../configs/multer.js';
import { requireAuth, extractUser } from '../middlewares/authMiddleware.js';

const educatorRouter = express.Router();

// Add Educator Role 
educatorRouter.get('/update-role', requireAuth, extractUser, updateRoleToEducator);

// Add Courses 
educatorRouter.post('/add-course', upload.single('image'), requireAuth, extractUser, addCourse);

// Get Educator Courses 
educatorRouter.get('/courses', requireAuth, extractUser, getEducatorCourses);

// Get Educator Dashboard Data
educatorRouter.get('/dashboard', requireAuth, extractUser, educatorDashboardData);

// Get Educator Students Data
educatorRouter.get('/enrolled-students', requireAuth, extractUser, getEnrolledStudentsData);

export default educatorRouter;
