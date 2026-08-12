import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import { useTheme } from '../ThemeContext';
import { useLocation } from '../LocationContext';
import {
  getParkingSlots, getParkingReservations, createParkingReservation, checkInParking, checkOutParking
} from '../api';
import {
  Car, Zap, CheckCircle2, QrCode, Plus, LogOut
} from 'lucide-react';

export default function ParkingPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { location } = useLocation();

  const [slots, setSlots] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Reserve Form State
  const [vehicleNumber, setVehicleNumber] = useState('TN 38 CA 8821');
  const [vehicleType, setVehicleType] = useState('EV Car');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [submitting, setSubmitting] = useState(false);

  const userId = user?.user_id;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [slotList, resList] = await Promise.all([
        getParkingSlots({ location }),
        getParkingReservations({ location, user_id: userId })
      ]);
      setSlots(slotList || []);
      setReservations(resList || []);
    } catch (err) {
      console.error('Failed to load parking data:', err);
    } finally {
      setLoading(false);
    }
  }, [location, userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleReserve = async (e) => {
    e.preventDefault();
    if (!selectedSlot) return;
    setSubmitting(true);
    try {
      await createParkingReservation({
        slot_id: selectedSlot.slot_id,
        user_id: userId,
        vehicle_number: vehicleNumber,
        vehicle_type: vehicleType,
        start_time: startTime,
        end_time: endTime
      });
      setShowModal(false);
      setSelectedSlot(null);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to reserve slot');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckIn = async (resId) => {
    try {
      await checkInParking(resId);
      loadData();
    } catch (err) {
      alert(err.message || 'Check-in failed');
    }
  };

  const handleCheckOut = async (resId) => {
    try {
      await checkOutParking(resId);
      loadData();
    } catch (err) {
      alert(err.message || 'Check-out failed');
    }
  };

  const totalSlots = slots.length;
  const availableSlots = slots.filter(s => s.status === 'available').length;
  const evSlots = slots.filter(s => s.type === 'EV').length;
  const activePasses = reservations.filter(r => r.status === 'confirmed' || r.status === 'checked_in').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              ParkSwift Smart Parking
            </span>
            <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              Location: {location}
            </span>
          </div>
          <h1 className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Smart Parking & Vehicle Access
          </h1>
          <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Real-time parking slot map, EV charging bays, license plate registration, and digital QR entry passes.
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className={`p-5 rounded-2xl border ${theme === 'dark' ? 'bg-[#0f1420] border-[#1e2a45]' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Total Spots</p>
              <h3 className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{totalSlots}</h3>
            </div>
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Car size={22} />
            </div>
          </div>
        </div>

        <div className={`p-5 rounded-2xl border ${theme === 'dark' ? 'bg-[#0f1420] border-[#1e2a45]' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Available Now</p>
              <h3 className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>{availableSlots}</h3>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 size={22} />
            </div>
          </div>
        </div>

        <div className={`p-5 rounded-2xl border ${theme === 'dark' ? 'bg-[#0f1420] border-[#1e2a45]' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>EV Chargers</p>
              <h3 className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'}`}>{evSlots}</h3>
            </div>
            <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Zap size={22} />
            </div>
          </div>
        </div>

        <div className={`p-5 rounded-2xl border ${theme === 'dark' ? 'bg-[#0f1420] border-[#1e2a45]' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>My Active Passes</p>
              <h3 className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}>{activePasses}</h3>
            </div>
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
              <QrCode size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* Active Reservations Section */}
      {reservations.length > 0 && (
        <div className={`p-5 rounded-2xl border space-y-3 ${theme === 'dark' ? 'bg-[#0f1420] border-[#1e2a45]' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center justify-between border-b pb-3 border-slate-800">
            <h2 className={`text-base font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              <QrCode size={18} className="text-emerald-400" />
              <span>My ParkSwift Entry Passes</span>
            </h2>
            <span className="text-xs text-slate-400">{reservations.length} Active Pass(es)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {reservations.map(resv => (
              <div
                key={resv.reservation_id}
                className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${
                  theme === 'dark' ? 'bg-[#0a0e17] border-[#1e2a45]' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {resv.pass_code}
                    </span>
                    <span className="text-xs font-bold text-slate-200">{resv.slot_number}</span>
                  </div>
                  <p className="text-xs text-indigo-400 font-medium mt-1">
                    Vehicle: {resv.vehicle_number} ({resv.vehicle_type})
                  </p>
                  <p className="text-[0.7rem] text-slate-400 mt-0.5">
                    Time: {resv.start_time} - {resv.end_time} ({resv.date})
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[0.65rem] font-semibold uppercase ${
                    resv.status === 'checked_in' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {resv.status}
                  </span>

                  {resv.status === 'confirmed' && (
                    <button
                      onClick={() => handleCheckIn(resv.reservation_id)}
                      className="px-3 py-1 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-500"
                    >
                      Check In
                    </button>
                  )}

                  {resv.status === 'checked_in' && (
                    <button
                      onClick={() => handleCheckOut(resv.reservation_id)}
                      className="px-3 py-1 rounded-lg text-xs font-medium bg-purple-600 text-white hover:bg-purple-500 flex items-center gap-1"
                    >
                      <LogOut size={12} />
                      <span>Release Slot</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interactive Parking Map Grid */}
      <div className={`p-6 rounded-2xl border space-y-4 ${theme === 'dark' ? 'bg-[#0f1420] border-[#1e2a45]' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-4 border-slate-800">
          <div>
            <h2 className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Parking Bays Map — {location}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select an available parking slot to instantly reserve for your vehicle.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-3 h-3 rounded-full bg-emerald-500/30 border border-emerald-500 inline-block" /> Available
            </span>
            <span className="flex items-center gap-1.5 text-cyan-400">
              <Zap size={14} /> EV Bay
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-3 h-3 rounded-full bg-amber-500/30 border border-amber-500 inline-block" /> Reserved
            </span>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-500">Loading parking bays...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {slots.map(slot => {
              const isAvailable = slot.status === 'available';
              const isEV = slot.type === 'EV';

              return (
                <div
                  key={slot.slot_id}
                  onClick={() => {
                    if (isAvailable) {
                      setSelectedSlot(slot);
                      setShowModal(true);
                    }
                  }}
                  className={`p-4 rounded-xl border transition cursor-pointer relative flex flex-col justify-between h-32 ${
                    isAvailable
                      ? theme === 'dark'
                        ? 'bg-[#0a0e17] border-emerald-500/30 hover:border-emerald-400 hover:scale-[1.02]'
                        : 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-400 hover:scale-[1.02]'
                      : theme === 'dark'
                        ? 'bg-slate-900/40 border-slate-800 opacity-60 cursor-not-allowed'
                        : 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-200">{slot.slot_number}</span>
                    {isEV && <Zap size={16} className="text-cyan-400" />}
                  </div>

                  <div>
                    <p className="text-[0.65rem] text-slate-400 font-medium truncate">{slot.zone}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[0.6rem] font-bold ${
                      isEV ? 'bg-cyan-500/20 text-cyan-400' : 'bg-indigo-500/20 text-indigo-400'
                    }`}>
                      {slot.type}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[0.65rem]">
                    <span className={isAvailable ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>
                      {isAvailable ? 'Reserve Spot' : 'Occupied'}
                    </span>
                    {isAvailable && <Plus size={14} className="text-emerald-400" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reserve Modal */}
      {showModal && selectedSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl space-y-4 ${
            theme === 'dark' ? 'bg-[#0f1420] border-[#1e2a45] text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-700">
              <div className="flex items-center gap-2">
                <Car className="text-emerald-400" size={20} />
                <h2 className="text-lg font-bold">Reserve Parking Slot {selectedSlot.slot_number}</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleReserve} className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 space-y-1">
                <p>Zone: <strong>{selectedSlot.zone}</strong></p>
                <p>Type: <strong>{selectedSlot.type} Bay</strong></p>
                <p>Location: <strong>{selectedSlot.location}</strong></p>
              </div>

              <div>
                <label className="block font-medium mb-1 opacity-80">Vehicle Registration Plate Number *</label>
                <input
                  type="text"
                  required
                  value={vehicleNumber}
                  onChange={e => setVehicleNumber(e.target.value)}
                  placeholder="e.g. TN 38 CA 8821"
                  className={`w-full px-3 py-2 rounded-xl border outline-none uppercase font-mono ${
                    theme === 'dark' ? 'bg-[#0a0e17] border-[#1e2a45]' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1 opacity-80">Vehicle Type</label>
                  <select
                    value={vehicleType}
                    onChange={e => setVehicleType(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border outline-none ${
                      theme === 'dark' ? 'bg-[#0a0e17] border-[#1e2a45]' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <option value="EV Car">EV Car</option>
                    <option value="Car">Sedan / SUV</option>
                    <option value="Bike">Two Wheeler</option>
                    <option value="EV Bike">EV Two Wheeler</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1 opacity-80">Parking Window</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={startTime}
                      onChange={e => setStartTime(e.target.value)}
                      className={`w-1/2 px-2 py-2 rounded-xl border outline-none text-center ${
                        theme === 'dark' ? 'bg-[#0a0e17] border-[#1e2a45]' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                    <span>-</span>
                    <input
                      type="text"
                      value={endTime}
                      onChange={e => setEndTime(e.target.value)}
                      className={`w-1/2 px-2 py-2 rounded-xl border outline-none text-center ${
                        theme === 'dark' ? 'bg-[#0a0e17] border-[#1e2a45]' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                >
                  {submitting ? 'Reserving...' : 'Confirm Reservation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
