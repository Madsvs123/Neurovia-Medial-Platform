// All portals share one axios instance — see src/lib/http.js
import http from '../../lib/http';
import { createNotificationApi } from '../../lib/notificationApi';

const API = http;

// Auth
export const educatorLogin = (data) => API.post('/api/users/login', data);
export const getUsers = () => API.get('/api/users');
export const getEducators = () => API.get('/api/users/educators');

// Dashboard
export const getDashboardStats = () => API.get('/api/users/profile');

// Courses
export const getCourses = (params) => API.get('/api/courses', { params });
export const getCourseById = (id) => API.get(`/api/courses/${id}`);
export const createCourse = (data) => API.post('/api/courses', data);
export const updateCourse = (id, data) => API.put(`/api/courses/${id}`, data);
export const toggleCoursePublish = (id) => API.put(`/api/courses/${id}/publish`);
export const deleteCourse = (id) => API.delete(`/api/courses/${id}`);
export const getMyCourses = () => API.get('/api/courses/my-courses');

// Lessons
export const getLessonsByCourse = (courseId) => API.get(`/api/lessons/course/${courseId}`);
export const getLessonById = (id) => API.get(`/api/lessons/${id}`);
export const createLesson = (data) => API.post('/api/lessons', data);
export const updateLesson = (id, data) => API.put(`/api/lessons/${id}`, data);
export const toggleLessonPublish = (id) => API.put(`/api/lessons/${id}/publish`);
export const deleteLesson = (id) => API.delete(`/api/lessons/${id}`);

// Quizzes
export const getQuizzes = (params) => API.get('/api/quizzes', { params });
export const getQuizById = (id) => API.get(`/api/quizzes/${id}`);
export const createQuiz = (data) => API.post('/api/quizzes', data);
export const updateQuiz = (id, data) => API.put(`/api/quizzes/${id}`, data);
export const deleteQuiz = (id) => API.delete(`/api/quizzes/${id}`);

// Clinical Cases
export const getClinicalCases = (params) => API.get('/api/clinical-cases', { params });
export const getClinicalCaseById = (id) => API.get(`/api/clinical-cases/${id}`);
export const createClinicalCase = (data) => API.post('/api/clinical-cases', data);
export const updateClinicalCase = (id, data) => API.put(`/api/clinical-cases/${id}`, data);
export const deleteClinicalCase = (id) => API.delete(`/api/clinical-cases/${id}`);

// Programs
export const getPrograms = (params) => API.get('/api/programs', { params });
export const getMyPrograms = (params) => API.get('/api/programs/my-programs', { params });
export const getProgramById = (id) => API.get(`/api/programs/${id}`);
export const createProgram = (data) => API.post('/api/programs', data);
export const updateProgram = (id, data) => API.put(`/api/programs/${id}`, data);
export const toggleProgram = (id) => API.put(`/api/programs/${id}/toggle`);
export const deleteProgram = (id) => API.delete(`/api/programs/${id}`);
export const getProgramResources = (id) => API.get(`/api/programs/${id}/resources`);
export const addProgramResource = (id, data) => API.post(`/api/programs/${id}/resources`, data);
export const removeProgramResource = (resourceId) => API.delete(`/api/programs/resources/${resourceId}`);

// Enrollments / Students
export const getEnrollmentsByProgram = (programId, params) => API.get(`/api/program-enrollments/program/${programId}`, { params });
export const removeUserFromProgram = (enrollmentId) => API.delete(`/api/program-enrollments/${enrollmentId}`);
export const getEnrollmentStats = () => API.get('/api/program-enrollments/stats');
export const addUserToProgram = (programId, userId) => API.post(`/api/program-enrollments/admin/${programId}`, { userId });
export const addEducatorToProgram = (programId, educatorId) => API.post(`/api/programs/${programId}/educators`, { educatorId });
export const removeEducatorFromProgram = (programId, educatorId) => API.delete(`/api/programs/${programId}/educators/${educatorId}`);

// ==================== FLASHCARDS ====================
export const getFlashcards = (params) => API.get('/api/flashcards', { params });
export const getFlashcardById = (id) => API.get(`/api/flashcards/${id}`);
export const createFlashcard = (data) => API.post('/api/flashcards', data);
export const updateFlashcard = (id, data) => API.put(`/api/flashcards/${id}`, data);
export const deleteFlashcard = (id) => API.delete(`/api/flashcards/${id}`);
export const getFlashcardStats = () => API.get('/api/flashcards/stats');

// ==================== NOTIFICATIONS ====================
export const {
  getNotifications, getUnreadCount, getNotificationStats, createNotification,
  broadcastNotification, markNotificationAsRead, markAllNotificationsAsRead,
  deleteNotification, deleteAllNotifications,
} = createNotificationApi(API);

export default API;
