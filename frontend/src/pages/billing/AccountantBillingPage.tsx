import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { billingApi, customersApi } from '../../api/index.js';
import {
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  AlertCircle,
  Download,
  Filter,
  DollarSign,
  UserCheck,
  Search,
  Calendar,
  Building,
  Tag,
  ArrowUpRight,
} from 'lucide-react';
import { Button } from '../../components/common/Button.js';
import { Spinner } from '../../components/common/Spinner.js';
import { BillingStatus } from '../../types/index.js';

export const AccountantBillingPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [actionStatus, setActionStatus] = useState<BillingStatus | ''>('');
  const [actionNotes, setActionNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch summary
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['billingSummary'],
    queryFn: () => billingApi.getSummary(),
  });

  // Fetch list
  const { data: listData, isLoading: listLoading, refetch } = useQuery({
    queryKey: ['billingExtraHours', statusFilter],
    queryFn: () =>
      billingApi.listExtraHours({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      }),
  });

  const summary = summaryData?.data || {
    totalCustomers: 0,
    totalSupportHours: 0,
    includedHoursUsed: 0,
    extraHours: 0,
    totalExtraBilling: 0,
    pendingAmount: 0,
    invoicedAmount: 0,
    paidAmount: 0,
  };

  const records = listData?.data || [];

  const filteredRecords = records.filter((r: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.customer?.name?.toLowerCase().includes(term) ||
      r.customer?.email?.toLowerCase().includes(term) ||
      r.ticket?.ticketNumber?.toLowerCase().includes(term) ||
      r.ticket?.subject?.toLowerCase().includes(term)
    );
  });

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord || !actionStatus) return;

    setIsUpdating(true);
    try {
      await billingApi.updateStatus(selectedRecord.id, {
        status: actionStatus,
        notes: actionNotes,
      });
      queryClient.invalidateQueries({ queryKey: ['billingSummary'] });
      queryClient.invalidateQueries({ queryKey: ['billingExtraHours'] });
      setSelectedRecord(null);
      setActionStatus('');
      setActionNotes('');
    } catch (err: any) {
      alert(err.message || 'Failed to update billing status');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status: BillingStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
      case 'INVOICED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <ArrowUpRight className="w-3 h-3" /> Invoiced
          </span>
        );
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Paid
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  const handleExportCsv = () => {
    const exportUrl = billingApi.getExportUrl({
      status: statusFilter === 'ALL' ? undefined : statusFilter,
    });
    window.open(exportUrl, '_blank');
  };

  if (summaryLoading || listLoading) {
    return <Spinner size="lg" className="h-96" />;
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Support Hours & Extra Billing</h1>
            <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded">
              Accountant Module
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track customer support consumption, plan deductions, extra-hour billings, and invoicing status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">Total Support Logged</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{summary.totalSupportHours} hrs</div>
          <div className="mt-1 text-xs text-slate-500">
            Included: <span className="font-semibold text-slate-700">{summary.includedHoursUsed}h</span> | Extra:{' '}
            <span className="font-semibold text-amber-600">{summary.extraHours}h</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">Total Extra Billing</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">₹{summary.totalExtraBilling.toLocaleString()}</div>
          <div className="mt-1 text-xs text-slate-500">Across all extra hour sessions</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-amber-600">Pending Invoicing</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-900">₹{summary.pendingAmount.toLocaleString()}</div>
          <div className="mt-1 text-xs text-amber-700">Awaiting invoice generation</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-emerald-600">Collected / Paid</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-900">₹{summary.paidAmount.toLocaleString()}</div>
          <div className="mt-1 text-xs text-emerald-700">Invoiced: ₹{summary.invoicedAmount.toLocaleString()}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by customer, ticket..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'PENDING', 'INVOICED', 'PAID', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === st
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Extra Hours Records Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Extra Hours Billing Records ({filteredRecords.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Ticket</th>
                <th className="py-3 px-4">Agent</th>
                <th className="py-3 px-4 text-center">Extra Hours</th>
                <th className="py-3 px-4 text-right">Rate</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No extra-hour billing records found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(r.date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{r.customer?.name}</div>
                      <div className="text-[11px] text-slate-400">{r.customer?.company || r.customer?.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <a
                        href={`/admin/tickets/${r.ticket?.id}`}
                        className="font-medium text-brand-600 hover:underline"
                      >
                        {r.ticket?.ticketNumber}
                      </a>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">{r.ticket?.subject}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                      {r.agent?.user?.name || 'Assigned Agent'}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-amber-700">
                      {r.durationHours} hrs
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500 whitespace-nowrap">
                      ₹{r.hourlyRate}/hr
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                      ₹{r.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {getStatusBadge(r.status)}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => {
                          setSelectedRecord(r);
                          setActionStatus(r.status);
                          setActionNotes(r.notes || '');
                        }}
                        className="text-xs font-semibold text-brand-600 hover:text-brand-800 hover:underline"
                      >
                        Update Status
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status Update Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6">
            <h3 className="text-base font-bold text-slate-900 mb-2">Update Billing Status</h3>
            <p className="text-xs text-slate-500 mb-4">
              Ticket <span className="font-semibold">{selectedRecord.ticket?.ticketNumber}</span> for customer{' '}
              <span className="font-semibold">{selectedRecord.customer?.name}</span> ({selectedRecord.durationHours}h @
              ₹{selectedRecord.amount})
            </p>

            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Status</label>
                <select
                  value={actionStatus}
                  onChange={(e) => setActionStatus(e.target.value as BillingStatus)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-brand-500"
                  required
                >
                  <option value="PENDING">PENDING</option>
                  <option value="INVOICED">INVOICED</option>
                  <option value="PAID">PAID</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Invoice Notes / Reference</label>
                <textarea
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="e.g. Invoice #INV-1092 sent via email, or Wire reference..."
                  rows={3}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedRecord(null)}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={isUpdating}>
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
