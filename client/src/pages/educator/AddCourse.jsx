import React, { useContext, useEffect, useRef, useState } from 'react';
import { assets } from '../../assets/assets';
import { toast } from 'react-toastify';
import Quill from 'quill';
import 'quill/dist/quill.snow.css'; // Import Quill styles
import uniqid from 'uniqid';
import axios from 'axios';
import { AppContext } from '../../context/AppContext';

// =======================
// Helper Logging Functions
// =======================
const isDev = import.meta.env.DEV;

const logInfo = (message, data = {}) => {
    if (isDev) console.log(`[${new Date().toISOString()}] AddCourse: ${message}`, data);
};

const logError = (message, error) => {
    if (isDev) console.error(`[${new Date().toISOString()}] AddCourse Error: ${message}`, error);
};

// =======================
// URL Validation
// =======================
const validateYouTubeUrl = (url) => {
    const patterns = [
        /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/,
        /^[a-zA-Z0-9_-]{11}$/
    ];
    return patterns.some(pattern => pattern.test(url));
};

// NEW: Generic URL Validator
const validateUrl = (url) => {
    if (!url) return false;
    try {
        new URL(url);
        return url.startsWith('http://') || url.startsWith('https://');
    } catch (_) {
        return false;
    }
};

const AddCourse = () => {
    const editorRef = useRef(null);
    const quillRef = useRef(null);
    const fileInputRef = useRef(null);

    const { backendUrl, getToken } = useContext(AppContext);

    const [courseTitle, setCourseTitle] = useState('');
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [accessCode, setAccessCode] = useState('');
    const [chapters, setChapters] = useState([]);
    const [showPopup, setShowPopup] = useState(false);
    const [currentChapterId, setCurrentChapterId] = useState(null);
    const [isCreating, setIsCreating] = useState(false);

    const [lectureDetails, setLectureDetails] = useState({
        lectureTitle: '',
        lectureDuration: '',
        lectureUrl: '',
        lectureType: 'video',
        isPreviewFree: false,
        lectureOrder: 1
    });

    // =======================
    // Initialize Quill Editor
    // =======================
    useEffect(() => {
        if (editorRef.current && !quillRef.current) {
            quillRef.current = new Quill(editorRef.current, {
                theme: 'snow',
                placeholder: 'Write course description...',
                modules: {
                    toolbar: [
                        [{ 'header': [1, 2, false] }],
                        ['bold', 'italic', 'underline'],
                        ['link', 'blockquote'],
                        [{ list: 'ordered' }, { list: 'bullet' }]
                    ]
                }
            });
        }
    }, []);

    // =======================
    // Generate Access Code
    // =======================
    const generateAccessCode = () => {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        setAccessCode(code);
        logInfo('Generated new access code', { code });
    };

    // =======================
    // Handle Thumbnail Change
    // =======================
    const handleThumbnailChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // 2MB
                toast.error('Image size should be less than 2MB');
                return;
            }
            setImage(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result);
            reader.readAsDataURL(file);
            logInfo('Thumbnail selected', { fileName: file.name });
        }
    };

    // =======================
    // File Upload Handler (for Thumbnail)
    // =======================
    const handleFileUpload = async (file, resourceType = 'auto') => {
        logInfo('Uploading file', { fileName: file.name, type: resourceType });

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
        formData.append('cloud_name', import.meta.env.VITE_CLOUDINARY_CLOUD_NAME);

        try {
            const uploadUrl = `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;
            const response = await axios.post(uploadUrl, formData);
            logInfo('File uploaded successfully', { url: response.data.secure_url });
            return response.data.secure_url;
        } catch (error) {
            logError('File upload failed', error);
            throw new Error('Failed to upload file. Please try again.');
        }
    };

    // =======================
    // Get YouTube Video ID
    // =======================
    const getYouTubeVideoId = (url) => {
        if (!url) return null;
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu.be\/|youtube.com\/embed\/)([^&\s]+)/,
            /^[a-zA-Z0-9_-]{11}$/
        ];
        for (let pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        return null;
    };

    // =======================
    // UPDATED: Lecture Content Change
    // =======================
    const handleLectureContentChange = (e) => {
        const { value } = e.target;
        // This function now simply updates the URL value for both videos and PDFs
        setLectureDetails(prev => ({ ...prev, lectureUrl: value }));
    };

    // =======================
    // Add Lecture to Chapter
    // =======================
    const handleAddLecture = () => {
        if (!lectureDetails.lectureTitle || !lectureDetails.lectureDuration) {
            toast.error('Please fill all required fields');
            return;
        }

        if (lectureDetails.lectureType === 'video' && !validateYouTubeUrl(lectureDetails.lectureUrl)) {
            toast.error('Please enter a valid YouTube URL');
            return;
        }

        // UPDATED: Validation for PDF link instead of file upload
        if (lectureDetails.lectureType === 'pdf' && !validateUrl(lectureDetails.lectureUrl)) {
            toast.error('Please enter a valid PDF link (e.g., a Google Drive link)');
            return;
        }

        setChapters(prevChapters =>
            prevChapters.map(chapter =>
                chapter.chapterId === currentChapterId
                    ? {
                        ...chapter,
                        chapterContent: [
                            ...chapter.chapterContent,
                            {
                                ...lectureDetails,
                                lectureId: uniqid(),
                                // This logic is now perfect:
                                // For 'video', it creates an embed link.
                                // For 'pdf', it saves the direct link (e.g., Google Drive)
                                lectureUrl:
                                    lectureDetails.lectureType === 'video'
                                        ? `https://www.youtube.com/embed/${getYouTubeVideoId(lectureDetails.lectureUrl)}`
                                        : lectureDetails.lectureUrl
                            }
                        ]
                    }
                    : chapter
            )
        );

        setLectureDetails({
            lectureTitle: '',
            lectureDuration: '',
            lectureUrl: '',
            lectureType: 'video',
            isPreviewFree: false,
            lectureOrder: lectureDetails.lectureOrder + 1
        });

        setShowPopup(false);
    };

    // =======================
    // Submit Course
    // =======================
    const handleSubmit = async (e) => {
        e.preventDefault();
        logInfo('Starting course creation');

        if (!courseTitle.trim()) {
            toast.error('Please enter a course title');
            return;
        }

        if (!accessCode) {
            toast.error('Please generate an access code');
            return;
        }

        if (!image) {
            toast.error('Please upload a course thumbnail');
            return;
        }

        if (chapters.length === 0) {
            toast.error('Please add at least one chapter');
            return;
        }

        const invalidChapter = chapters.find(
            chapter => !chapter.chapterTitle.trim() || chapter.chapterContent.length === 0
        );
        if (invalidChapter) {
            toast.error('Each chapter must have a title and at least one lecture');
            return;
        }

        const courseDescription = quillRef.current.root.innerHTML;
        if (courseDescription === '<p><br></p>') {
            toast.error('Please add course description');
            return;
        }

        setIsCreating(true);
        logInfo('Validated form data, uploading thumbnail');

        try {
            const token = await getToken();
            if (!token) {
                toast.error('Authentication failed. Please login again.');
                setIsCreating(false);
                return;
            }

            const thumbnailUrl = await handleFileUpload(image, 'image');

            const courseData = {
                courseTitle: courseTitle.trim(),
                courseDescription,
                courseThumbnail: thumbnailUrl,
                accessCode,
                courseContent: chapters,
                isPublished: true
            };

            logInfo('Sending course creation request', courseData);

            const response = await axios.post(
                `${backendUrl}/api/course/create`,
                courseData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.success) {
                logInfo('Course created successfully', { courseId: response.data.courseId });
                toast.success('Course created successfully');

                setCourseTitle('');
                setAccessCode('');
                setImage(null);
                setImagePreview('');
                setChapters([]);
                quillRef.current.setContents([]);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        } catch (error) {
            logError('Course creation failed', error);
            const errorMessage =
                error.response?.data?.message ||
                error.message ||
                'Failed to create course. Please try again.';
            toast.error(errorMessage);
        } finally {
            setIsCreating(false);
        }
    };

    // =======================
    // JSX
    // =======================
    return (
        <div className="px-4 py-8 max-w-6xl mx-auto">
            <h1 className="text-2xl font-semibold mb-6">Create New Course</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Course Title */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Course Title</label>
                    <input
                        type="text"
                        aria-label="Course Title"
                        value={courseTitle}
                        onChange={(e) => setCourseTitle(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                    />
                </div>

                {/* Access Code */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Access Code</label>
                    <div className="mt-1 flex gap-2">
                        <input
                            type="text"
                            value={accessCode}
                            readOnly
                            aria-label="Access Code"
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            required
                        />
                        <button
                            type="button"
                            onClick={generateAccessCode}
                            aria-label="Generate Access Code"
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            Generate Code
                        </button>
                    </div>
                </div>

                {/* Course Description */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Course Description
                    </label>
                    <div ref={editorRef} className="h-48 border rounded-md"></div>
                </div>

                {/* Course Thumbnail */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        Course Thumbnail
                    </label>
                    <div className="mt-1 flex items-center gap-4">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleThumbnailChange}
                            aria-label="Course Thumbnail Upload"
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            required
                        />
                        {imagePreview && (
                            <img
                                src={imagePreview}
                                alt="Thumbnail preview"
                                className="h-20 w-36 object-cover rounded"
                            />
                        )}
                    </div>
                </div>

                {/* Course Content */}
                <div>
                    <h2 className="text-lg font-medium mb-4">Course Content</h2>
                    <button
                        type="button"
                        aria-label="Add Chapter"
                        onClick={() =>
                            setChapters(prev => [
                                ...prev,
                                {
                                    chapterId: uniqid(),
                                    chapterOrder: chapters.length + 1,
                                    chapterTitle: `Chapter ${chapters.length + 1}`,
                                    chapterContent: []
                                }
                            ])
                        }
                        className="mb-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                        Add Chapter
                    </button>

                    <div className="space-y-4">
                        {chapters.map((chapter) => (
                            <div key={chapter.chapterId} className="border rounded-md p-4">
                                <input
                                    type="text"
                                    value={chapter.chapterTitle}
                                    aria-label="Chapter Title"
                                    onChange={(e) =>
                                        setChapters(chapters.map(ch =>
                                            ch.chapterId === chapter.chapterId
                                                ? { ...ch, chapterTitle: e.target.value }
                                                : ch
                                        ))
                                    }
                                    className="mb-2 block w-full rounded-md border-gray-300"
                                    required
                                />
                                <button
                                    type="button"
                                    aria-label="Add Lecture"
                                    onClick={() => {
                                        setCurrentChapterId(chapter.chapterId);
                                        setShowPopup(true);
                                    }}
                                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    Add Lecture
                                </button>

                                <div className="mt-2 space-y-2">
                                    {chapter.chapterContent.map((lecture) => (
                                        <div key={lecture.lectureId} className="flex items-center gap-2 text-sm">
                                            <img
                                                src={lecture.lectureType === 'pdf' ? assets.pdf_icon : assets.play_icon}
                                                alt=""
                                                className="w-4 h-4"
                                            />
                                            <span>{lecture.lectureTitle}</span>
                                            {lecture.isPreviewFree && (
                                                <span className="text-xs text-blue-600">(Preview)</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isCreating}
                    aria-label="Create Course"
                    className={`w-full px-4 py-2 rounded-md text-white font-medium ${
                        isCreating ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                >
                    {isCreating ? 'Creating Course...' : 'Create Course'}
                </button>
            </form>

            {/* Add Lecture Popup */}
            {showPopup && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-md">
                        <h3 className="text-lg font-medium mb-4">Add Lecture</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Title</label>
                                <input
                                    type="text"
                                    value={lectureDetails.lectureTitle}
                                    aria-label="Lecture Title"
                                    onChange={(e) =>
                                        setLectureDetails(prev => ({
                                            ...prev,
                                            lectureTitle: e.target.value
                                        }))
                                    }
                                    className="mt-1 block w-full rounded-md border-gray-300"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Duration ({lectureDetails.lectureType === 'video' ? 'minutes' : 'est. minutes'})
                                </label>
                                <input
                                    type="number"
                                    value={lectureDetails.lectureDuration}
                                    aria-label="Lecture Duration"
                                    onChange={(e) =>
                                        setLectureDetails(prev => ({
                                            ...prev,
                                            lectureDuration: e.target.valueAsNumber || 0
                                        }))
                                    }
                                    className="mt-1 block w-full rounded-md border-gray-300"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Content Type</label>
                                <select
                                    value={lectureDetails.lectureType}
                                    aria-label="Lecture Type"
                                    onChange={(e) =>
                                        setLectureDetails(prev => ({
                                            ...prev,
                                            lectureType: e.target.value,
                                            lectureUrl: ''
                                        }))
                                    }
                                    className="mt-1 block w-full rounded-md border-gray-300"
                                >
                                    <option value="video">YouTube Video</option>
                                    <option value="pdf">PDF Document Link</option>
                                </select>
                            </div>

                            {/* UPDATED: Replaced file input with a single URL/Text input */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    {lectureDetails.lectureType === 'video' ? 'YouTube URL' : 'PDF Link'}
                                </label>
                                <input
                                    type="url"
                                    value={lectureDetails.lectureUrl}
                                    onChange={handleLectureContentChange}
                                    placeholder={
                                        lectureDetails.lectureType === 'video'
                                            ? 'https://www.youtube.com/watch?v=...'
                                            : 'https://drive.google.com/file/d/...'
                                    }
                                    aria-label={lectureDetails.lectureType === 'video' ? "Lecture Video URL" : "Lecture PDF Link"}
                                    className="mt-1 block w-full rounded-md border-gray-300"
                                    required
                                />
                            </div>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={lectureDetails.isPreviewFree}
                                    onChange={(e) =>
                                        setLectureDetails(prev => ({
                                            ...prev,
                                            isPreviewFree: e.target.checked
                                        }))
                                    }
                                    aria-label="Preview Lecture"
                                    className="mr-2"
                                />
                                <label>Preview Lecture</label>
                            </div>

                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowPopup(false)}
                                    className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleAddLecture}
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    Add Lecture
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AddCourse;
