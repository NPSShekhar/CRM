import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { reportsApi } from '../../api/index.js';
import { Spinner } from '../../components/common/Spinner.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { PriorityBadge } from '../../components/common/PriorityBadge.js';
import { Button } from '../../components/common/Button.js';
import {
  Ticket,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Inbox,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  Calendar,
  Briefcase,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';

export const AgentWorkloadPage: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ['agent-workload-metrics'],
    queryFn: () => reportsApi.getDashboardMetrics(),
  });

  if (isLoading) {
    return <Spinner size="lg" className="h-96" />;
  }

  if (error || !data?.data) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
        Failed to load agent workload. Please verify server connection.
      </div>
    );
  }

  const metrics = data.data;
  const agent = metrics.agentInfo;

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

  return (
    <div className="space-y-6">
      {/* Agent Profile & Workload Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white font-bold text-lg flex items-center justify-center shadow-md shadow-indigo-500/20">
            {agent?.name?.charAt(0) || 'A'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900">{agent?.name || 'Support Agent'}</h1>
              <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full font-semibold border border-indigo-200">
                {agent?.teamName || 'Tier 1 Support'}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Ready for Assignments
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Assigned Capacity: <strong>{metrics.currentWorkload ?? metrics.openTickets} / {agent?.maxCapacity || 15} tickets</strong> • Specializations: {(agent?.skills || ['General CRM', 'Email Intake']).join(', ')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate('/agent/tickets')}
            size="sm"
            icon={<Ticket className="w-4 h-4" />}
          >
            My Ticket Queue ({metrics.totalTickets})
          </Button>
        </div>
      </div>

      {/* Section 12: Workload KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* 1. My Open Tickets */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">My Open</span>
            <Inbox className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <p className="text-xl font-bold text-blue-600">{metrics.myOpenTickets ?? metrics.openTickets}</p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Active issues</span>
        </div>

        {/* 2. New Assignments */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">New</span>
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <p className="text-xl font-bold text-indigo-600">{metrics.newAssignments ?? 0}</p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Need intake</span>
        </div>

        {/* 3. In Progress */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">In Progress</span>
            <Briefcase className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <p className="text-xl font-bold text-amber-600">{metrics.inProgress ?? (metrics.openTickets - (metrics.newAssignments ?? 0))}</p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Investigating</span>
        </div>

        {/* 4. Waiting for Customer */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Waiting Cust</span>
            <Clock className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <p className="text-xl font-bold text-purple-600">{metrics.waitingForCustomer ?? metrics.pendingTickets}</p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Reply pending</span>
        </div>

        {/* 5. Urgent Tickets */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Urgent</span>
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <p className="text-xl font-bold text-rose-600">{metrics.urgentTickets || 0}</p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Top priority</span>
        </div>

        {/* 6. SLA At Risk */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">SLA Risk</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <p className="text-xl font-bold text-amber-600">{metrics.slaAtRisk || 0}</p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">&lt;2h remaining</span>
        </div>

        {/* 7. SLA Breached */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">SLA Breached</span>
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <p className="text-xl font-bold text-rose-600">{metrics.slaBreached || 0}</p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Needs expedite</span>
        </div>

        {/* 8. Resolved Today */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Resolved Today</span>
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-xl font-bold text-emerald-600">{metrics.resolvedToday || metrics.resolvedTickets}</p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Solved today</span>
        </div>
      </div>

      {/* Secondary Workload Health Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900 text-white p-4 rounded-xl shadow-xs">
        <div>
          <span className="text-[11px] text-slate-400 block font-medium">Current Workload</span>
          <span className="text-lg font-bold text-white">
            {metrics.currentWorkload ?? metrics.openTickets} tickets assigned
          </span>
        </div>
        <div>
          <span className="text-[11px] text-slate-400 block font-medium">Today's Assignments</span>
          <span className="text-lg font-bold text-indigo-300">
            +{metrics.todayAssignments ?? metrics.ticketsToday} received today
          </span>
        </div>
        <div>
          <span className="text-[11px] text-slate-400 block font-medium">Average Response Time</span>
          <span className="text-lg font-bold text-emerald-400">
            {metrics.avgResponseTimeHours} hours
          </span>
        </div>
        <div>
          <span className="text-[11px] text-slate-400 block font-medium">Average Resolution Time</span>
          <span className="text-lg font-bold text-amber-300">
            {metrics.avgResolutionTimeHours} hours
          </span>
        </div>
      </div>

      {/* Main Focus: What does this agent need to handle right now? */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Urgent & Active Queue */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Immediate Action Work Queue</h2>
              <p className="text-xs text-slate-500">
                Issues requiring your troubleshooting, reply, or customer confirmation right now
              </p>
            </div>
            <Link
              to="/agent/tickets"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              All Assigned ({metrics.totalTickets})
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {(!metrics.activeTickets || metrics.activeTickets.length === 0) ? (
            <div className="p-12 text-center text-xs text-slate-400">
              <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              You currently have no open assigned tickets. Great job maintaining zero backlog!
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {metrics.activeTickets.map((t: any) => (
                <div
                  key={t.id}
                  className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-indigo-600 text-xs">{t.ticketNumber}</span>
                      <StatusBadge status={t.status} />
                      <PriorityBadge priority={t.priority} />
                      <span className="text-[11px] bg-slate-100 px-2 py-0.5 rounded font-medium text-slate-600">
                        {t.application?.name}
                      </span>
                    </div>

                    <Link
                      to={`/agent/tickets/${t.id}`}
                      className="font-semibold text-slate-900 text-sm hover:text-indigo-600 truncate block"
                    >
                      {t.subject}
                    </Link>

                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span>Customer: <strong>{t.customer?.name}</strong> ({t.customer?.email})</span>
                      <span>•</span>
                      <span>Created: {new Date(t.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <Link
                    to={`/agent/tickets/${t.id}`}
                    className="shrink-0 px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold text-xs flex items-center gap-1 transition-colors"
                  >
                    Reply
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status Breakdown for Agent */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Workload by Status</h2>
            <p className="text-xs text-slate-500">Distribution of your personal tickets</p>
          </div>

          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.ticketsByStatus}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={68}
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
};
