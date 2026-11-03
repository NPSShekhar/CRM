import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { applicationsApi, ticketsApi } from '../../api/index.js';
import { Button } from '../../components/common/Button.js';
import { Spinner } from '../../components/common/Spinner.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { PriorityBadge } from '../../components/common/PriorityBadge.js';
import {
  ArrowLeft,
  Grid,
  Mail,
  CheckCircle,
  Ticket,
  Users,
  Settings,
  ExternalLink,
} from 'lucide-react';

export const ApplicationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['application', id],
    queryFn: () => applicationsApi.getById(id!),
    enabled: !!id,
  });

  const { data: appTicketsData } = useQuery({
    queryKey: ['app-tickets', id],
    queryFn: () => ticketsApi.list({ applicationId: id, limit: 10 }),
    enabled: !!id,
  });

  if (isLoading) return <Spinner size="lg" className="h-96" />;

  const app = data?.data;
  const tickets = appTicketsData?.data || [];

  if (!app) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-base font-semibold text-slate-800">Application not found</h2>
        <Button onClick={() => navigate('/applications')} className="mt-4" size="sm">
          Return to Applications
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/applications"
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">{app.name}</h1>
            <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
              {app.code}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{app.supportEmail}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Properties */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3 text-xs">
            <h2 className="font-semibold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100">
              Application Details
            </h2>

            <div>
              <span className="text-slate-400 block text-[10px]">Description</span>
              <p className="text-slate-700 mt-1 leading-relaxed">
                {app.description || 'No description provided.'}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-slate-400 block text-[10px]">Support Email Routing</span>
              <span className="font-semibold text-brand-600 block mt-0.5">{app.supportEmail}</span>
              <p className="text-[11px] text-slate-400 mt-1">
                Emails sent to this address will automatically route to {app.name} tickets.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-slate-500">Status</span>
              <span className="font-medium text-emerald-600 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Active
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Tickets */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ticket className="w-4 h-4 text-brand-600" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Recent Tickets for {app.name}
                </h2>
              </div>
            </div>

            {tickets.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No tickets for this application yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {tickets.map((t) => (
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
                      </div>
                      <p className="font-medium text-slate-800 text-sm">{t.subject}</p>
                      <span className="text-[11px] text-slate-400">
                        From {t.customer?.name} ({t.customer?.email})
                      </span>
                    </div>

                    <ExternalLink className="w-4 h-4 text-slate-400" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
