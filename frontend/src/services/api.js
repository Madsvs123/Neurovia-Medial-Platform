// All portals share one axios instance — see src/lib/http.js
import http from '../lib/http';
import { createNotificationApi } from '../lib/notificationApi';

const API = http;

// ==================== AUTH ====================
export const login = (data) => API.post('/api/users/login', data);
export const register = (data) => API.post('/api/users/register', data);
export const googleAuth = (credential) => API.post('/api/users/google-login', credential);
export const getUserProfile = () => API.get('/api/users/profile');
export const updateUserProfile = (data) => API.put('/api/users/profile', data);

// ==================== ADMIN USERS ====================
export const getAllUsers = () => API.get('/api/users');
export const getUserById = (id) => API.get(`/api/users/${id}`);
export const adminUpdateUser = (id, data) => API.put(`/api/users/${id}`, data);
export const deleteUser = (id) => API.delete(`/api/users/${id}`);

// ==================== PROFILES ====================
export const getMyProfile = () => API.get('/api/profiles/me');
export const updateMyProfile = (data) => API.put('/api/profiles/me', data);
export const getProfileByUserId = (userId) => API.get(`/api/profiles/${userId}`);
export const searchProfiles = (params) => API.get('/api/profiles/search', { params });

// ==================== SUBSCRIPTIONS ====================
export const getSubscriptionPlans = () => API.get('/api/subscription-plans');
export const getSubscriptions = () => API.get('/api/subscriptions');

// ==================== NOTIFICATIONS ====================
export const {
  getNotifications, getUnreadCount, getNotificationStats, createNotification,
  broadcastNotification, markNotificationAsRead, markAllNotificationsAsRead,
  deleteNotification, deleteAllNotifications,
} = createNotificationApi(API);

// ==================== ACTIVITY LOGS ====================
export const getActivityLogs = (params) => API.get('/api/activity-logs', { params });

// ==================== COURSES ====================
export const getCourses = (params) => API.get('/api/courses', { params });
export const getCourseById = (id) => API.get(`/api/courses/${id}`);
export const getCoursesByInstructor = (instructorId) => API.get(`/api/courses/instructor/${instructorId}`);
export const getMyCourses = () => API.get('/api/courses/my-courses');
export const getCourseStats = (id) => API.get(`/api/courses/${id}/stats`);

// ==================== LESSONS ====================
export const getLessonById = (id) => API.get(`/api/lessons/${id}`);
export const getLessonsByCourse = (courseId) => API.get(`/api/lessons/course/${courseId}`);

// ==================== PAYMENTS ====================
export const getPayments = (params) => API.get('/api/payments', { params });

// ==================== QUIZZES ====================
export const getQuizzes = (params) => API.get('/api/quizzes', { params });
export const getQuizById = (id) => API.get(`/api/quizzes/${id}`);
export const getQuizzesByCourse = (courseId) => API.get(`/api/quizzes/course/${courseId}`);
export const getQuizzesByLesson = (lessonId) => API.get(`/api/quizzes/lesson/${lessonId}`);
export const createQuiz = (data) => API.post('/api/quizzes', data);
export const updateQuiz = (id, data) => API.put(`/api/quizzes/${id}`, data);
export const deleteQuiz = (id) => API.delete(`/api/quizzes/${id}`);
export const submitQuiz = (quizId, answers) => API.post(`/api/quizzes/${quizId}/submit`, { answers });
export const getQuizStats = (id) => API.get(`/api/quizzes/${id}/stats`);

// ==================== CLINICAL CASES ====================
export const getClinicalCases = (params) => API.get('/api/clinical-cases', { params });
export const getClinicalCaseById = (id) => API.get(`/api/clinical-cases/${id}`);
export const getClinicalCasesBySpecialty = (specialty) => API.get(`/api/clinical-cases/specialty/${specialty}`);
export const getClinicalCasesByDifficulty = (difficulty) => API.get(`/api/clinical-cases/difficulty/${difficulty}`);
export const searchClinicalCasesBySymptoms = (symptoms) => API.get('/api/clinical-cases/search-by-symptoms', { params: { symptoms } });
export const searchClinicalCasesByDiagnosis = (diagnosis) => API.get('/api/clinical-cases/search-by-diagnosis', { params: { diagnosis } });
export const getClinicalCaseStats = (id) => API.get(`/api/clinical-cases/${id}/stats`);

// ==================== PROGRAMS ====================
export const getPrograms = (params) => API.get('/api/programs', { params });
export const getProgramById = (id) => API.get(`/api/programs/${id}`);
export const getProgramByCode = (code) => API.get(`/api/programs/code/${code}`);
export const getProgramResources = (id) => API.get(`/api/programs/${id}/resources`);
export const getProgramStats = (id) => API.get(`/api/programs/${id}/stats`);
export const getProgramEnrollments = (params) => API.get('/api/program-enrollments', { params });

// ==================== USER PROGRAMS ====================
export const enrollInProgram = (programId) => API.post(`/api/users/enroll-program/${programId}`);
export const getMyPrograms = () => API.get('/api/users/my-programs');
export const getMyCompletedQuizzes = () => API.get('/api/users/my-completed-quizzes');
export const getMyActivityLogs = (params) => API.get('/api/activity-logs/me', { params });
export const unenrollFromProgram = (programId) => API.delete(`/api/program-enrollments/me/${programId}`);
export const removeUserFromProgram = (enrollmentId) => API.delete(`/api/program-enrollments/${enrollmentId}`);

// ==================== FLASHCARDS ====================
export const getFlashcardById = (id) => API.get(`/api/flashcards/${id}`);

export default API;
