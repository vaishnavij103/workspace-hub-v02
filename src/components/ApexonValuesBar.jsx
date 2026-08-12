import React from 'react';
import { useTheme } from '../ThemeContext';

const APEXON_VALUES = [
    { icon: '🛡️', title: 'Integrity', desc: 'Establishing trust' },
    { icon: '🌟', title: 'Authenticity', desc: 'Being ourselves' },
    { icon: '🤝', title: 'Empathy', desc: 'Treating others well' },
    { icon: '🌍', title: 'Community', desc: 'Collaborative experience' },
    { icon: '💡', title: 'Entrepreneurial Spirit', desc: 'Continuous innovation' },
    { icon: '✨', title: 'Excellence', desc: 'Highest standards' },
];

export default function ApexonValuesBar() {
    const { theme } = useTheme();

    return (
        <div className={`w-full overflow-hidden rounded-2xl border py-2 px-4 shadow-sm relative backdrop-blur-sm ${theme === 'dark'
            ? 'bg-[#0a0f1e]/80 border-[#1e2a45] text-slate-200'
            : 'bg-white/90 border-slate-200 text-slate-800'
            }`}>
            <div className="flex items-center gap-2 overflow-hidden">

                {/* Moving Ticker Track */}
                <div className="flex-1 overflow-hidden relative">
                    <div className="animate-marquee flex items-center gap-8 py-0.5 whitespace-nowrap">
                        {APEXON_VALUES.map(val => (
                            <div key={val.title} className="flex items-center gap-2.5">
                                <div className={`w-8 h-8 flex items-center justify-center rounded-full ${theme === 'dark' ? 'bg-indigo-500/10 border border-indigo-500/20' : 'bg-indigo-100 border border-indigo-200'} text-sm shadow-inner flex-shrink-0`}>
                                    {val.icon}
                                </div>
                                <div className="flex flex-col">
                                    <span className={`font-bold uppercase tracking-wider text-[0.7rem] ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}>
                                        {val.title}
                                    </span>
                                    <span className={`text-[0.65rem] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {val.desc}
                                    </span>
                                </div>
                                <div className={`mx-4 h-4 w-px ${theme === 'dark' ? 'bg-[#1e2a45]' : 'bg-indigo-200'}`} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
