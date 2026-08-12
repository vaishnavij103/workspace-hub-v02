import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import { useTheme } from '../ThemeContext';
import { PageHeader, Button, EmptyState } from '../components/ui';
import { getNotifications, markNotificationRead, markNotificationUnread, markAllNotificationsRead, markAllNotificationsUnread } from '../api';

export default function NotificationsPage() {
    const { user } = useAuth();
    const { theme } = useTheme();
    const [notifications, setNotifications] = useState([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        if (!user?.user_id) return;
        setLoading(true);
        setError('');
        try {
            const data = await getNotifications({ user_id: user.user_id, read: filter === 'all' ? '' : filter === 'read' ? true : false });
            setNotifications(data);
        } catch (e) {
            setError(e.detail || e.message || 'Failed to fetch notifications');
        } finally {
            setLoading(false);
        }
    }, [user, filter]);

    useEffect(() => {
        let isMounted = true;
        if (!user?.user_id) return;
        getNotifications({ user_id: user.user_id, read: filter === 'all' ? '' : filter === 'read' ? true : false })
            .then(data => { if (isMounted) { setNotifications(data); setLoading(false); } })
            .catch(e => { if (isMounted) { setError(e.detail || e.message || 'Failed to fetch notifications'); setLoading(false); } });
        return () => { isMounted = false; };
    }, [user, filter]);

    const handleMarkRead = async (id) => {
        try {
            await markNotificationRead(id);
            load();
        } catch (e) {
            setError(e.detail || e.message || 'Unable to mark notification read');
        }
    };

    const handleMarkUnread = async (id) => {
        try {
            await markNotificationUnread(id);
            load();
        } catch (e) {
            setError(e.detail || e.message || 'Unable to mark notification unread');
        }
    };

    const handleMarkAll = async (read) => {
        try {
            if (read) {
                await markAllNotificationsRead(user.user_id);
            } else {
                await markAllNotificationsUnread(user.user_id);
            }
            load();
        } catch (e) {
            setError(e.detail || e.message || 'Unable to update notifications');
        }
    };

    const unreadCount = notifications.filter((item) => !item.read_at).length;

    return (
        <div className="animate-fade-up">
            <PageHeader title="🔔 Notifications" subtitle="Read and manage real-time updates on bookings and admin alerts." />

            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                    {['all', 'unread', 'read'].map((value) => (
                        <button
                            key={value}
                            onClick={() => setFilter(value)}
                            className={`px-4 py-2 rounded-2xl text-sm font-semibold transition ${filter === value
                                ? 'bg-indigo-500 text-white'
                                : theme === 'dark'
                                    ? 'bg-[#0f1420] text-slate-300 border border-slate-800'
                                    : 'bg-white text-slate-700 border border-gray-200'
                                }`}
                        >
                            {value === 'all' ? 'All' : value === 'read' ? 'Read' : `Unread${unreadCount ? ` ${unreadCount}` : ''}`}
                        </button>
                    ))}
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => handleMarkAll(true)}
                        className="px-4 py-2 rounded-2xl bg-emerald-500 text-white text-sm font-semibold transition hover:bg-emerald-600"
                    >
                        Mark all read
                    </button>
                    <button
                        onClick={() => handleMarkAll(false)}
                        className="px-4 py-2 rounded-2xl bg-slate-700 text-white text-sm font-semibold transition hover:bg-slate-800"
                    >
                        Mark all unread
                    </button>
                </div>
            </div>

            {error && <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

            {loading ? (
                <div className="text-center py-20 text-slate-500">Loading notifications…</div>
            ) : notifications.length === 0 ? (
                <EmptyState icon="🔕" text={filter === 'unread' ? 'No unread notifications.' : 'No notifications yet.'} />
            ) : (
                <div className="space-y-4">
                    {notifications.map((notification) => {
                        const isRead = Boolean(notification.read_at);
                        const timeLabel = new Date(notification.created_at).toLocaleString();
                        const accentColor = isRead ? 'bg-slate-400/70' : 'bg-indigo-500';
                        const statusLabel = isRead ? 'Read' : 'Unread';
                        const cardBg = theme === 'dark' ? 'border-slate-700 bg-slate-950 text-slate-100' : 'border-gray-200 bg-white text-slate-900';
                        const bodyText = theme === 'dark' ? 'text-slate-300' : 'text-slate-600';
                        const mutedText = theme === 'dark' ? 'text-slate-400' : 'text-slate-500';
                        const qrDataUrl = notification.metadata?.qr_data_url;

                        return (
                            <div key={notification.notification_id} className={`relative overflow-hidden rounded-[2rem] border p-5 shadow-sm transition duration-200 hover:shadow-xl sm:px-6 sm:py-5 ${cardBg}`}>
                                <div className={`absolute left-0 top-4 bottom-4 w-1 ${accentColor}`} />
                                <div className="relative ml-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="space-y-4">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <div className="text-base font-semibold">{notification.title}</div>
                                                <p className={`mt-2 max-w-2xl text-sm leading-7 ${bodyText}`}>{notification.message}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`inline-flex items-center rounded-full px-3 py-1 text-[0.72rem] font-semibold ${isRead ? 'bg-slate-800 text-slate-300' : 'bg-indigo-500 text-white'}`}>
                                                    {statusLabel}
                                                </span>
                                            </div>
                                        </div>
                                        {qrDataUrl && (
                                            <div className={`rounded-2xl border p-4 ${theme === 'dark' ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-slate-50'}`}>
                                                <div className={`text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                                                    QR Code for meeting
                                                </div>
                                                <img
                                                    src={qrDataUrl}
                                                    alt="Meeting QR Code"
                                                    className="mx-auto h-48 w-48 rounded-xl bg-white p-2 shadow-sm"
                                                />
                                                <p className={`mt-3 text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                                    Scan this QR code to share meeting details with invitees.
                                                </p>
                                            </div>
                                        )}
                                        <div className={`flex flex-wrap items-center gap-3 text-sm ${mutedText}`}>
                                            <span>{timeLabel}</span>
                                            {notification.related_booking_id && (
                                                <span className="rounded-full border border-current/10 px-2 py-0.5">Booking update</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 justify-start lg:justify-end">
                                        {isRead ? (
                                            <button
                                                onClick={() => handleMarkUnread(notification.notification_id)}
                                                className="rounded-full border border-slate-600/40 bg-transparent px-3 py-2 text-xs font-semibold transition hover:border-slate-500 hover:bg-slate-900/80"
                                            >
                                                Mark unread
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleMarkRead(notification.notification_id)}
                                                className="rounded-full bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700"
                                            >
                                                Mark read
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {notifications.length > 0 && (
                <div className="mt-6 text-sm text-slate-500">{unreadCount} unread notification{unreadCount === 1 ? '' : 's'}.</div>
            )}
        </div>
    );
}
