import React, { useContext, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
// FIX: Corrected import paths to point to the 'src' directory
import { AppContext } from '../../../src/context/AppContext';
import { assets } from '../../../src/assets/assets';
import { toast } from 'react-toastify';
import axios from 'axios';

const Player = () => {
    const { courseId: id } = useParams(); // FIX: Use courseId from App.jsx route
    const navigate = useNavigate();
    const { backendUrl, getToken } = useContext(AppContext);

    const [courseData, setCourseData] = useState(null);
    const [currentChapter, setCurrentChapter] = useState(0);
    const [currentLecture, setCurrentLecture] = useState(0);
    const [showChapters, setShowChapters] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [progress, setProgress] = useState({});

    // Fetch course data and progress
    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = await getToken();
                if (!token) {
                    toast.error('Please login to access the course');
                    navigate('/login');
                    return;
                }

                // Fetch course data
                // FIX: Changed endpoint to /api/course/enrolled/:id
                const response = await axios.get(`${backendUrl}/api/course/enrolled/${id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.data.success) {
                    throw new Error(response.data.message);
                }

                setCourseData(response.data.courseData);

                // Fetch progress data
                // FIX: Changed endpoint to /api/user/get-course-progress and method to POST
                const progressResponse = await axios.post(`${backendUrl}/api/user/get-course-progress`, { courseId: id }, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (progressResponse.data.success) {
                    // FIX: progress data is in .progressData and ensure it's an object
                    setProgress(progressResponse.data.progressData || {});
                    if (progressResponse.data.progressData?.lastPosition) {
                        setCurrentChapter(progressResponse.data.progressData.lastPosition.chapter || 0);
                        setCurrentLecture(progressResponse.data.progressData.lastPosition.lecture || 0);
                    }
                }
            } catch (error) {
                toast.error(error.response?.data?.message || error.message || 'Failed to load course');
                navigate('/my-enrollments');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [id, backendUrl, getToken, navigate]);

    // Update progress
    const updateProgress = async (chapterIndex, lectureIndex, lectureId) => {
        try {
            const token = await getToken();
            if (!token) return;

            // FIX: Changed endpoint to /api/user/update-course-progress
            // ADDED: Sending lastPosition
            await axios.post(`${backendUrl}/api/user/update-course-progress`, {
                courseId: id,
                lectureId: lectureId, // Sending lectureId as per userController
                lastPosition: {
                    chapter: chapterIndex,
                    lecture: lectureIndex
                }
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // Update local progress
            setProgress(prev => ({
                ...prev,
                lastPosition: { chapter: chapterIndex, lecture: lectureIndex },
                // Add lectureId to completedLectures if not already present
                completedLectures: [
                    ...(prev.completedLectures || []).filter(l => l !== lectureId),
                    lectureId
                ]
            }));
        } catch (error) {
            console.error('Failed to update progress:', error);
        }
    };

    // Handle lecture change
    const handleLectureChange = async (chapterIndex, lectureIndex) => {
        const lectureData = courseData.courseContent[chapterIndex].chapterContent[lectureIndex];
        setCurrentChapter(chapterIndex);
        setCurrentLecture(lectureIndex);
        // Pass lectureId to updateProgress
        await updateProgress(chapterIndex, lectureIndex, lectureData.lectureId);
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    // Error state
    if (!courseData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <img src={assets.my_course_icon} alt="Course not found" className="w-32 h-32 mb-4" /> {/* FIX: asset */}
                <h2 className="text-xl font-semibold text-gray-900">Course not found</h2>
                <p className="text-gray-500 mt-2">The course you're looking for doesn't exist or you don't have access.</p>
            </div>
        );
    }

    const currentChapterData = courseData.courseContent[currentChapter];
    const currentLectureData = currentChapterData?.chapterContent[currentLecture];
    // FIX: Check if lectureId is in the completedLectures array
    const isCompleted = progress.completedLectures?.includes(currentLectureData?.lectureId);

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <div className={`${showChapters ? 'w-80' : 'w-0'} bg-white border-r transition-all duration-300 overflow-hidden flex flex-col`}>
                <div className="p-4 border-b">
                    <h2 className="text-lg font-semibold text-gray-900 truncate">{courseData.courseTitle}</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                    {courseData.courseContent.map((chapter, chapterIndex) => (
                        <div key={chapter.chapterId} className="mb-4">
                            <h3 className="font-medium text-gray-900 mb-2">{chapter.chapterTitle}</h3>
                            <div className="space-y-1">
                                {chapter.chapterContent.map((lecture, lectureIndex) => {
                                    // FIX: Check if lectureId is in the completedLectures array
                                    const isLectureCompleted = progress.completedLectures?.includes(lecture.lectureId);
                                    const isCurrentLecture = currentChapter === chapterIndex && currentLecture === lectureIndex;

                                    return (
                                        <button
                                            key={lecture.lectureId}
                                            onClick={() => handleLectureChange(chapterIndex, lectureIndex)}
                                            className={`w-full px-3 py-2 text-left text-sm rounded-md flex items-center gap-2
                                                ${isCurrentLecture ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}
                                                ${isLectureCompleted ? 'text-green-600' : ''}
                                            `}
                                        >
                                            <img
                                                src={lecture.lectureType === 'pdf' ? assets.lesson_icon : assets.play_icon} // FIX: asset
                                                alt=""
                                                className="w-4 h-4"
                                            />
                                            <span className="flex-1 truncate">{lecture.lectureTitle}</span>
                                            {isLectureCompleted && (
                                                <img src={assets.blue_tick_icon} alt="completed" className="w-4 h-4" /> // FIX: asset
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="bg-white border-b px-4 py-3 flex items-center gap-4">
                    <button
                        onClick={() => setShowChapters(!showChapters)}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <img
                            src={showChapters ? assets.cross_icon : assets.home_icon} // FIX: assets
                            alt="toggle chapters"
                            className="w-6 h-6"
                        />
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-lg font-medium text-gray-900 truncate">
                            {currentLectureData?.lectureTitle}
                        </h1>
                        <p className="text-sm text-gray-500 truncate">
                            {currentChapterData?.chapterTitle}
                        </p>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 p-4 overflow-y-auto">
                    {currentLectureData?.lectureType === 'pdf' ? (
                        // PDF Viewer
                        // This `iframe` will now correctly display the Google Drive or other public PDF link
                        <div className="w-full h-full bg-white rounded-lg shadow">
                            <iframe
                                src={currentLectureData.lectureUrl}
                                title={currentLectureData.lectureTitle}
                                className="w-full h-full rounded-lg"
                                // Adding sandbox attributes for better security with external links
                                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                            />
                        </div>
                    ) : (
                        // Video Player
                        <div className="aspect-video w-full max-w-4xl mx-auto bg-black rounded-lg shadow overflow-hidden">
                            <iframe
                                src={currentLectureData?.lectureUrl}
                                title={currentLectureData?.lectureTitle}
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    )}
                </div>

                {/* Navigation Controls */}
                <div className="bg-white border-t px-4 py-3 flex items-center justify-between">
                    <button
                        onClick={() => {
                            if (currentLecture > 0) {
                                handleLectureChange(currentChapter, currentLecture - 1);
                            } else if (currentChapter > 0) {
                                handleLectureChange(
                                    currentChapter - 1,
                                    courseData.courseContent[currentChapter - 1].chapterContent.length - 1
                                );
                            }
                        }}
                        disabled={currentChapter === 0 && currentLecture === 0}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Previous
                    </button>

                    <button
                        onClick={async () => {
                            if (!isCompleted) {
                                await updateProgress(currentChapter, currentLecture, currentLectureData.lectureId);
                            }
                        }}
                        className={`px-4 py-2 text-sm font-medium rounded-md ${
                            isCompleted
                                ? 'bg-green-600 text-white cursor-default'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                        // Disable button if already completed
                        disabled={isCompleted}
                    >
                        {isCompleted ? 'Completed' : 'Mark as Complete'}
                    </button>

                    <button
                        onClick={() => {
                            if (currentLecture < currentChapterData.chapterContent.length - 1) {
                                handleLectureChange(currentChapter, currentLecture + 1);
                            } else if (currentChapter < courseData.courseContent.length - 1) {
                                handleLectureChange(currentChapter + 1, 0);
                            }
                        }}
                        disabled={
                            currentChapter === courseData.courseContent.length - 1 &&
                            currentLecture === currentChapterData.chapterContent.length - 1
                        }
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Player;

