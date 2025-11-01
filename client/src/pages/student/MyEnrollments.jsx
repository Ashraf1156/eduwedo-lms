import React, { useContext, useEffect, useState } from 'react';
import { Line } from 'rc-progress';
import { useNavigate } from 'react-router-dom';
import { assets } from '../../assets/assets';
import { AppContext } from '../../context/AppContext';
import axios from 'axios';
import { toast } from 'react-toastify';

const MyEnrollments = () => {
    const navigate = useNavigate();
    const { backendUrl, getToken, calculateCourseDuration } = useContext(AppContext);
    
    const [enrolledCourses, setEnrolledCourses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [progressData, setProgressData] = useState({});
    const [sortBy, setSortBy] = useState('recent'); // 'recent', 'progress', 'title'
    const [filteredCourses, setFilteredCourses] = useState([]);

    // Fetch enrolled courses
    useEffect(() => {
        const fetchEnrolledCourses = async () => {
            try {
                const token = await getToken();
                if (!token) {
                    toast.error('Please login to view your enrollments');
                    navigate('/login');
                    return;
                }

                // FIX: Changed endpoint from /api/course/enrolled to /api/user/enrolled-courses
                // This call was the likely cause of the CastError
                const response = await axios.get(`${backendUrl}/api/user/enrolled-courses`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.data.success) {
                    setEnrolledCourses(response.data.enrolledCourses);
                    setFilteredCourses(response.data.enrolledCourses);
                }
            } catch (error) {
                toast.error('Failed to fetch enrolled courses');
            } finally {
                setIsLoading(false);
            }
        };

        fetchEnrolledCourses();
    }, [backendUrl, getToken, navigate]);

    // Fetch progress data
    useEffect(() => {
        const fetchProgress = async () => {
            try {
                const token = await getToken();
                if (!token) return;

                const progressPromises = enrolledCourses.map(course =>
                    // FIX: Changed endpoint to /api/user/get-course-progress and method to POST
                    axios.post(`${backendUrl}/api/user/get-course-progress`, { courseId: course._id }, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                );

                const progressResponses = await Promise.all(progressPromises);
                const newProgressData = {};

                progressResponses.forEach((response, index) => {
                    if (response.data.success) {
                        const courseId = enrolledCourses[index]._id;
                        // FIX: progress data is in response.data.progressData from userController
                        newProgressData[courseId] = response.data.progressData; 
                    }
                });

                setProgressData(newProgressData);
            } catch (error) {
                console.error('Failed to fetch progress data:', error);
            }
        };

        if (enrolledCourses.length > 0) {
            fetchProgress();
        }
    }, [enrolledCourses, backendUrl, getToken]);

    // Filter and sort courses
    useEffect(() => {
        let filtered = [...enrolledCourses];

        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(course => 
                course.courseTitle.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Apply sorting
        switch (sortBy) {
            case 'progress':
                filtered.sort((a, b) => {
                    const progressA = calculateProgress(a._id);
                    const progressB = calculateProgress(b._id);
                    return progressB - progressA;
                });
                break;
            case 'title':
                filtered.sort((a, b) => 
                    a.courseTitle.localeCompare(b.courseTitle)
                );
                break;
            case 'recent':
            default:
                // Assuming courses have createdAt field
                filtered.sort((a, b) => 
                    new Date(b.createdAt) - new Date(a.createdAt)
                );
                break;
        }

        setFilteredCourses(filtered);
    }, [searchTerm, sortBy, enrolledCourses]);

    // Calculate progress percentage
    const calculateProgress = (courseId) => {
        const progress = progressData[courseId];
        if (!progress) return 0;
        
        // Find total lectures in the course
        const course = enrolledCourses.find(c => c._id === courseId);
        if (!course) return 0;
        
        const totalLectures = course.courseContent?.reduce((total, chapter) => 
            total + (chapter.chapterContent?.length || 0), 0
        ) || 0;
        
        const completedLectures = progress.lectureCompleted?.length || 0;

        if (totalLectures === 0) return 0;
        return Math.round((completedLectures / totalLectures) * 100);
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <h1 className="text-2xl font-semibold text-gray-900">My Enrollments</h1>
                    <p className="mt-2 text-sm text-gray-700">
                        A list of all your enrolled courses and their progress.
                    </p>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="mt-4 mb-6 flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <input
                        type="text"
                        placeholder="Search courses..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <img 
                        src={assets.search_icon} 
                        alt="search" 
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5"
                    />
                </div>
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="recent">Most Recent</option>
                    <option value="progress">Progress</option>
                    <option value="title">Title</option>
                </select>
            </div>

            {/* Courses Grid */}
            {filteredCourses.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCourses.map((course) => {
                        const percent = calculateProgress(course._id);
                        const isCompleted = percent === 100;

                        return (
                            <div 
                                key={course._id}
                                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
                            >
                                {/* Course Thumbnail */}
                                <div className="relative aspect-video">
                                    <img
                                        src={course.courseThumbnail || assets.course_1_thumbnail} // FIX: Fallback asset
                                        alt={course.courseTitle}
                                        className="w-full h-full object-cover"
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
                                                <img src={assets.lesson_icon} alt="" className="w-3 h-3" /> {/* Using lesson as pdf icon */}
                                                PDF
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Course Info */}
                                <div className="p-4">
                                    <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
                                        {course.courseTitle}
                                    </h3>

                                    {/* Progress Bar */}
                                    <div className="mb-4">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-gray-600">Progress</span>
                                            <span className={isCompleted ? 'text-green-600' : 'text-blue-600'}>
                                                {percent}%
                                            </span>
                                        </div>
                                        <Line
                                            percent={percent}
                                            strokeWidth={2}
                                            strokeColor={isCompleted ? '#10B981' : '#2563EB'}
                                            trailWidth={2}
                                            trailColor="#E5E7EB"
                                        />
                                    </div>

                                    {/* Course Stats */}
                                    <div className="flex items-center justify-between text-sm text-gray-600">
                                        <div className="flex items-center gap-2">
                                            <img src={assets.time_clock_icon} alt="" className="w-4 h-4" />
                                            <span>{calculateCourseDuration(course)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <img src={assets.lesson_icon} alt="" className="w-4 h-4" />
                                            <span>
                                                {course.courseContent?.reduce((total, chapter) => 
                                                    total + chapter.chapterContent.length, 0
                                                )} lectures
                                            </span>
                                        </div>
                                    </div>

                                    {/* Continue Button */}
                                    <button
                                        onClick={() => navigate(`/player/${course._id}`)}
                                        className={`mt-4 w-full px-4 py-2 rounded-md text-white font-medium ${
                                            isCompleted 
                                                ? 'bg-green-600 hover:bg-green-700' 
                                                : 'bg-blue-600 hover:bg-blue-700'
                                        }`}
                                    >
                                        {isCompleted ? 'Review Course' : 'Continue Learning'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-12">
                    <img src={assets.my_course_icon} alt="No courses" className="w-32 h-32 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No courses found</h3>
                    <p className="text-sm text-gray-500">
                        {enrolledCourses.length === 0
                            ? "You haven't enrolled in any courses yet."
                            : "No courses match your search criteria."}
                    </p>
                </div>
            )}
        </div>
    );
};

export default MyEnrollments;
