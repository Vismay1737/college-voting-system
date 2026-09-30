import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Admin pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import Elections from './pages/admin/Elections';
import ElectionDetail from './pages/admin/ElectionDetail';
import Classes from './pages/admin/Classes';
import Voters from './pages/admin/Voters';
import VotingActivity from './pages/admin/VotingActivity';
import Results from './pages/admin/Results';
import AuditLogs from './pages/admin/AuditLogs';

// Voter pages
import VoterLogin from './pages/voter/VoterLogin';
import VoterDashboard from './pages/voter/VoterDashboard';
import VotingPage from './pages/voter/VotingPage';

function AdminRoute({ children }) {
  const token = localStorage.getItem('admin_token');
  if (!token) return <Navigate to="/admin/login" replace />;
  return children;
}

function VoterRoute({ children }) {
  const token = localStorage.getItem('voter_token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1e293b',
            color: '#e2e8f0',
            border: '1px solid rgba(71, 85, 105, 0.5)',
            borderRadius: '12px',
          },
          success: {
            iconTheme: { primary: '#22c55e', secondary: '#0f172a' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#0f172a' },
          },
        }}
      />

      <Routes>
        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="elections" element={<Elections />} />
          <Route path="elections/:id" element={<ElectionDetail />} />
          <Route path="classes" element={<Classes />} />
          <Route path="voters" element={<Voters />} />
          <Route path="activity" element={<VotingActivity />} />
          <Route path="results" element={<Results />} />
          <Route path="audit-logs" element={<AuditLogs />} />
        </Route>

        {/* Voter Routes */}
        <Route path="/login" element={<VoterLogin />} />
        <Route
          path="/voter/dashboard"
          element={
            <VoterRoute>
              <VoterDashboard />
            </VoterRoute>
          }
        />
        <Route
          path="/voter/vote/:electionId"
          element={
            <VoterRoute>
              <VotingPage />
            </VoterRoute>
          }
        />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
