import mongoose from 'mongoose';

const courseProgressSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    courseId: { type: String, required: true },
    completed: { type: Boolean, default: false },
    lectureCompleted: [
        { type: String } // FIX: Define array content as array of strings (lectureIds)
    ],
    // ADD: Store last position
    lastPosition: {
        chapter: { type: Number, default: 0 },
        lecture: { type: Number, default: 0 }
    }
}, { minimize: false });

export const CourseProgress = mongoose.model('CourseProgress', courseProgressSchema);
