import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../AuthContext";
import { useLocation } from "../LocationContext";
import { useTheme } from "../ThemeContext";
import {
  getWorkstations,
  getWorkstationBookings,
  createWorkstationBooking,
  cancelWorkstationBooking,
  checkInWorkstationBooking,
  checkOutWorkstationBooking,
  createWorkstation,
  deleteWorkstation,
} from "../api";
import {
  Monitor,
  Plus,
  Search,
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  Laptop,
  Check,
  ShieldAlert,
  SlidersHorizontal,
  Trash2,
  Tv,
  Zap,
  Armchair,
  Wifi,
} from "lucide-react";

export default function WorkstationsPage() {
  const { user, isAdmin } = useAuth();
  const { location } = useLocation();
  const { theme } = useTheme();

  const [workstations, setWorkstations] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [selectedFloor, setSelectedFloor] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("browse"); // 'browse' | 'my_bookings' | 'manage'

  // Booking Modal State
  const [bookingModalWs, setBookingModalWs] = useState(null);
  const [bookingSlot, setBookingSlot] = useState("Full Day");
  const [bookingNotes, setBookingNotes] = useState("");
  const [submittingBooking, setSubmittingBooking] = useState(false);

  // Create Workstation Modal State (Admin)
  const [showCreateWsModal, setShowCreateWsModal] = useState(false);
  const [newWsLabel, setNewWsLabel] = useState("");
  const [newWsBay, setNewWsBay] = useState("IT07");
  const [newWsFloor, setNewWsFloor] = useState(1);
  const [newWsType, setNewWsType] = useState("Hot Desk");
  const [newWsAmenities, setNewWsAmenities] = useState([
    "Power Outlet",
    "Dual Monitors",
    "Ergonomic Chair",
  ]);

  const amenityList = [
    "Dual Monitors",
    "Ergonomic Chair",
    "Power Outlet",
    "Standing Desk",
    "LAN Port",
    "Wireless Charger",
  ];

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [wsList, bkgList] = await Promise.all([
        getWorkstations({ location, date: selectedDate }),
        getWorkstationBookings({ location, user_id: activeTab === 'my_bookings' ? user?.user_id : undefined }),
      ]);
      setWorkstations(wsList || []);
      setBookings(bkgList || []);
    } catch (err) {
      setError(err.message || "Failed to load workstations");
    } finally {
      setLoading(false);
    }
  }, [location, selectedDate, activeTab, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Workstation Booking
  const handleConfirmBooking = async () => {
    if (!bookingModalWs) return;
    setSubmittingBooking(true);
    setError(null);
    try {
      await createWorkstationBooking({
        workstation_id: bookingModalWs.workstation_id,
        label: bookingModalWs.label,
        location: bookingModalWs.location,
        date: selectedDate,
        slot_type: bookingSlot,
        notes: bookingNotes,
      });
      setBookingModalWs(null);
      setBookingNotes("");
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to book workstation");
    } finally {
      setSubmittingBooking(false);
    }
  };

  // Handle Cancel Booking
  const handleCancelBooking = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this workstation booking?")) return;
    try {
      await cancelWorkstationBooking(id);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle Check In
  const handleCheckIn = async (id) => {
    try {
      await checkInWorkstationBooking(id);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle Check Out
  const handleCheckOut = async (id) => {
    try {
      await checkOutWorkstationBooking(id);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle Admin Add Workstation
  const handleAddWorkstation = async (e) => {
    e.preventDefault();
    if (!newWsLabel) return;
    try {
      await createWorkstation({
        label: newWsLabel,
        location,
        floor: Number(newWsFloor),
        bay: newWsBay,
        type: newWsType,
        amenities: newWsAmenities,
      });
      setShowCreateWsModal(false);
      setNewWsLabel("");
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle Admin Delete Workstation
  const handleDeleteWorkstation = async (id) => {
    if (!window.confirm("Delete this workstation?")) return;
    try {
      await deleteWorkstation(id);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Filtered Workstations
  const filteredWorkstations = workstations.filter((ws) => {
    const matchesSearch =
      ws.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ws.bay && ws.bay.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFloor =
      selectedFloor === "all" || ws.floor === Number(selectedFloor);
    const matchesType = selectedType === "all" || ws.type === selectedType;
    return matchesSearch && matchesFloor && matchesType;
  });

  const myBookings = bookings.filter((b) => b.user_id === user?.user_id);

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
              Workstation Management
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Location: <strong className="text-indigo-400">{location}</strong>
            </span>
          </div>
          <h1 className="text-2xl font-bold mt-1">Book Your Desk</h1>
          <p className="text-xs text-slate-400">
            Reserve workstations, hot desks, and executive bays with real-time amenity availability.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <button
              onClick={() => {
                setNewWsLabel(`${location.slice(0, 2).toUpperCase()}07 WS ${Math.floor(10 + Math.random() * 80)}`);
                setShowCreateWsModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-500/25 transition"
            >
              <Plus size={16} />
              Add Workstation
            </button>
          )}
        </div>
      </div>

      {/* ERROR ALERT */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-bold ml-4">
            ×
          </button>
        </div>
      )}

      {/* TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
        <button
          onClick={() => setActiveTab("browse")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
            activeTab === "browse"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
              : "text-slate-400 hover:text-white hover:bg-slate-800/50"
          }`}
        >
          <Monitor size={15} />
          Browse Workstations ({filteredWorkstations.length})
        </button>

        <button
          onClick={() => setActiveTab("my_bookings")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
            activeTab === "my_bookings"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
              : "text-slate-400 hover:text-white hover:bg-slate-800/50"
          }`}
        >
          <Calendar size={15} />
          My Desk Reservations ({myBookings.length})
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveTab("manage")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
              activeTab === "manage"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <SlidersHorizontal size={15} />
            All Reservations ({bookings.length})
          </button>
        )}
      </div>

      {/* TAB 1: BROWSE WORKSTATIONS */}
      {activeTab === "browse" && (
        <div className="space-y-6">
          {/* FILTER CONTROLS */}
          <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-4 ${
            theme === "dark" ? "bg-[#0b101d] border-gray-800" : "bg-white border-gray-200"
          }`}>
            <div className="flex flex-wrap items-center gap-3">
              {/* Date Selector */}
              <div className="flex items-center gap-2 bg-indigo-500/10 px-3 py-1.5 rounded-xl border border-indigo-500/20">
                <Calendar size={15} className="text-indigo-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-indigo-300 focus:outline-none"
                />
              </div>

              {/* Floor Filter */}
              <select
                value={selectedFloor}
                onChange={(e) => setSelectedFloor(e.target.value)}
                className={`px-3 py-2 rounded-xl text-xs font-medium border focus:outline-none ${
                  theme === "dark"
                    ? "bg-[#121829] border-gray-800 text-slate-300"
                    : "bg-gray-50 border-gray-300 text-gray-800"
                }`}
              >
                <option value="all">All Floors</option>
                <option value="1">Floor 1</option>
                <option value="2">Floor 2</option>
                <option value="3">Floor 3</option>
                <option value="4">Floor 4</option>
              </select>

              {/* Type Filter */}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className={`px-3 py-2 rounded-xl text-xs font-medium border focus:outline-none ${
                  theme === "dark"
                    ? "bg-[#121829] border-gray-800 text-slate-300"
                    : "bg-gray-50 border-gray-300 text-gray-800"
                }`}
              >
                <option value="all">All Desk Types</option>
                <option value="Hot Desk">Hot Desk</option>
                <option value="Dedicated Desk">Dedicated Desk</option>
                <option value="Executive Desk">Executive Desk</option>
                <option value="Standing Desk">Standing Desk</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search label (e.g. IT07 WS 74)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs border focus:outline-none focus:border-indigo-500 ${
                  theme === "dark"
                    ? "bg-[#121829] border-gray-800 text-slate-200 placeholder-slate-500"
                    : "bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400"
                }`}
              />
            </div>
          </div>

          {/* WORKSTATIONS GRID */}
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Loading workstation availability...
            </div>
          ) : filteredWorkstations.length === 0 ? (
            <div className={`p-12 text-center rounded-2xl border ${
              theme === "dark" ? "bg-[#0b101d] border-gray-800" : "bg-white border-gray-200"
            }`}>
              <Monitor size={36} className="mx-auto text-slate-500 mb-3 opacity-60" />
              <h3 className="text-base font-bold text-slate-300">No Workstations Found</h3>
              <p className="text-xs text-slate-500 mt-1">
                There are no workstations matching your filter criteria at {location}.
              </p>
              {isAdmin && (
                <button
                  onClick={() => setShowCreateWsModal(true)}
                  className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition"
                >
                  Create Workstation
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredWorkstations.map((ws) => {
                const isBooked = ws.is_booked;

                return (
                  <div
                    key={ws.workstation_id}
                    className={`rounded-2xl border transition-all duration-200 p-5 flex flex-col justify-between ${
                      theme === "dark"
                        ? "bg-[#0b101d] border-gray-800/80 hover:border-indigo-500/40"
                        : "bg-white border-gray-200 hover:border-indigo-300 shadow-sm"
                    }`}
                  >
                    <div>
                      {/* Label & Status Badge */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-extrabold text-indigo-400 tracking-wide">
                              {ws.label}
                            </h3>
                            <span className="text-[0.65rem] px-2 py-0.5 rounded-md font-semibold bg-slate-800 text-slate-300">
                              Floor {ws.floor}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 font-medium mt-0.5">
                            Bay: <span className="text-slate-200">{ws.bay || "Main Floor"}</span> · {ws.type}
                          </p>
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-full text-[0.65rem] font-extrabold uppercase tracking-wider ${
                            isBooked
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          }`}
                        >
                          {isBooked ? "Booked" : "Available"}
                        </span>
                      </div>

                      {/* Amenities Pills */}
                      <div className="mt-4 pt-3 border-t border-slate-800/60">
                        <div className="text-[0.65rem] uppercase font-bold text-slate-500 mb-2">
                          Available Amenities
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {ws.amenities && ws.amenities.length > 0 ? (
                            ws.amenities.map((a, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 rounded-lg text-[0.68rem] font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 flex items-center gap-1"
                              >
                                <Check size={11} className="text-indigo-400" />
                                {a}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-500 italic">Standard Desk Amenities</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ACTION BUTTON */}
                    <div className="mt-5 pt-3 border-t border-slate-800/60 flex items-center justify-between">
                      <div className="text-xs text-slate-400">
                        Date: <span className="text-slate-200 font-medium">{selectedDate}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteWorkstation(ws.workstation_id)}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                            title="Delete Workstation"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                        {isBooked ? (
                          <button
                            disabled
                            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-500 cursor-not-allowed"
                          >
                            Reserved
                          </button>
                        ) : (
                          <button
                            onClick={() => setBookingModalWs(ws)}
                            className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition"
                          >
                            Book Desk
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY DESK RESERVATIONS */}
      {activeTab === "my_bookings" && (
        <div className="space-y-4">
          {myBookings.length === 0 ? (
            <div className={`p-12 text-center rounded-2xl border ${
              theme === "dark" ? "bg-[#0b101d] border-gray-800" : "bg-white border-gray-200"
            }`}>
              <Calendar size={36} className="mx-auto text-slate-500 mb-3 opacity-60" />
              <h3 className="text-base font-bold text-slate-300">No Desk Reservations</h3>
              <p className="text-xs text-slate-500 mt-1">
                You haven't booked any workstations yet. Switch to "Browse Workstations" to reserve a desk.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {myBookings.map((b) => (
                <div
                  key={b.booking_id}
                  className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    theme === "dark" ? "bg-[#0b101d] border-gray-800" : "bg-white border-gray-200"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                      <Monitor size={22} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-indigo-400">{b.label}</h4>
                        <span className={`px-2.5 py-0.5 rounded-full text-[0.65rem] font-bold ${
                          b.status === "confirmed"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : b.status === "checked_in"
                            ? "bg-indigo-500/10 text-indigo-400"
                            : "bg-slate-800 text-slate-400"
                        }`}>
                          {b.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Location: <strong className="text-slate-200">{b.location}</strong> · Date: <strong className="text-slate-200">{b.date}</strong> ({b.slot_type})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {b.status === "confirmed" && (
                      <>
                        <button
                          onClick={() => handleCheckIn(b.booking_id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition"
                        >
                          Check In
                        </button>
                        <button
                          onClick={() => handleCancelBooking(b.booking_id)}
                          className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white text-xs font-semibold rounded-xl transition border border-rose-500/30"
                        >
                          Cancel
                        </button>
                      </>
                    )}

                    {b.status === "checked_in" && (
                      <button
                        onClick={() => handleCheckOut(b.booking_id)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition"
                      >
                        Check Out
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ADMIN MANAGE ALL RESERVATIONS */}
      {activeTab === "manage" && isAdmin && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-gray-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#121829] text-slate-400 uppercase font-bold border-b border-gray-800">
                <tr>
                  <th className="p-3">Label</th>
                  <th className="p-3">User</th>
                  <th className="p-3">Location</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Slot</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 bg-[#0b101d]">
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-500">
                      No workstation reservations recorded in the system.
                    </td>
                  </tr>
                ) : (
                  bookings.map((b) => (
                    <tr key={b.booking_id} className="hover:bg-slate-800/30">
                      <td className="p-3 font-extrabold text-indigo-400">{b.label}</td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-200">{b.user_name}</div>
                        <div className="text-[0.68rem] text-slate-500">{b.user_email}</div>
                      </td>
                      <td className="p-3 text-slate-300">{b.location}</td>
                      <td className="p-3 text-slate-300">{b.date}</td>
                      <td className="p-3 text-slate-300">{b.slot_type}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[0.65rem] font-bold ${
                          b.status === "confirmed"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : b.status === "checked_in"
                            ? "bg-indigo-500/10 text-indigo-400"
                            : "bg-slate-800 text-slate-400"
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {b.status === "confirmed" && (
                          <button
                            onClick={() => handleCancelBooking(b.booking_id)}
                            className="px-2.5 py-1 text-[0.7rem] bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white rounded-lg transition"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BOOKING MODAL */}
      {bookingModalWs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#0e1424] border border-gray-800 text-slate-200 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-indigo-400">
                  Book Workstation {bookingModalWs.label}
                </h3>
                <p className="text-xs text-slate-400">
                  Location: {bookingModalWs.location} · Floor {bookingModalWs.floor}
                </p>
              </div>
              <button
                onClick={() => setBookingModalWs(null)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Reservation Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#141b2d] border border-gray-800 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Shift / Slot Duration
                </label>
                <select
                  value={bookingSlot}
                  onChange={(e) => setBookingSlot(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#141b2d] border border-gray-800 text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="Full Day">Full Day (9:00 AM - 6:00 PM)</option>
                  <option value="Morning Slot (9 AM - 1 PM)">Morning Slot (9 AM - 1 PM)</option>
                  <option value="Afternoon Slot (2 PM - 6 PM)">Afternoon Slot (2 PM - 6 PM)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Special Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Need extra power outlet for lab testing"
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#141b2d] border border-gray-800 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-gray-800 flex items-center justify-end gap-3">
              <button
                onClick={() => setBookingModalWs(null)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-xl transition"
              >
                Cancel
              </button>
              <button
                disabled={submittingBooking}
                onClick={handleConfirmBooking}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition"
              >
                {submittingBooking ? "Reserving..." : "Confirm Reservation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE WORKSTATION MODAL (ADMIN) */}
      {showCreateWsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <form
            onSubmit={handleAddWorkstation}
            className="w-full max-w-md p-6 rounded-2xl bg-[#0e1424] border border-gray-800 text-slate-200 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-base font-bold text-indigo-400">
                Add Workstation to {location}
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateWsModal(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Workstation Label (e.g. IT07 WS 74)
                </label>
                <input
                  type="text"
                  required
                  placeholder="IT07 WS 74"
                  value={newWsLabel}
                  onChange={(e) => setNewWsLabel(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#141b2d] border border-gray-800 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    Bay Name / Zone
                  </label>
                  <input
                    type="text"
                    placeholder="IT07"
                    value={newWsBay}
                    onChange={(e) => setNewWsBay(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#141b2d] border border-gray-800 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    Floor Number
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={newWsFloor}
                    onChange={(e) => setNewWsFloor(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#141b2d] border border-gray-800 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Desk Type
                </label>
                <select
                  value={newWsType}
                  onChange={(e) => setNewWsType(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#141b2d] border border-gray-800 text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="Hot Desk">Hot Desk</option>
                  <option value="Dedicated Desk">Dedicated Desk</option>
                  <option value="Executive Desk">Executive Desk</option>
                  <option value="Standing Desk">Standing Desk</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Amenities
                </label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {amenityList.map((item) => {
                    const isChecked = newWsAmenities.includes(item);
                    return (
                      <label
                        key={item}
                        className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer text-[0.7rem] transition ${
                          isChecked
                            ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-300"
                            : "bg-[#141b2d] border-gray-800 text-slate-400"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewWsAmenities([...newWsAmenities, item]);
                            } else {
                              setNewWsAmenities(
                                newWsAmenities.filter((a) => a !== item)
                              );
                            }
                          }}
                          className="hidden"
                        />
                        <div
                          className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                            isChecked
                              ? "bg-indigo-600 border-indigo-500 text-white"
                              : "border-slate-600"
                          }`}
                        >
                          {isChecked && <Check size={10} />}
                        </div>
                        {item}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCreateWsModal(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition"
              >
                Create Workstation
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
