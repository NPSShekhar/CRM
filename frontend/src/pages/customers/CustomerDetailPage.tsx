import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { customersApi, supportHoursApi } from '../../api/index.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { PriorityBadge } from '../../components/common/PriorityBadge.js';
import { Button } from '../../components/common/Button.js';
import { Spinner } from '../../components/common/Spinner.js';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Building,
  Calendar,
  Ticket,
  Plus,
  ExternalLink,
  Award,
  Clock,
  DollarSign,
  AlertCircle,
} from 'lucide-react';

export const CustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customersApi.getById(id!),
    enabled: !!id,
  });

  const { data: summaryData } = useQuery({
    queryKey: ['customerSupportSummary', id],
    queryFn: () => supportHoursApi.getCustomerSummary(id!),
    enabled: !!id,
  });

  if (isLoading) return <Spinner size="lg" className="h-96" />;

  const customer = data?.data;
  const supportSummary = summaryData?.data || {
    activeMembership: null,
    totalLoggedHours: 0,
    totalIncludedHours: 0,
    usedIncludedHours: 0,
    remainingIncludedHours: 0,
    totalExtraHours: 0,
    totalExtraAmount: 0,
  };

  if (!customer) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-base font-semibold text-slate-800">Customer not found</h2>
        <Button onClick={() => navigate('/customers')} className="mt-4" size="sm">
          Return to Customers
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/customers"
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{customer.name}</h1>
              <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                {customer.customerCode}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{customer.email}</p>
          </div>
        </div>

        <Button
          onClick={() => navigate('/tickets/new')}
          icon={<Plus className="w-4 h-4" />}
          size="sm"
        >
          Create Ticket
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Customer Profile */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100">
              Customer Information
            </h2>
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-slate-400" />
                <div>
                  <span className="text-slate-400 block text-[10px]">Name</span>
                  <span className="font-semibold text-slate-800">{customer.name}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-slate-400" />
                <div>
                  <span className="text-slate-400 block text-[10px]">Email</span>
                  <span className="font-medium text-slate-700">{customer.email}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-slate-400" />
                <div>
                  <span className="text-slate-400 block text-[10px]">Phone</span>
                  <span className="font-medium text-slate-700">{customer.phone || 'Not provided'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Building className="w-4 h-4 text-slate-400" />
                <div>
                  <span className="text-slate-400 block text-[10px]">Company</span>
                  <span className="font-medium text-slate-700">{customer.company || 'Not provided'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-slate-400" />
                <div>
                  <span className="text-slate-400 block text-[10px]">Created Date</span>
                  <span className="font-medium text-slate-700">
                    {new Date(customer.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Support Membership & Hours Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-brand-600" />
                <span>Support Membership</span>
              </h2>
              <Link to="/admin/memberships" className="text-xs text-brand-600 font-semibold hover:underline">
                Manage
              </Link>
            </div>

            {supportSummary.activeMembership ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">
                    {supportSummary.activeMembership.plan.name}
                  </span>
                  <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                    Active Plan
                  </span>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Included Support Hours</span>
                    <span className="font-semibold text-slate-800">
                      {supportSummary.usedIncludedHours} / {supportSummary.totalIncludedHours} hrs used
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full ${
                        supportSummary.remainingIncludedHours === 0
                          ? 'bg-rose-500'
                          : supportSummary.remainingIncludedHours < 5
                          ? 'bg-amber-500'
                          : 'bg-brand-600'
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          (supportSummary.usedIncludedHours / (supportSummary.totalIncludedHours || 1)) * 100
                        )}%`,
                      }}
                    ></div>
                  </div>
                  <div className="mt-1 flex justify-between text-[11px] text-slate-400">
                    <span>Expiry: {new Date(supportSummary.activeMembership.expiryDate).toLocaleDateString()}</span>
                    <span className="font-bold text-brand-700">
                      {supportSummary.remainingIncludedHours} hrs remaining
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-amber-50 rounded-lg border border-amber-100">
                    <span className="text-[10px] uppercase text-amber-700 block font-semibold">Extra Hours</span>
                    <span className="font-bold text-amber-900 text-sm">{supportSummary.totalExtraHours} hrs</span>
                  </div>
                  <div className="p-2 bg-purple-50 rounded-lg border border-purple-100">
                    <span className="text-[10px] uppercase text-purple-700 block font-semibold">Extra Billing</span>
                    <span className="font-bold text-purple-900 text-sm">
                      ₹{supportSummary.totalExtraAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 space-y-2">
                <p className="text-xs text-slate-400">No active membership assigned.</p>
                <Link
                  to="/admin/memberships"
                  className="inline-block text-xs font-semibold text-brand-600 hover:underline"
                >
                  + Assign Membership Plan
                </Link>
              </div>
            )}
          </div>

          {/* Connected Applications */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100">
              Connected Products
            </h2>
            <div className="space-y-2">
              {customer.applications && customer.applications.length > 0 ? (
                customer.applications.map((rel: any) => (
                  <div
                    key={rel.application.id}
                    className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/70 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">{rel.application.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{rel.application.code}</div>
                    </div>
                    <span className="text-[10px] font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                      Active
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">No applications linked yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Customer Tickets */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ticket className="w-4 h-4 text-brand-600" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Customer Tickets ({customer.tickets?.length || 0})
                </h2>
              </div>
            </div>

            {(!customer.tickets || customer.tickets.length === 0) ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No tickets filed by this customer yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {customer.tickets.map((t: any) => (
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
                        {t.application?.name} • Created {new Date(t.createdAt).toLocaleDateString()}
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
