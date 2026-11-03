import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Ticket,
  Users,
  Grid,
  UserCheck,
  BarChart3,
  Settings,
  Bell,
  LogOut,
  Menu,
  X,
  Layers,
  Send,
  Shield,
  Award,
  FileSpreadsheet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { NotificationBell } from '../components/notifications/NotificationBell.js';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isOpsOrAdmin =
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'ADMIN' ||
    user?.role === 'SUPPORT_MANAGER' ||
    user?.role === 'ACCOUNTANT';

  // Strict route protection: Non-admin/accountant users cannot access Admin layout
  if (!isOpsOrAdmin) {
    return <Navigate to="/agent/workload" replace />;
  }

  const isAccountant = user?.role === 'ACCOUNTANT';

  const navItems = isAccountant
    ? [
        { label: 'Support & Extra Billing', path: '/admin/billing', icon: <FileSpreadsheet className="w-5 h-5" /> },
        { label: 'Customers', path: '/admin/customers', icon: <Users className="w-5 h-5" /> },
        { label: 'Tickets', path: '/admin/tickets', icon: <Ticket className="w-5 h-5" /> },
        { label: 'Memberships', path: '/admin/memberships', icon: <Award className="w-5 h-5" /> },
      ]
    : [
        { label: 'Overview', path: '/admin/overview', icon: <LayoutDashboard className="w-5 h-5" /> },
        { label: 'Tickets', path: '/admin/tickets', icon: <Ticket className="w-5 h-5" /> },
        { label: 'Customers', path: '/admin/customers', icon: <Users className="w-5 h-5" /> },
        { label: 'Applications', path: '/admin/applications', icon: <Grid className="w-5 h-5" /> },
        { label: 'Agents', path: '/admin/agents', icon: <UserCheck className="w-5 h-5" /> },
        { label: 'Teams', path: '/admin/teams', icon: <Layers className="w-5 h-5" /> },
        { label: 'Memberships', path: '/admin/memberships', icon: <Award className="w-5 h-5" /> },
        { label: 'Support Hours & Billing', path: '/admin/billing', icon: <FileSpreadsheet className="w-5 h-5" /> },
        { label: 'Reports', path: '/admin/reports', icon: <BarChart3 className="w-5 h-5" /> },
        { label: 'Email Simulator', path: '/admin/email-simulator', icon: <Send className="w-5 h-5" /> },
        { label: 'Settings', path: '/admin/settings', icon: <Settings className="w-5 h-5" /> },
      ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Admin Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-slate-900 border-r border-slate-800 text-slate-300">
        <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-800">
          <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold shadow-md shadow-brand-500/20">
            CRM
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-semibold text-white text-sm leading-tight">Admin Portal</h1>
              <span className="text-[10px] bg-brand-500/20 text-brand-300 font-bold px-1.5 py-0.5 rounded">OPS</span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Enterprise Management</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* User Card at bottom of Admin sidebar */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-brand-700 text-white font-semibold flex items-center justify-center text-xs">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white truncate">{user?.name}</p>
              <div className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-brand-400" />
                <p className="text-[10px] text-slate-400 truncate">{user?.role?.replace(/_/g, ' ')}</p>
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            title="Logout"
            className="text-slate-400 hover:text-rose-400 p-1.5 rounded-md hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span className="font-semibold text-slate-800">Admin Portal</span>
              <span>/</span>
              <span className="text-brand-600 capitalize">
                {location.pathname.replace('/admin/', '').split('/')[0] || 'Overview'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Center */}
            <NotificationBell />

            <div className="h-6 w-px bg-slate-200"></div>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                {user?.name?.charAt(0) || 'A'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-800">{user?.name}</p>
                <p className="text-[10px] text-brand-600 font-semibold">{user?.role?.replace(/_/g, ' ')}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative flex flex-col w-64 bg-slate-900 text-slate-300 p-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold">
                  CRM
                </div>
                <span className="font-semibold text-white text-sm">Admin Portal</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-4 space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium ${
                      isActive ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'
                    }`
                  }
                >
                  {item.icon}
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-rose-400 hover:bg-slate-800 rounded-lg"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
