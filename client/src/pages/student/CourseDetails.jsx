import React, { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { assets } from '../../assets/assets';
import { AppContext } from '../../context/AppContext';
import { toast } from 'react-toastify';
import axios from 'axios';

// Helper function for YouTube URL parsing
const getYouTubeVideoId = (url) => {
    if (!url) return null;
    try {
        const trimmed = url.trim();
        const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
        if (shortMatch && shortMatch[1]) return shortMatch[1];
        const embedMatch = trimmed.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
        if (embedMatch && embedMatch[1]) return embedMatch[1];
        // A more general regex to catch video IDs from various URL formats
        const anyMatch = trimmed.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
        if (anyMatch && anyMatch[2] && anyMatch[2].length === 11) {
             return anyMatch[2];
        }
        return null;
    } catch (error) {
        console.error("Error parsing YouTube URL:", url, error);
        return null;
    }
};

const CourseDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const accessCodeInputRef = useRef(null);

    const [courseData, setCourseData] = useState(null);
    const [playerData, setPlayerData] = useState(null);
    const [isAlreadyEnrolled, setIsAlreadyEnrolled] = useState(false);
    const [isLoadingCourse, setIsLoadingCourse] = useState(true);
    const [accessCode, setAccessCode] = useState('');
    const [isEnrolling, setIsEnrolling] = useState(false);

    const {
        backendUrl,
        getToken,
        userData,
        isUserDataLoading,
        calculateRating,
        calculateCourseDuration,
        calculateNoOfLectures
    } = useContext(AppContext);

    // ✅ Fixed Fetch Course Data (handles both logged-in & public)
    useEffect(() => {
        const fetchCourseData = async () => {
            try {
                setIsLoadingCourse(true);
                const token = await getToken();
                const headers = token ? { Authorization: `Bearer ${token}` } : {};
                // FIX: Changed endpoint to /api/course/details/:id to match server route
                const response = await axios.get(`${backendUrl}/api/course/details/${id}`, { headers });

                if (response.data?.success) {
                    setCourseData(response.data.courseData);
                } else {
                    toast.error("Course not found or unavailable");
                }
            } catch (error) {
                console.error("Course fetch error:", error);
                toast.error(error.response?.data?.message || 'Failed to fetch course details');
            } finally {
                setIsLoadingCourse(false);
            }
        };

        fetchCourseData();
    }, [backendUrl, id, getToken]);

    // Check enrollment status
    useEffect(() => {
        if (!isLoadingCourse && !isUserDataLoading && userData && courseData) {
            // Use .some() for safer check on array of strings
            setIsAlreadyEnrolled(courseData.enrolledStudents?.some(studentId => studentId === userData._id));
        }
    }, [isLoadingCourse, isUserDataLoading, userData, courseData]);

    // Handle sections toggle
    const [openSections, setOpenSections] = useState({});
    const toggleSection = (index) => setOpenSections(prev => ({ ...prev, [index]: !prev[index] }));

    // Handle enrollment
    const enrollCourse = async () => {
        if (!courseData?._id) {
            toast.error("Course data not loaded.");
            return;
        }
        if (isUserDataLoading) {
            toast.info("Verifying login status...");
            return;
        }
        if (!userData) {
            toast.warn('Login to Enroll');
            return;
        }
        if (isAlreadyEnrolled) {
            navigate(`/player/${courseData._id}`);
            return;
        }

        if (!accessCode.trim()) {
            toast.error('Please enter the access code');
            accessCodeInputRef.current?.focus();
            return;
        }

        setIsEnrolling(true);

        try {
            const token = await getToken();
            if (!token) {
                toast.error('Authentication failed');
                return;
            }
            
            // FIX: Calling the correct endpoint as defined in courseRoute.js
            const enrollResponse = await axios.post(`${backendUrl}/api/course/${courseData._id}/enroll`, {
                accessCode: accessCode.trim()
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });


            if (enrollResponse.data.success) {
                toast.success('Successfully enrolled in the course!');
                setIsAlreadyEnrolled(true);
                navigate(`/player/${courseData._id}`);
            } else {
                 // Throw an error to be caught below if not successful
                 throw new Error(enrollResponse.data.message || 'Enrollment failed');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Invalid access code or enrollment failed');
        } finally {
            setIsEnrolling(false);
        }
    };

    // Preview lecture
    const handlePreview = (lecture) => {
        if (lecture.isPreviewFree) {
            setPlayerData(lecture);
        } else {
            toast.info('This lecture is not available for preview');
        }
    };

    // Calculate rating
    const ratingValue = calculateRating(courseData);
    const safeRating = Number.isFinite(ratingValue) ? ratingValue.toFixed(1) : '0.0';

    if (isLoadingCourse) {
        return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
    }

    if (!courseData) {
        return <div className="flex justify-center items-center min-h-screen text-gray-600">Course not found</div>;
    }

    return (
        <>
            <div className="flex md:flex-row flex-col-reverse gap-10 relative items-start justify-between md:px-36 px-8 md:pt-20 pt-10 text-left min-h-screen">
                {/* Background Gradient */}
                <div className="absolute top-0 left-0 w-full h-section-height -z-1 bg-gradient-to-b from-cyan-100/70"></div>

                {/* Left Column: Course Info */}
                <div className="max-w-xl z-10 text-gray-500">
                    <h1 className="md:text-course-deatails-heading-large text-course-deatails-heading-small font-semibold text-gray-800">
                        {courseData.courseTitle || 'Untitled Course'}
                    </h1>

                    <p className="pt-4 md:text-base text-sm rich-text" // Added rich-text class
                        dangerouslySetInnerHTML={{ __html: courseData.courseDescription }} 
                    />

                    <div className='flex items-center gap-4 pt-4 text-sm'>
                        <div className="flex items-center gap-1" title={`${safeRating} rating`}>
                            <img src={assets.star} alt="star icon" className='w-4 h-4' />
                            <span>{safeRating}</span>
                        </div>
                        <div className="flex items-center gap-1" title="Course duration">
                            <img src={assets.time_clock_icon} alt="clock icon" className='w-4 h-4' />
                            <span>{calculateCourseDuration(courseData)}</span>
                        </div>
                        <div className="flex items-center gap-1" title="Number of lessons">
                            <img src={assets.lesson_icon} alt="lesson icon" className='w-4 h-4' />
                            <span>{calculateNoOfLectures(courseData)} lessons</span>
                        </div>
                    </div>

                    {/* Course Content */}
                    <div className="mt-8">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">Course Content</h2>
                        <div className="space-y-4">
                            {courseData.courseContent?.map((chapter, index) => (
                                <div key={chapter.chapterId} className="border rounded-lg overflow-hidden">
                                    <button
                                        onClick={() => toggleSection(index)}
                                        className="w-full px-4 py-3 bg-gray-50 flex justify-between items-center"
                                    >
                                        <span className="font-medium text-gray-800">{chapter.chapterTitle}</span>
                                        <img
                                            src={assets.down_arrow_icon} // FIX: using correct asset
                                            alt="toggle"
                                            className={`w-4 h-4 transition-transform ${openSections[index] ? 'rotate-180' : ''}`}
                                        />
                                    </button>
                                    {openSections[index] && (
                                        <div className="divide-y">
                                            {chapter.chapterContent.map((lecture) => (
                                                <div
                                                    key={lecture.lectureId}
                                                    className="px-4 py-3 flex justify-between items-center hover:bg-gray-50"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <img
                                                            src={lecture.lectureType === 'pdf' ? assets.lesson_icon : assets.play_icon} // FIX: using lesson_icon for PDF
                                                            alt="content type"
                                                            className="w-4 h-4"
                                                        />
                                                        <span>{lecture.lectureTitle}</span>
                                                    </div>
                                                    {lecture.isPreviewFree && (
                                                        <button
                                                            onClick={() => handlePreview(lecture)}
                                                            className="text-sm text-blue-600 hover:underline"
                                                        >
                                                            Preview
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Enrollment Card */}
                <div className="md:w-96 w-full md:sticky md:top-24">
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <img
                            src={courseData.courseThumbnail || assets.course_1_thumbnail} // FIX: added fallback asset
                            alt={courseData.courseTitle}
                            className="w-full aspect-video object-cover rounded-lg mb-6"
                        />

                        <div className="flex items-center justify-between text-sm mb-6">
                            <div className="flex items-center gap-1">
                                <img src={assets.patients_icon} alt="enrolled" className="w-4 h-4" /> {/* FIX: using correct asset */}
                                <span>{courseData.enrolledStudents?.length || 0} students</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <img src={assets.lesson_icon} alt="lessons" className="w-4 h-4" />
                                <span>{calculateNoOfLectures(courseData)} lessons</span>
                            </div>
                        </div>

                        {!isAlreadyEnrolled && (
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="accessCode" className="block text-sm font-medium text-gray-700 mb-1">
                                        Access Code
                                    </label>
                                    <input
                                        ref={accessCodeInputRef}
                                        type="text"
                                        id="accessCode"
                                        value={accessCode}
                                        onChange={(e) => setAccessCode(e.target.value)}
                                        placeholder="Enter access code"
                                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        )}

                        <button
                            onClick={enrollCourse}
                            disabled={isEnrolling || isUserDataLoading || !courseData?._id}
                            className={`w-full py-3 rounded text-white font-medium transition duration-200 mt-4 ${
                                isEnrolling || isUserDataLoading || !courseData?._id
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                        >
                            {isEnrolling
                                ? 'Enrolling...'
                                : isUserDataLoading
                                ? 'Loading...'
                                : isAlreadyEnrolled
                                ? 'Go to Course'
                                : 'Enroll Now'}
                        </button>

                        <div className="mt-6">
                            <h3 className="text-lg font-medium text-gray-800 mb-3">This course includes:</h3>
                            <ul className="space-y-2 text-sm text-gray-600">
                                <li className="flex items-center gap-2">
                                    <img src={assets.play_icon} alt="" className="w-4 h-4" /> {/* FIX: using correct asset */}
                                    Video lectures
                                </li>
                                <li className="flex items-center gap-2">
                                    <img src={assets.lesson_icon} alt="" className="w-4 h-4" /> {/* FIX: using correct asset */}
                                    PDF resources
                                </li>
                                <li className="flex items-center gap-2">
                                    <img src={assets.time_left_clock_icon} alt="" className="w-4 h-4" /> {/* FIX: using correct asset */}
                                    Full lifetime access
                                </li>
                                <li className="flex items-center gap-2">
                                    <img src={assets.blue_tick_icon} alt="" className="w-4 h-4" /> {/* FIX: using correct asset */}
                                    Certificate of completion
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Preview Modal */}
            {playerData && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-3xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-medium">{playerData.lectureTitle}</h3>
                            <button
                                onClick={() => setPlayerData(null)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <img src={assets.cross_icon} alt="close" className="w-6 h-6" />
                            </button>
                        </div>
                        {playerData.lectureType === 'pdf' ? (
                            <iframe
                                src={playerData.lectureUrl}
                                className="w-full h-[60vh]"
                                title={playerData.lectureTitle}
                            />
                        ) : (
                            <div className="aspect-video">
                                <iframe
                                    src={`https://www.youtube.com/embed/${getYouTubeVideoId(playerData.lectureUrl)}`}
                                    className="w-full h-full"
                                    title={playerData.lectureTitle}
                                    allowFullScreen
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default CourseDetails;
