import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useTheme } from '../ThemeContext';
import { healthCheck } from '../api';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, CalendarDays, Building2, Users, Bell, LogOut, ChevronLeft, ChevronRight,
  UserCheck, Car, Monitor, FileText, LifeBuoy
} from 'lucide-react';
import { Navbar } from "./Navbar";
import AdminTickerBar from "./AdminTickerBar";
import ApexonValuesBar from "./ApexonValuesBar";
import ChatbotWidget from "./ChatbotWidget";
import logo from "../assets/Apexon_id6ht3QYLO_0.png";

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Workplace Hub', sub: 'Hub Overview', adminOnly: false },
  { to: '/bookings', icon: CalendarDays, label: 'RoomBook', sub: 'Book meeting rooms', adminOnly: false },
  { to: '/workstations', icon: Monitor, label: 'Workstations', sub: 'Book desk & amenities', adminOnly: false },
  { to: '/visitors', icon: UserCheck, label: 'VisiFlow Access', sub: 'Visitor check-in & badges', adminOnly: true },
  { to: '/invoices', icon: FileText, label: 'Invoice & Expenses', sub: 'Upload & OCR reports', adminOnly: true },
  { to: '/parking', icon: Car, label: 'ParkSwift', sub: 'Smart parking slots', adminOnly: false },
  { to: '/helpdesk', icon: LifeBuoy, label: 'Helpdesk & Support', sub: 'My tickets & support desk', adminOnly: false },
  { to: '/notifications', icon: Bell, label: 'Notifications', sub: 'Alerts & updates', adminOnly: false },
  { to: '/rooms', icon: Building2, label: 'Space Admin', sub: 'Manage rooms & workstations', adminOnly: true },
  { to: '/users', icon: Users, label: 'Users Directory', sub: 'User roles & directory', adminOnly: true },
];

export default function Layout({ children }) {
  const { user, isAdmin, logout } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [apiOk, setApiOk] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    let mounted = true;
    const checkStatus = () => {
      healthCheck()
        .then(d => {
          if (mounted) setApiOk(d?.status === 'ok');
        })
        .catch(() => {
          if (mounted) setApiOk(false);
        });
    };

    checkStatus();
    // Fast initial retries to recover quickly after server restarts
    const retryTimeout = setTimeout(checkStatus, 1500);
    const interval = setInterval(checkStatus, 5000);

    return () => {
      mounted = false;
      clearTimeout(retryTimeout);
      clearInterval(interval);
    };
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className={`flex h-screen overflow-hidden ${theme === "dark" ? "bg-[#080b14]" : "bg-gray-50"}`}>

      {/* Sidebar */}
      <aside className={`flex-shrink-0 flex flex-col border-r transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'} ${theme === "dark" ? "border-[#1e2a45] bg-gradient-to-b from-[#0a0f1e] to-[#080b14]" : "border-gray-200 bg-white"
        }`}>
        {/* Logo Header */}
        <div className={`px-5 pt-6 pb-4 border-b flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} ${theme === "dark" ? "border-[#1e2a45]" : "border-gray-200"}`}>
          {isCollapsed ? (
            <div className="flex items-center gap-3">
              <img
                src={logo}
                alt="Apexon Logo"
                className="w-full max-w-[140px] h-auto object-contain opacity-90"
              />
            </div>
          ) : (
            <div className="overflow-hidden flex-1">
              <div className="flex items-center gap-3">
                <img
                  src={logo}
                  alt="Apexon Logo"
                  className="w-full max-w-[140px] h-auto object-contain opacity-90"
                />
              </div>
              <div className="leading-tight mt-3">
                <h1 className={`text-xs font-extrabold tracking-wider ${theme === "dark" ? "text-indigo-400" : "text-indigo-600"}`}>
                  WORKPLACE HUB
                </h1>
                <p className={`text-[0.6rem] tracking-[0.12em] ${theme === "dark" ? "text-slate-400" : "text-slate-500"} uppercase whitespace-nowrap font-medium mt-0.5`}>
                  RoomBook · VisiFlow · ParkSwift
                </p>
              </div>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-1.5 rounded-lg border transition-all flex-shrink-0 ${theme === "dark" ? "border-[#1e2a45] text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10" : "border-gray-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
              }`}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Nav Links */}
        <div className="px-3 mt-3 overflow-y-auto flex-1">
          {!isCollapsed && (
            <div className={`text-[0.65rem] uppercase tracking-widest ${theme === "dark" ? "text-slate-500" : "text-slate-400"} font-bold px-3 py-1 mb-1`}>
              Module Apps
            </div>
          )}
          <nav className="space-y-1">
            {NAV.filter(n => !n.adminOnly || isAdmin).map(n => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === '/'}
                title={isCollapsed ? n.label : undefined}
                className={({ isActive }) =>
                  `flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group ${isActive
                    ? theme === "dark"
                      ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/15 text-indigo-300 border border-indigo-500/30'
                      : 'bg-gradient-to-r from-indigo-100 to-purple-50 text-indigo-700 border border-indigo-300'
                    : theme === "dark"
                      ? 'text-slate-400 hover:bg-indigo-500/10 hover:text-indigo-300 border border-transparent'
                      : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 border border-transparent'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <n.icon size={18} className="flex-shrink-0" />
                    {!isCollapsed && (
                      <div className="flex-1 overflow-hidden">
                        <div className="leading-tight truncate">{n.label}</div>
                        <div className="text-[0.6rem] opacity-60 font-normal truncate mt-0.5">{n.sub}</div>
                      </div>
                    )}
                    {isActive && !isCollapsed && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Health Indicator */}
        <div className="px-3 mb-2 pt-2 border-t border-slate-800/50">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'} px-3 py-2 rounded-xl text-xs font-medium ${apiOk
            ? theme === "dark" ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-emerald-100 border border-emerald-300 text-emerald-700'
            : theme === "dark" ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' : 'bg-rose-100 border border-rose-300 text-rose-700'
            }`} title={isCollapsed ? (apiOk ? 'API Connected' : 'API Unreachable') : undefined}>
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${apiOk ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
            {!isCollapsed && <span>{apiOk ? 'All Services Online' : 'API Unreachable'}</span>}
          </div>
        </div>

        {/* Logout */}
        <div className="px-3 mb-4">
          <button
            onClick={handleLogout}
            title={isCollapsed ? "Logout" : undefined}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'} px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${theme === "dark"
              ? "text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border-transparent hover:border-rose-500/20"
              : "text-slate-600 hover:text-rose-600 hover:bg-rose-50 border-transparent hover:border-rose-200"
              }`}
          >
            <LogOut size={16} className="flex-shrink-0" />
            {!isCollapsed && <span>Logout ({user?.name || 'User'})</span>}
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 min-h-0 overflow-y-auto flex flex-col relative">
        <Navbar />
        <div className="flex-1 max-w-[1500px] w-full mx-auto px-6 py-4 space-y-4">
          <AdminTickerBar />
          <ApexonValuesBar />
          {children}
        </div>
        <ChatbotWidget />
      </main>
    </div>
  );
}
