import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import {
    Button,
    Select,
    MenuItem,
    FormControl,
    Menu,
    Badge
} from "@mui/material";
import { MapPin, Bell, Moon, Sun, User, LogOut, Settings } from "lucide-react";

import { useLocation } from "../LocationContext";
import { useTheme } from "../ThemeContext";
import { getNotifications } from '../api';

const locations = [
    "Pune",
    "Mumbai",
    "Ahmedabad",
    "Coimbatore",
    "Hyderabad",
    "Bangalore(Domlur)",
    "Bangalore(Signet)",
    "Chennai",
];



export function Navbar() {
    const navigate = useNavigate();
    const { location, setLocation } = useLocation();
    const { theme, toggleTheme } = useTheme();
    const [notifAnchor, setNotifAnchor] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const { user, isAdmin, logout } = useAuth();
    const initials = user?.name?.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) || '?';
    const [profileAnchor, setProfileAnchor] = useState(null);

    const handleLogout = () => { logout(); navigate('/login'); };

    useEffect(() => {
        if (!user?.user_id) return;
        getNotifications({ user_id: user.user_id, read: false })
            .then((items) => {
                setNotifications(items.slice(0, 4));
                setUnreadCount(items.length);
            })
            .catch(() => {
                setUnreadCount(0);
            });
    }, [user]);

    return (

        <nav className={`h-16 flex items-center justify-between px-8 border-b sticky top-0 z-30 ${theme === "dark"
            ? "bg-[#020817] text-gray-200 border-gray-800"
            : "bg-white text-gray-900 border-gray-200"}`}>


            {/* LEFT */}
            <div className="flex items-center gap-6 flex-1">

                {/* Location Selector */}
                <div className="flex items-center gap-2.5 min-w-[210px]">
                    <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center flex-shrink-0">
                        <MapPin size={16} />
                    </div>

                    <FormControl size="small" fullWidth>
                        <Select
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            sx={{
                                height: "38px",
                                fontSize: "0.85rem",
                                fontWeight: 600,
                                color: theme === "dark" ? "#f1f5f9" : "#0f172a",
                                borderRadius: "0.75rem",
                                backgroundColor: theme === "dark" ? "rgba(15, 23, 42, 0.6)" : "rgba(241, 245, 249, 0.9)",
                                "& .MuiSelect-select": {
                                    py: "6px",
                                    px: "12px",
                                    display: "flex",
                                    alignItems: "center",
                                },
                                "& .MuiOutlinedInput-notchedOutline": {
                                    borderColor: theme === "dark" ? "rgba(30, 42, 69, 0.8)" : "rgba(226, 232, 240, 1)"
                                },
                                "&:hover .MuiOutlinedInput-notchedOutline": {
                                    borderColor: theme === "dark" ? "rgba(99, 102, 241, 0.5)" : "rgba(99, 102, 241, 0.5)"
                                },
                                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                                    borderColor: "#6366f1"
                                }
                            }}
                        >
                            {locations.map((loc) => (
                                <MenuItem key={loc} value={loc} sx={{ fontSize: "0.85rem", fontWeight: 500, py: 1 }}>
                                    {loc}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </div>
            </div>

            {/* RIGHT */}
            <div className="flex items-center gap-3">

                {/* Theme Toggle */}
                <Button
                    onClick={toggleTheme}
                    sx={{ minWidth: 0, color: theme === "dark" ? "white" : "black" }}
                    title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
                >
                    {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
                </Button>

                {/* Notification */}
                <Button
                    onClick={(e) => setNotifAnchor(e.currentTarget)}
                    sx={{ minWidth: 0, color: theme === "dark" ? "white" : "black" }}
                >
                    <Badge color="error" badgeContent={unreadCount || null} showZero={false}>
                        <Bell size={18} />
                    </Badge>
                </Button>

                {/* Notification Menu */}
                <Menu
                    anchorEl={notifAnchor}
                    open={Boolean(notifAnchor)}
                    onClose={() => setNotifAnchor(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    slotProps={{
                        paper: {
                            sx: {
                                mt: 1.5,
                                bgcolor: theme === 'dark' ? '#0f1420' : '#ffffff',
                                color: theme === 'dark' ? '#f8fafc' : '#0f172a',
                                border: '1px solid',
                                borderColor: theme === 'dark' ? '#1e2a45' : '#e2e8f0',
                                borderRadius: '1rem',
                                minWidth: '280px',
                                boxShadow: theme === 'dark' ? '0 10px 15px -3px rgba(0, 0, 0, 0.5)' : '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                            }
                        }
                    }}
                >
                    <div className={`px-4 py-3 border-b text-sm font-bold ${theme === 'dark' ? 'border-[#1e2a45]' : 'border-gray-100'}`}>
                        Notifications
                    </div>
                    {notifications.length === 0 ? (
                        <MenuItem onClick={() => setNotifAnchor(null)} sx={{ fontSize: '0.8rem', py: 1.5 }}>
                            <span className="mr-2">🔕</span> No new notifications.
                        </MenuItem>
                    ) : notifications.map((notification) => (
                        <MenuItem
                            key={notification.notification_id}
                            onClick={() => {
                                setNotifAnchor(null);
                                navigate('/notifications');
                            }}
                            sx={{ fontSize: '0.8rem', py: 1.5, alignItems: 'flex-start' }}
                        >
                            <div className="font-semibold truncate" style={{ maxWidth: 220 }}>{notification.title}</div>
                            <div className="text-[0.75rem] text-slate-500 truncate" style={{ maxWidth: 220 }}>
                                {notification.message}
                            </div>
                        </MenuItem>
                    ))}
                    <MenuItem
                        onClick={() => {
                            setNotifAnchor(null);
                            navigate('/notifications');
                        }}
                        sx={{ fontSize: '0.8rem', py: 1.5, justifyContent: 'center' }}
                    >
                        View all notifications
                    </MenuItem>
                </Menu>
                {/* User info */}
                <div className="flex items-center px-3 py-2 rounded-xl">
                    {/* Profile Avatar */}
                    <Button
                        onClick={(e) => setProfileAnchor(e.currentTarget)}
                        sx={{
                            minWidth: 0,
                            p: 0.4,
                            borderRadius: "999px",
                        }}
                    >
                        <div className="relative">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center 
        bg-gradient-to-br from-indigo-500 to-purple-500 
        text-sm font-semibold text-white shadow-md">
                                {initials}
                            </div>
                        </div>
                    </Button>

                    {/* Profile Menu */}
                    <Menu
                        anchorEl={profileAnchor}
                        open={Boolean(profileAnchor)}
                        onClose={() => setProfileAnchor(null)}
                        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                        transformOrigin={{ vertical: "top", horizontal: "right" }}
                        slotProps={{
                            paper: {
                                sx: {
                                    mt: 1.5,
                                    width: 280,
                                    borderRadius: "16px",
                                    overflow: "hidden",
                                    bgcolor: theme === "dark" ? "#0f172a" : "#ffffff",
                                    color: theme === "dark" ? "#f8fafc" : "#0f172a",
                                    border: "1px solid",
                                    borderColor: theme === "dark" ? "#1e293b" : "#e2e8f0",
                                    boxShadow:
                                        theme === "dark"
                                            ? "0 10px 30px rgba(0,0,0,0.5)"
                                            : "0 8px 25px rgba(0,0,0,0.1)",
                                },
                            }
                        }}
                    >
                        {/* Header */}
                        <div className="px-4 py-4 flex items-center gap-3">
                            {/* Avatar */}
                            <div className="w-12 h-12 rounded-full flex items-center justify-center 
        bg-gradient-to-br from-indigo-500 to-purple-500 
        text-white font-bold text-lg shadow">
                                {initials}
                            </div>

                            {/* User Info */}
                            <div className="min-w-0">
                                <p className="font-semibold text-sm truncate">
                                    {user?.name}
                                </p>

                                <p
                                    className={`text-xs mt-0.5 ${theme === "dark" ? "text-slate-400" : "text-slate-500"
                                        }`}
                                >
                                    {isAdmin ? "🛡️ Admin" : "👤 Employee"}
                                </p>

                                <p
                                    className={`text-xs truncate ${theme === "dark" ? "text-slate-500" : "text-slate-400"
                                        }`}
                                >
                                    {user?.department}
                                </p>
                            </div>
                        </div>

                        {/* Divider */}
                        <div
                            className={`h-px mx-3 ${theme === "dark" ? "bg-slate-700" : "bg-slate-200"
                                }`}
                        />

                        {/* Optional Menu Items */}
                        {/* Menu Items */}
                        <div className="py-2">

                            {/* View Profile */}
                            <button
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm 
               hover:bg-indigo-50 dark:hover:bg-slate-800 
               transition rounded-md"
                            >
                                <User size={16} className="flex-shrink-0" />
                                <span>View Profile</span>
                            </button>

                            {/* Settings */}
                            <button
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm 
               text-slate-600 dark:text-slate-300
               hover:bg-indigo-50 dark:hover:bg-slate-800 
               transition rounded-md"
                            >
                                <Settings size={16} className="flex-shrink-0" />
                                <span>Settings</span>
                            </button>

                            {/* Logout */}
                            <button
                                title="Logout"
                                onClick={handleLogout}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm 
               text-red-500 hover:text-red-600
               hover:bg-red-50 dark:hover:bg-slate-800 
               transition rounded-md"
                            >
                                <LogOut size={16} className="flex-shrink-0" />
                                <span>Logout</span>
                            </button>

                        </div>

                    </Menu>
                </div>

            </div>
        </nav>
    );
}