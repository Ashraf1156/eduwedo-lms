import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { ClerkExpressWithAuth } from '@clerk/clerk-sdk-node';

// ===== Load environment variables =====
dotenv.config();

// ===== Initialize app =====
const app = express();

// ===== Middleware =====
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ===== Initialize Clerk Auth =====
app.use(ClerkExpressWithAuth());

// ===== Import Routes =====
import courseRoutes from './routes/courseRoute.js';
import educatorRoutes from './routes/educatorRoutes.js';
import userRoutes from './routes/userRoutes.js';

// ===== API Routes =====
app.use('/api/course', courseRoutes);
app.use('/api/educator', educatorRoutes);
app.use('/api/user', userRoutes);

// ===== Default Route =====
app.get('/', (req, res) => {
  res.send('✅ LMS Server is running successfully!');
});

// ===== Error Handling Middleware =====
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Something went wrong!',
  });
});

// ===== MongoDB Connection =====
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// ===== Start Server =====
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});

export default app;
