import React from 'react';
import { useTheme } from '../ThemeContext';

export function Badge({ status }) {
  const isOk = status === 'confirmed' || status === 'active' || status === 'approved' || status === 'paid';
  const isWarn = status === 'pending' || status === 'expected' || status === 'pending_approval';
  
  let bg = isOk
    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    : isWarn
    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    : 'bg-rose-500/10 text-rose-400 border-rose-500/20';

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[0.7rem] font-bold border capitalize ${bg}`}>
      {status || 'Unknown'}
    </span>
  );
}

export function PageHeader({ title, subtitle, action }) {
  const { theme } = useTheme();
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className={`text-2xl font-black tracking-tight ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
          {title}
        </h1>
        {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function SectionHeader({ title, action }) {
  const { theme } = useTheme();
  return (
    <div className="flex items-center justify-between gap-4 mb-3">
      <h2 className={`text-base font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
        {title}
      </h2>
      {action && <div>{action}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, message, text, action }) {
  const { theme } = useTheme();
  const displayTitle = title || text;

  const renderIcon = () => {
    if (!Icon) return null;
    if (typeof Icon === 'string') {
      return <span className="text-2xl">{Icon}</span>;
    }
    if (typeof Icon === 'function' || typeof Icon === 'object') {
      const LucideIcon = Icon;
      return <LucideIcon size={24} />;
    }
    return Icon;
  };

  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center rounded-2xl border ${
      theme === 'dark' ? 'bg-[#0f1420] border-[#1e2a45]' : 'bg-slate-50 border-slate-200'
    }`}>
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
          {renderIcon()}
        </div>
      )}
      {displayTitle && (
        <h3 className={`text-sm font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>{displayTitle}</h3>
      )}
      {message && <p className="text-xs text-slate-500 mt-1 max-w-sm">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Button({ children, onClick, variant = 'primary', className = '', ...props }) {
  const base = "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20",
    secondary: "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700",
    outline: "border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10",
    danger: "bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 border border-rose-500/30"
  };

  return (
    <button onClick={onClick} className={`${base} ${variants[variant] || variants.primary} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Input({ label, ...props }) {
  const { theme } = useTheme();
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-semibold text-slate-400 mb-1">{label}</label>}
      <input
        className={`w-full px-3.5 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:border-indigo-500 transition-all ${
          theme === 'dark' ? 'bg-[#070c1a] border-[#1e2a45] text-slate-100' : 'bg-white border-slate-300 text-slate-900'
        }`}
        {...props}
      />
    </div>
  );
}

export function Select({ label, children, ...props }) {
  const { theme } = useTheme();
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-semibold text-slate-400 mb-1">{label}</label>}
      <select
        className={`w-full px-3.5 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:border-indigo-500 transition-all ${
          theme === 'dark' ? 'bg-[#070c1a] border-[#1e2a45] text-slate-100' : 'bg-white border-slate-300 text-slate-900'
        }`}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
