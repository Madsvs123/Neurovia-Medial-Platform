import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import AdminLayout from './layout/AdminLayout';
import AdminDashboard from './pages/Dashboard';
import AdminUsers from './pages/Users';
import AdminUserDetail from './pages/UserDetail';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import LessonEditor from './pages/LessonEditor';
import Quizzes from './pages/Quizzes';
import QuizEditor from './pages/QuizEditor';
import Flashcards from './pages/Flashcards';
import FlashcardEditor from './pages/FlashcardEditor';
import Programs from './pages/Programs';
import ProgramDetail from './pages/ProgramDetail';
import Billing from './pages/Billing';
import ActivityLogs from './pages/ActivityLogs';
import ClinicalCases from './pages/ClinicalCases';
import ClinicalCaseEditor from './pages/ClinicalCaseEditor';
import Notifications from './pages/Notifications';
import DoctorTools from './pages/DoctorTools';
import Settings from './pages/Settings';
import AdminMessages, { AdminNewMessage, LegacyConversationRedirect } from './pages/Messages';

const AdminApp = () => {
  return (
    <Routes>
      {/* No separate admin login — admins log in via the main /login page */}
      <Route path="" element={<PrivateRoute><AdminLayout /></PrivateRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="users/:id" element={<AdminUserDetail />} />
        <Route path="users/:id/edit" element={<AdminUserDetail />} />
        <Route path="courses" element={<Courses />} />
        <Route path="courses/:id" element={<CourseDetail />} />
        <Route path="courses/:id/edit" element={<CourseDetail />} />
        <Route path="courses/:courseId/lessons/new" element={<LessonEditor />} />
        <Route path="courses/:courseId/lessons/:lessonId" element={<LessonEditor />} />
        <Route path="quizzes" element={<Quizzes />} />
        <Route path="quizzes/new" element={<QuizEditor />} />
        <Route path="quizzes/:quizId/edit" element={<QuizEditor />} />
        <Route path="flashcards" element={<Flashcards />} />
        <Route path="flashcards/new" element={<FlashcardEditor />} />
        <Route path="flashcards/:cardId/edit" element={<FlashcardEditor />} />
        <Route path="billing" element={<Billing />} />
        <Route path="programs" element={<Programs />} />
        <Route path="programs/:id" element={<ProgramDetail />} />
        <Route path="programs/:id/edit" element={<ProgramDetail />} />
        <Route path="activity-logs" element={<ActivityLogs />} />
        <Route path="clinical-cases" element={<ClinicalCases />} />
        <Route path="clinical-cases/new" element={<ClinicalCaseEditor />} />
        <Route path="clinical-cases/:id/edit" element={<ClinicalCaseEditor />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="doctor-tools" element={<DoctorTools />} />
        <Route path="settings" element={<Settings />} />
        <Route path="messages" element={<AdminMessages />} />
        <Route path="messages/new" element={<AdminNewMessage />} />
        <Route path="messages/:threadId" element={<AdminMessages />} />
        {/* redirects from the previous "conversations" routes */}
        <Route path="conversations" element={<Navigate to="/admin/messages" replace />} />
        <Route path="conversations/new" element={<Navigate to="/admin/messages/new" replace />} />
        <Route path="conversations/:id" element={<LegacyConversationRedirect base="/admin/messages" />} />
      </Route>
      {/* Catch-all: redirect to main login page */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AdminApp;
