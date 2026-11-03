import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { reportsApi } from '../../api/index.js';
import { Spinner } from '../../components/common/Spinner.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { PriorityBadge } from '../../components/common/PriorityBadge.js';
import { Button } from '../../components/common/Button.js';
import {
  Users,
  Grid,
  Ticket,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Inbox,
  UserX,
  UserCheck,
  CheckCircle2,
  ExternalLink,
  Shield,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: () => reportsApi.getDashboardMetrics(),
  });

  if (isLoading) {
    return <Spinner size="lg" className="h-96" />;
  }

  if (error || !data?.data) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
        Failed to load dashboard analytics. Please verify server connection.
      </div>
    );
  }

  const metrics = data.data;

  const STATUS_COLORS: Record<string, string> = {
    NEW: '#3b82f6',
    OPEN: '#6366f1',
    IN_PROGRESS: '#f59e0b',
    WAITING_FOR_CUSTOMER: '#a855f7',
    RESOLVED: '#10b981',
    CLOSED: '#64748b',
  };

  const PRIORITY_COLORS: Record<string, string> = {
    URGENT: '#ef4444',
    HIGH: '#f97316',
    MEDIUM: '#f59e0b',
    LOW: '#94a3b8',
  };

  // ==========================================
  // AGENT-SPECIFIC WORKLOAD DASHBOARD (Section 19)
  // ==========================================
  if (metrics.isAgentView) {
    const agent = metrics.agentInfo;
    return (
      <div className="space-y-6">
        {/* Agent Profile & Workload Header */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-brand-600 text-white font-bold text-lg flex items-center justify-center shadow-md shadow-brand-500/20">
              {agent?.name?.charAt(0) || 'A'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900">{agent?.name}</h1>
                <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full font-semibold border border-indigo-200">
                  {agent?.teamName}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Available
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Role: <strong>Support Agent</strong> • Capacity: <strong>{agent?.currentLoad} / {agent?.maxCapacity} tickets</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => navigate('/tickets')}
              size="sm"
              icon={<Ticket className="w-4 h-4" />}
            >
              View My Queue ({metrics.totalTickets})
            </Button>
          </div>
        </div>

        {/* Agent KPI Metrics (Section 19 Requirements) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">My Tickets</span>
              <Ticket className="w-4 h-4 text-brand-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{metrics.totalTickets}</p>
            <span className="text-[11px] text-slate-400 mt-1 block">Assigned to you</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Open / In Progress</span>
              <Inbox className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-2xl font-bold text-indigo-600">{metrics.openTickets}</p>
            <span className="text-[11px] text-slate-400 mt-1 block">Active issues to solve</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Waiting Customer</span>
              <Clock className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-purple-600">{metrics.pendingTickets}</p>
            <span className="text-[11px] text-slate-400 mt-1 block">Awaiting replies</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Urgent Issues</span>
              <AlertCircle className="w-4 h-4 text-rose-600" />
            </div>
            <p className="text-2xl font-bold text-rose-600">{metrics.urgentTickets || 0}</p>
            <span className="text-[11px] text-slate-400 mt-1 block">Immediate SLA risk</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">My Resolved</span>
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-600">{metrics.resolvedTickets}</p>
            <span className="text-[11px] text-slate-400 mt-1 block">Solved tickets</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Avg Response</span>
              <TrendingUp className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{metrics.avgResponseTimeHours}h</p>
            <span className="text-[11px] text-slate-400 mt-1 block">{metrics.avgResolutionTimeHours}h resolution</span>
          </div>
        </div>

        {/* Main Agent Content: Active Queue & Status Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Queue Table */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">My Active Ticket Queue</h2>
                <p className="text-xs text-slate-500">Tickets assigned directly to you awaiting response or closure</p>
              </div>
              <Link to="/tickets" className="text-xs text-brand-600 hover:underline font-semibold">
                View All
              </Link>
            </div>

            {(!metrics.activeTickets || metrics.activeTickets.length === 0) ? (
              <div className="p-8 text-center text-xs text-slate-400">
                You have no pending active tickets assigned. Excellent job!
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {metrics.activeTickets.map((t: any) => (
                  <Link
                    key={t.id}
                    to={`/tickets/${t.id}`}
                    className="p-4 hover:bg-slate-50 flex items-center justify-between block transition-colors text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-brand-600">{t.ticketNumber}</span>
                        <StatusBadge status={t.status} />
                        <PriorityBadge priority={t.priority} />
                        <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-medium">
                          {t.application?.name}
                        </span>
                      </div>
                      <p className="font-medium text-slate-800 text-sm">{t.subject}</p>
                      <span className="text-[11px] text-slate-400">
                        Customer: {t.customer?.name} ({t.customer?.email})
                      </span>
                    </div>

                    <ExternalLink className="w-4 h-4 text-slate-400" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Agent Status Pie Chart */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">My Assigned Workload</h2>
              <p className="text-xs text-slate-500">Status breakdown for your queue</p>
            </div>

            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.ticketsByStatus}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                  >
                    {metrics.ticketsByStatus.map((entry) => (
                      <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#cbd5e1'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
              {metrics.ticketsByStatus.map((s) => (
                <div key={s.status} className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: STATUS_COLORS[s.status] || '#cbd5e1' }}
                    />
                    {s.status.replace(/_/g, ' ').toLowerCase()}
                  </span>
                  <span className="font-semibold text-slate-900">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // ENTERPRISE OVERVIEW DASHBOARD (Admins & SuperAdmins)
  // ==========================================
  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Enterprise Operations Overview</h1>
        <p className="text-xs text-slate-500 mt-1">
          Real-time customer issues, response SLA tracking, and multi-app distribution across all teams
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Tickets</span>
            <Ticket className="w-4 h-4 text-brand-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{metrics.totalTickets}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">+{metrics.ticketsToday} today</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Open Tickets</span>
            <Inbox className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-indigo-600">{metrics.openTickets}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">Active work in queue</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Waiting Customer</span>
            <Clock className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-600">{metrics.pendingTickets}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">Awaiting client response</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Unassigned</span>
            <UserX className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-bold text-rose-600">{metrics.unassignedTickets}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">Needs agent triage</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Resolved</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-600">{metrics.resolvedTickets}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">Closed & solved</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg Resolution</span>
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{metrics.avgResolutionTimeHours}h</p>
          <span className="text-[11px] text-slate-400 mt-1 block">{metrics.avgResponseTimeHours}h avg first response</span>
        </div>
      </div>

      {/* Middle Row: Volume Over Time & Tickets by Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Ticket Inflow Over Time</h2>
              <p className="text-xs text-slate-500">Daily creation volume across all apps (last 7 days)</p>
            </div>
            <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full">
              {metrics.ticketsThisWeek} this week
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.ticketsOverTime}>
                <defs>
                  <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorInflow)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tickets by Status Breakdown */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <h2 className="text-sm font-semibold text-slate-900 mb-1">Tickets by Status</h2>
          <p className="text-xs text-slate-500 mb-4">Current stage distribution</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.ticketsByStatus}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                >
                  {metrics.ticketsByStatus.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#cbd5e1'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100 text-xs">
            {metrics.ticketsByStatus.map((s) => (
              <div key={s.status} className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: STATUS_COLORS[s.status] || '#cbd5e1' }}
                  />
                  {s.status.replace(/_/g, ' ').toLowerCase()}
                </span>
                <span className="font-semibold text-slate-900">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: By Application & By Agent Workload */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Application */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Issues by Connected Product</h2>
              <p className="text-xs text-slate-500">Distribution across connected applications</p>
            </div>
            <Grid className="w-4 h-4 text-slate-400" />
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.ticketsByApplication} layout="vertical">
                <XAxis type="number" stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} width={110} tickLine={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* By Priority */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Tickets by Urgency & Priority</h2>
              <p className="text-xs text-slate-500">SLA threat and urgency breakdown</p>
            </div>
            <AlertCircle className="w-4 h-4 text-slate-400" />
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.ticketsByPriority}>
                <XAxis dataKey="priority" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {metrics.ticketsByPriority.map((entry) => (
                    <Cell key={entry.priority} fill={PRIORITY_COLORS[entry.priority] || '#cbd5e1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
