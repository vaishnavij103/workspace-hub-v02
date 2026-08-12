import React, { useState, useEffect } from 'react';
import { useLocation } from '../LocationContext';
import { useTheme } from '../ThemeContext';
import { getAdminContacts } from '../api';
import { Mail, Phone, MapPin, ShieldCheck } from 'lucide-react';

const FALLBACK_ADMINS = {
  'Ahmedabad': [
    { name: 'Kalpana Parmar', email: 'kalpana.parmar@apexon.com', phone: '7698004492' },
    { name: 'Ayush Mathuria', email: 'ayush.mathuria@apexon.com', phone: '9624010002' }
  ],
  'Chennai': [
    { name: 'Yuvaraj S', email: 'yuvaraj.s@apexon.com', phone: '9884000341' }
  ],
  'Hyderabad': [
    { name: 'Yuvaraj S', email: 'yuvaraj.s@apexon.com', phone: '9884000341' }
  ],
  'Coimbatore': [
    { name: 'Manoharan M', email: 'manoharan.m@apexon.com', phone: '9626873215' }
  ],
  'Bangalore(Domlur)': [
    { name: 'Manjula Munikeshava', email: 'manjula.munikeshava@apexon.com', phone: '6361476691' }
  ],
  'Bangalore(Signet)': [
    { name: 'Bhavya S', email: 'bhavya.s@apexon.com', phone: '9972915522' }
  ],
  'Pune': [
    { name: 'Nitin Nikumbh', email: 'nitin.nikumbh@apexon.com', phone: '7720008395' }
  ],
  'Mumbai': [
    { name: 'Nitin Nikumbh', email: 'nitin.nikumbh@apexon.com', phone: '7720008395' }
  ]
};

export default function AdminTickerBar() {
  const { location } = useLocation();
  const { theme } = useTheme();
  const [admins, setAdmins] = useState([]);

  useEffect(() => {
    let isMounted = true;
    async function fetchAdmins() {
      try {
        const data = await getAdminContacts({ location });
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setAdmins(data);
          return;
        }
      } catch {
        // use fallback
      }
      if (isMounted) {
        const fb = FALLBACK_ADMINS[location] || FALLBACK_ADMINS['Pune'];
        setAdmins(fb);
      }
    }
    fetchAdmins();
    return () => { isMounted = false; };
  }, [location]);

  const activeAdmins = admins.length > 0 ? admins : (FALLBACK_ADMINS[location] || FALLBACK_ADMINS['Pune']);

  // Repeat items for seamless marquee loop
  const tickerItems = [...activeAdmins, ...activeAdmins, ...activeAdmins, ...activeAdmins];

  return (
    <div className={`w-full overflow-hidden rounded-2xl border py-2 px-4 shadow-sm relative backdrop-blur-sm ${
      theme === 'dark'
        ? 'bg-[#0a0f1e]/80 border-[#1e2a45] text-slate-200'
        : 'bg-white/90 border-slate-200 text-slate-800'
    }`}>
      <div className="flex items-center gap-2 overflow-hidden">
        {/* Fixed Label Badge on Left */}
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-bold text-[0.7rem] whitespace-nowrap z-10 flex-shrink-0 shadow-sm ${
          theme === 'dark'
            ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
        }`}>
          <MapPin size={12} className="text-indigo-500 animate-bounce" />
          <span>Location Admin ({location}) :</span>
        </div>

        {/* Moving Ticker Track */}
        <div className="flex-1 overflow-hidden relative">
          <div className="animate-marquee flex items-center gap-8 py-0.5 whitespace-nowrap">
            {tickerItems.map((adm, idx) => {
              const initial = adm.name ? adm.name.charAt(0).toUpperCase() : 'A';
              return (
                <div key={idx} className="flex items-center gap-3 text-xs flex-shrink-0">
                  {/* Purple Circle Avatar Icon */}
                  <div className="w-6 h-6 rounded-full bg-purple-600 text-white font-black text-[0.7rem] flex items-center justify-center shadow-inner">
                    {initial}
                  </div>

                  {/* Name */}
                  <span className="font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                    {adm.name}
                  </span>

                  <span className="text-slate-300 dark:text-slate-700">|</span>

                  {/* Email */}
                  <a
                    href={`mailto:${adm.email}`}
                    className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-medium text-[0.75rem]"
                  >
                    <Mail size={12} />
                    <span>{adm.email}</span>
                  </a>

                  <span className="text-slate-300 dark:text-slate-700">|</span>

                  {/* Phone */}
                  <a
                    href={`tel:${adm.phone}`}
                    className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline font-bold text-[0.75rem]"
                  >
                    <Phone size={12} />
                    <span>{adm.phone}</span>
                  </a>

                  {idx < tickerItems.length - 1 && (
                    <span className="ml-4 text-indigo-400/40 font-bold">•</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
