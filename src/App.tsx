import React, { useState, useEffect } from 'react';
import { 
  Users as UsersIcon, 
  UserCircle, 
  BookOpen, 
  GraduationCap, 
  FileText, 
  BarChart3, 
  LogOut, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Plus,
  Menu,
  X,
  UserPlus,
  Layers,
  Settings as SettingsIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, UserRole } from './types.ts';
import { supabase } from './lib/supabase';
import { ToastProvider } from './components/Toast';

// Components
import Login from './components/Login.tsx';
import Dashboard from './components/Dashboard.tsx';
import UsersList from './components/UsersList.tsx';
import StudentsList from './components/StudentsList.tsx';
import SubjectsList from './components/SubjectsList.tsx';
import Curriculum from './components/Curriculum.tsx';
import Examination from './components/Examination.tsx';
import ResultsEntry from './components/ResultsEntry.tsx';
import Reports from './components/Reports.tsx';
import Assignments from './components/Assignments.tsx';
import Streams from './components/Streams.tsx';
import SchoolSettings from './components/SchoolSettings.tsx';
import MyProfile from './components/MyProfile.tsx';

type SchoolSettingsState = {
  school_name: string;
  academic_year?: string;
  address?: string;
  region?: string;
  district?: string;
};

const SETTINGS_KEY = 'school_settings';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<string>('dashboard');
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettingsState>(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed?.school_name) return { school_name: String(parsed.school_name) };
    } catch {
      // ignore
    }
    return { school_name: 'KITUKUTU TECHNICAL SCHOOL' };
  });

  const fetchSchoolSettings = async (authToken: string) => {
    try {
      const res = await fetch('/api/settings/school', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) return;
      const json = await res.json().catch(() => null);
      if (!json?.school_name) return;
      const next: SchoolSettingsState = {
        school_name: String(json.school_name),
        academic_year: json.academic_year,
        address: json.address,
        region: json.region,
        district: json.district,
      };
      setSchoolSettings(next);
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (token) {
      // In a real app, verify token or fetch profile
      const savedUser = localStorage.getItem('user');
      if (savedUser) setUser(JSON.parse(savedUser));

      fetchSchoolSettings(token);
    }
  }, [token]);

  useEffect(() => {
    const handler = () => {
      try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        if (parsed?.school_name) {
          setSchoolSettings((prev) => ({ ...prev, ...parsed }));
        }
      } catch {
        // ignore
      }
      if (token) fetchSchoolSettings(token);
    };
    window.addEventListener('schoolSettingsUpdated', handler as any);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('schoolSettingsUpdated', handler as any);
      window.removeEventListener('storage', handler);
    };
  }, [token]);

  useEffect(() => {
    const name = (schoolSettings.school_name || 'School').trim();
    document.title = `${name} RMS`;
  }, [schoolSettings.school_name]);

  const handleLogin = (newUser: User, newToken: string) => {
    setUser(newUser);
    setToken(newToken);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setView('dashboard');
  };

  const handleLogout = async () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore supabase errors on logout
    }
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const renderView = () => {
    switch (view) {
      case 'dashboard': return <Dashboard user={user} setView={setView} />;
      case 'profile': return <MyProfile token={token!} user={user} onUserUpdated={setUser} />;
      case 'users': return user.role === 'headmaster' ? <UsersList token={token!} userRole={user.role} /> : <Dashboard user={user} setView={setView} />;
      case 'students': return <StudentsList token={token!} />;
      case 'subjects': return <SubjectsList token={token!} />;
      case 'curriculum': return <Curriculum token={token!} userRole={user.role} userId={user.id} />;
      case 'examination': return <Examination token={token!} userRole={user.role} userId={user.id} />;
      case 'results': return <ResultsEntry token={token!} userRole={user.role} />;
      case 'reports': return <Reports token={token!} />;
      case 'assignments': return <Assignments token={token!} />;
      case 'classes': return <Streams token={token!} />;
      case 'settings': return <SchoolSettings token={token!} />;
      default: return <Dashboard user={user} setView={setView} />;
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, roles: ['headmaster', 'academic', 'teacher'] },
    { id: 'profile', label: 'My Profile', icon: UserCircle, roles: ['headmaster', 'academic', 'teacher'] },
    { id: 'users', label: 'Staff members', icon: UsersIcon, roles: ['headmaster'] },
    { id: 'students', label: 'Students', icon: GraduationCap, roles: ['headmaster', 'academic', 'teacher'] },
    { id: 'subjects', label: 'Subjects', icon: BookOpen, roles: ['headmaster', 'academic'] },
    { id: 'classes', label: 'Classes/Streams', icon: Layers, roles: ['headmaster', 'academic'] },
    { id: 'assignments', label: 'Deployments', icon: UserPlus, roles: ['headmaster', 'academic'] },
{ id: 'curriculum', label: 'Curriculum & Topics', icon: FileText, roles: ['teacher', 'academic', 'headmaster'] },
    { id: 'examination', label: 'Examination', icon: CheckCircle2, roles: ['headmaster', 'academic', 'teacher'] },
    { id: 'results', label: 'Exam Results', icon: CheckCircle2, roles: ['teacher', 'academic'] },
    { id: 'reports', label: 'Analytics', icon: BarChart3, roles: ['headmaster', 'academic'] },
    { id: 'settings', label: 'Settings', icon: SettingsIcon, roles: ['headmaster', 'academic'] },
  ];

  const displaySchoolName = (schoolSettings.school_name || '').trim() || 'School';
  const sidebarTitle = displaySchoolName.toUpperCase();

  const displayUserName = (() => {
    const n = String(user?.full_name || '').trim();
    if (!n) return 'User';
    return n.split(/\s+/)[0];
  })();

  return (
    <ToastProvider>
    <div className="min-h-screen bg-brand-bg flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-brand-sidebar text-white px-4 py-3 flex justify-between items-center sticky top-0 z-50">
        <h1 className="text-lg font-bold tracking-tight truncate max-w-[70vw]" title={displaySchoolName}>{displaySchoolName}</h1>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1">
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <AnimatePresence>
        {(sidebarOpen || !isMobile) && (
          <motion.aside 
            initial={isMobile ? { x: -300 } : false}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed inset-y-0 left-0 z-40 w-64 bg-brand-sidebar text-white shadow-xl md:static h-[100dvh] md:h-screen`}
          >
            <div className="h-full flex flex-col overflow-y-auto">
              <div className="px-6 py-8 shrink-0 border-b border-white/5">
                <h1 className="text-xl font-black leading-tight tracking-tighter text-white break-words">{sidebarTitle}<br/><span className="text-brand-primary">RMS</span></h1>
                <p className="text-[10px] mt-1 uppercase tracking-widest text-slate-400 font-semibold">Management System</p>
              </div>

              <nav className="flex-1 px-3 py-4 space-y-1">
                {navItems.filter(item => item.roles.includes(user.role)).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setView(item.id); if (isMobile) setSidebarOpen(false); }}
                    className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-md font-medium text-xs transition-all ${
                      view === item.id 
                        ? 'bg-brand-primary text-white shadow-lg' 
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <item.icon size={16} />
                    <span className="uppercase tracking-wide">{item.label}</span>
                  </button>
                ))}
              </nav>

              <div className="p-4 bg-black/20 mt-auto shrink-0 border-t border-white/5">
                <div className="flex items-center gap-3 px-2 py-1 mb-3">
                  <div className="w-9 h-9 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-xs font-bold text-brand-primary">
                    {displayUserName.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-[11px] font-bold truncate text-white">{displayUserName}</p>
                    <p className="text-[9px] text-slate-400 uppercase tracking-widest font-black">{user.role}</p>
                  </div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-md bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-all font-black text-[10px] uppercase tracking-[0.2em] border border-rose-500/20"
                >
                  <LogOut size={14} />
                  <span>Sign Out System</span>
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Backdrop for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 md:h-screen md:overflow-y-auto p-0 md:p-4">
        <div className="max-w-6xl mx-auto md:my-3 md:mr-3 bg-white md:rounded-2xl md:border md:border-slate-200 md:shadow-sm p-4 md:p-8 min-h-[calc(100dvh-2rem)] md:min-h-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
    </ToastProvider>
  );
}
