import { useState, useEffect, useRef } from 'react';
import { getRoomAvailability, createBooking } from '../api';
import { useAuth } from '../AuthContext';
import { useTheme } from '../ThemeContext';
import { format } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import { Users, UserPlus, Trash2, Mail, Phone, QrCode, CheckCircle2, AlertCircle, Send, Download, X } from 'lucide-react';

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

const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email.trim());
};

export default function SlotPicker({ room, onBooked, onClose }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [slots, setSlots] = useState([]);
  const [_loading, setLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [title, setTitle] = useState('');
  const [costCentre, setCostCentre] = useState('');
  const [meetingType, setMeetingType] = useState('Internal Meeting');
  const [meetingDescription, setMeetingDescription] = useState('');
  const [sendQR, setSendQR] = useState(true);
  const [recurrence, setRecurrence] = useState('none');
  const [recurrenceCount, setRecurrenceCount] = useState(1);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [_ibMsg, setIbMsg] = useState({ type: '', text: '' });
  const [ibStart, setIbStart] = useState(null);
  const [ibEnd, setIbEnd] = useState(null);
  const [ibStartHour, setIbStartHour] = useState('08');
  const [ibStartMin, setIbStartMin] = useState('00');
  const [ibStartAMPM, setIbStartAMPM] = useState('AM');
  const [ibEndHour, setIbEndHour] = useState('09');
  const [ibEndMin, setIbEndMin] = useState('00');
  const [ibEndAMPM, setIbEndAMPM] = useState('AM');
  const pickerRef = useRef(null);

  // Attendees State
  const [attendees, setAttendees] = useState([
    { id: 'att_1', name: '', email: '', phone: '', touchedEmail: false }
  ]);
  const [qrPassModalData, setQrPassModalData] = useState(null);

  useEffect(() => {
    setTimeout(() => {
      pickerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }, [room.room_id]);

  useEffect(() => {
    setLoading(true);
    setSelectedSlot(null);
    setError('');
    setSuccess('');
    getRoomAvailability(room.room_id, date)
      .then(data => {
        let free = (data.slots || []).filter(s => s.is_available);
        const today = format(new Date(), 'yyyy-MM-dd');
        if (date === today) {
          const now = format(new Date(), 'HH:mm');
          free = free.filter(s => s.start_time.slice(11, 16) >= now);
        }
        setSlots(free);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [room.room_id, date]);

  const isAdmin = user?.role === 'admin';
  const canBook = (room.allowed_users?.length || 0) === 0 || isAdmin || (user && (room.allowed_users || []).includes(user.user_id));

  // Attendee helper handlers
  const handleAddAttendee = () => {
    setAttendees(prev => [
      ...prev,
      { id: `att_${Date.now()}_${prev.length}`, name: '', email: '', phone: '', touchedEmail: false }
    ]);
  };

  const handleUpdateAttendee = (index, field, value) => {
    setAttendees(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [field]: value,
        ...(field === 'email' ? { touchedEmail: true } : {})
      };
      return copy;
    });
  };

  const handleRemoveAttendee = (index) => {
    setAttendees(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = async () => {
    if (!selectedSlot && (!ibStart || !ibEnd)) return;
    const st = ibStart || selectedSlot?.start_time;
    const et = ibEnd || selectedSlot?.end_time;

    // Filter filled attendees
    const filledAttendees = attendees.filter(a => a.name.trim() || a.email.trim() || a.phone.trim());

    // Validate email for all filled attendees
    for (let i = 0; i < filledAttendees.length; i++) {
      const att = filledAttendees[i];
      if (!att.name.trim()) {
        setError(`Attendee #${i + 1} requires a name.`);
        return;
      }
      if (!att.email.trim() || !isValidEmail(att.email)) {
        setError(`Attendee "${att.name || i + 1}" has an invalid email format. Example: user@apexon.com`);
        return;
      }
    }

    setBooking(true);
    setError('');
    try {
      const formattedAttendees = filledAttendees.map((a, idx) => ({
        id: a.id || `att_${Date.now()}_${idx}`,
        name: a.name.trim(),
        email: a.email.trim(),
        phone: a.phone.trim(),
        qr_pass_code: `QR-MEET-${room.room_id.slice(-4)}-${Date.now().toString().slice(-6)}-${idx + 1}`
      }));

      const resBooking = await createBooking({
        title: title.trim() || 'Meeting',
        room_id: room.room_id,
        user_id: user.user_id,
        start_time: st,
        end_time: et,
        notes: meetingDescription,
        cost_centre: costCentre.trim(),
        meeting_type: meetingType,
        meeting_description: meetingDescription,
        send_qr: sendQR,
        attendees: formattedAttendees,
        recurrence,
        recurrence_count: recurrenceCount
      });

      const meetingTitle = title.trim() || 'Meeting';
      setSuccess(`Booked! ${room.name} (${recurrence !== 'none' ? `${recurrenceCount} recurring sessions` : 'single session'})`);

      // Show QR Pass Modal if sendQR is checked and attendees exist
      if (sendQR && formattedAttendees.length > 0) {
        setQrPassModalData({
          bookingId: resBooking?.booking_id || `bkg_${Date.now()}`,
          roomName: room.name,
          date,
          startTime: st.slice(11, 16),
          endTime: et.slice(11, 16),
          title: meetingTitle,
          attendees: formattedAttendees
        });
      } else {
        setTimeout(() => { onBooked?.(); }, 1000);
      }

      setSelectedSlot(null);
      setIbStart(null);
      setIbEnd(null);
      setTitle('');
      setMeetingType('Internal Meeting');
      setMeetingDescription('');
      setCostCentre('');
      setSendQR(true);
      setAttendees([{ id: 'att_1', name: '', email: '', phone: '', touchedEmail: false }]);
      setRecurrence('none');
      setRecurrenceCount(1);
      setIbMsg({ type: '', text: '' });
    } catch (e) {
      setError(e.status === 409 ? 'Slot conflict or room already booked. Try another time or room.' : (e.detail || e.message));
    } finally { setBooking(false); }
  };

  const buildDateTime = (date, time) => `${date}T${time}:00`;

  // Helper: Convert 12-hour format to 24-hour format
  const convertTo24Hour = (hour, ampm) => {
    let hr = parseInt(hour, 10);
    if (ampm === 'AM') {
      if (hr === 12) hr = 0;
    } else {
      if (hr !== 12) hr += 12;
    }
    return hr.toString().padStart(2, '0');
  };

  // Helper: Convert 24-hour format to 12-hour format
  const convertTo12Hour = (hr24) => {
    let hr = parseInt(hr24, 10);
    const ampm = hr >= 12 ? 'PM' : 'AM';
    if (hr === 0) hr = 12;
    else if (hr > 12) hr -= 12;
    return { hour: hr.toString().padStart(2, '0'), ampm };
  };

  // Helper: Check if a datetime string is in the past
  const _isTimePassed = (dateTimeStr) => {
    return new Date(dateTimeStr) <= new Date();
  };

  // Helper: Get valid time options (filter out past times for today)
  const getValidTimeOptions = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const now = format(new Date(), 'HH:mm');

    if (date === today) {
      // Filter out times that have already passed
      return TIME_OPTIONS.filter(opt => opt.value >= now);
    }
    // All times available for future dates
    return TIME_OPTIONS;
  };

  // Helper: Check if end time is valid (after start time)
  const isEndTimeValid = (startTime, endTime) => {
    if (!startTime || !endTime) return false;
    return new Date(endTime) > new Date(startTime);
  };

  // Handle Start Time Selection
  const handleStartTimeChange = (timeValue) => {
    if (!timeValue) {
      setIbStart(null);
      setIbEnd(null);
      setIbMsg({ type: '', text: '' });
      return;
    }

    const selectedDateTime = buildDateTime(date, timeValue);
    setIbStart(selectedDateTime);
    setIbEnd(null); // Reset end time when start time changes
    setIbMsg({ type: '', text: '' });
    const { hour, ampm } = convertTo12Hour(timeValue.split(':')[0]);
    setIbStartHour(hour);
    setIbStartMin(timeValue.split(':')[1]);
    setIbStartAMPM(ampm);
  };

  // Handle End Time Selection
  const handleEndTimeChange = (timeValue) => {
    if (!timeValue) {
      setIbEnd(null);
      setIbMsg({ type: '', text: '' });
      return;
    }

    const selectedDateTime = buildDateTime(date, timeValue);

    // Validate: end time must be after start time
    if (!isEndTimeValid(ibStart, selectedDateTime)) {
      setIbMsg({
        type: 'error',
        text: 'End time must be after start time.',
      });
      return;
    }

    setIbEnd(selectedDateTime);
    setIbMsg({ type: '', text: '' });
    const { hour, ampm } = convertTo12Hour(timeValue.split(':')[0]);
    setIbEndHour(hour);
    setIbEndMin(timeValue.split(':')[1]);
    setIbEndAMPM(ampm);
  };

  // Handle manual start time input (12-hour format)
  const _handleManualStartTime = () => {
    const hr24 = convertTo24Hour(ibStartHour, ibStartAMPM);
    const timeValue = `${hr24}:${ibStartMin}`;
    handleStartTimeChange(timeValue);
  };

  // Handle manual end time input (12-hour format)
  const _handleManualEndTime = () => {
    const hr24 = convertTo24Hour(ibEndHour, ibEndAMPM);
    const timeValue = `${hr24}:${ibEndMin}`;
    handleEndTimeChange(timeValue);
  };

  // Check if selected range has any unavailable slot
  const isUnavailable = slots
    .filter(slot => slot.start_time >= ibStart && slot.end_time <= ibEnd)
    .some(slot => !slot.is_available);

  // Decide color + icon
  const textColor = isUnavailable
    ? theme === "dark"
      ? "text-red-400"
      : "text-red-600"
    : theme === "dark"
      ? "text-emerald-400"
      : "text-emerald-700";

  const icon = isUnavailable ? "❌" : "📅";



  return (
    <div ref={pickerRef} className="animate-fade-up mt-4 scroll-mt-24">
      <div className={`h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent mb-5`} />

      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'} flex items-center gap-2`}>
          ⚡ Pick a Time Slot — {room.name}
        </h3>
        <button onClick={onClose}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${theme === 'dark'
            ? 'border-[#1e2a45] text-slate-400 hover:border-rose-500 hover:text-rose-400'
            : 'border-gray-300 text-slate-600 hover:border-rose-500 hover:text-rose-600'
            }`}>
          ✖ Close
        </button>
      </div>

      {/* Date picker */}
      <div className="mb-4">
        <label className={`block text-xs font-semibold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'} uppercase tracking-wider mb-1.5`}>Date</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className={`px-4 py-2.5 rounded-xl ${theme === 'dark'
            ? 'bg-[#0a0f1e] border-[#1e2a45] text-slate-100 focus:border-indigo-500'
            : 'bg-white border-gray-300 text-slate-900 focus:border-indigo-500'
            } border text-sm outline-none transition-all`} />
      </div>

      <div className="grid grid-cols-2 gap-6 mb-4">
        <datalist id="time-options-slot">
          {getValidTimeOptions().map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </datalist>

        {/* START TIME */}
        <div className={`${theme === 'dark' ? 'bg-[#0b1224] border-[#1e2a45]' : 'bg-gray-50 border-gray-200'} border rounded-2xl p-4`}>
          <div className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'} mb-2`}>
            Start Time
          </div>

          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${theme === 'dark'
            ? 'bg-[#070c1a] border-[#1e2a45]'
            : 'bg-white border-gray-300'
            } border mb-3`}>
            <span className={theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}>🕒</span>
            <input
              type="time"
              list="time-options-slot"
              required
              value={ibStart ? ibStart.slice(11, 16) : ""}
              onChange={e => handleStartTimeChange(e.target.value)}
              className={`bg-transparent w-full ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'} text-sm outline-none cursor-pointer`}
            />
          </div>
        </div>

        {/* END TIME */}
        <div className={`${theme === 'dark' ? 'bg-[#0b1224] border-[#1e2a45]' : 'bg-gray-50 border-gray-200'} border rounded-2xl p-4`}>
          <div className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'} mb-2`}>
            End Time
          </div>

          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${theme === 'dark'
            ? 'bg-[#070c1a] border-[#1e2a45]'
            : 'bg-white border-gray-300'
            } border mb-3`}>
            <span className={theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}>🕒</span>
            <input
              type="time"
              list="time-options-slot"
              required
              disabled={!ibStart}
              value={ibEnd ? ibEnd.slice(11, 16) : ""}
              onChange={e => handleEndTimeChange(e.target.value)}
              className={`bg-transparent w-full ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'} text-sm outline-none cursor-pointer`}
            />
          </div>
        </div>

      </div>

      {error && (
        <div className={`mb-3 px-4 py-2 rounded-xl ${theme === 'dark'
          ? 'bg-rose-500/8 border-rose-500/20 text-rose-400'
          : 'bg-rose-100 border-rose-300 text-rose-700'
          } border text-sm`}>❌ {error}</div>
      )}
      {!canBook && (
        <div className={`mb-3 px-4 py-2 rounded-xl ${theme === 'dark'
          ? 'bg-amber-500/8 border-amber-500/20 text-amber-400'
          : 'bg-amber-50 border-amber-300 text-amber-700'
          } border text-sm`}>🔒 Booking restricted to specific users for this room.</div>
      )}
      {success && (
        <div className={`mb-3 px-4 py-2 rounded-xl ${theme === 'dark'
          ? 'bg-emerald-500/8 border-emerald-500/20 text-emerald-400'
          : 'bg-emerald-100 border-emerald-300 text-emerald-700'
          } border text-sm`}>✅ {success}</div>
      )}

      {/* Confirm form */}
      {ibStart && ibEnd && (
        <div className="animate-fade-in">
          <div className={`px-4 py-3 rounded-xl ${theme === 'dark'
            ? 'bg-emerald-500/8 border-emerald-500/20'
            : 'bg-emerald-100 border-emerald-300'
            } border mb-4`}>

            <div className={`text-sm font-semibold ${textColor}`}>
              {icon} {room.name} · {date} · {ibStart.slice(11, 16)} – {ibEnd.slice(11, 16)}
            </div>

          </div>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className={`block text-xs font-semibold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'} uppercase tracking-wider mb-1.5`}>Meeting Title</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Sprint Planning"
                className={`w-full px-4 py-2.5 rounded-xl ${theme === 'dark'
                  ? 'bg-[#0a0f1e] border-[#1e2a45] text-slate-100 placeholder-slate-600 focus:border-indigo-500'
                  : 'bg-white border-gray-300 text-slate-900 placeholder-slate-400 focus:border-indigo-500'
                  } border text-sm outline-none transition-all`} />
            </div>
            <div className="flex-1">
              <label className={`block text-xs font-semibold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'} uppercase tracking-wider mb-1.5`}>Cost Centre</label>
              <input type="text" value={costCentre} onChange={e => setCostCentre(e.target.value)}
                placeholder="e.g. CC-1234"
                className={`w-full px-4 py-2.5 rounded-xl ${theme === 'dark'
                  ? 'bg-[#0a0f1e] border-[#1e2a45] text-slate-100 placeholder-slate-600 focus:border-indigo-500'
                  : 'bg-white border-gray-300 text-slate-900 placeholder-slate-400 focus:border-indigo-500'
                  } border text-sm outline-none transition-all`} />
            </div>
          </div>
          {/* ATTENDEES & QR PASS SECTION */}
          <div className={`p-4 rounded-2xl mb-4 border ${
            theme === 'dark'
              ? 'bg-[#0a0f1e]/90 border-indigo-500/20'
              : 'bg-indigo-50/50 border-indigo-100'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" />
                <span className={`text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-indigo-300' : 'text-indigo-900'}`}>
                  Meeting Attendees (QR Pass via Email & SMS)
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddAttendee}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm"
              >
                <UserPlus size={13} />
                <span>Add Attendee</span>
              </button>
            </div>

            <div className="space-y-3">
              {attendees.map((att, idx) => {
                const isEmailValid = att.email ? isValidEmail(att.email) : null;
                return (
                  <div
                    key={att.id || idx}
                    className={`p-3 rounded-xl border transition-all ${
                      theme === 'dark'
                        ? 'bg-[#070c1a] border-[#1e2a45]'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-indigo-500">
                        Attendee #{idx + 1}
                      </span>
                      {attendees.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAttendee(idx)}
                          className="text-rose-500 hover:text-rose-600 p-1 text-xs transition-colors flex items-center gap-1"
                          title="Remove Attendee"
                        >
                          <Trash2 size={13} />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Name */}
                      <div>
                        <label className={`block text-[0.7rem] font-medium mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                          Full Name *
                        </label>
                        <input
                          type="text"
                          value={att.name}
                          onChange={(e) => handleUpdateAttendee(idx, 'name', e.target.value)}
                          placeholder="e.g. Rahul Sharma"
                          className={`w-full px-3 py-2 rounded-lg text-xs border outline-none ${
                            theme === 'dark'
                              ? 'bg-[#0a0f1e] border-[#1e2a45] text-slate-100 placeholder-slate-600 focus:border-indigo-500'
                              : 'bg-slate-50 border-gray-300 text-slate-900 placeholder-slate-400 focus:border-indigo-500'
                          }`}
                        />
                      </div>

                      {/* Email with Validation Feedback */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className={`block text-[0.7rem] font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                            Email Address *
                          </label>
                          {att.email && (
                            <span className="text-[0.65rem] flex items-center gap-1">
                              {isEmailValid ? (
                                <span className="text-emerald-500 font-medium flex items-center gap-0.5">
                                  <CheckCircle2 size={11} /> Valid Email
                                </span>
                              ) : (
                                <span className="text-rose-500 font-medium flex items-center gap-0.5">
                                  <AlertCircle size={11} /> Invalid Email
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <input
                            type="email"
                            value={att.email}
                            onChange={(e) => handleUpdateAttendee(idx, 'email', e.target.value)}
                            placeholder="rahul.sharma@apexon.com"
                            className={`w-full px-3 py-2 pr-8 rounded-lg text-xs border outline-none transition-all ${
                              att.email && !isEmailValid
                                ? 'border-rose-500 bg-rose-500/5 text-rose-300'
                                : att.email && isEmailValid
                                ? 'border-emerald-500 bg-emerald-500/5'
                                : theme === 'dark'
                                ? 'bg-[#0a0f1e] border-[#1e2a45] text-slate-100 placeholder-slate-600 focus:border-indigo-500'
                                : 'bg-slate-50 border-gray-300 text-slate-900 placeholder-slate-400 focus:border-indigo-500'
                            }`}
                          />
                          <Mail size={13} className="absolute right-2.5 top-2.5 text-slate-400 opacity-60" />
                        </div>
                      </div>

                      {/* Phone Number */}
                      <div>
                        <label className={`block text-[0.7rem] font-medium mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                          Phone / Mobile (SMS QR) *
                        </label>
                        <div className="relative">
                          <input
                            type="tel"
                            value={att.phone}
                            onChange={(e) => handleUpdateAttendee(idx, 'phone', e.target.value)}
                            placeholder="+91 9876543210"
                            className={`w-full px-3 py-2 pr-8 rounded-lg text-xs border outline-none ${
                              theme === 'dark'
                                ? 'bg-[#0a0f1e] border-[#1e2a45] text-slate-100 placeholder-slate-600 focus:border-indigo-500'
                                : 'bg-slate-50 border-gray-300 text-slate-900 placeholder-slate-400 focus:border-indigo-500'
                            }`}
                          />
                          <Phone size={13} className="absolute right-2.5 top-2.5 text-slate-400 opacity-60" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={`block text-xs font-semibold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'} uppercase tracking-wider mb-1.5`}>Meeting Type</label>
              <select
                value={meetingType}
                onChange={(e) => setMeetingType(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl ${theme === 'dark'
                  ? 'bg-[#0a0f1e] border-[#1e2a45] text-slate-100'
                  : 'bg-white border-gray-300 text-slate-900'
                  } border text-sm outline-none transition-all`}>
                <option>Internal Meeting</option>
                <option>External Meeting</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-3 cursor-pointer p-2 rounded-xl border border-indigo-500/20 bg-indigo-500/5">
                <input
                  type="checkbox"
                  checked={sendQR}
                  onChange={(e) => setSendQR(e.target.checked)}
                  className="h-4 w-4 accent-indigo-600"
                />
                <span className={`text-xs font-semibold flex items-center gap-1.5 ${theme === 'dark' ? 'text-indigo-300' : 'text-indigo-800'}`}>
                  <QrCode size={14} className="text-indigo-500" />
                  Auto-Send QR Entry Pass to Attendees via Email & SMS
                </span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={`block text-xs font-semibold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'} uppercase tracking-wider mb-1.5`}>Recurring Booking</label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl ${theme === 'dark'
                  ? 'bg-[#0a0f1e] border-[#1e2a45] text-slate-100'
                  : 'bg-white border-gray-300 text-slate-900'
                  } border text-sm outline-none transition-all`}>
                <option value="none">One-time Meeting (No Repeat)</option>
                <option value="daily">Repeat Daily (Weekdays)</option>
                <option value="weekly">Repeat Weekly</option>
                <option value="biweekly">Repeat Bi-weekly</option>
                <option value="monthly">Repeat Monthly</option>
              </select>
            </div>

            {recurrence !== 'none' && (
              <div>
                <label className={`block text-xs font-semibold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'} uppercase tracking-wider mb-1.5`}>Number of Occurrences</label>
                <select
                  value={recurrenceCount}
                  onChange={(e) => setRecurrenceCount(Number(e.target.value))}
                  className={`w-full px-4 py-2.5 rounded-xl ${theme === 'dark'
                    ? 'bg-[#0a0f1e] border-[#1e2a45] text-slate-100'
                    : 'bg-white border-gray-300 text-slate-900'
                    } border text-sm outline-none transition-all`}>
                  {[2, 3, 4, 5, 6, 8, 10].map(cnt => (
                    <option key={cnt} value={cnt}>{cnt} Sessions ({recurrence})</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="mb-4">
            <label className={`block text-xs font-semibold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'} uppercase tracking-wider mb-1.5`}>Meeting Description</label>
            <textarea
              rows={3}
              value={meetingDescription}
              onChange={(e) => setMeetingDescription(e.target.value)}
              placeholder="Enter meeting agenda or description"
              className={`w-full px-4 py-2.5 rounded-xl ${theme === 'dark'
                ? 'bg-[#0a0f1e] border-[#1e2a45] text-slate-100 placeholder-slate-600'
                : 'bg-white border-gray-300 text-slate-900 placeholder-slate-400'
                } border text-sm outline-none transition-all`} />
          </div>
          <div className="flex gap-3 items-end">
            <button onClick={handleConfirm} disabled={booking || !canBook}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-sm hover:from-emerald-600 hover:to-teal-600 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-500/25 disabled:opacity-50 whitespace-nowrap">
              {booking ? '⏳ Processing...' : '✅ Confirm Booking & Dispatch QR Passes'}
            </button>
            <button onClick={() => setSelectedSlot(null)}
              className={`px-4 py-2.5 rounded-xl border text-sm transition-all ${theme === 'dark'
                ? 'border-[#1e2a45] text-slate-400 hover:border-rose-500 hover:text-rose-400'
                : 'border-gray-300 text-slate-600 hover:border-rose-500 hover:text-rose-600'
                }`}>
              ✖
            </button>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL: ATTENDEE QR PASS DISPATCH PREVIEW */}
      {qrPassModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className={`max-w-2xl w-full rounded-3xl border shadow-2xl p-6 relative overflow-hidden ${
            theme === 'dark'
              ? 'bg-[#0f172a] border-[#1e2a45] text-slate-100'
              : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold">Meeting Booked & QR Passes Sent!</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {qrPassModalData.roomName} · {qrPassModalData.date} ({qrPassModalData.startTime} – {qrPassModalData.endTime})
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setQrPassModalData(null);
                  onBooked?.();
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Notification alert */}
            <div className="my-4 p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between text-xs text-indigo-400">
              <div className="flex items-center gap-2">
                <Send size={14} className="animate-pulse text-indigo-400" />
                <span>QR Passes dispatched via Email & SMS to all {qrPassModalData.attendees.length} attendee(s).</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[0.65rem] font-bold">
                ✓ Delivered
              </span>
            </div>

            {/* Attendees Cards List */}
            <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
              {qrPassModalData.attendees.map((att, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                    theme === 'dark' ? 'bg-[#070c1a] border-[#1e2a45]' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-indigo-400 truncate">{att.name}</div>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Mail size={12} className="text-indigo-400" /> {att.email}
                      </span>
                      {att.phone && (
                        <span className="flex items-center gap-1">
                          <Phone size={12} className="text-emerald-400" /> {att.phone}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 text-[0.65rem] font-semibold border border-indigo-500/20 flex items-center gap-1">
                        <Mail size={10} /> Email QR Sent
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[0.65rem] font-semibold border border-emerald-500/20 flex items-center gap-1">
                        <Phone size={10} /> SMS QR Sent
                      </span>
                    </div>
                  </div>

                  {/* QR Pass */}
                  <div className="p-2 bg-white rounded-xl shadow-md border border-slate-200 flex flex-col items-center flex-shrink-0">
                    <QRCodeSVG
                      value={JSON.stringify({
                        pass: att.qr_pass_code || `QR-${i}`,
                        attendee: att.name,
                        room: qrPassModalData.roomName,
                        date: qrPassModalData.date,
                        time: `${qrPassModalData.startTime}-${qrPassModalData.endTime}`
                      })}
                      size={64}
                      level="M"
                    />
                    <span className="text-[0.6rem] font-mono text-slate-600 mt-1 font-bold">
                      {att.qr_pass_code ? att.qr_pass_code.slice(-8) : `PASS-${i+1}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Buttons */}
            <div className="mt-5 flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => {
                  setQrPassModalData(null);
                  onBooked?.();
                }}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all shadow-md"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
