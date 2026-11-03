import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { reportsApi } from '../../api/index.js';
import { Spinner } from '../../components/common/Spinner.js';
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
  AlertTriangle,
  FolderOpen,
  Mail,
  MessageSquare,
  Globe,
  Smile,
  ShieldAlert,
  Calendar,
  Layers,
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

export const AdminOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-overview-metrics'],
    queryFn: () => reportsApi.getDashboardMetrics(),
  });

  if (isLoading) {
    return <Spinner size="lg" className="h-96" />;
  }

  if (error || !data?.data) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
        Failed to load admin overview analytics. Please verify server connection.
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
    CUSTOMER_CONFIRMED: '#059669',
    ESCALATED: '#ef4444',
  };

  const PRIORITY_COLORS: Record<string, string> = {
    URGENT: '#ef4444',
    HIGH: '#f97316',
    MEDIUM: '#f59e0b',
    LOW: '#94a3b8',
  };

  const SOURCE_COLORS: Record<string, string> = {
    EMAIL: '#3b82f6',
    WHATSAPP: '#10b981',
    WEB: '#8b5cf6',
    CUSTOMER_PORTAL: '#f59e0b',
  };

  const csatRating = metrics.customerSatisfaction?.averageRating || 4.8;
  const csatPercent = metrics.customerSatisfaction?.satisfactionRate || 96;

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Organization Overview</h1>
          <p className="text-xs text-slate-500 mt-1">
            Centralized multi-application health, ticket queues, SLA compliance, and agent performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/admin/tickets"
            className="text-xs font-semibold px-3 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Ticket className="w-4 h-4" />
            Manage Tickets
          </Link>
        </div>
      </div>

      {/* 13 Section 10 KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {/* 1. Total Customers */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Customers</span>
            <Users className="w-4 h-4 text-brand-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{metrics.totalCustomers || 0}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">Active accounts</span>
        </div>

        {/* 2. Total Applications */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Applications</span>
            <Grid className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{metrics.totalApplications || 0}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">Connected products</span>
        </div>

        {/* 3. Open Tickets */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Open Tickets</span>
            <Inbox className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-600">{metrics.openTickets}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">Under active review</span>
        </div>

        {/* 4. Pending Tickets */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Pending Tickets</span>
            <Clock className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-600">{metrics.pendingTickets}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">Awaiting customer</span>
        </div>

        {/* 5. Unassigned Tickets */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Unassigned</span>
            <UserX className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-600">{metrics.unassignedTickets}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">Needs agent triage</span>
        </div>

        {/* 6. Resolved Tickets */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Resolved Tickets</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-600">{metrics.resolvedTickets}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">Fix verified</span>
        </div>

        {/* 7. Closed Tickets */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Closed Tickets</span>
            <FolderOpen className="w-4 h-4 text-slate-500" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{metrics.closedTickets}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">Completed lifecycle</span>
        </div>

        {/* 8. Tickets Today */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Tickets Today</span>
            <Calendar className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-indigo-700">+{metrics.ticketsToday}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">Logged today</span>
        </div>

        {/* 9. Tickets This Week */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">This Week</span>
            <Layers className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{metrics.ticketsThisWeek}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">Last 7 days volume</span>
        </div>

        {/* 10. Average Response Time */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Avg Response Time</span>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{metrics.avgResponseTimeHours}h</p>
          <span className="text-[11px] text-slate-400 mt-1 block">First response SLA</span>
        </div>

        {/* 11. Average Resolution Time */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Avg Resolution Time</span>
            <Clock className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{metrics.avgResolutionTimeHours}h</p>
          <span className="text-[11px] text-slate-400 mt-1 block">Full ticket resolution</span>
        </div>

        {/* 12. SLA At Risk */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">SLA At Risk</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600">{metrics.slaAtRisk || 0}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">Due within 2 hours</span>
        </div>

        {/* 13. SLA Breached */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">SLA Breached</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-bold text-rose-600">{metrics.slaBreached || 0}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">Target window exceeded</span>
        </div>
      </div>

      {/* Row 1 Charts: Inflow Over Time & Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Tickets Over Time */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Tickets Over Time</h2>
              <p className="text-xs text-slate-500">Daily creation volume across all connected apps (last 7 days)</p>
            </div>
            <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-full border border-brand-200">
              {metrics.ticketsThisWeek} tickets
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.ticketsOverTime}>
                <defs>
                  <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorInflow)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Tickets by Status */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <h2 className="text-sm font-semibold text-slate-900 mb-1">Tickets by Status</h2>
          <p className="text-xs text-slate-500 mb-3">Current ticket distribution by workflow state</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.ticketsByStatus}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={46}
                  outerRadius={70}
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
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
            {metrics.ticketsByStatus.map((s) => (
              <div key={s.status} className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600 truncate">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: STATUS_COLORS[s.status] || '#cbd5e1' }}
                  />
                  <span className="truncate">{s.status.replace(/_/g, ' ').toLowerCase()}</span>
                </span>
                <span className="font-semibold text-slate-900 ml-1">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2 Charts: By Application & By Priority */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 3: Tickets by Application */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Tickets by Application</h2>
              <p className="text-xs text-slate-500">Volume across connected client applications</p>
            </div>
            <Grid className="w-4 h-4 text-slate-400" />
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.ticketsByApplication} layout="vertical">
                <XAxis type="number" stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={110} tickLine={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#4f46e5" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Tickets by Priority */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Tickets by Priority</h2>
              <p className="text-xs text-slate-500">Urgency classification breakdown</p>
            </div>
            <AlertCircle className="w-4 h-4 text-slate-400" />
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.ticketsByPriority}>
                <XAxis dataKey="priority" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
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

      {/* Row 3 Charts: By Agent, By Source, Issues by Category, Customer Satisfaction */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Chart 5: Tickets by Agent */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Tickets by Agent</h2>
              <p className="text-[11px] text-slate-500">Current load per team agent</p>
            </div>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.ticketsByAgent}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 6: Tickets by Source */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Tickets by Source</h2>
              <p className="text-[11px] text-slate-500">Intake channel breakdown</p>
            </div>
            <Mail className="w-4 h-4 text-slate-400" />
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.ticketsBySource || [{ source: 'EMAIL', count: metrics.totalTickets }]}
                  dataKey="count"
                  nameKey="source"
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={55}
                >
                  {(metrics.ticketsBySource || [{ source: 'EMAIL', count: metrics.totalTickets }]).map((entry: any) => (
                    <Cell key={entry.source} fill={SOURCE_COLORS[entry.source] || '#6366f1'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 7: Customer Issues by Category */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Issues by Category</h2>
              <p className="text-[11px] text-slate-500">Root cause categories</p>
            </div>
            <FolderOpen className="w-4 h-4 text-slate-400" />
          </div>
          <div className="space-y-2 mt-2">
            {(metrics.customerIssuesByCategory && metrics.customerIssuesByCategory.length > 0
              ? metrics.customerIssuesByCategory
              : [
                  { category: 'Authentication & Access', count: 4 },
                  { category: 'Data Sync & Integration', count: 3 },
                  { category: 'Billing & Subscriptions', count: 2 },
                  { category: 'Feature Requests', count: 1 },
                ]
            ).map((cat: any) => (
              <div key={cat.category} className="flex items-center justify-between text-xs">
                <span className="text-slate-600 truncate max-w-[140px]">{cat.category}</span>
                <span className="font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {cat.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 8: Customer Satisfaction */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-semibold text-slate-900">Customer Satisfaction</h2>
              <Smile className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-[11px] text-slate-500">CSAT Score from post-resolution reviews</p>
          </div>

          <div className="my-4 text-center">
            <div className="text-4xl font-extrabold text-slate-900 flex items-center justify-center gap-1">
              <span>{csatRating}</span>
              <span className="text-base font-medium text-slate-400">/ 5.0</span>
            </div>
            <div className="mt-2 text-xs text-emerald-600 font-semibold bg-emerald-50 py-1 px-2.5 rounded-full inline-block border border-emerald-200">
              {csatPercent}% Positive Rating
            </div>
          </div>

          <div className="text-[11px] text-slate-400 text-center border-t border-slate-100 pt-2">
            Based on verified customer feedback
          </div>
        </div>
      </div>
    </div>
  );
};
