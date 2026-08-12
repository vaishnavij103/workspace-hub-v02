import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useTheme } from '../ThemeContext';
import { useLocation } from '../LocationContext';
import {
  getRooms, getVisitors, getParkingSlots,
  getWorkstations, getAdminContacts, createBooking, checkInVisitor
} from '../api';
import { format } from 'date-fns';
import {
  Building2, Calendar, MapPin, ArrowRight, Phone,
  UserCheck, Car, Monitor, ShieldCheck, FileText
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { theme } = useTheme();
  const { location } = useLocation();

  const [rooms, setRooms] = useState([]);
  const [workstations, setWorkstations] = useState([]);
  const [visitors, setVisitors] = useState([]);
  const [parkingSlots, setParkingSlots] = useState([]);
  const [adminContacts, setAdminContacts] = useState([]);

  // Quick Room Booking state
  const [selectedRoom, setSelectedRoom] = useState('');
  const [bookingTitle, setBookingTitle] = useState('');
  const [bookingDate, setBookingDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [bookingStart, setBookingStart] = useState('10:00');
  const [bookingEnd, setBookingEnd] = useState('11:00');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [rm, ws, pk, adm] = await Promise.all([
        getRooms({ location }),
        getWorkstations({ location, date: format(new Date(), 'yyyy-MM-dd') }),
        getParkingSlots({ location }),
        getAdminContacts({ location })
      ]);
      setRooms(rm || []);
      setWorkstations(ws || []);
      setParkingSlots(pk || []);
      setAdminContacts(adm || []);

      if (rm && rm.length > 0 && !selectedRoom) {
        setSelectedRoom(rm[0].room_id);
      }

      if (isAdmin) {
        const vis = await getVisitors({ location }).catch(() => []);
        setVisitors(vis || []);
      }
    } catch {
      // ignore
    }
  }, [location, selectedRoom, isAdmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleQuickBook = async (e) => {
    e.preventDefault();
    if (!selectedRoom) return;
    setBookingSubmitting(true);
    try {
      const startIso = `${bookingDate}T${bookingStart}:00`;
      const endIso = `${bookingDate}T${bookingEnd}:00`;

      await createBooking({
        room_id: selectedRoom,
        user_id: user?.user_id,
        title: bookingTitle || 'Quick Workspace Sync',
        start_time: startIso,
        end_time: endIso,
        meeting_type: 'Internal Meeting'
      });
      setBookingTitle('');
      alert('Room booking confirmed successfully!');
      loadData();
    } catch (err) {
      alert(err.detail || err.message || 'Failed to book room');
    } finally {
      setBookingSubmitting(false);
    }
  };

  const handleVisitorCheckIn = async (visId) => {
    try {
      await checkInVisitor(visId);
      loadData();
    } catch {
      alert('Check-in failed');
    }
  };

  const cityRooms = useMemo(() => rooms.filter(r => r.location.toLowerCase() === location.toLowerCase()), [rooms, location]);
  const availableWorkstations = useMemo(() => workstations.filter(w => !w.is_booked), [workstations]);
  const todayVisitors = useMemo(() => visitors.filter(v => v.visit_date === format(new Date(), 'yyyy-MM-dd')), [visitors]);
  const availableParkingCount = useMemo(() => parkingSlots.filter(s => s.status === 'available').length, [parkingSlots]);

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome & Workplace Hub Header */}
      <div className={`p-6 md:p-8 rounded-3xl border relative overflow-hidden ${
        theme === 'dark'
          ? 'bg-gradient-to-r from-indigo-950/40 via-[#0a0f24] to-[#0d1530] border-indigo-500/20 shadow-2xl'
          : 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white shadow-xl'
      }`}>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-white/10 backdrop-blur-md border border-white/20 text-indigo-200">
                Apexon Operations Hub
              </span>
              <span className="flex items-center gap-1 text-xs text-indigo-200 font-medium">
                <MapPin size={14} />
                {location} Operations
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[0.68rem] font-extrabold uppercase bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                Role: {user?.role === 'super_admin' ? 'Super Admin' : user?.role === 'admin_location' ? 'Location Admin' : 'Employee'}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.name || 'Employee'}! 👋
            </h1>
            <p className="text-sm opacity-90 max-w-2xl font-light">
              Your central platform for RoomBook meeting spaces, Workstation desk booking, ParkSwift parking, and VisiFlow visitor management.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => navigate('/bookings')}
              className="px-4 py-2.5 rounded-xl bg-white text-indigo-900 font-bold text-xs hover:bg-indigo-50 transition shadow-md flex items-center gap-2"
            >
              <Calendar size={16} />
              <span>Book Meeting Room</span>
            </button>
            <button
              onClick={() => navigate('/workstations')}
              className="px-4 py-2.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-white font-semibold text-xs border border-white/20 transition backdrop-blur-md flex items-center gap-2"
            >
              <Monitor size={16} />
              <span>Book Workstation</span>
            </button>
          </div>
        </div>
      </div>

      {/* Module Quick Launch Cards (4 Apps) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Apexon RoomBook */}
        <div
          onClick={() => navigate('/bookings')}
          className={`p-5 rounded-2xl border transition-all hover:-translate-y-1 cursor-pointer group ${
            theme === 'dark' ? 'bg-[#0f1420] border-[#1e2a45] hover:border-indigo-500/50' : 'bg-white border-slate-200 hover:border-indigo-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition">
              <Building2 size={24} />
            </div>
            <span className="text-[0.65rem] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400">
              {cityRooms.length} Spaces
            </span>
          </div>
          <h3 className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            RoomBook
          </h3>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2">
            Meeting rooms, VC equipment, cabins, and calendar slot reservations.
          </p>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-indigo-400 group-hover:underline">
            <span>Book Meeting Room</span>
            <ArrowRight size={14} />
          </div>
        </div>

        {/* Workstation Management */}
        <div
          onClick={() => navigate('/workstations')}
          className={`p-5 rounded-2xl border transition-all hover:-translate-y-1 cursor-pointer group ${
            theme === 'dark' ? 'bg-[#0f1420] border-[#1e2a45] hover:border-purple-500/50' : 'bg-white border-slate-200 hover:border-purple-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 group-hover:scale-110 transition">
              <Monitor size={24} />
            </div>
            <span className="text-[0.65rem] font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400">
              {availableWorkstations.length} Available
            </span>
          </div>
          <h3 className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Workstations
          </h3>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2">
            Reserve hot desks and executive bays (e.g. IT07 WS 74) with amenities.
          </p>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-purple-400 group-hover:underline">
            <span>Reserve Workstation</span>
            <ArrowRight size={14} />
          </div>
        </div>

        {/* ParkSwift */}
        <div
          onClick={() => navigate('/parking')}
          className={`p-5 rounded-2xl border transition-all hover:-translate-y-1 cursor-pointer group ${
            theme === 'dark' ? 'bg-[#0f1420] border-[#1e2a45] hover:border-cyan-500/50' : 'bg-white border-slate-200 hover:border-cyan-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition">
              <Car size={24} />
            </div>
            <span className="text-[0.65rem] font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400">
              {availableParkingCount} Free Slots
            </span>
          </div>
          <h3 className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            ParkSwift
          </h3>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2">
            Smart slot booking, EV charging bays, vehicle passes & barrier access.
          </p>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-cyan-400 group-hover:underline">
            <span>Parking Map</span>
            <ArrowRight size={14} />
          </div>
        </div>

        {/* VisiFlow / Admin Invoices */}
        <div
          onClick={() => navigate(isAdmin ? '/visitors' : '/helpdesk')}
          className={`p-5 rounded-2xl border transition-all hover:-translate-y-1 cursor-pointer group ${
            theme === 'dark' ? 'bg-[#0f1420] border-[#1e2a45] hover:border-emerald-500/50' : 'bg-white border-slate-200 hover:border-emerald-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition">
              {isAdmin ? <UserCheck size={24} /> : <FileText size={24} />}
            </div>
            <span className="text-[0.65rem] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
              {isAdmin ? `${todayVisitors.length} Visitors` : 'Support'}
            </span>
          </div>
          <h3 className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            {isAdmin ? 'VisiFlow Access' : 'Helpdesk Support'}
          </h3>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2">
            {isAdmin ? 'Visitor check-in, digital badges & NDA compliance.' : 'Submit facility requests and track support tickets.'}
          </p>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-emerald-400 group-hover:underline">
            <span>Open {isAdmin ? 'VisiFlow' : 'Helpdesk'}</span>
            <ArrowRight size={14} />
          </div>
        </div>
      </div>

      {/* Main Grid: Quick Room Booking & Live Operations Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Instant Room Booking */}
        <div className={`p-6 rounded-3xl border ${theme === 'dark' ? 'bg-[#0f1420] border-[#1e2a45]' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-4 border-b pb-3 border-slate-800">
            <Building2 className="text-indigo-400" size={20} />
            <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Instant Room Reservation
            </h2>
          </div>

          <form onSubmit={handleQuickBook} className="space-y-4 text-xs">
            <div>
              <label className="block font-medium mb-1 text-slate-400">Select Meeting Space ({location})</label>
              <select
                value={selectedRoom}
                onChange={e => setSelectedRoom(e.target.value)}
                className={`w-full px-3 py-2.5 rounded-xl border outline-none font-medium ${
                  theme === 'dark' ? 'bg-[#0a0e17] border-[#1e2a45] text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              >
                {cityRooms.length === 0 ? (
                  <option value="">No rooms available in {location}</option>
                ) : (
                  cityRooms.map(r => (
                    <option key={r.room_id} value={r.room_id}>
                      {r.name} (Cap: {r.capacity} · Floor {r.floor})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block font-medium mb-1 text-slate-400">Meeting Title</label>
              <input
                type="text"
                value={bookingTitle}
                onChange={e => setBookingTitle(e.target.value)}
                placeholder="e.g. Sprint Sync & Architecture"
                className={`w-full px-3 py-2.5 rounded-xl border outline-none ${
                  theme === 'dark' ? 'bg-[#0a0e17] border-[#1e2a45] text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium mb-1 text-slate-400">Date</label>
                <input
                  type="date"
                  value={bookingDate}
                  onChange={e => setBookingDate(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border outline-none ${
                    theme === 'dark' ? 'bg-[#0a0e17] border-[#1e2a45] text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block font-medium mb-1 text-slate-400">Time Range</label>
                <div className="flex items-center gap-1">
                  <input
                    type="time"
                    value={bookingStart}
                    onChange={e => setBookingStart(e.target.value)}
                    className={`w-1/2 px-2 py-2 rounded-xl border outline-none text-center ${
                      theme === 'dark' ? 'bg-[#0a0e17] border-[#1e2a45] text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                  <span>-</span>
                  <input
                    type="time"
                    value={bookingEnd}
                    onChange={e => setBookingEnd(e.target.value)}
                    className={`w-1/2 px-2 py-2 rounded-xl border outline-none text-center ${
                      theme === 'dark' ? 'bg-[#0a0e17] border-[#1e2a45] text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={bookingSubmitting || cityRooms.length === 0}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold transition shadow-lg shadow-indigo-500/20"
            >
              {bookingSubmitting ? 'Reserving...' : 'Confirm Instant Booking'}
            </button>
          </form>

          {/* Admin Hotline Card */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Phone size={14} className="text-indigo-400" />
              <span>{location} Facilities Admin Contact</span>
            </h4>
            {adminContacts.length === 0 ? (
              <p className="text-xs text-slate-500">No contact hotline registered for {location}</p>
            ) : (
              <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/15 text-xs space-y-1">
                <p className="font-bold text-indigo-400">{adminContacts[0].name}</p>
                <p className="text-slate-300">📞 {adminContacts[0].phone}</p>
                <p className="text-slate-400 text-[0.7rem]">✉️ {adminContacts[0].email}</p>
              </div>
            )}
          </div>
        </div>

        {/* Live Operations Feed */}
        <div className="lg:col-span-2 space-y-6">
          {/* Workstations Quick Overview */}
          <div className={`p-6 rounded-3xl border ${theme === 'dark' ? 'bg-[#0f1420] border-[#1e2a45]' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-800">
              <div className="flex items-center gap-2">
                <Monitor className="text-purple-400" size={20} />
                <h2 className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  Workstations in {location} ({workstations.length})
                </h2>
              </div>
              <button
                onClick={() => navigate('/workstations')}
                className="text-xs font-semibold text-purple-400 hover:underline flex items-center gap-1"
              >
                <span>Book Desk</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {workstations.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                No workstations configured for {location} yet. Admins can add workstations from Space Admin or the Workstations page.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                {workstations.slice(0, 6).map(ws => (
                  <div key={ws.workstation_id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
                    <div className="font-extrabold text-indigo-400">{ws.label}</div>
                    <div className="text-[0.7rem] text-slate-400 mt-0.5">Floor {ws.floor} · {ws.type}</div>
                    <div className="mt-2 text-[0.65rem] font-bold text-emerald-400 uppercase">
                      {ws.is_booked ? 'Booked' : 'Available'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* VisiFlow Visitors for Admins */}
          {isAdmin && (
            <div className={`p-6 rounded-3xl border ${theme === 'dark' ? 'bg-[#0f1420] border-[#1e2a45]' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="flex items-center justify-between border-b pb-3 border-slate-800">
                <div className="flex items-center gap-2">
                  <UserCheck className="text-emerald-400" size={20} />
                  <h2 className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    VisiFlow Visitors ({todayVisitors.length})
                  </h2>
                </div>
                <button
                  onClick={() => navigate('/visitors')}
                  className="text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <span>Visitor Portal</span>
                  <ArrowRight size={14} />
                </button>
              </div>

              {todayVisitors.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">No visitors logged today in {location}.</p>
              ) : (
                <div className="divide-y divide-slate-800/60 mt-2">
                  {todayVisitors.slice(0, 3).map(v => (
                    <div key={v.visitor_id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-bold text-white">{v.visitor_name} ({v.company})</div>
                        <p className="text-slate-500 text-[0.7rem]">Host: {v.host_name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[0.65rem] font-bold bg-emerald-500/20 text-emerald-400">
                          {v.status}
                        </span>
                        {v.status === 'expected' && (
                          <button
                            onClick={() => handleVisitorCheckIn(v.visitor_id)}
                            className="px-2 py-0.5 rounded text-[0.65rem] bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                          >
                            Check In
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
