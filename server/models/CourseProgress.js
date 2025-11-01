import mongoose from 'mongoose';

const courseProgressSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, // Use ObjectId
        required: true, 
        ref: 'User' // Reference the 'User' model
    },
    courseId: { 
        type: mongoose.Schema.Types.ObjectId, // Use ObjectId
        required: true, 
        ref: 'Course' // Reference the 'Course' model
    },
    completed: { 
        type: Boolean, 
        default: false 
    },
    lectureCompleted: [
        { 
            type: String // This is fine for storing lecture IDs (which might be sub-document IDs)
        }
    ],
    lastPosition: {
        chapter: { type: Number, default: 0 },
        lecture: { type: Number, default: 0 }
    }
}, { 
    minimize: false,
    timestamps: true // ADD: Automatically adds createdAt and updatedAt timestamps
});

export const CourseProgress = mongoose.model('CourseProgress', courseProgressSchema);