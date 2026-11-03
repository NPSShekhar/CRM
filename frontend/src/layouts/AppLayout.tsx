import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Ticket,
  Users,
  Grid,
  UserCheck,
  BarChart3,
  Settings,
  Mail,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Layers,
  Send,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { NotificationBell } from '../components/notifications/NotificationBell.js';

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  const navItems = [
    { label: isAdmin ? 'Overview' : 'My Workload', path: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: isAdmin ? 'Tickets' : 'My Tickets', path: '/tickets', icon: <Ticket className="w-5 h-5" /> },
    { label: 'Customers', path: '/customers', icon: <Users className="w-5 h-5" /> },
    { label: 'Applications', path: '/applications', icon: <Grid className="w-5 h-5" /> },
    ...(isAdmin
      ? [
          { label: 'Agents', path: '/agents', icon: <UserCheck className="w-5 h-5" /> },
          { label: 'Teams', path: '/teams', icon: <Layers className="w-5 h-5" /> },
          { label: 'Reports', path: '/reports', icon: <BarChart3 className="w-5 h-5" /> },
        ]
      : []),
    { label: 'Email Simulator', path: '/simulator', icon: <Send className="w-5 h-5" /> },
    ...(isAdmin
      ? [{ label: 'Settings', path: '/settings/email', icon: <Settings className="w-5 h-5" /> }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-slate-900 border-r border-slate-800 text-slate-300">
        <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-800">
          <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold shadow-md shadow-brand-500/20">
            CRM
          </div>
          <div>
            <h1 className="font-semibold text-white text-sm leading-tight">Support Suite</h1>
            <span className="text-[11px] text-slate-400 font-medium">Enterprise Edition</span>
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

        {/* User Card at bottom of sidebar */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-brand-700 text-white font-semibold flex items-center justify-center text-xs">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white truncate">{user?.name}</p>
              <p className="text-[11px] text-slate-400 truncate">{user?.role}</p>
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

      {/* Main Content Container */}
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
              <span>CRM</span>
              <span>/</span>
              <span className="text-slate-800 capitalize">
                {location.pathname.split('/')[1] || 'Dashboard'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Center */}
            <NotificationBell />

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-medium text-xs flex items-center justify-center">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <ChevronDown className="w-4 h-4 text-slate-500" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-900">{user?.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={logout}
                    className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Mobile Sidebar Modal */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div className="fixed inset-0 bg-slate-900/60" onClick={() => setMobileMenuOpen(false)} />
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-slate-900 text-slate-300">
              <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
                <span className="font-bold text-white text-base">Support CRM</span>
                <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800"
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Page Content Outlet */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
