import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../../api/index.js';
import { Spinner } from '../../components/common/Spinner.js';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { BarChart3, Clock, CheckCircle2, TrendingUp, ShieldAlert } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['reports-dashboard'],
    queryFn: () => reportsApi.getDashboardMetrics(),
  });

  if (isLoading) return <Spinner size="lg" className="h-96" />;

  const metrics = data?.data;

  if (!metrics) return null;

  const STATUS_COLORS = ['#6366f1', '#3b82f6', '#f59e0b', '#a855f7', '#10b981', '#64748b'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Support Analytics & SLA Reports</h1>
        <p className="text-xs text-slate-500">
          Executive performance metrics, team resolution SLAs, and product-level ticket volume
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <Clock className="w-4 h-4 text-brand-600" />
            <span className="text-xs font-semibold uppercase">Avg First Response</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{metrics.avgResponseTimeHours} hrs</p>
          <span className="text-[11px] text-emerald-600 font-medium block mt-1">Within standard 4h SLA</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-semibold uppercase">Avg Resolution Time</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{metrics.avgResolutionTimeHours} hrs</p>
          <span className="text-[11px] text-slate-400 block mt-1">Across all connected products</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-semibold uppercase">Total Resolved</span>
          </div>
          <p className="text-2xl font-bold text-indigo-600">{metrics.resolvedTickets}</p>
          <span className="text-[11px] text-slate-400 block mt-1">Satisfied customer requests</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-semibold uppercase">Waiting on Customer</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">{metrics.pendingTickets}</p>
          <span className="text-[11px] text-slate-400 block mt-1">Information requested</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agent Assignment Volume */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <h2 className="text-sm font-semibold text-slate-900 mb-1">Ticket Volume by Support Agent</h2>
          <p className="text-xs text-slate-500 mb-4">Total tickets handled per representative</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.ticketsByAgent}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Product Volume */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <h2 className="text-sm font-semibold text-slate-900 mb-1">Inquiries by Application</h2>
          <p className="text-xs text-slate-500 mb-4">Volume comparison across connected SaaS products</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.ticketsByApplication} layout="vertical">
                <XAxis type="number" stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} width={100} tickLine={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
