// All portals share one axios instance — see src/lib/http.js
import http from '../../lib/http';
import { createNotificationApi } from '../../lib/notificationApi';

const API = http;

// Auth
export const adminLogin = (data) => API.post('/api/users/login', data);

// Users
export const getUsers = () => API.get('/api/users');
export const getUserById = (id) => API.get(`/api/users/${id}`);
export const updateUser = (id, data) => API.put(`/api/users/${id}`, data);
export const deleteUser = (id) => API.delete(`/api/users/${id}`);

// Profiles
export const getProfileByUserId = (userId) => API.get(`/api/profiles/${userId}`);
export const updateProfile = (data) => API.put('/api/profiles/me', data);

// Activity Logs

// Dashboard data
export const getDashboardStats = () => API.get('/api/users?limit=5');

// ==================== COURSES ====================
export const getCourses = (params) => API.get('/api/courses', { params });
export const getCourseById = (id) => API.get(`/api/courses/${id}`);
export const createCourse = (data) => API.post('/api/courses', data);
export const updateCourse = (id, data) => API.put(`/api/courses/${id}`, data);
export const toggleCoursePublish = (id) => API.put(`/api/courses/${id}/publish`);
export const deleteCourse = (id) => API.delete(`/api/courses/${id}`);
export const getCourseStats = (id) => API.get(`/api/courses/${id}/stats`);

// ==================== LESSONS ====================
export const getLessonsByCourse = (courseId) => API.get(`/api/lessons/course/${courseId}`);
export const getLessonById = (id) => API.get(`/api/lessons/${id}`);
export const createLesson = (data) => API.post('/api/lessons', data);
export const updateLesson = (id, data) => API.put(`/api/lessons/${id}`, data);
export const toggleLessonPublish = (id) => API.put(`/api/lessons/${id}/publish`);
export const deleteLesson = (id) => API.delete(`/api/lessons/${id}`);
export const reorderLessons = (courseId, lessonOrders) => API.put('/api/lessons/reorder', { courseId, lessonOrders });

// ==================== QUIZZES ====================
export const getQuizzes = (params) => API.get('/api/quizzes', { params });
export const getQuizById = (id) => API.get(`/api/quizzes/${id}`);
export const getQuizzesByCourse = (courseId) => API.get(`/api/quizzes/course/${courseId}`);
export const createQuiz = (data) => API.post('/api/quizzes', data);
export const updateQuiz = (id, data) => API.put(`/api/quizzes/${id}`, data);
export const deleteQuiz = (id) => API.delete(`/api/quizzes/${id}`);
export const getQuizStats = (id) => API.get(`/api/quizzes/${id}/stats`);

// ==================== SUBSCRIPTION PLANS ====================
export const getSubscriptionPlans = (params) => API.get('/api/subscription-plans', { params });
export const getSubscriptionPlanById = (id) => API.get(`/api/subscription-plans/${id}`);
export const createSubscriptionPlan = (data) => API.post('/api/subscription-plans', data);
export const updateSubscriptionPlan = (id, data) => API.put(`/api/subscription-plans/${id}`, data);
export const toggleSubscriptionPlan = (id) => API.put(`/api/subscription-plans/${id}/toggle`);
export const deleteSubscriptionPlan = (id) => API.delete(`/api/subscription-plans/${id}`);

// ==================== SUBSCRIPTIONS ====================
export const getSubscriptions = (params) => API.get('/api/subscriptions', { params });
export const getSubscriptionById = (id) => API.get(`/api/subscriptions/${id}`);
export const getSubscriptionStats = () => API.get('/api/subscriptions/stats');
export const getSubscriptionsByUser = (userId, params) => API.get(`/api/subscriptions/user/${userId}`, { params });
export const updateSubscriptionStatus = (id, status) => API.put(`/api/subscriptions/${id}/status`, { status });

// ==================== PROGRAMS ====================
export const getPrograms = (params) => API.get('/api/programs', { params });
export const getProgramById = (id) => API.get(`/api/programs/${id}`);
export const createProgram = (data) => API.post('/api/programs', data);
export const updateProgram = (id, data) => API.put(`/api/programs/${id}`, data);
export const toggleProgram = (id) => API.put(`/api/programs/${id}/toggle`);
export const deleteProgram = (id) => API.delete(`/api/programs/${id}`);
export const getProgramResources = (id) => API.get(`/api/programs/${id}/resources`);
export const addProgramResource = (id, data) => API.post(`/api/programs/${id}/resources`, data);
export const removeProgramResource = (resourceId) => API.delete(`/api/programs/resources/${resourceId}`);
export const getProgramStats = (id) => API.get(`/api/programs/${id}/stats`);
export const addEducatorToProgram = (programId, educatorId) => API.post(`/api/programs/${programId}/educators`, { educatorId });
export const removeEducatorFromProgram = (programId, educatorId) => API.delete(`/api/programs/${programId}/educators/${educatorId}`);

// ==================== PAYMENTS ====================
export const getPayments = (params) => API.get('/api/payments', { params });
export const getPaymentById = (id) => API.get(`/api/payments/${id}`);
export const getPaymentStats = () => API.get('/api/payments/stats');
export const getRecentPayments = (limit) => API.get(`/api/payments/recent?limit=${limit || 20}`);
export const recordPayment = (data) => API.post('/api/payments', data);
export const updatePaymentStatus = (id, status) => API.put(`/api/payments/${id}/status`, { status });
export const getPaymentsByUser = (userId) => API.get(`/api/payments/user/${userId}`);

// ==================== ACTIVITY LOGS ====================
export const getRecentActivityLogs = (params) => API.get('/api/activity-logs/recent', { params });
export const getActivityLogs = (params) => API.get('/api/activity-logs', { params });
export const getActivityStats = (params) => API.get('/api/activity-logs/stats', { params });
export const getActivityLogsByUser = (userId, params) => API.get(`/api/activity-logs/user/${userId}`, { params });
export const getEngagementStats = (params) => API.get('/api/activity-logs/engagement', { params });

// ==================== PROGRAM ENROLLMENTS ====================
export const getEnrollmentsByUser = (userId, params) => API.get(`/api/program-enrollments/user/${userId}`, { params });

// ==================== PROGRAM ENROLLMENT ACTIONS ====================
export const removeUserFromProgram = (enrollmentId) => API.delete(`/api/program-enrollments/${enrollmentId}`);
export const addUserToProgram = (programId, userId) => API.post(`/api/program-enrollments/admin/${programId}`, { userId });

// ==================== CLINICAL CASES ====================
export const getClinicalCases = (params) => API.get('/api/clinical-cases', { params });
export const getClinicalCaseById = (id) => API.get(`/api/clinical-cases/${id}`);
export const createClinicalCase = (data) => API.post('/api/clinical-cases', data);
export const updateClinicalCase = (id, data) => API.put(`/api/clinical-cases/${id}`, data);
export const deleteClinicalCase = (id) => API.delete(`/api/clinical-cases/${id}`);

// ==================== NOTIFICATIONS ====================
export const {
  getNotifications, getUnreadCount, getNotificationStats, createNotification,
  broadcastNotification, markNotificationAsRead, markAllNotificationsAsRead,
  deleteNotification, deleteAllNotifications,
} = createNotificationApi(API);

// ==================== FLASHCARDS ====================
export const getFlashcards = (params) => API.get('/api/flashcards', { params });
export const getFlashcardById = (id) => API.get(`/api/flashcards/${id}`);
export const getDueFlashcards = () => API.get('/api/flashcards/due');
export const getFlashcardStats = () => API.get('/api/flashcards/stats');
export const createFlashcard = (data) => API.post('/api/flashcards', data);
export const updateFlashcard = (id, data) => API.put(`/api/flashcards/${id}`, data);
export const deleteFlashcard = (id) => API.delete(`/api/flashcards/${id}`);

// ==================== DOCTOR TOOLS ====================
export const getDoctorTools = (params) => API.get('/api/doctor-tools', { params });
export const getDoctorToolById = (id) => API.get(`/api/doctor-tools/${id}`);
export const createDoctorTool = (data) => API.post('/api/doctor-tools', data);
export const updateDoctorTool = (id, data) => API.put(`/api/doctor-tools/${id}`, data);
export const toggleDoctorTool = (id) => API.put(`/api/doctor-tools/${id}/toggle`);
export const deleteDoctorTool = (id) => API.delete(`/api/doctor-tools/${id}`);
export const getDoctorToolAlgorithms = () => API.get('/api/doctor-tools/algorithms');
export const calculateDoctorTool = (algorithmId, inputs) => API.post('/api/doctor-tools/calculate', { algorithmId, inputs });

// ==================== DISEASES ====================
export const getDiseases = (params) => API.get('/api/diseases', { params });
export const getDiseaseById = (id) => API.get(`/api/diseases/${id}`);
export const createDisease = (data) => API.post('/api/diseases', data);
export const updateDisease = (id, data) => API.put(`/api/diseases/${id}`, data);
export const deleteDisease = (id) => API.delete(`/api/diseases/${id}`);

// ==================== MEDICATIONS ====================
export const getMedications = (params) => API.get('/api/medications', { params });
export const createMedication = (data) => API.post('/api/medications', data);
export const updateMedication = (id, data) => API.put(`/api/medications/${id}`, data);
export const deleteMedication = (id) => API.delete(`/api/medications/${id}`);

// ==================== SYMPTOMS ====================
export const getSymptoms = (params) => API.get('/api/symptoms', { params });
export const createSymptom = (data) => API.post('/api/symptoms', data);
export const updateSymptom = (id, data) => API.put(`/api/symptoms/${id}`, data);
export const deleteSymptom = (id) => API.delete(`/api/symptoms/${id}`);

// ==================== PROGRAM ENROLLMENTS ====================
export const getEnrollmentsByProgram = (programId, params) => API.get(`/api/program-enrollments/program/${programId}`, { params });

export const getEnrollmentStats = () => API.get('/api/program-enrollments/stats');

export default API;
