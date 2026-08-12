import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('apexon_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.role === 'admin') parsed.role = 'admin_location';
        return parsed;
      } catch {
        return null;
      }
    }
    return {
      user_id: 'usr_superadmin',
      name: 'Super Admin',
      email: 'superadmin@apexon.com',
      role: 'super_admin',
      department: 'Global Operations'
    };
  });

  const [location, setLocation] = useState(() => {
    return localStorage.getItem('apexon_location') || 'Pune';
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('apexon_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('apexon_user');
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('apexon_location', location);
  }, [location]);

  const register = (userData) => {
    const newUser = {
      user_id: `usr_${Date.now()}`,
      name: userData.name || 'Apexon User',
      email: userData.email || 'user@apexon.com',
      role: userData.role || 'employee',
      department: userData.department || 'Engineering'
    };
    setUser(newUser);
    return newUser;
  };

  const login = (email, _password, customRole = null, customName = null, customDept = null) => {
    let role = customRole || 'employee';
    let name = customName || 'Rahul Sharma';
    let dept = customDept || 'Engineering';

    if (email) {
      const lowerEmail = email.toLowerCase();
      if (lowerEmail.includes('superadmin') || customRole === 'super_admin') {
        role = 'super_admin';
        name = customName || 'Super Admin';
        dept = customDept || 'Global Operations';
      } else if (lowerEmail.includes('admin') || customRole === 'admin_location' || customRole === 'admin') {
        role = 'admin_location';
        name = customName || 'Location Admin';
        dept = customDept || 'Facility Mgmt';
      }
    }

    const userData = {
      user_id: `usr_${role}_${Date.now().toString().slice(-4)}`,
      name,
      email: email || `${role}@apexon.com`,
      role,
      department: dept
    };
    setUser(userData);
    return true;
  };

  const logout = () => {
    setUser(null);
  };

  const isSuperAdmin = user?.role === 'super_admin';
  const isLocationAdmin = user?.role === 'admin_location';
  const isEmployee = user?.role === 'employee' || (!isSuperAdmin && !isLocationAdmin);
  const isAdmin = isSuperAdmin || isLocationAdmin || user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        login,
        register,
        logout,
        isAdmin,
        isSuperAdmin,
        isLocationAdmin,
        isEmployee,
        location,
        setLocation
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: { user_id: 'usr_superadmin', name: 'Super Admin', role: 'super_admin' },
      isAdmin: true,
      isSuperAdmin: true,
      isLocationAdmin: false,
      isEmployee: false,
      login: () => { },
      logout: () => { },
      location: 'Pune',
      setLocation: () => { }
    };
  }
  return context;
}

