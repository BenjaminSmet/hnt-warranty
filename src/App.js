import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { auth } from './firebase';
import Login from './Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Claims from './pages/Claims';
import Dealers from './pages/Dealers';
import LabourCodes from './pages/LabourCodes';
import Parts from './pages/Parts';
import WeeklyReport from './pages/WeeklyReport';
import Settings from './pages/Settings';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Loading...</div>;
  if (!user) return <Login />;

  return (
    <BrowserRouter basename="/hnt-warranty">
      <Routes>
        <Route path="/" element={<Layout user={user} />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="claims" element={<Claims />} />
          <Route path="dealers" element={<Dealers />} />
          <Route path="labour-codes" element={<LabourCodes />} />
          <Route path="parts" element={<Parts />} />
          <Route path="weekly-report" element={<WeeklyReport />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;