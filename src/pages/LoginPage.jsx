import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useTheme } from '../ThemeContext';
import logo from "../assets/Apexon_id6ht3QYLO_0.png";

import {
  Lock,
  Mail,
  User,
  Building2,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  UserPlus,
  LogIn,
  Sun,
  Moon,
  Users,
  Building,
  KeyRound
} from 'lucide-react';

export default function LoginPage({ initialTab = "login" }) {
  const { login, register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const routeLocation = useLocation();

  const isRegisterRoute = routeLocation.pathname === '/register' || initialTab === 'register';
  const [activeTab, setActiveTab] = useState(isRegisterRoute ? 'register' : 'login');

  useEffect(() => {
    if (routeLocation.pathname === '/register') {
      setActiveTab('register');
    } else if (routeLocation.pathname === '/login') {
      setActiveTab('login');
    }
  }, [routeLocation.pathname]);

  // Form states
  const [email, setEmail] = useState('admin@apexon.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);

  // Register specific fields
  const [fullName, setFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [role, setRole] = useState('employee');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg('Please enter your corporate email');
      return;
    }
    setErrorMsg('');
    login(email, password);
    navigate('/');
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    if (!fullName || !regEmail || !regPassword) {
      setErrorMsg('Please fill in all required fields');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }
    setErrorMsg('');
    register({
      name: fullName,
      email: regEmail,
      role: role,
      department: department
    });
    setSuccessMsg('Account created successfully! Redirecting to dashboard...');
    setTimeout(() => {
      navigate('/');
    }, 800);
  };

  const handlePersonaSelect = (personaEmail, personaRole, personaName, personaDept) => {
    setEmail(personaEmail);
    setPassword('password123');
    login(personaEmail, 'password123', personaRole, personaName, personaDept);
    navigate('/');
  };

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen flex flex-col justify-between p-4 sm:p-6 transition-colors duration-200 ${isDark ? 'bg-[#080c19] text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}>
      {/* Top Header Navigation */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between py-2 px-2">
        <div className="flex items-center gap-3">
          <img
            src={logo}
            alt="Apexon Logo"
            className="w-full max-w-[140px] h-auto object-contain opacity-90"
          />
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${isDark
            ? 'bg-[#131d35] border-[#223359] text-slate-300 hover:text-white hover:border-indigo-500'
            : 'bg-white border-slate-300 text-slate-700 hover:text-slate-900 hover:border-slate-400 shadow-sm'
            }`}
        >
          {isDark ? (
            <>
              <Sun size={14} className="text-amber-400" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon size={14} className="text-indigo-600" />
              <span>Dark Mode</span>
            </>
          )}
        </button>
      </header>

      {/* Main split auth card container */}
      <main className="max-w-5xl w-full mx-auto my-auto py-4">
        <div className={`rounded-3xl border shadow-2xl overflow-hidden flex flex-col lg:flex-row transition-all ${isDark ? 'bg-[#0f172a] border-[#1e2a45]' : 'bg-white border-slate-200'
          }`}>

          {/* Left Hero Banner */}
          <div className="lg:w-5/12 bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-700 p-8 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden">
            {/* Background decorative circles */}
            <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none"></div>
            <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-indigo-900/30 blur-3xl pointer-events-none"></div>

            <div className="relative z-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.7rem] font-bold tracking-wide uppercase bg-white/15 backdrop-blur-md border border-white/20 text-indigo-100 mb-6">
                <Sparkles size={13} className="text-amber-300" />
                <span>Enterprise Operations</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-snug mb-4">
                Unified Workplace Management Platform
              </h1>

              <p className="text-xs sm:text-sm text-indigo-100/90 leading-relaxed font-medium mb-8">
                Streamline visitor logs, meeting room allocations, IT helpdesk tickets, and compliance audit logs in one central hub.
              </p>

              <div className="space-y-3">
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/10 border border-white/15 backdrop-blur-sm text-xs font-semibold">
                  <ShieldCheck size={16} className="text-indigo-200 flex-shrink-0" />
                  <span>Role-Based Access Control & Single Sign-On</span>
                </div>
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/10 border border-white/15 backdrop-blur-sm text-xs font-semibold">
                  <CheckCircle2 size={16} className="text-emerald-300 flex-shrink-0" />
                  <span>Real-Time Audit Trail & AI Smart Search</span>
                </div>
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/10 border border-white/15 backdrop-blur-sm text-xs font-semibold">
                  <Building size={16} className="text-sky-300 flex-shrink-0" />
                  <span>Multi-Location Room & Desk Reservations</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/20 relative z-10 text-[0.7rem] text-indigo-200 flex items-center justify-between">
              <span>Apexon Workplace Hub v2.5</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                System Operational
              </span>
            </div>
          </div>

          {/* Right Form Area */}
          <div className="lg:w-7/12 p-6 sm:p-10 flex flex-col justify-between">
            <div>
              {/* Tab Switcher */}
              <div className={`p-1 rounded-2xl border flex items-center mb-6 max-w-sm ${isDark ? 'bg-[#080c1a] border-[#1e2a45]' : 'bg-slate-100 border-slate-200'
                }`}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('login');
                    setErrorMsg('');
                    setSuccessMsg('');
                    navigate('/login');
                  }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${activeTab === 'login'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : isDark
                      ? 'text-slate-400 hover:text-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  <LogIn size={14} />
                  <span>Sign In</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('register');
                    setErrorMsg('');
                    setSuccessMsg('');
                    navigate('/register');
                  }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${activeTab === 'register'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : isDark
                      ? 'text-slate-400 hover:text-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  <UserPlus size={14} />
                  <span>Create Account</span>
                </button>
              </div>

              {/* Feedback messages */}
              {errorMsg && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                  {successMsg}
                </div>
              )}

              {/* SIGN IN FORM */}
              {activeTab === 'login' && (
                <div>
                  <div className="mb-6">
                    <h2 className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Welcome to Workplace Hub
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">Sign in with your corporate SSO credentials</p>
                  </div>

                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">Corporate Email</label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-3.5 top-3 text-slate-500" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="admin@apexon.com"
                          required
                          className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs font-medium focus:outline-none focus:border-indigo-500 transition-all ${isDark ? 'bg-[#070c1a] border-[#1e2a45] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                            }`}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-400">Password</label>
                        <button
                          type="button"
                          onClick={() => alert("Password reset instructions sent to your corporate email.")}
                          className="text-[0.7rem] font-bold text-indigo-500 hover:underline"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock size={16} className="absolute left-3.5 top-3 text-slate-500" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-xs font-medium focus:outline-none focus:border-indigo-500 transition-all ${isDark ? 'bg-[#070c1a] border-[#1e2a45] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                            }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
                    >
                      <span>Sign In with SSO</span>
                      <ArrowRight size={16} />
                    </button>
                  </form>

                  {/* QUICK DEMO PERSONA SWITCHER (as shown in reference image 2) */}
                  <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                    <p className="text-[0.65rem] font-extrabold text-slate-400 uppercase tracking-widest text-center mb-3">
                      QUICK DEMO PERSONA SWITCH
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handlePersonaSelect('admin@apexon.com', 'admin', 'Apexon Admin', 'Facility Mgmt')}
                        className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all hover:border-indigo-500 ${isDark ? 'bg-[#080c1a] border-[#1e2a45] hover:bg-[#131d35]' : 'bg-slate-50 border-slate-200 hover:bg-white'
                          }`}
                      >
                        <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                          <ShieldCheck size={14} />
                        </div>
                        <div className="overflow-hidden">
                          <p className={`text-xs font-bold leading-tight ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                            Super Admin
                          </p>
                          <p className="text-[0.65rem] text-slate-500">Full Control</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePersonaSelect('ananya.patel@apexon.com', 'admin', 'Ananya Patel', 'HR & Culture')}
                        className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all hover:border-indigo-500 ${isDark ? 'bg-[#080c1a] border-[#1e2a45] hover:bg-[#131d35]' : 'bg-slate-50 border-slate-200 hover:bg-white'
                          }`}
                      >
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                          <Users size={14} />
                        </div>
                        <div className="overflow-hidden">
                          <p className={`text-xs font-bold leading-tight ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                            HR Admin
                          </p>
                          <p className="text-[0.65rem] text-slate-500">Users & Roles</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePersonaSelect('pune.facility@apexon.com', 'admin', 'Vikram Deshmukh', 'Facility Mgmt')}
                        className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all hover:border-indigo-500 ${isDark ? 'bg-[#080c1a] border-[#1e2a45] hover:bg-[#131d35]' : 'bg-slate-50 border-slate-200 hover:bg-white'
                          }`}
                      >
                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                          <Building2 size={14} />
                        </div>
                        <div className="overflow-hidden">
                          <p className={`text-xs font-bold leading-tight ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                            Facility Mgr
                          </p>
                          <p className="text-[0.65rem] text-slate-500">Rooms & Visitors</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePersonaSelect('rahul.sharma@apexon.com', 'employee', 'Rahul Sharma', 'Engineering')}
                        className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all hover:border-indigo-500 ${isDark ? 'bg-[#080c1a] border-[#1e2a45] hover:bg-[#131d35]' : 'bg-slate-50 border-slate-200 hover:bg-white'
                          }`}
                      >
                        <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                          <KeyRound size={14} />
                        </div>
                        <div className="overflow-hidden">
                          <p className={`text-xs font-bold leading-tight ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                            Employee
                          </p>
                          <p className="text-[0.65rem] text-slate-500">Standard Access</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* CREATE ACCOUNT / REGISTER FORM */}
              {activeTab === 'register' && (
                <div>
                  <div className="mb-5">
                    <h2 className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Create Workplace Account
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">Register your corporate profile for room & visitor management</p>
                  </div>

                  <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">Full Name</label>
                      <div className="relative">
                        <User size={16} className="absolute left-3.5 top-3 text-slate-500" />
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Rahul Sharma"
                          required
                          className={`w-full pl-10 pr-4 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:border-indigo-500 transition-all ${isDark ? 'bg-[#070c1a] border-[#1e2a45] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                            }`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">Corporate Email</label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-3.5 top-3 text-slate-500" />
                        <input
                          type="email"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="rahul.sharma@apexon.com"
                          required
                          className={`w-full pl-10 pr-4 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:border-indigo-500 transition-all ${isDark ? 'bg-[#070c1a] border-[#1e2a45] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                            }`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1">Department</label>
                        <select
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          className={`w-full px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:border-indigo-500 transition-all ${isDark ? 'bg-[#070c1a] border-[#1e2a45] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                            }`}
                        >
                          <option value="Engineering">Engineering</option>
                          <option value="Facility Mgmt">Facility Mgmt</option>
                          <option value="HR & Culture">HR & Culture</option>
                          <option value="IT Operations">IT Operations</option>
                          <option value="Finance">Finance</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1">Role Type</label>
                        <select
                          value={role}
                          onChange={(e) => setRole(e.target.value)}
                          className={`w-full px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:border-indigo-500 transition-all ${isDark ? 'bg-[#070c1a] border-[#1e2a45] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                            }`}
                        >
                          <option value="employee">Employee</option>
                          <option value="admin">Facility Admin</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">Password</label>
                      <div className="relative">
                        <Lock size={16} className="absolute left-3.5 top-3 text-slate-500" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="At least 8 characters"
                          required
                          className={`w-full pl-10 pr-10 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:border-indigo-500 transition-all ${isDark ? 'bg-[#070c1a] border-[#1e2a45] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                            }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">Confirm Password</label>
                      <div className="relative">
                        <Lock size={16} className="absolute left-3.5 top-3 text-slate-500" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          placeholder="Confirm your password"
                          required
                          className={`w-full pl-10 pr-4 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:border-indigo-500 transition-all ${isDark ? 'bg-[#070c1a] border-[#1e2a45] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                            }`}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all mt-2"
                    >
                      <span>Create Account & Sign In</span>
                      <ArrowRight size={16} />
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Bottom Terms & Privacy Disclaimer Footer */}
            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800/80 text-center text-[0.7rem] text-slate-500">
              <p>
                By continuing, you agree to our{' '}
                <a href="#terms" onClick={(e) => { e.preventDefault(); alert("Apexon Workplace Terms of Service"); }} className="text-indigo-500 font-semibold hover:underline">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#privacy" onClick={(e) => { e.preventDefault(); alert("Apexon Workplace Privacy Policy"); }} className="text-indigo-500 font-semibold hover:underline">
                  Privacy Policy
                </a>.
              </p>
            </div>
          </div>

        </div>
      </main>

      {/* Footer copyright bar */}
      <footer className="text-center text-[0.7rem] text-slate-500 py-2">
        Workplace Hub Operations Platform © 2026 • Enterprise Single Sign-On Enabled
      </footer>
    </div>
  );
}
