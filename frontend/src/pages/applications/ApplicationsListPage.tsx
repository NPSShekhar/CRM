import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { applicationsApi } from '../../api/index.js';
import { Button } from '../../components/common/Button.js';
import { Spinner } from '../../components/common/Spinner.js';
import {
  Grid,
  Plus,
  Mail,
  Ticket,
  Users,
  ExternalLink,
  X,
  CheckCircle,
} from 'lucide-react';

export const ApplicationsListPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['applications'],
    queryFn: () => applicationsApi.list(),
  });

  const createAppMutation = useMutation({
    mutationFn: (payload: any) => applicationsApi.create(payload),
    onSuccess: () => {
      setModalOpen(false);
      setName('');
      setCode('');
      setDescription('');
      setSupportEmail('');
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to create application');
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    createAppMutation.mutate({
      name,
      code,
      description,
      supportEmail,
    });
  };

  if (isLoading) return <Spinner size="lg" className="h-96" />;

  const applications = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Connected Products & Applications</h1>
          <p className="text-xs text-slate-500">
            Configure external products whose support tickets and inquiries are ingested by this CRM
          </p>
        </div>
        <Button
          onClick={() => setModalOpen(true)}
          icon={<Plus className="w-4 h-4" />}
          size="sm"
        >
          Add Product
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {applications.map((app) => (
          <div
            key={app.id}
            onClick={() => navigate(`/applications/${app.id}`)}
            className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 hover:border-brand-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 font-bold flex items-center justify-center text-sm border border-brand-100">
                  {app.code.slice(0, 3)}
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle className="w-3 h-3" /> Active
                </span>
              </div>

              <h2 className="text-base font-bold text-slate-900">{app.name}</h2>
              <span className="font-mono text-[11px] text-slate-400 font-medium block mt-0.5">
                CODE: {app.code}
              </span>

              <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                {app.description || 'No description provided.'}
              </p>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate">{app.supportEmail}</span>
              </div>

              <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <Ticket className="w-3.5 h-3.5 text-slate-400" />
                  <strong className="text-slate-800">{app._count?.tickets || 0}</strong> tickets
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <strong className="text-slate-800">{app._count?.customers || 0}</strong> customers
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Application Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">Add Connected Application</h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. SkillBridge"
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Application Code *</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SKILLBRIDGE"
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs uppercase font-mono focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Dedicated Support Email *</label>
                <input
                  type="email"
                  required
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  placeholder="support@skillbridge.com"
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Overview of this product..."
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={createAppMutation.isPending}>
                  Save Application
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
