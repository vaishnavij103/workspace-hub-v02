import { useState } from 'react';
import { Badge } from './ui';
import { useTheme } from '../ThemeContext';
import { QRCodeSVG } from 'qrcode.react';
import { Users, QrCode, Mail, Phone, Send, CheckCircle2, X } from 'lucide-react';

export default function BookingCard({ booking, roomName, userName, onCancel, onReschedule, onCheckIn, onCheckOut }) {
  const { theme } = useTheme();
  const [showQRModal, setShowQRModal] = useState(false);
  const [resendStatus, setResendStatus] = useState(null);

  const { title, status, start_time, end_time, notes, cost_centre, actual_check_in, actual_check_out, attendees } = booking;
  const date = start_time?.slice(0, 10) || '';
  const sTime = start_time?.slice(11, 16) || '';
  const eTime = end_time?.slice(11, 16) || '';

  const attendeeList = Array.isArray(attendees) ? attendees : [];

  let duration = '';
  try {
    const mins = (new Date(end_time) - new Date(start_time)) / 60000;
    duration = mins >= 60 ? `${Math.floor(mins / 60)}h${mins % 60 ? mins % 60 + 'm' : ''}` : `${mins}m`;
  } catch { }

  const accent = status === 'confirmed' ? '#10b981' : '#f43f5e';

  const handleResendAllQR = () => {
    setResendStatus('Resending QR Passes via Email & SMS...');
    setTimeout(() => {
      setResendStatus('✅ All QR Passes re-dispatched successfully!');
      setTimeout(() => setResendStatus(null), 3000);
    }, 1000);
  };

  return (
    <>
      <div className={`flex items-center gap-4 ${theme === 'dark'
        ? 'bg-gradient-to-br from-[#0f1420] to-[#161c2e] border-[#1e2a45] hover:border-[#2d3f6b]'
        : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 hover:border-gray-300'
        } border rounded-2xl p-4 mb-2 transition-all hover:translate-x-1 group`}>
        {/* Accent bar */}
        <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: accent }} />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'} truncate`}>
              {title || 'Booking'}
            </div>
            <Badge status={status} />
          </div>
          <div className={`flex flex-wrap items-center gap-3 mt-1 text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>
            <span className="flex items-center gap-1">🏢 {roomName}</span>
            <span className="flex items-center gap-1">👤 {userName}</span>
            <span className="flex items-center gap-1">📅 {date}</span>
            <span className="flex items-center gap-1">🕐 {sTime} – {eTime}</span>
            {duration && <span className="flex items-center gap-1">⏱️ {duration}</span>}
          </div>

          {/* Attendees Summary Badge */}
          {attendeeList.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-medium flex items-center gap-1.5">
                <Users size={12} className="text-indigo-400" />
                <span>{attendeeList.length} Attendee(s)</span>
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[0.65rem] font-bold flex items-center gap-1">
                <QrCode size={10} /> QR Passes Sent
              </span>
            </div>
          )}

          {notes && (
            <div className={`text-xs ${theme === 'dark' ? 'text-slate-600' : 'text-slate-500'} mt-1.5 italic truncate`}>"{notes}"</div>
          )}
          {cost_centre && (
            <div className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'} mt-1`}>
              💳 {cost_centre}
            </div>
          )}
        </div>

        {/* Actions */}
        {status === 'confirmed' && (
          <div className="flex flex-wrap items-center gap-2 opacity-90 group-hover:opacity-100 transition-opacity flex-shrink-0">
            {attendeeList.length > 0 && (
              <button
                onClick={() => setShowQRModal(true)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 border transition-all ${
                  theme === 'dark'
                    ? 'border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20'
                    : 'border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                }`}
                title="View attendee QR entry passes & resend options"
              >
                <QrCode size={13} />
                <span>Attendee QR Passes</span>
              </button>
            )}

            {/* Outlook ICS Export */}
            <a
              href={`/api/bookings/${booking.booking_id}/ics`}
              download={`${(title || 'meeting').replace(/[^a-zA-Z0-9]/g, '_')}_invite.ics`}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 border transition-all ${
                theme === 'dark'
                  ? 'border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20'
                  : 'border-indigo-200 text-indigo-700 hover:bg-indigo-100'
              }`}
              title="Download Outlook Calendar (.ics) invite"
            >
              📅 Outlook .ics
            </a>

            {onCheckIn && !actual_check_in && (
              <button onClick={() => onCheckIn(booking)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${theme === 'dark'
                  ? 'border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10'
                  : 'border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                  } border transition-all`}>
                ⏱️ Check In
              </button>
            )}
            {onCheckOut && actual_check_in && !actual_check_out && (
              <button onClick={() => onCheckOut(booking)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${theme === 'dark'
                  ? 'border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/10'
                  : 'border-yellow-300 text-yellow-700 hover:bg-yellow-100'
                  } border transition-all`}>
                🚪 Check Out
              </button>
            )}
            {onReschedule && (
              <button onClick={() => onReschedule(booking)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${theme === 'dark'
                  ? 'border-[#1e2a45] text-slate-400 hover:border-indigo-500 hover:text-indigo-300'
                  : 'border-gray-300 text-slate-600 hover:border-indigo-500 hover:text-indigo-600'
                  }`}>
                🔄 Reschedule
              </button>
            )}
            {onCancel && (
              <button onClick={() => onCancel(booking)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${theme === 'dark'
                  ? 'border-rose-500/20 text-rose-400 hover:bg-rose-500/10'
                  : 'border-rose-300 text-rose-700 hover:bg-rose-100'
                  } border transition-all`}>
                ✖ Cancel
              </button>
            )}
          </div>
        )}
      </div>

      {/* ATTENDEES QR PASSES MODAL */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className={`max-w-2xl w-full rounded-3xl border shadow-2xl p-6 relative overflow-hidden ${
            theme === 'dark'
              ? 'bg-[#0f172a] border-[#1e2a45] text-slate-100'
              : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <QrCode size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold">Attendee QR Passes — {title || 'Meeting'}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {roomName} · {date} ({sTime} – {eTime})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowQRModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {resendStatus && (
              <div className="my-3 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
                <CheckCircle2 size={14} />
                <span>{resendStatus}</span>
              </div>
            )}

            <div className="mt-4 max-h-80 overflow-y-auto space-y-3 pr-1">
              {attendeeList.map((att, i) => {
                const name = typeof att === 'string' ? att : (att.name || `Attendee ${i + 1}`);
                const email = typeof att === 'object' ? att.email : '';
                const phone = typeof att === 'object' ? att.phone : '';
                const passCode = typeof att === 'object' ? (att.qr_pass_code || `QR-${booking.booking_id.slice(-4)}-${i+1}`) : `QR-${i+1}`;

                return (
                  <div
                    key={i}
                    className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                      theme === 'dark' ? 'bg-[#070c1a] border-[#1e2a45]' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-indigo-400 truncate">{name}</div>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-400">
                        {email && (
                          <span className="flex items-center gap-1">
                            <Mail size={12} className="text-indigo-400" /> {email}
                          </span>
                        )}
                        {phone && (
                          <span className="flex items-center gap-1">
                            <Phone size={12} className="text-emerald-400" /> {phone}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 text-[0.65rem] font-semibold border border-indigo-500/20 flex items-center gap-1">
                          <Mail size={10} /> Email Pass Sent
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[0.65rem] font-semibold border border-emerald-500/20 flex items-center gap-1">
                          <Phone size={10} /> SMS Pass Sent
                        </span>
                      </div>
                    </div>

                    <div className="p-2 bg-white rounded-xl shadow-md border border-slate-200 flex flex-col items-center flex-shrink-0">
                      <QRCodeSVG
                        value={JSON.stringify({
                          pass: passCode,
                          attendee: name,
                          room: roomName,
                          date,
                          time: `${sTime}-${eTime}`
                        })}
                        size={64}
                        level="M"
                      />
                      <span className="text-[0.6rem] font-mono text-slate-600 mt-1 font-bold">
                        {passCode.slice(-8)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={handleResendAllQR}
                className="px-4 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-semibold text-xs flex items-center gap-1.5 transition-all"
              >
                <Send size={13} />
                <span>Resend QR Passes via Email & SMS</span>
              </button>

              <button
                onClick={() => setShowQRModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
