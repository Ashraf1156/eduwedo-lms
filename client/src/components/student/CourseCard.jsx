import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { assets } from '../../assets/assets';
import { AppContext } from '../../context/AppContext';

const CourseCard = ({ course }) => {
    const { calculateRating } = useContext(AppContext);

    // Added safety check for course object
    if (!course) {
        return null;
    }

    const rating = calculateRating(course);

    return (
        <Link to={`/course-details/${course._id}`} className="block">
            <div className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300">
                {/* Course Thumbnail */}
                <div className="relative aspect-video">
                    <img
                        src={course.courseThumbnail || assets.thumbnail_placeholder}
                        alt={course.courseTitle}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            e.target.src = assets.thumbnail_placeholder;
                        }}
                    />
                    {/* Content Type Indicators */}
                    <div className="absolute top-2 right-2 flex gap-1">
                        {course.courseContent?.some(chapter => 
                            chapter.chapterContent.some(lecture => lecture.lectureType === 'video')
                        ) && (
                            <span className="bg-black/70 text-white px-2 py-1 rounded-md text-xs flex items-center gap-1">
                                <img src={assets.play_icon} alt="" className="w-3 h-3" />
                                Video
                            </span>
                        )}
                        {course.courseContent?.some(chapter => 
                            chapter.chapterContent.some(lecture => lecture.lectureType === 'pdf')
                        ) && (
                            <span className="bg-black/70 text-white px-2 py-1 rounded-md text-xs flex items-center gap-1">
                                <img src={assets.pdf_icon} alt="" className="w-3 h-3" />
                                PDF
                            </span>
                        )}
                    </div>
                </div>

                {/* Course Info */}
                <div className="p-4 space-y-2">
                    {/* Title */}
                    <h3 className="font-medium text-gray-800 line-clamp-2 min-h-[2.5rem]">
                        {course.courseTitle}
                    </h3>

                    {/* Educator Name */}
                    <div className="flex items-center gap-2">
                        <img 
                            src={course.educator?.avatar || assets.user_icon} 
                            alt="" 
                            className="w-6 h-6 rounded-full"
                        />
                        <p className="text-sm text-gray-600">
                            {course.educator?.name || 'Instructor'}
                        </p>
                    </div>

                    {/* Stats Row */}
                    <div className="flex items-center justify-between text-sm">
                        {/* Rating */}
                        <div className="flex items-center gap-1.5">
                            <p className='font-medium text-yellow-600'>
                                {rating > 0 ? rating.toFixed(1) : 'New'}
                            </p>
                            <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                    <img
                                        key={i}
                                        className="w-3.5 h-3.5"
                                        src={i < Math.round(rating) ? assets.star : assets.star_blank}
                                        alt=""
                                    />
                                ))}
                            </div>
                            <p className="text-gray-400">
                                ({course.courseRatings?.length || 0})
                            </p>
                        </div>

                        {/* Students Count */}
                        <div className="flex items-center gap-1 text-gray-600">
                            <img src={assets.enrolled_icon} alt="" className="w-4 h-4" />
                            <span>{course.enrolledStudents?.length || 0}</span>
                        </div>
                    </div>

                    {/* Course Details */}
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                        {/* Lecture Count */}
                        <div className="flex items-center gap-1">
                            <img src={assets.lesson_icon} alt="" className="w-4 h-4" />
                            <span>
                                {course.courseContent?.reduce((total, chapter) => 
                                    total + (chapter.chapterContent?.length || 0), 0) || 0} lectures
                            </span>
                        </div>
                        
                        {/* Preview Indicator */}
                        {course.courseContent?.some(chapter => 
                            chapter.chapterContent.some(lecture => lecture.isPreviewFree)
                        ) && (
                            <span className="text-blue-600">
                                Preview available
                            </span>
                        )}
                    </div>

                    {/* Access Type Indicator */}
                    <div className="pt-2 border-t">
                        <span className="inline-block px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-full">
                            Access Code Required
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default CourseCard;