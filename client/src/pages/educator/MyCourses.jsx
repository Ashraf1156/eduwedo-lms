import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import Loading from '../../components/student/Loading';
import { assets } from '../../assets/assets'; // Import assets for delete icon

const MyCourses = () => {
    // Removed currency from context destructuring
    const { backendUrl, isEducator, getToken } = useContext(AppContext);

    const [courses, setCourses] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [courseToDelete, setCourseToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchEducatorCourses = async () => {
        try {
            const token = await getToken();
            const { data } = await axios.get(backendUrl + '/api/educator/courses', { headers: { Authorization: `Bearer ${token}` } });
            if (data.success) {
                setCourses(data.courses);
            } else {
                toast.error(data.message); // Added error toast for unsuccessful fetch
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    useEffect(() => {
        if (isEducator) {
            fetchEducatorCourses();
        }
    }, [isEducator]);

    // Opens the delete confirmation modal
    const openDeleteModal = (course) => {
        setCourseToDelete(course);
        setShowDeleteModal(true);
    };

    // Closes the delete confirmation modal
    const closeDeleteModal = () => {
        if (isDeleting) return; // Don't close if deletion is in progress
        setCourseToDelete(null);
        setShowDeleteModal(false);
    };

    // Handles the actual course deletion
    const confirmDeleteCourse = async () => {
        if (!courseToDelete) return;

        setIsDeleting(true);
        try {
            const token = await getToken();
            const response = await axios.delete(
                `${backendUrl}/api/educator/course/${courseToDelete._id}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
                toast.success('Course deleted successfully');
                // Filter out the deleted course from the state
                setCourses(prevCourses => prevCourses.filter(c => c._id !== courseToDelete._id));
            } else {
                toast.error(response.data.message || 'Failed to delete course');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'An error occurred while deleting');
        } finally {
            setIsDeleting(false);
            closeDeleteModal();
        }
    };

    return courses ? (
        // Changed min-h-screen to h-auto to prevent potential overflow issues, added pb-8
        <div className="flex flex-col items-start md:p-8 p-4 pt-8 pb-8">
            <div className='w-full'>
                <h2 className="pb-4 text-lg font-medium text-gray-800">My Courses</h2>
                {/* Added overflow-x-auto for smaller screens */}
                <div className="flex flex-col items-center max-w-4xl w-full overflow-hidden rounded-md bg-white border border-gray-500/20 overflow-x-auto">
                    {/* Changed table layout for better responsiveness */}
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 text-gray-900 text-sm text-left">
                            <tr>
                                <th scope="col" className="px-4 py-3 font-semibold tracking-wider">Course</th>
                                <th scope="col" className="px-4 py-3 font-semibold tracking-wider">Students</th>
                                <th scope="col" className="px-4 py-3 font-semibold tracking-wider">Published On</th>
                                <th scope="col" className="px-4 py-3 font-semibold tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 text-sm text-gray-500">
                            {courses.length === 0 ? (
                                <tr>
                                    {/* Updated colSpan to 4 */}
                                    <td colSpan="4" className="px-4 py-4 text-center text-gray-500">No courses found.</td>
                                </tr>
                            ) : (
                                courses.map((course) => (
                                    <tr key={course._id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex items-center space-x-3">
                                                <img src={course.courseThumbnail} alt={course.courseTitle || "Course Image"} className="w-16 h-9 object-cover rounded" />
                                                <span className="font-medium text-gray-900">{course.courseTitle}</span>
                                            </div>
                                        </td>
                                        {/* Removed Earnings data cell */}
                                        <td className="px-4 py-3 whitespace-nowrap">{course.enrolledStudents.length}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {new Date(course.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <button
                                                onClick={() => openDeleteModal(course)}
                                                className="text-red-600 hover:text-red-800"
                                                title="Delete course"
                                            >
                                                {/* Use trash icon or similar, cross_icon is also fine */}
                                                <img src={assets.cross_icon} alt="Delete" className="w-5 h-5" /> 
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
                        <h3 className="text-lg font-medium text-gray-900">Delete Course</h3>
                        <p className="mt-2 text-sm text-gray-600">
                            Are you sure you want to delete "<strong>{courseToDelete?.courseTitle}</strong>"? This action is permanent and cannot be undone. All associated data will be removed.
                        </p>
                        <div className="mt-6 flex justify-end space-x-3">
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={closeDeleteModal}
                                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={confirmDeleteCourse}
                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:bg-red-400"
                            >
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    ) : <Loading />;
};

export default MyCourses;

