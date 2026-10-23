import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import LeadsPage from './pages/LeadsPage';
import CallHistoryPage from './pages/CallHistoryPage';
import SimulatorPage from './pages/SimulatorPage';
import CampaignsPage from './pages/CampaignsPage';
import DemosPage from './pages/DemosPage';
import SettingsPage from './pages/SettingsPage';
import CompliancePage from './pages/CompliancePage';
import LoginPage from './pages/LoginPage';
import api from './api/client';

function ProtectedLayout() {
  const { isAuthenticated, loading } = useAuth();
  const [callingMode, setCallingMode] = useState('demo');

  useEffect(() => {
    const fetchMode = async () => {
      try {
        const res = await api.get('/settings');
        setCallingMode(res.data.calling_mode);
      } catch (err) {
        // Defaults to demo
      }
    };
    if (isAuthenticated) {
      fetchMode();
    }
  }, [isAuthenticated]);

  const handleEmergencyStop = async () => {
    if (window.confirm("GLOBAL EMERGENCY STOP: Immediately kill all outbound campaigns and stop all voice dialing?")) {
      try {
        const res = await api.post('/campaigns/emergency-stop');
        alert(res.data.message);
      } catch (err) {
        alert("Emergency stop failed");
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center text-slate-400 text-xs">
        Initializing Nani AI Platform...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      <Navbar callingMode={callingMode} onEmergencyStop={handleEmergencyStop} />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/leads" element={<LeadsPage />} />
            <Route path="/calls" element={<CallHistoryPage />} />
            <Route path="/simulator" element={<SimulatorPage />} />
            <Route path="/campaigns" element={<CampaignsPage />} />
            <Route path="/demos" element={<DemosPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/compliance" element={<CompliancePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={<ProtectedLayout />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
