import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../AuthContext';
import { useTheme } from '../ThemeContext';
import { getRooms, getUsers, getBookings, cancelBooking, updateBooking, checkInBooking, checkOutBooking } from '../api';
import { PageHeader, SectionHeader, EmptyState } from '../components/ui';
import RoomCard from '../components/RoomCard';
import SlotPicker from '../components/SlotPicker';
import BookingCard from '../components/BookingCard';
import { useLocation } from "../LocationContext";

const TIME_OPTIONS = Array.from({ length: 49 }).map((_, i) => {
  const hr = Math.floor(i / 4) + 8;
  const min = (i % 4) * 15;
  const ampm = hr < 12 ? 'AM' : 'PM';
  const hr12 = hr === 12 ? 12 : hr % 12;
  const hr24 = hr.toString().padStart(2, '0');
  const minStr = min.toString().padStart(2, '0');
  return {
    value: `${hr24}:${minStr}`,
    label: `${hr12.toString().padStart(2, '0')}:${minStr} ${ampm}`
  };
});

export default function BookingsPage() {
  const { location } = useLocation();
  const { user, isAdmin } = useAuth();
  const { theme } = useTheme();
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Room selection for booking
  const [selectedRoom, setSelectedRoom] = useState(null);

  // Cancel confirm
  const [cancelTarget, setCancelTarget] = useState(null);

  // Reschedule
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [rescheduleData, setRescheduleData] = useState({ date: '', start: '', end: '', title: '' });
  const [rescheduleError, setRescheduleError] = useState('');

  // Filters
  const [filterDate, setFilterDate] = useState('');
  const [filterRoom, setFilterRoom] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRoomType, setFilterRoomType] = useState('any');

  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [capacityFilter, setCapacityFilter] = useState("any");
  const [amenityFilters, setAmenityFilters] = useState([]);

  const AMENITIES = [
    "Projector",
    "White board",
    "Board - Pillar",
    "Samsung TV +Yealink Bar+ Yealink Wifi  Network device",
    "Board -Glass Wall",
    "Board -Glass Wall + Samsung TV",
    "White Glass Board",
    "TV/Hdmi Cable",
    "Food and Refreshment",
    "Video Call",
    "TV",
  ];

  const reload = useCallback(() => {
    setLoading(true);
    Promise.all([
      getRooms(),
      getBookings(isAdmin ? {} : { user_id: user?.user_id }),
      isAdmin ? getUsers() : Promise.resolve([user]),
    ])
      .then(([r, b, u]) => { setRooms(r); setBookings(b); setUsers(u); })
      .finally(() => setLoading(false));
  }, [isAdmin, user]);

  // Check‑in / check‑out handlers now live inside the component so they can call `reload`
  const handleCheckIn = async (booking) => {
    try {
      await checkInBooking(booking.booking_id);
      reload();
    } catch (e) {
      alert(e.detail || e.message);
    }
  };

  const handleCheckOut = async (booking) => {
    try {
      await checkOutBooking(booking.booking_id);
      reload();
    } catch (e) {
      alert(e.detail || e.message);
    }
  };

  useEffect(reload, [reload]);


  const cityRooms = useMemo(() => {
    return rooms.filter(r => r.location === location);
  }, [rooms, location]);

  const activeRooms = cityRooms.filter(r => r.status === 'active' || r.status === '');
  const roomMap = Object.fromEntries(cityRooms.map(r => [r.room_id, r.name]));
  const userMap = Object.fromEntries(users.map(u => [u.user_id, u.name]));

  // Filtered bookings
  let filtered = [...bookings];
  if (filterDate) filtered = filtered.filter(b => b.start_time?.slice(0, 10) === filterDate);
  if (filterRoom) filtered = filtered.filter(b => b.room_id === filterRoom);
  if (filterRoomType && filterRoomType !== 'any') filtered = filtered.filter(b => roomMap[b.room_id] && rooms.find(r => r.room_id === b.room_id)?.room_type === filterRoomType);
  if (filterStatus) filtered = filtered.filter(b => b.status === filterStatus);

  const confirmedN = filtered.filter(b => b.status === 'confirmed').length;
  const cancelledN = filtered.filter(b => b.status === 'cancelled').length;

  const handleCancel = async () => {
    if (!cancelTarget) return;
    try {
      await cancelBooking(cancelTarget.booking_id);
      setCancelTarget(null);
      reload();
    } catch (e) {
      alert(e.detail || e.message);
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleTarget) return;
    setRescheduleError('');
    const { date, start, end, title } = rescheduleData;
    if (!date || !start || !end) { setRescheduleError('All fields required.'); return; }
    if (start >= end) { setRescheduleError('End must be after start.'); return; }
    try {
      await updateBooking(rescheduleTarget.booking_id, {
        title: title || rescheduleTarget.title,
        start_time: `${date}T${start}:00`,
        end_time: `${date}T${end}:00`,
      });
      setRescheduleTarget(null);
      reload();
    } catch (e) {
      setRescheduleError(e.detail || e.message);
    }
  };

  if (loading) return <div className="text-center py-20 text-slate-500">Loading...</div>;

  const filteredRooms = activeRooms.filter(room => {
    // Search by name or amenities
    const searchMatch =
      room.name.toLowerCase().includes(search.toLowerCase()) ||
      room.amenities?.some(a =>
        a.toLowerCase().includes(search.toLowerCase())
      );

    // Status
    const statusMatch =
      statusFilter === "all" || room.status === statusFilter;

    // Capacity
    const capacityMatch =
      capacityFilter === "any" ||
      (capacityFilter === "small" && room.capacity <= 4) ||
      (capacityFilter === "medium" && room.capacity >= 5 && room.capacity <= 10) ||
      (capacityFilter === "large" && room.capacity > 10);

    // Room Type
    const typeMatch =
      filterRoomType === 'any' || room.room_type === filterRoomType;

    // Amenities
    const amenityMatch =
      amenityFilters.length === 0 ||
      amenityFilters.every(a => room.amenities?.includes(a));

    return searchMatch && statusMatch && capacityMatch && typeMatch && amenityMatch;
  });

  return (
    <div className="animate-fade-up">
      <PageHeader title="📅 Book a Room" subtitle="Select a room, pick a time slot, and confirm your booking" />


      {/* Room Cards Grid */}
      <div className="flex gap-6">

        {/* Filters Sidebar */}
        <div className={`w-[260px] shrink-0 p-4 rounded-2xl ${theme === 'dark'
          ? 'bg-gradient-to-br from-[#0f1420] to-[#161c2e] border-[#1e2a45]'
          : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200'
          } border`}>

          <div className="flex items-center justify-between mb-4">
            <span className={`font-bold ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}>⚙ Filters</span>
            <button
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setCapacityFilter("any");
                setAmenityFilters([]);
              }}
              className={`text-xs ${theme === 'dark' ? 'text-slate-400 hover:text-rose-400' : 'text-slate-600 hover:text-rose-600'}`}
            >
              Reset
            </button>
          </div>

          {/* Search */}
          <div className="mb-4 relative">
            <label className={`block text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'} mb-1`}>SEARCH</label>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
              placeholder="Name or feature..."
              className={`w-full px-3 py-2 rounded-xl ${theme === 'dark'
                ? 'bg-[#0a0f1e] border-[#1e2a45] text-slate-100'
                : 'bg-white border-gray-300 text-slate-900'
                } border text-sm`}
            />
            {/* Room dropdown */}
            {(searchFocused || search) && (
              <div className={`absolute top-full mt-1 w-full rounded-xl border shadow-lg z-10 ${theme === 'dark'
                ? 'bg-[#0a0f1e] border-[#1e2a45]'
                : 'bg-white border-gray-300'
                } max-h-48 overflow-y-auto`}>
                {activeRooms
                  .filter(room =>
                    search === '' || room.name.toLowerCase().includes(search.toLowerCase())
                  )
                  .map(room => (
                    <button
                      key={room.room_id}
                      onClick={() => {
                        setSearch(room.name);
                        setSearchFocused(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-indigo-500/10 transition-colors ${theme === 'dark'
                        ? 'text-slate-200 hover:text-indigo-300'
                        : 'text-slate-800 hover:text-indigo-600'
                        }`}
                    >
                      {room.name}
                    </button>
                  ))
                }
                {activeRooms.filter(room =>
                  search === '' || room.name.toLowerCase().includes(search.toLowerCase())
                ).length === 0 && (
                    <div className={`px-3 py-2 text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                      No rooms found
                    </div>
                  )}
              </div>
            )}
          </div>

          {/* Status */}
          <div className="mb-4">
            <label className={`block text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'} mb-1`}>STATUS</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl ${theme === 'dark'
                ? 'bg-[#0a0f1e] border-[#1e2a45] text-slate-100'
                : 'bg-white border-gray-300 text-slate-900'
                } border text-sm`}
            >
              <option value="all">All Statuses</option>
              <option value="active">Available</option>
              <option value="inactive">Unavailable</option>
            </select>
          </div>

          {/* Capacity */}
          <div className="mb-4">
            <label className={`block text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'} mb-1`}>CAPACITY</label>
            <select
              value={capacityFilter}
              onChange={e => setCapacityFilter(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl ${theme === 'dark'
                ? 'bg-[#0a0f1e] border-[#1e2a45] text-slate-100'
                : 'bg-white border-gray-300 text-slate-900'
                } border text-sm`}
            >
              <option value="any">Any</option>
              <option value="small">1–4</option>
              <option value="medium">5–10</option>
              <option value="large">10+</option>
            </select>
          </div>

          {/* Amenities */}
          <div>
            <label className={`block text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'} mb-2`}>AMENITIES</label>
            <div className="space-y-2">
              {AMENITIES.map(a => (
                <label key={a} className={`flex items-center gap-2 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  <input
                    type="checkbox"
                    checked={amenityFilters.includes(a)}
                    onChange={() =>
                      setAmenityFilters(prev =>
                        prev.includes(a)
                          ? prev.filter(x => x !== a)
                          : [...prev, a]
                      )
                    }
                  />
                  {a}
                </label>
              ))}
            </div>
          </div>
        </div>



        {/* Room Cards Grid */}
        <div className="flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-2">
            {filteredRooms.map(room => (
              <RoomCard
                key={room.room_id}
                room={room}
                selected={selectedRoom?.room_id === room.room_id}
                canBook={(room.allowed_users?.length || 0) === 0 || isAdmin || (user && (room.allowed_users || []).includes(user.user_id))}
                onSelect={r =>
                  setSelectedRoom(
                    selectedRoom?.room_id === r.room_id ? null : r
                  )
                }
              />
            ))}
          </div>

          {filteredRooms.length === 0 && (
            <EmptyState icon="🔍" text="No rooms match the filters." />
          )}
        </div>

      </div>

      {activeRooms.length === 0 && <EmptyState icon="🏗️" text="No active rooms available." />}

      {/* Slot Picker */}
      {selectedRoom && (
        <SlotPicker
          room={selectedRoom}
          onBooked={() => { setSelectedRoom(null); reload(); }}
          onClose={() => setSelectedRoom(null)}
        />
      )}

      {/* Divider */}
      <div className="mt-8 mb-6">
        <div className="h-px bg-gradient-to-r from-transparent via-[#1e2a45] to-transparent" />
      </div>

      <SectionHeader title={isAdmin ? '📋 All Bookings' : '📋 My Bookings'} />

      {/* Cancel Confirm Dialog */}
      {cancelTarget && (
        <div className={`mb-4 p-4 rounded-2xl animate-fade-in border ${theme === 'dark' ? 'bg-rose-500/5 border-rose-500/20' : 'bg-rose-50 border-rose-200'}`}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-lg">⚠️</span>
            <span className={`text-sm ${theme === 'dark' ? 'text-rose-300' : 'text-rose-700'}`}>Cancel booking "{cancelTarget.title}"?</span>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCancel}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${theme === 'dark' ? 'bg-rose-500/15 border-rose-500/25 text-rose-400 hover:bg-rose-500/25' : 'bg-rose-100 border-rose-300 text-rose-700 hover:bg-rose-200'}`}>
              ✅ Yes, cancel
            </button>
            <button onClick={() => setCancelTarget(null)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${theme === 'dark' ? 'border-[#1e2a45] text-slate-400 hover:border-slate-500' : 'border-gray-300 text-slate-600 hover:border-gray-400'}`}>
              ✖ No
            </button>
          </div>
        </div>
      )}

      {/* Reschedule Form */}
      {rescheduleTarget && (
        <div className={`mb-4 p-5 rounded-2xl border animate-fade-in ${theme === 'dark' ? 'bg-gradient-to-br from-[#0f1420] to-[#161c2e] border-indigo-500/20' : 'bg-gradient-to-br from-indigo-50 to-white border-indigo-200 shadow-sm'}`}>
          <datalist id="time-options-reschedule">
            {TIME_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </datalist>
          <div className={`text-sm font-bold mb-3 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>🔄 Reschedule: {rescheduleTarget.title}</div>
          {rescheduleError && (
            <div className={`mb-3 px-4 py-2 rounded-xl border text-sm ${theme === 'dark' ? 'bg-rose-500/8 border-rose-500/20 text-rose-400' : 'bg-rose-100 border-rose-300 text-rose-700'}`}>❌ {rescheduleError}</div>
          )}
          <div className="grid grid-cols-4 gap-3 mb-3">
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>Title</label>
              <input type="text" value={rescheduleData.title} onChange={e => setRescheduleData(d => ({ ...d, title: e.target.value }))}
                placeholder={rescheduleTarget.title}
                className={`w-full px-3 py-2 rounded-xl text-sm outline-none border focus:border-indigo-500 transition-all ${theme === 'dark' ? 'bg-[#0a0f1e] border-[#1e2a45] text-slate-100' : 'bg-white border-gray-300 text-slate-900'}`} />
            </div>
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>Date</label>
              <input type="date" value={rescheduleData.date} onChange={e => setRescheduleData(d => ({ ...d, date: e.target.value }))}
                className={`w-full px-3 py-2 rounded-xl text-sm outline-none border focus:border-indigo-500 transition-all ${theme === 'dark' ? 'bg-[#0a0f1e] border-[#1e2a45] text-slate-100' : 'bg-white border-gray-300 text-slate-900'}`} />
            </div>
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>Start</label>
              <input type="time" list="time-options-reschedule" required value={rescheduleData.start} onChange={e => setRescheduleData(d => ({ ...d, start: e.target.value }))}
                className={`w-full px-3 py-2 rounded-xl text-sm outline-none border focus:border-indigo-500 transition-all cursor-pointer ${theme === 'dark' ? 'bg-[#0a0f1e] border-[#1e2a45] text-slate-100' : 'bg-white border-gray-300 text-slate-900'}`} />
            </div>
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>End</label>
              <input type="time" list="time-options-reschedule" required value={rescheduleData.end} onChange={e => setRescheduleData(d => ({ ...d, end: e.target.value }))}
                className={`w-full px-3 py-2 rounded-xl text-sm outline-none border focus:border-indigo-500 transition-all cursor-pointer ${theme === 'dark' ? 'bg-[#0a0f1e] border-[#1e2a45] text-slate-100' : 'bg-white border-gray-300 text-slate-900'}`} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleReschedule}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-bold hover:from-indigo-600 hover:to-purple-600 transition-all">
              💾 Save
            </button>
            <button onClick={() => setRescheduleTarget(null)}
              className={`px-4 py-2 rounded-xl border text-sm transition-all ${theme === 'dark' ? 'border-[#1e2a45] text-slate-400 hover:border-rose-500 hover:text-rose-400' : 'border-gray-300 text-slate-600 hover:border-rose-500 hover:text-rose-600'}`}>
              ✖ Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div>
          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs outline-none border focus:border-indigo-500 transition-all ${theme === 'dark' ? 'bg-[#0a0f1e] border-[#1e2a45] text-slate-100' : 'bg-white border-gray-300 text-slate-900'}`} />
        </div>
        <select value={filterRoom} onChange={e => setFilterRoom(e.target.value)}
          className={`px-3 py-2 rounded-xl text-xs outline-none border focus:border-indigo-500 transition-all ${theme === 'dark' ? 'bg-[#0a0f1e] border-[#1e2a45] text-slate-100' : 'bg-white border-gray-300 text-slate-900'}`}>
          <option value="">All Rooms</option>
          {cityRooms.map(r => <option key={r.room_id} value={r.room_id}>{r.name}</option>)}
        </select>
        <select value={filterRoomType} onChange={e => setFilterRoomType(e.target.value)}
          className={`px-3 py-2 rounded-xl text-xs outline-none border focus:border-indigo-500 transition-all ${theme === 'dark' ? 'bg-[#0a0f1e] border-[#1e2a45] text-slate-100' : 'bg-white border-gray-300 text-slate-900'}`}>
          <option value="any">Any Type</option>
          {Array.from(new Set(cityRooms.map(r => r.room_type).filter(Boolean))).map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className={`px-3 py-2 rounded-xl text-xs outline-none border focus:border-indigo-500 transition-all ${theme === 'dark' ? 'bg-[#0a0f1e] border-[#1e2a45] text-slate-100' : 'bg-white border-gray-300 text-slate-900'}`}>
          <option value="">All Status</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        {(filterDate || filterRoom || filterStatus) && (
          <button onClick={() => { setFilterDate(''); setFilterRoom(''); setFilterStatus(''); }}
            className={`px-3 py-2 rounded-xl border text-xs transition-all ${theme === 'dark' ? 'border-[#1e2a45] text-slate-400 hover:text-rose-400 hover:border-rose-500' : 'border-gray-300 text-slate-600 hover:text-rose-600 hover:border-rose-500'}`}>
            ✖ Clear
          </button>
        )}
      </div>

      {/* Summary bar */}
      <div className={`flex gap-6 mb-4 px-4 py-3 rounded-xl border ${theme === 'dark' ? 'bg-[#0f1420] border-[#1e2a45]' : 'bg-gray-50 border-gray-200'}`}>
        <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}><span className={`font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>{filtered.length}</span> results</span>
        <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}><span className="text-emerald-500 font-bold">{confirmedN}</span> confirmed</span>
        <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}><span className="text-rose-500 font-bold">{cancelledN}</span> cancelled</span>
      </div>

      {/* Booking list */}
      {filtered.length === 0 ? (
        <EmptyState icon="📭" text="No bookings found." />
      ) : (
        filtered.map(b => {
          const canModify = isAdmin || b.user_id === user?.user_id;
          return (
            <BookingCard
              key={b.booking_id}
              booking={b}
              roomName={roomMap[b.room_id] || ''}
              userName={userMap[b.user_id] || ''}
              onCancel={canModify ? (bk) => setCancelTarget(bk) : undefined}
              onReschedule={canModify ? (bk) => {
                setRescheduleTarget(bk);
                setRescheduleData({
                  title: bk.title,
                  date: bk.start_time?.slice(0, 10) || '',
                  start: bk.start_time?.slice(11, 16) || '',
                  end: bk.end_time?.slice(11, 16) || '',
                });
                setRescheduleError('');
              } : undefined}
              onCheckIn={canModify ? handleCheckIn : undefined}
              onCheckOut={canModify ? handleCheckOut : undefined}
            />
          );
        })
      )}
    </div>
  );
}
