import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { applicationsApi, customersApi, ticketsApi } from '../../api/index.js';
import { useAuth } from '../../context/AuthContext.js';
import { Button } from '../../components/common/Button.js';
import { ArrowLeft, Save, Plus } from 'lucide-react';
import { TicketPriority, TicketSource } from '../../types/index.js';

export const NewTicketPage: React.FC = () => {
  const navigate = useNavigate();

  const [applicationId, setApplicationId] = useState('');
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing');
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('MEDIUM');
  const [source, setSource] = useState<TicketSource>('WEB');
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();
  const isAgent = user?.role === 'AGENT';
  const ticketsBasePath = isAgent ? '/agent/tickets' : '/admin/tickets';

  const { data: appsData } = useQuery({
    queryKey: ['applications'],
    queryFn: () => applicationsApi.list(),
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers-list-all'],
    queryFn: () => customersApi.list({ limit: 100 }),
  });

  const applications = appsData?.data || [];
  const customers = customersData?.data || [];

  const createTicketMutation = useMutation({
    mutationFn: (data: any) => ticketsApi.create(data),
    onSuccess: (res) => {
      if (res.data?.id) {
        navigate(`${ticketsBasePath}/${res.data.id}`);
      } else {
        navigate(ticketsBasePath);
      }
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to create ticket');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!applicationId) {
      setError('Please select an application');
      return;
    }

    const payload: any = {
      applicationId,
      subject,
      description,
      priority,
      source,
    };

    if (customerMode === 'existing') {
      if (!customerId) {
        setError('Please choose an existing customer');
        return;
      }
      payload.customerId = customerId;
    } else {
      if (!customerEmail) {
        setError('Please enter a customer email address');
        return;
      }
      payload.customerEmail = customerEmail;
      payload.customerName = customerName || customerEmail.split('@')[0];
    }

    createTicketMutation.mutate(payload);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to={ticketsBasePath}
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Create Support Ticket</h1>
          <p className="text-xs text-slate-500">
            Open a new ticket and route it through automatic application assignment rules
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
        {error && (
          <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Product / Application */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Connected Product / Application *
            </label>
            <select
              required
              value={applicationId}
              onChange={(e) => setApplicationId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">Select an Application</option>
              {applications.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.name} ({app.supportEmail})
                </option>
              ))}
            </select>
          </div>

          {/* Customer Selection Tabs */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Customer Information *
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCustomerMode('existing')}
                  className={`text-xs px-2.5 py-1 rounded font-medium ${
                    customerMode === 'existing'
                      ? 'bg-brand-50 text-brand-700 border border-brand-200'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  Existing Customer
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerMode('new')}
                  className={`text-xs px-2.5 py-1 rounded font-medium ${
                    customerMode === 'new'
                      ? 'bg-brand-50 text-brand-700 border border-brand-200'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  + New Customer
                </button>
              </div>
            </div>

            {customerMode === 'existing' ? (
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="">Choose an Existing Customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.email}) {c.company ? `• ${c.company}` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Customer Full Name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="border border-slate-300 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <input
                  type="email"
                  required
                  placeholder="Customer Email Address"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="border border-slate-300 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            )}
          </div>

          {/* Ticket Details */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Subject *
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of the issue (e.g., Unable to generate payroll summary)"
                className="w-full border border-slate-300 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TicketPriority)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Source Channel
                </label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value as TicketSource)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="WEB">Web Portal</option>
                  <option value="EMAIL">Email</option>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="CUSTOMER_PORTAL">Customer Portal</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Description & Initial Message *
              </label>
              <textarea
                rows={5}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed explanation of the problem, error logs, or user feedback..."
                className="w-full border border-slate-300 rounded-lg p-3 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate(ticketsBasePath)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={createTicketMutation.isPending}
              icon={<Save className="w-3.5 h-3.5" />}
            >
              Create Ticket
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
