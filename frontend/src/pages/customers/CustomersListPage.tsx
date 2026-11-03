import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { customersApi, applicationsApi } from '../../api/index.js';
import { Button } from '../../components/common/Button.js';
import { Spinner } from '../../components/common/Spinner.js';
import { EmptyState } from '../../components/common/EmptyState.js';
import {
  Search,
  Plus,
  User,
  Building,
  Mail,
  Phone,
  Grid,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

export const CustomersListPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);

  // New Customer Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: customersData, isLoading } = useQuery({
    queryKey: ['customers', { search, page }],
    queryFn: () =>
      customersApi.list({
        search: search || undefined,
        page,
        limit: 15,
      }),
  });

  const { data: appsData } = useQuery({
    queryKey: ['applications'],
    queryFn: () => applicationsApi.list(),
  });

  const customers = customersData?.data || [];
  const pagination = customersData?.pagination;
  const applications = appsData?.data || [];

  const createCustomerMutation = useMutation({
    mutationFn: (data: any) => customersApi.create(data),
    onSuccess: () => {
      setModalOpen(false);
      setName('');
      setEmail('');
      setPhone('');
      setCompany('');
      setSelectedAppIds([]);
      setFormError(null);
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to create customer');
    },
  });

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    createCustomerMutation.mutate({
      name,
      email,
      phone: phone || null,
      company: company || null,
      applicationIds: selectedAppIds,
    });
  };

  const toggleAppSelection = (appId: string) => {
    setSelectedAppIds((prev) =>
      prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId]
    );
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Customer Directory</h1>
          <p className="text-xs text-slate-500">
            View customer contact records, associated applications, and ticket histories
          </p>
        </div>
        <Button
          onClick={() => setModalOpen(true)}
          icon={<Plus className="w-4 h-4" />}
          size="sm"
        >
          Add Customer
        </Button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by customer name, email, company, or customer code..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <Spinner size="md" className="h-64" />
        ) : customers.length === 0 ? (
          <EmptyState
            title="No customers found"
            description="No customer records match your current search query."
            actionText="Add Customer"
            onAction={() => setModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Connected Applications</th>
                  <th className="py-3 px-4">Tickets</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/customers/${c.id}`)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs">
                          {c.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{c.name}</div>
                          <div className="text-[11px] text-slate-400">{c.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                      {c.customerCode}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {c.company || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {c.phone || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {c.applications && c.applications.length > 0 ? (
                          c.applications.map((appRel) => (
                            <span
                              key={appRel.application.id}
                              className="text-[10px] font-medium bg-brand-50 text-brand-700 px-2 py-0.5 rounded border border-brand-100"
                            >
                              {appRel.application.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-slate-400">None</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">
                      {c._count?.tickets ?? 0}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/customers/${c.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-slate-400 hover:text-brand-600 p-1 inline-block"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <div>
              Page <span className="font-semibold text-slate-700">{pagination.page}</span> of{' '}
              <span className="font-semibold text-slate-700">{pagination.totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                icon={<ChevronLeft className="w-3.5 h-3.5" />}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(page + 1)}
                icon={<ChevronRight className="w-3.5 h-3.5" />}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create Customer Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">Add New Customer</h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rachel Green"
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rachel@company.com"
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1-555-0100"
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Company</label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Ralph Lauren"
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Connected Applications
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 border border-slate-200 rounded-lg">
                  {applications.map((app) => (
                    <label key={app.id} className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedAppIds.includes(app.id)}
                        onChange={() => toggleAppSelection(app.id)}
                        className="rounded text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-slate-700 truncate">{app.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={createCustomerMutation.isPending}>
                  Save Customer
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
