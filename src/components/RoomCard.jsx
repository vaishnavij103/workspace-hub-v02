import React from 'react';
import { useTheme } from '../ThemeContext';
import { Badge } from './ui';
import { Users, Tv, Wifi, Zap, Building2 } from 'lucide-react';

export default function RoomCard({ room, onSelect, selected }) {
  const { theme } = useTheme();
  const { name, location, capacity, amenities, status, floor, room_type } = room;

  const amenityList = Array.isArray(amenities) ? amenities : [];

  return (
    <div
      onClick={() => onSelect && onSelect(room)}
      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
        selected
          ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10'
          : theme === 'dark'
          ? 'bg-[#0f1420] border-[#1e2a45] hover:border-[#2d3f6b]'
          : 'bg-white border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <h3 className={`text-sm font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>{name}</h3>
          <p className="text-[0.7rem] text-slate-500 flex items-center gap-1 mt-0.5">
            <Building2 size={12} /> {location} · Floor {floor || 1}
          </p>
        </div>
        <Badge status={status} />
      </div>

      <div className="flex flex-wrap items-center gap-3 my-3 text-xs text-slate-400">
        <span className="flex items-center gap-1 text-indigo-400 font-semibold bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20">
          <Users size={12} /> {capacity} Seats
        </span>
        {room_type && (
          <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-[0.65rem]">
            {room_type}
          </span>
        )}
      </div>

      {amenityList.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-200/20 dark:border-slate-800">
          {amenityList.map((a, i) => (
            <span key={i} className="text-[0.65rem] px-2 py-0.5 rounded-md bg-slate-800/50 text-slate-400 border border-slate-700/50">
              {a}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
