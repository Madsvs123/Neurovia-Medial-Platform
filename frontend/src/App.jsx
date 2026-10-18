import React from 'react';
import { Box } from '@chakra-ui/react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import CoursesPage from './pages/CoursesPage';
import CourseDetailPage from './pages/CourseDetailPage';
import LessonViewPage from './pages/LessonViewPage';
import QuizzesPage from './pages/QuizzesPage';
import QuizTakePage from './pages/QuizTakePage';
import QuizResultPage from './pages/QuizResultPage';
import ClinicalCasesPage from './pages/ClinicalCasesPage';
import ClinicalCaseDetailPage from './pages/ClinicalCaseDetailPage';
import ProgramsPage from './pages/ProgramsPage';
import ProgramDetailPage from './pages/ProgramDetailPage';
import ProgramDashboardPage from './pages/ProgramDashboardPage';
import FlashcardViewPage from './pages/FlashcardViewPage';
import PlanPage from './pages/PlanPage';
import SubscriptionPage from './pages/SubscriptionPage';
import { AuthRoute, PublicRoute } from './components/ProtectedRoute';

const NotFoundPage = () => (
  <Box textAlign="center" py={20}>
    <h1>404 - Page Not Found</h1>
  </Box>
);

const App = () => {
  return (
    <Box minHeight="100vh" display="flex" flexDirection="column">
      <Navbar />
      <Box flex="1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          } />
          <Route path="/register" element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          } />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/courses/:id" element={<CourseDetailPage />} />
          <Route path="/courses/:courseId/lessons/:lessonId" element={<LessonViewPage />} />
          <Route path="/quizzes" element={<QuizzesPage />} />
          <Route path="/quizzes/:id" element={<QuizTakePage />} />
          <Route path="/quizzes/:id/result" element={<QuizResultPage />} />
          <Route path="/clinical-cases" element={<ClinicalCasesPage />} />
          <Route path="/clinical-cases/:id" element={<ClinicalCaseDetailPage />} />
          <Route path="/programs" element={<ProgramsPage />} />
          <Route path="/programs/:id" element={<ProgramDetailPage />} />

          <Route path="/my-program/:id" element={<ProgramDashboardPage />} />
          <Route path="/flashcard/:id" element={<FlashcardViewPage />} />
          <Route path="/plans" element={<PlanPage />} />
          <Route path="/subscription" element={<SubscriptionPage />} />
          <Route path="/profile" element={
            <AuthRoute>
              <ProfilePage />
            </AuthRoute>
          } />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Box>
    </Box>
  );
};

export default App;
