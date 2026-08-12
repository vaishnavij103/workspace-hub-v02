import { createContext, useContext, useState, useEffect } from 'react';

const LocationContext = createContext();

export function LocationProvider({ children }) {
  const [location, setLocation] = useState(() => {
    return localStorage.getItem('apexon_selected_location') || 'Pune';
  });

  useEffect(() => {
    localStorage.setItem('apexon_selected_location', location);
  }, [location]);

  return (
    <LocationContext.Provider value={{ location, setLocation }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) {
    return {
      location: 'Pune',
      setLocation: () => { }
    };
  }
  return context;
}
