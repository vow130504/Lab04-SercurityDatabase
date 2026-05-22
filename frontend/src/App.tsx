import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ClassesPage from './pages/ClassesPage';
import ClassStudentsPage from './pages/ClassStudentsPage';
import GradesPage from './pages/GradesPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/classes" element={<ClassesPage />} />
        <Route path="/classes/:malop/students" element={<ClassStudentsPage />} />
        <Route path="/grades" element={<GradesPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
