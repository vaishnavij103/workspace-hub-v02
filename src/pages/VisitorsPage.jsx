import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import { useTheme } from '../ThemeContext';
import { useLocation } from '../LocationContext';
import {
  getVisitors, createVisitor, checkInVisitor, checkOutVisitor, deleteVisitor, getUsers
} from '../api';
import {
  UserCheck, UserPlus, Search, QrCode, ShieldCheck, Clock,
  Calendar, Building2, Phone, Mail, CheckCircle, XCircle, LogOut, Download
} from 'lucide-react';

export default function VisitorsPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { location } = useLocation();

  const [visitors, setVisitors] = useState([]);
  const [hosts, setHosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showRegModal, setShowRegModal] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState(null);

  // Form State for Visitor Pre-Registration / Quick Check-In
  const [formName, setFormName] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formHostId, setFormHostId] = useState('');
  const [formPurpose, setFormPurpose] = useState('Business Meeting');
  const [formTime, setFormTime] = useState('10:00 AM');
  const [formInstant, setFormInstant] = useState(false);
  const [formNda, setFormNda] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [visList, usrList] = await Promise.all([
        getVisitors({ location }),
        getUsers()
      ]);
      setVisitors(visList || []);
      setHosts(usrList || []);
      if (usrList && usrList.length > 0 && !formHostId) {
        setFormHostId(usrUser => usrUser || usrList[0].user_id);
      }
    } catch (err) {
      console.error('Failed to load visitor data:', err);
    } finally {
      setLoading(false);
    }
  }, [location, formHostId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!formName || !formCompany) return;
    setSubmitting(true);
    try {
      await createVisitor({
        visitor_name: formName,
        company: formCompany,
        email: formEmail,
        phone: formPhone,
        host_id: formHostId || user?.user_id,
        location,
        purpose: formPurpose,
        expected_time: formTime,
        instant_checkin: formInstant,
        nda_signed: formNda
      });
      setShowRegModal(false);
      // Reset
      setFormName('');
      setFormCompany('');
      setFormEmail('');
      setFormPhone('');
      loadData();
    } catch (err) {
      alert(err.detail || err.message || 'Failed to register visitor');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckIn = async (visitorId) => {
    try {
      await checkInVisitor(visitorId);
      loadData();
    } catch (err) {
      alert(err.message || 'Check-in failed');
    }
  };

  const handleCheckOut = async (visitorId) => {
    try {
      await checkOutVisitor(visitorId);
      loadData();
    } catch (err) {
      alert(err.message || 'Check-out failed');
    }
  };

  const handleCancel = async (visitorId) => {
    if (!confirm('Are you sure you want to cancel this visitor registration?')) return;
    try {
      await deleteVisitor(visitorId);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to cancel');
    }
  };

  // Filtered List
  const filteredVisitors = visitors.filter(v => {
    if (filterStatus !== 'all' && v.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        v.visitor_name.toLowerCase().includes(q) ||
        v.company.toLowerCase().includes(q) ||
        v.badge_code.toLowerCase().includes(q) ||
        v.host_name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const expectedCount = visitors.filter(v => v.status === 'expected').length;
  const checkedInCount = visitors.filter(v => v.status === 'checked_in').length;
  const completedCount = visitors.filter(v => v.status === 'checked_out').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
              VisiFlow Operations
            </span>
            <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              Location: {location}
            </span>
          </div>
          <h1 className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Visitor Access & Security Hub
          </h1>
          <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Digital guest check-in, host notifications, automated badge generation, and security NDA logs.
          </p>
        </div>

        <button
          onClick={() => setShowRegModal(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium shadow-lg shadow-indigo-500/20 transition duration-200"
        >
          <UserPlus size={18} />
          <span>Invite</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-5 rounded-2xl border ${theme === 'dark' ? 'bg-[#0f1420] border-[#1e2a45]' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Expected Today</p>
              <h3 className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}>{expectedCount}</h3>
            </div>
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Clock size={22} />
            </div>
          </div>
        </div>

        <div className={`p-5 rounded-2xl border ${theme === 'dark' ? 'bg-[#0f1420] border-[#1e2a45]' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Currently On-Site</p>
              <h3 className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>{checkedInCount}</h3>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
              <UserCheck size={22} />
            </div>
          </div>
        </div>

        <div className={`p-5 rounded-2xl border ${theme === 'dark' ? 'bg-[#0f1420] border-[#1e2a45]' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Completed Visits</p>
              <h3 className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}>{completedCount}</h3>
            </div>
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
              <CheckCircle size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row gap-4 justify-between items-center ${theme === 'dark' ? 'bg-[#0f1420] border-[#1e2a45]' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {['all', 'expected', 'checked_in', 'checked_out'].map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium capitalize transition whitespace-nowrap ${filterStatus === st
                ? 'bg-indigo-600 text-white shadow-md'
                : theme === 'dark'
                  ? 'text-slate-400 hover:bg-slate-800'
                  : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              {st === 'all' ? 'All Visitors' : st.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search visitor, company, badge..."
            className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs border outline-none transition ${theme === 'dark'
              ? 'bg-[#0a0e17] border-[#1e2a45] text-white focus:border-indigo-500'
              : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'
              }`}
          />
        </div>
      </div>

      {/* Visitors List Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-500">Loading visitor records...</div>
      ) : filteredVisitors.length === 0 ? (
        <div className={`p-12 text-center rounded-2xl border ${theme === 'dark' ? 'bg-[#0f1420] border-[#1e2a45] text-slate-400' : 'bg-white border-slate-200 text-slate-500'}`}>
          <UserCheck size={48} className="mx-auto mb-3 opacity-30 text-indigo-400" />
          <p className="font-semibold text-base">No visitors found for {location}</p>
          <p className="text-xs mt-1 opacity-70">Pre-register guests or change your filter options above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVisitors.map(visitor => (
            <div
              key={visitor.visitor_id}
              className={`p-5 rounded-2xl border transition hover:shadow-lg flex flex-col justify-between ${theme === 'dark' ? 'bg-[#0f1420] border-[#1e2a45]' : 'bg-white border-slate-200 shadow-sm'
                }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="font-mono text-[0.65rem] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {visitor.badge_code}
                    </span>
                    <h3 className={`text-base font-bold mt-1.5 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {visitor.visitor_name}
                    </h3>
                    <p className={`text-xs font-medium ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}>
                      {visitor.company}
                    </p>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[0.65rem] font-semibold capitalize ${visitor.status === 'checked_in'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : visitor.status === 'expected'
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      : visitor.status === 'checked_out'
                        ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}>
                    {visitor.status.replace('_', ' ')}
                  </span>
                </div>

                <div className={`space-y-1.5 text-xs ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                  <div className="flex items-center gap-2">
                    <Building2 size={14} className="text-slate-400 flex-shrink-0" />
                    <span>Host: <strong className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>{visitor.host_name}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-slate-400 flex-shrink-0" />
                    <span>Date: {visitor.visit_date} ({visitor.expected_time})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={14} className="text-slate-400 flex-shrink-0" />
                    <span>Purpose: {visitor.purpose}</span>
                  </div>
                  {visitor.email && (
                    <div className="flex items-center gap-2">
                      <Mail size={14} className="text-slate-400 flex-shrink-0" />
                      <span className="truncate">{visitor.email}</span>
                    </div>
                  )}
                  {visitor.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-slate-400 flex-shrink-0" />
                      <span>{visitor.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Toolbar */}
              <div className={`mt-4 pt-3 border-t flex items-center justify-between gap-2 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'}`}>
                <button
                  onClick={() => setSelectedVisitor(visitor)}
                  className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition ${theme === 'dark' ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                >
                  <QrCode size={14} />
                  <span>Digital Pass</span>
                </button>

                <div className="flex items-center gap-1.5">
                  {visitor.status === 'expected' && (
                    <button
                      onClick={() => handleCheckIn(visitor.visitor_id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition"
                    >
                      Check In
                    </button>
                  )}

                  {visitor.status === 'checked_in' && (
                    <button
                      onClick={() => handleCheckOut(visitor.visitor_id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-600 hover:bg-purple-500 text-white transition flex items-center gap-1"
                    >
                      <LogOut size={13} />
                      <span>Check Out</span>
                    </button>
                  )}

                  {visitor.status === 'expected' && (
                    <button
                      onClick={() => handleCancel(visitor.visitor_id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 transition"
                      title="Cancel Registration"
                    >
                      <XCircle size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Register Visitor Modal */}
      {showRegModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-lg p-6 rounded-2xl border shadow-2xl space-y-4 ${theme === 'dark' ? 'bg-[#0f1420] border-[#1e2a45] text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-700">
              <div className="flex items-center gap-2">
                <UserPlus className="text-indigo-500" size={20} />
                <h2 className="text-lg font-bold">VisiFlow Visitor Pre-Registration</h2>
              </div>
              <button onClick={() => setShowRegModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleRegister} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium mb-1 opacity-80">Visitor Full Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. Sarah Connor"
                  className={`w-full px-3 py-2 rounded-xl border outline-none ${theme === 'dark' ? 'bg-[#0a0e17] border-[#1e2a45]' : 'bg-slate-50 border-slate-200'
                    }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1 opacity-80">Organization / Company *</label>
                  <input
                    type="text"
                    required
                    value={formCompany}
                    onChange={e => setFormCompany(e.target.value)}
                    placeholder="e.g. Google Cloud"
                    className={`w-full px-3 py-2 rounded-xl border outline-none ${theme === 'dark' ? 'bg-[#0a0e17] border-[#1e2a45]' : 'bg-slate-50 border-slate-200'
                      }`}
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 opacity-80">Phone Number</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={e => setFormPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className={`w-full px-3 py-2 rounded-xl border outline-none ${theme === 'dark' ? 'bg-[#0a0e17] border-[#1e2a45]' : 'bg-slate-50 border-slate-200'
                      }`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1 opacity-80">Email Address</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={e => setFormEmail(e.target.value)}
                  placeholder="sarah@example.com"
                  className={`w-full px-3 py-2 rounded-xl border outline-none ${theme === 'dark' ? 'bg-[#0a0e17] border-[#1e2a45]' : 'bg-slate-50 border-slate-200'
                    }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1 opacity-80">Apexon Host</label>
                  <select
                    value={formHostId}
                    onChange={e => setFormHostId(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border outline-none ${theme === 'dark' ? 'bg-[#0a0e17] border-[#1e2a45]' : 'bg-slate-50 border-slate-200'
                      }`}
                  >
                    {hosts.map(h => (
                      <option key={h.user_id} value={h.user_id}>
                        {h.name} ({h.department})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1 opacity-80">Expected Arrival Time</label>
                  <input
                    type="text"
                    value={formTime}
                    onChange={e => setFormTime(e.target.value)}
                    placeholder="10:30 AM"
                    className={`w-full px-3 py-2 rounded-xl border outline-none ${theme === 'dark' ? 'bg-[#0a0e17] border-[#1e2a45]' : 'bg-slate-50 border-slate-200'
                      }`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1 opacity-80">Purpose of Visit</label>
                <input
                  type="text"
                  value={formPurpose}
                  onChange={e => setFormPurpose(e.target.value)}
                  placeholder="e.g. Executive Meeting & Product Demo"
                  className={`w-full px-3 py-2 rounded-xl border outline-none ${theme === 'dark' ? 'bg-[#0a0e17] border-[#1e2a45]' : 'bg-slate-50 border-slate-200'
                    }`}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formInstant}
                    onChange={e => setFormInstant(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Check In Instantly (At Desk)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formNda}
                    onChange={e => setFormNda(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Visitor NDA Signed</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowRegModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
                >
                  {submitting ? 'Registering...' : 'Complete Pre-Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Digital Pass Drawer / Modal */}
      {selectedVisitor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className={`w-full max-w-sm p-6 rounded-3xl border shadow-2xl text-center space-y-4 relative overflow-hidden ${theme === 'dark' ? 'bg-[#0f1420] border-[#1e2a45] text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <button
              onClick={() => setSelectedVisitor(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              ✕
            </button>

            <div className="inline-flex p-3 rounded-full bg-indigo-500/10 text-indigo-400 mb-1">
              <QrCode size={32} />
            </div>

            <div>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                {selectedVisitor.badge_code}
              </span>
              <h2 className="text-xl font-bold mt-2">{selectedVisitor.visitor_name}</h2>
              <p className="text-xs text-indigo-400 font-medium">{selectedVisitor.company}</p>
            </div>

            {/* Simulated Digital Pass QR Box */}
            <div className="p-4 rounded-2xl bg-white text-slate-900 border border-slate-300 mx-auto w-48 h-48 flex flex-col items-center justify-center shadow-inner">
              <div className="w-36 h-36 border-4 border-slate-900 rounded-lg flex items-center justify-center p-2 relative">
                <div className="w-full h-full border-2 border-dashed border-slate-800 flex items-center justify-center font-mono text-[0.6rem] text-center font-bold">
                  APEXON VISIFLOW<br />DIGITAL PASS<br />{selectedVisitor.badge_code}
                </div>
              </div>
            </div>

            <div className="text-xs space-y-1 opacity-80">
              <p>Location: <strong>{selectedVisitor.location}</strong></p>
              <p>Host: <strong>{selectedVisitor.host_name}</strong></p>
              <p>Date: {selectedVisitor.visit_date} ({selectedVisitor.expected_time})</p>
              <p>NDA Status: {selectedVisitor.nda_signed ? '✅ Agreed & Signed' : '⚠️ Pending Sign'}</p>
            </div>

            <button
              onClick={() => {
                alert(`Digital Badge ${selectedVisitor.badge_code} downloaded to printable PDF wallet format!`);
                setSelectedVisitor(null);
              }}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center justify-center gap-2"
            >
              <Download size={14} />
              <span>Download Digital Badge</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
