import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../lib/api';
import type { User, TenantWithRole } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  tenants: TenantWithRole[];
  currentTenant: TenantWithRole | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName: string, tenantName: string, tenantSlug: string) => Promise<void>;
  logout: () => void;
  switchTenant: (tenantId: string) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [tenants, setTenants] = useState<TenantWithRole[]>([]);
  const [currentTenant, setCurrentTenant] = useState<TenantWithRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      // Decode user from token (simple JWT payload read)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({ id: payload.id, email: payload.email, full_name: payload.full_name });

        // Fetch tenants
        api.get('/tenants').then((res) => {
          const t = res.data.map((t: any) => ({ id: t.id, name: t.name, slug: t.slug, role: 'member' as const }));
          setTenants(t);
          const savedTenantId = localStorage.getItem('tenantId');
          const current = t.find((tenant: TenantWithRole) => tenant.id === savedTenantId) || t[0] || null;
          setCurrentTenant(current);
          if (current) localStorage.setItem('tenantId', current.id);
        }).finally(() => setIsLoading(false));
      } catch {
        logout();
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: t, user: u, tenants: tList } = res.data;
    localStorage.setItem('token', t);
    setToken(t);
    setUser(u);
    setTenants(tList || []);
    const first = tList?.[0] || null;
    setCurrentTenant(first);
    if (first) localStorage.setItem('tenantId', first.id);
  };

  const signup = async (email: string, password: string, fullName: string, tenantName: string, tenantSlug: string) => {
    const res = await api.post('/auth/signup', {
      email, password, full_name: fullName, tenant_name: tenantName, tenant_slug: tenantSlug,
    });
    const { token: t, user: u, tenant } = res.data;
    localStorage.setItem('token', t);
    setToken(t);
    setUser(u);
    const tw: TenantWithRole = { id: tenant.id, name: tenant.name, slug: tenant.slug, role: 'owner' };
    setTenants([tw]);
    setCurrentTenant(tw);
    localStorage.setItem('tenantId', tenant.id);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('tenantId');
    setToken(null);
    setUser(null);
    setTenants([]);
    setCurrentTenant(null);
  };

  const switchTenant = (tenantId: string) => {
    const t = tenants.find((t) => t.id === tenantId) || null;
    setCurrentTenant(t);
    if (t) localStorage.setItem('tenantId', t.id);
  };

  return (
    <AuthContext.Provider value={{ user, token, tenants, currentTenant, login, signup, logout, switchTenant, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
