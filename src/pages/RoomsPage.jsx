import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getRooms, createRoom, updateRoom, deactivateRoom, getRoomAvailability, getUsers, importRoomsFromCSV } from '../api';
import { useTheme } from '../ThemeContext';
import { PageHeader, SectionHeader, EmptyState, Input, Select, Button } from '../components/ui';
import RoomCard from '../components/RoomCard';
import { useLocation } from "../LocationContext";

const AMENITIES = ['Projector', 'Whiteboard', 'Video Conferencing', 'TV Screen', 'Phone', 'Standing Desk', 'Natural Light', 'Air Conditioning'];

function RoomImportForm({ onSuccess, onCancel }) {
  const { theme } = useTheme();
  const [file, setFile] = useState(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f && !f.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      setFileLoading(false);
      return;
    }
    setError('');
    setFile(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { setError('Please select a file'); return; }

    setFileLoading(true);
    try {
      const result = await importRoomsFromCSV(file);
      setResults(result);
      if (result.created > 0) {
        setTimeout(() => { onSuccess?.(); }, 2000);
      }
    } catch (err) {
      setError(err.detail || err.message);
    } finally {
      setFileLoading(false);
    }
  };

  if (results) {
    return (
      <div className={`p-5 rounded-2xl ${theme === 'dark'
        ? 'bg-gradient-to-br from-[#0f1420] to-[#161c2e] border-[#1e2a45]'
        : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200'
        } border mb-4 relative`}>
        <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-green-500 to-transparent" />
        <h3 className={`text-base font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'} mb-4`}>✅ Import Complete</h3>

        <div className="space-y-3 mb-4">
          <div className={`px-4 py-2 rounded-xl text-sm ${theme === 'dark' ? 'bg-green-500/8 border-green-500/20 text-green-400 border' : 'bg-green-100 border-green-300 text-green-700 border'}`}>
            ✓ <span className="font-semibold">{results.created}</span> rooms created
          </div>
          {results.skipped > 0 && (
            <div className={`px-4 py-2 rounded-xl text-sm ${theme === 'dark' ? 'bg-amber-500/8 border-amber-500/20 text-amber-400 border' : 'bg-amber-100 border-amber-300 text-amber-700 border'}`}>
              ⏩ <span className="font-semibold">{results.skipped}</span> rooms skipped (duplicates)
            </div>
          )}
          {results.failed > 0 && (
            <div className={`px-4 py-2 rounded-xl text-sm ${theme === 'dark' ? 'bg-rose-500/8 border-rose-500/20 text-rose-400 border' : 'bg-rose-100 border-rose-300 text-rose-700 border'}`}>
              ✕ <span className="font-semibold">{results.failed}</span> rooms failed
              {results.failed_rooms.length > 0 && (
                <div className={`mt-2 text-xs space-y-1 max-h-32 overflow-y-auto ${theme === 'dark' ? 'text-rose-300' : 'text-rose-700'}`}>
                  {results.failed_rooms.slice(0, 5).map((r, i) => (
                    <div key={i}>{r.name}: {r.reason}</div>
                  ))}
                  {results.failed_rooms.length > 5 && <div>... and {results.failed_rooms.length - 5} more</div>}
                </div>
              )}
            </div>
          )}
        </div>

        {results.created_rooms.length > 0 && (
          <div className={`text-xs space-y-1 mb-4 max-h-32 overflow-y-auto p-3 rounded-xl ${theme === 'dark' ? 'bg-[#0a0f1e] border-[#1e2a45]' : 'bg-gray-50 border-gray-200'} border`}>
            <div className={`font-semibold mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Created rooms:</div>
            {results.created_rooms.slice(0, 5).map((r, i) => (
              <div key={i} className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
                • {r.name} ({r.location})
              </div>
            ))}
            {results.created_rooms.length > 5 && (
              <div className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
                ... and {results.created_rooms.length - 5} more
              </div>
            )}
          </div>
        )}

        <button onClick={() => onCancel?.()} className={`w-full px-4 py-2 rounded-xl font-semibold transition-all ${theme === 'dark'
          ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}>
          Close
        </button>
      </div>
    );
  }

  return (
    <div className={`p-5 rounded-2xl ${theme === 'dark'
      ? 'bg-gradient-to-br from-[#0f1420] to-[#161c2e] border-[#1e2a45]'
      : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200'
      } border mb-4 relative`}>
      <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
      <h3 className={`text-base font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'} mb-4`}>📊 Import Rooms from CSV</h3>
      {error && <div className={`mb-3 px-4 py-2 rounded-xl ${theme === 'dark'
        ? 'bg-rose-500/8 border-rose-500/20 text-rose-400'
        : 'bg-rose-100 border-rose-300 text-rose-700'
        } border text-sm`}>❌ {error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
            📁 Select CSV File
          </label>
          <input type="file" accept=".csv" onChange={handleFileChange} disabled={fileLoading}
            className={`w-full px-4 py-2 rounded-xl text-sm border focus:outline-none transition-all ${theme === 'dark'
              ? 'bg-[#0a0f1e] border-[#1e2a45] text-slate-100 file:text-slate-400'
              : 'bg-white border-gray-300 text-slate-900 file:text-slate-600'
              } ${file ? (theme === 'dark' ? 'border-green-500/30' : 'border-green-300') : ''}`} />
          {file && <div className={`mt-1 text-xs ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
            ✓ {file.name}
          </div>}
        </div>
        <div className={`mb-4 p-3 rounded-xl text-xs ${theme === 'dark' ? 'bg-[#0a0f1e] border-[#1e2a45] text-slate-400 border' : 'bg-gray-50 border-gray-300 text-slate-600 border'}`}>
          <div className="font-semibold mb-1">CSV Format:</div>
          <div>Expected columns: Room Name, Location / Building, Floor, Room Type, Cabin Type, Seating Capacity, Amenities Available, VC Enabled, Power Points</div>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={!file || fileLoading}>
            {fileLoading ? '⏳ Importing...' : '✅ Import Rooms'}
          </Button>
          <Button variant="secondary" type="button" onClick={onCancel} disabled={fileLoading}>✖ Cancel</Button>
        </div>
      </form>
    </div>
  );
}

function RoomForm({ existing, onSave, onCancel }) {
  const { theme } = useTheme();
  const { location: currentLocation } = useLocation();
  const [name, setName] = useState(existing?.name || '');
  const [location, setLocation] = useState(existing?.location || currentLocation || '');
  const [building, setBuilding] = useState(existing?.building || '');
  const [capacity, setCapacity] = useState(existing?.capacity || 10);
  const [floor, setFloor] = useState(existing?.floor || 1);
  const [roomType, setRoomType] = useState(existing?.room_type || '');
  const [cabinType, setCabinType] = useState(existing?.cabin_type || '');
  const [vcEnabled, setVcEnabled] = useState(existing?.vc_enabled || false);
  const [powerPoints, setPowerPoints] = useState(existing?.power_points || false);
  const [status, setStatus] = useState(existing?.status || 'active');
  const [amenities, setAmenities] = useState(existing?.amenities || []);
  const [allowedUsers, setAllowedUsers] = useState(existing?.allowed_users || []);
  const [userOptions, setUserOptions] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    getUsers().then(setUserOptions).catch(() => setUserOptions([]));
  }, []);

  useEffect(() => {
    setName(existing?.name || '');
    setLocation(existing?.location || currentLocation || '');
    setBuilding(existing?.building || '');
    setCapacity(existing?.capacity || 10);
    setFloor(existing?.floor || 1);
    setRoomType(existing?.room_type || '');
    setCabinType(existing?.cabin_type || '');
    setVcEnabled(existing?.vc_enabled || false);
    setPowerPoints(existing?.power_points || false);
    setStatus(existing?.status || 'active');
    setAmenities(existing?.amenities || []);
    setAllowedUsers(existing?.allowed_users || []);
  }, [existing, currentLocation]);

  const toggle = (a) => setAmenities(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  const toggleAllowedUser = (userId) => setAllowedUsers(prev => prev.includes(userId) ? prev.filter(x => x !== userId) : [...prev, userId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Room name is required.'); return; }
    if (!location?.trim()) { setError('Location is required.'); return; }
    onSave({
      name: name.trim(),
      location: location.trim(),
      building: building?.trim() || null,
      capacity: Number(capacity),
      floor: Number(floor),
      room_type: roomType || null,
      cabin_type: cabinType || null,
      vc_enabled: vcEnabled,
      power_points: powerPoints,
      amenities,
      status,
      allowed_users: allowedUsers,
    });
  };

  return (
    <div className={`p-5 rounded-2xl ${theme === 'dark'
      ? 'bg-gradient-to-br from-[#0f1420] to-[#161c2e] border-[#1e2a45]'
      : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200'
      } border mb-4 relative`}>
      <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
      <h3 className={`text-base font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'} mb-4`}>{existing ? '✏️ Edit Room' : '🏢 New Room'}</h3>
      {error && <div className={`mb-3 px-4 py-2 rounded-xl ${theme === 'dark'
        ? 'bg-rose-500/8 border-rose-500/20 text-rose-400'
        : 'bg-rose-100 border-rose-300 text-rose-700'
        } border text-sm`}>❌ {error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Input label="Room Name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Horizon Suite" />
          <Input label="Location" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Pune" />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Input label="Room Type" value={roomType} onChange={e => setRoomType(e.target.value)} placeholder="e.g. Workstation, Board Room" />
          <Input label="Building" value={building} onChange={e => setBuilding(e.target.value)} placeholder="e.g. Tower A" />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Input label="Capacity" type="number" min="1" value={capacity} onChange={e => setCapacity(e.target.value)} />
          <Input label="Cabin Type" value={cabinType} onChange={e => setCabinType(e.target.value)} placeholder="e.g. Executive, Standard" />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="space-y-3">
            <label className={`block text-xs font-semibold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'} uppercase tracking-wider`}>
              Video Conferencing
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={vcEnabled} onChange={(e) => setVcEnabled(e.target.checked)} className="h-4 w-4 accent-indigo-600" />
              <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>VC enabled</span>
            </label>
          </div>
          <div className="space-y-3">
            <label className={`block text-xs font-semibold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'} uppercase tracking-wider`}>
              Power Points
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={powerPoints} onChange={(e) => setPowerPoints(e.target.checked)} className="h-4 w-4 accent-indigo-600" />
              <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Has power points</span>
            </label>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Input label="Floor" type="number" min="0" value={floor} onChange={e => setFloor(e.target.value)} />
          {existing && (
            <Select label="Status" value={status} onChange={e => setStatus(e.target.value)}
              options={[{ value: 'active', label: 'Available' }, { value: 'inactive', label: 'Unavailable' }]} />
          )}
        </div>
        <div className="mb-4">
          <label className={`block text-xs font-semibold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'} uppercase tracking-wider mb-2`}>Allowed Users</label>
          <div className={`p-4 rounded-2xl border ${theme === 'dark' ? 'border-[#1e2a45] bg-[#0a0f1e]' : 'border-gray-200 bg-white'}`}>
            <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} mb-3`}>
              Leave empty to allow all users. Select specific employees to restrict booking to only those users.
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto">
              {userOptions.map((user) => (
                <button
                  key={user.user_id}
                  type="button"
                  onClick={() => toggleAllowedUser(user.user_id)}
                  className={`text-left px-3 py-2 rounded-2xl border w-full transition-all ${allowedUsers.includes(user.user_id)
                    ? theme === 'dark'
                      ? 'bg-indigo-500/15 border-indigo-500 text-indigo-100'
                      : 'bg-indigo-100 border-indigo-300 text-indigo-800'
                    : theme === 'dark'
                      ? 'bg-[#0f1420] border-[#1e2a45] text-slate-300 hover:border-indigo-500/30 hover:text-indigo-300'
                      : 'bg-white border-gray-200 text-slate-600 hover:border-indigo-500/30 hover:text-indigo-700'
                    }`}>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span>{user.name}</span>
                    <span className="font-semibold">{user.user_id}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mb-4">
          <label className={`block text-xs font-semibold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'} uppercase tracking-wider mb-2`}>Amenities</label>
          <div className="flex flex-wrap gap-2">
            {AMENITIES.map(a => (
              <button key={a} type="button" onClick={() => toggle(a)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${amenities.includes(a)
                    ? theme === 'dark'
                      ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
                      : 'bg-indigo-100 border-indigo-300 text-indigo-700'
                    : theme === 'dark'
                      ? 'bg-[#0a0f1e] border-[#1e2a45] text-slate-500 hover:border-indigo-500/30 hover:text-indigo-400'
                      : 'bg-white border-gray-300 text-slate-600 hover:border-indigo-500 hover:text-indigo-600'
                  } border`}>
                {a}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="submit">{existing ? '💾 Save Room' : '✅ Create Room'}</Button>
          <Button variant="secondary" type="button" onClick={onCancel}>✖ Cancel</Button>
        </div>
      </form>
    </div>
  );
}

export default function RoomsPage() {
  const { theme } = useTheme();
  const { location } = useLocation();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editRoom, setEditRoom] = useState(null);
  const [error, setError] = useState('');
  const [showImport, setShowImport] = useState(false);

  // Availability viewer
  const [availRoom, setAvailRoom] = useState('');
  const [availDate, setAvailDate] = useState(new Date().toISOString().slice(0, 10));
  const [availData, setAvailData] = useState(null);

  const reload = useCallback(() => {
    setLoading(true);
    getRooms().then(setRooms).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);
  const formRef = useRef(null);

  // Auto-scroll to form when create or edit form is shown
  useEffect(() => {
    if (showForm || editRoom) {
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    }
  }, [showForm, editRoom]);

  const cityRooms = useMemo(() => {
    return rooms.filter(r => r.location === location);
  }, [rooms, location]);

  const handleCreate = async (data) => {
    try { await createRoom(data); setShowForm(false); reload(); }
    catch (e) { setError(e.detail || e.message); }
  };

  const handleUpdate = async (data) => {
    try { await updateRoom(editRoom.room_id, data); setEditRoom(null); reload(); }
    catch (e) { setError(e.detail || e.message); }
  };

  const handleDeactivate = async (room) => {
    if (!confirm(`Deactivate "${room.name}"?`)) return;
    try { await deactivateRoom(room.room_id); reload(); }
    catch (e) { alert(e.detail || e.message); }
  };

  const loadAvailability = useCallback(async () => {
    if (!availRoom || !availDate) return;
    try {
      const data = await getRoomAvailability(availRoom, availDate);
      setAvailData(data);
    } catch (e) { alert(e.detail || e.message); }
  }, [availRoom, availDate]);

  useEffect(() => {
    if (availRoom) {
      loadAvailability();
    }
  }, [availRoom, availDate, loadAvailability]);

  if (loading) return <div className="text-center py-20 text-slate-500">Loading...</div>;

  const activeRooms = cityRooms.filter(r => r.status === 'active');

  return (
    <div className="animate-fade-up">
      <div className="flex items-start justify-between mb-6">
        <PageHeader
          title="🏢 Meeting Rooms"
          subtitle="Manage your workspace rooms, amenities, and availability"
        />

        <div className="flex gap-2">
          <Button
            onClick={() => {
              setShowForm(!showForm);
              setEditRoom(null);
            }}
          >
            ＋ New Room
          </Button>

          <Button onClick={() => setShowImport(!showImport)}>
            📊 Import Rooms
          </Button>
        </div>
      </div>

      {error && <div className={`mb-4 px-4 py-2 rounded-xl ${theme === 'dark'
        ? 'bg-rose-500/8 border-rose-500/20 text-rose-400'
        : 'bg-rose-100 border-rose-300 text-rose-700'
        } border text-sm`}>❌ {error}</div>}

      {(showForm || editRoom) && (
        <div ref={formRef}>
          <RoomForm
            existing={editRoom}
            onSave={editRoom ? handleUpdate : handleCreate}
            onCancel={() => { if (editRoom) setEditRoom(null); else setShowForm(false); }}
          />
        </div>
      )}
      {showImport && <RoomImportForm onSuccess={() => { setShowImport(false); reload(); }} onCancel={() => setShowImport(false)} />}


      {/* Summary */}
      <div className={`flex gap-6 mb-5 px-4 py-3 ${theme === 'dark'
        ? 'bg-[#0f1420] border-[#1e2a45]'
        : 'bg-gray-50 border-gray-200'
        } border rounded-xl`}>
        <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}><span className={theme === 'dark' ? 'text-slate-100' : 'text-slate-900'} style={{ fontWeight: 'bold' }}>{cityRooms.length}</span> rooms</span>
        <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}><span className="text-emerald-400 font-bold">{activeRooms.length}</span> active</span>
        <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}><span className="text-rose-400 font-bold">{cityRooms.length - activeRooms.length}</span> inactive</span>
        <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}><span className="text-indigo-400 font-bold">{cityRooms.reduce((s, r) => s + r.capacity, 0)}</span> total seats</span>
      </div>

      {/* Room grid */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {cityRooms.map(room => (
          <RoomCard key={room.room_id} room={room}
            actions={
              <div className="flex gap-2 flex-1">
                <button onClick={() => { setEditRoom(room); setShowForm(false); }}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${theme === 'dark'
                    ? 'border-[#1e2a45] text-slate-400 hover:border-indigo-500 hover:text-indigo-300'
                    : 'border-gray-300 text-slate-600 hover:border-indigo-500 hover:text-indigo-600'
                    }`}>
                  ✏️ Edit
                </button>
                {room.status === 'active' && (
                  <button onClick={() => handleDeactivate(room)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${theme === 'dark'
                      ? 'border-rose-500/20 text-rose-400 hover:bg-rose-500/10'
                      : 'border-rose-300 text-rose-700 hover:bg-rose-100'
                      }`}>
                    🗑️ Deactivate
                  </button>
                )}
              </div>
            }
          />
        ))}
      </div>

      {cityRooms.length === 0 && <EmptyState icon="🏗️" text="No rooms yet. Create your first room!" />}

      {/* Availability Viewer */}
      <div className={`h-px bg-gradient-to-r from-transparent ${theme === 'dark' ? 'via-[#1e2a45]' : 'via-gray-300'} to-transparent mb-6`} />
      <SectionHeader title="📅 Room Availability" />
      <div className="grid grid-cols-2 gap-3 mb-4">
        <select value={availRoom} onChange={e => setAvailRoom(e.target.value)}
          className={`px-4 py-2.5 rounded-xl ${theme === 'dark'
            ? 'bg-[#0a0f1e] border-[#1e2a45] text-slate-100 focus:border-indigo-500'
            : 'bg-white border-gray-300 text-slate-900 focus:border-indigo-500'
            } border text-sm outline-none`}>
          <option value="">Select room...</option>
          {activeRooms.map(r => <option key={r.room_id} value={r.room_id}>{r.name}</option>)}
        </select>
        <input type="date" value={availDate} onChange={e => setAvailDate(e.target.value)}
          className={`px-4 py-2.5 rounded-xl ${theme === 'dark'
            ? 'bg-[#0a0f1e] border-[#1e2a45] text-slate-100 focus:border-indigo-500'
            : 'bg-white border-gray-300 text-slate-900 focus:border-indigo-500'
            } border text-sm outline-none`} />
      </div>

      {availData && (
        <div>
          {(() => {
            const slots = availData.slots || [];
            const free = slots.filter(s => s.is_available).length;
            const pct = slots.length ? Math.round(free / slots.length * 100) : 0;
            return (
              <>
                <div className={`flex items-center gap-4 mb-4 px-4 py-3 ${theme === 'dark'
                  ? 'bg-[#0f1420] border-[#1e2a45]'
                  : 'bg-gray-50 border-gray-200'
                  } border rounded-xl`}>
                  <div className="flex-1">
                    <div className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'} mb-1`}>Availability — {free} of {slots.length} slots free</div>
                    <div className={`h-1.5 ${theme === 'dark' ? 'bg-[#1e2a45]' : 'bg-gray-300'} rounded-full overflow-hidden`}>
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-emerald-400">{pct}%</div>
                    <div className={`text-[0.6rem] ${theme === 'dark' ? 'text-slate-600' : 'text-slate-500'}`}>available</div>
                  </div>
                </div>
                <div className="grid grid-cols-8 gap-2">
                  {slots.map((s, i) => {
                    const t = s.start_time?.slice(11, 16);
                    return (
                      <div key={i} className={`py-2 rounded-xl text-center text-xs font-bold transition-all border ${s.is_available
                          ? theme === 'dark'
                            ? 'bg-emerald-500/8 border-emerald-500/25 text-emerald-400'
                            : 'bg-emerald-100 border-emerald-300 text-emerald-700'
                          : theme === 'dark'
                            ? 'bg-rose-500/8 border-rose-500/20 text-rose-400'
                            : 'bg-rose-100 border-rose-300 text-rose-700'
                        }`}>
                        <div>{t}</div>
                        <div className="text-[0.6rem] opacity-70 mt-0.5">{s.is_available ? 'Available' : (s.booking_title || 'Booked').slice(0, 10)}</div>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
