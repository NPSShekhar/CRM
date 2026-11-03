import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Briefcase,
  Ticket,
  Users,
  Grid,
  Bell,
  LogOut,
  Menu,
  X,
  User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { NotificationBell } from '../components/notifications/NotificationBell.js';

export const AgentLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Section 11: Agent Portal Navigation
  const navItems = [
    { label: 'My Workload', path: '/agent/workload', icon: <Briefcase className="w-5 h-5" /> },
    { label: 'My Tickets', path: '/agent/tickets', icon: <Ticket className="w-5 h-5" /> },
    { label: 'Customers', path: '/agent/customers', icon: <Users className="w-5 h-5" /> },
    { label: 'Applications', path: '/agent/applications', icon: <Grid className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Agent Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-slate-900 border-r border-slate-800 text-slate-300">
        <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-800">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-500/20">
            CRM
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-semibold text-white text-sm leading-tight">Agent Workspace</h1>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-bold px-1.5 py-0.5 rounded">AGENT</span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Customer Support Suite</span>
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
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Agent Profile Card at bottom */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-indigo-700 text-white font-semibold flex items-center justify-center text-xs">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white truncate">{user?.name}</p>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <p className="text-[10px] text-slate-400 truncate">Support Agent</p>
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
              <span className="font-semibold text-slate-800">Agent Portal</span>
              <span>/</span>
              <span className="text-indigo-600 capitalize">
                {location.pathname.replace('/agent/', '').split('/')[0] || 'Workload'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Center */}
            <NotificationBell />

            <div className="h-6 w-px bg-slate-200"></div>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-700 text-white flex items-center justify-center text-xs font-bold">
                {user?.name?.charAt(0) || 'A'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-800">{user?.name}</p>
                <p className="text-[10px] text-indigo-600 font-semibold">Active Agent</p>
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
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">
                  CRM
                </div>
                <span className="font-semibold text-white text-sm">Agent Workspace</span>
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
                      isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
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
