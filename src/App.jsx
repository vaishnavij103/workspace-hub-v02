import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { useTheme } from "./ThemeContext";

import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import BookingsPage from './pages/BookingsPage';
import WorkstationsPage from './pages/WorkstationsPage';
import VisitorsPage from './pages/VisitorsPage';
import ParkingPage from './pages/ParkingPage';
import NotificationsPage from './pages/NotificationsPage';
import RoomsPage from './pages/RoomsPage';
import UsersPage from './pages/UsersPage';
import InvoicesPage from './pages/InvoicesPage';
import HelpdeskPage from './pages/HelpdeskPage';

function ProtectedRoutes() {
  const { user, isAdmin } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/bookings" element={<BookingsPage />} />
        <Route path="/workstations" element={<WorkstationsPage />} />
        <Route path="/parking" element={<ParkingPage />} />
        <Route path="/helpdesk" element={<HelpdeskPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        {isAdmin && <Route path="/visitors" element={<VisitorsPage />} />}
        {isAdmin && <Route path="/invoices" element={<InvoicesPage />} />}
        {isAdmin && <Route path="/rooms" element={<RoomsPage />} />}
        {isAdmin && <Route path="/users" element={<UsersPage />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen relative ${
      theme === "dark" ? "bg-[#020617] text-white" : "bg-white text-black"
    }`}>
      <div className="a-shape"></div>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<LoginPage initialTab="register" />} />
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </AuthProvider>
    </div>
  );
}
