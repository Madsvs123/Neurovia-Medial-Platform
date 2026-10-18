import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import EducatorLayout from './layout/EducatorLayout';
import EducatorDashboard from './pages/Dashboard';
import EducatorPrograms from './pages/Programs';
import EducatorProgramDetail from './pages/ProgramDetail';
import EducatorCourses from './pages/Courses';
import EducatorCourseDetail from './pages/CourseDetail';
import EducatorLessonEditor from './pages/LessonEditor';
import EducatorQuizzes from './pages/Quizzes';
import EducatorQuizEditor from './pages/QuizEditor';
import EducatorClinicalCases from './pages/ClinicalCases';
import EducatorClinicalCaseEditor from './pages/ClinicalCaseEditor';
import EducatorFlashcards from './pages/Flashcards';
import EducatorStudents from './pages/Students';
import EducatorMessages, { EducatorNewMessage, LegacyConversationRedirect } from './pages/Messages';

const EducatorApp = () => {
  return (
    <Routes>
      {/* No separate educator login — educators log in via the main /login page */}
      <Route path="" element={<PrivateRoute><EducatorLayout /></PrivateRoute>}>
        <Route index element={<EducatorDashboard />} />
        <Route path="dashboard" element={<EducatorDashboard />} />
        <Route path="programs" element={<EducatorPrograms />} />
        <Route path="programs/:id" element={<EducatorProgramDetail />} />
        <Route path="courses" element={<EducatorCourses />} />
        <Route path="courses/:id" element={<EducatorCourseDetail />} />
        <Route path="courses/:courseId/lessons/:lessonId" element={<EducatorLessonEditor />} />
        <Route path="quizzes" element={<EducatorQuizzes />} />
        <Route path="quizzes/new" element={<EducatorQuizEditor />} />
        <Route path="quizzes/:quizId" element={<EducatorQuizEditor />} />
        <Route path="clinical-cases" element={<EducatorClinicalCases />} />
        <Route path="clinical-cases/new" element={<EducatorClinicalCaseEditor />} />
        <Route path="clinical-cases/:id" element={<EducatorClinicalCaseEditor />} />
        <Route path="flashcards" element={<EducatorFlashcards />} />
        <Route path="students" element={<EducatorStudents />} />
        <Route path="messages" element={<EducatorMessages />} />
        <Route path="messages/new" element={<EducatorNewMessage />} />
        <Route path="messages/:threadId" element={<EducatorMessages />} />
        {/* redirects from the previous "conversations" routes */}
        <Route path="conversations" element={<Navigate to="/educator/messages" replace />} />
        <Route path="conversations/new" element={<Navigate to="/educator/messages/new" replace />} />
        <Route path="conversations/:id" element={<LegacyConversationRedirect base="/educator/messages" />} />
      </Route>
      {/* Catch-all: redirect to main login page */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default EducatorApp;
