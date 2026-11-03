import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamsApi } from '../../api/index.js';
import { Button } from '../../components/common/Button.js';
import { Spinner } from '../../components/common/Spinner.js';
import { Layers, Plus, Users, Ticket, X } from 'lucide-react';

export const TeamsListPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamsApi.list(),
  });

  const createTeamMutation = useMutation({
    mutationFn: (payload: any) => teamsApi.create(payload),
    onSuccess: () => {
      setModalOpen(false);
      setName('');
      setDescription('');
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to create team');
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createTeamMutation.mutate({ name, description });
  };

  if (isLoading) return <Spinner size="lg" className="h-96" />;

  const teams = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Support Teams & Tiers</h1>
          <p className="text-xs text-slate-500">
            Organize support agents into specialized operational and escalation units
          </p>
        </div>
        <Button
          onClick={() => setModalOpen(true)}
          icon={<Plus className="w-4 h-4" />}
          size="sm"
        >
          Add Team
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {teams.map((team: any) => (
          <div
            key={team.id}
            className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-slate-900">{team.name}</h2>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                {team.description || 'No description.'}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <strong className="text-slate-700">{team._count?.agents || 0}</strong> agents
              </span>
              <span className="flex items-center gap-1">
                <Ticket className="w-3.5 h-3.5 text-slate-400" />
                <strong className="text-slate-700">{team._count?.tickets || 0}</strong> tickets
              </span>
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">Create Support Team</h2>
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Team Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Enterprise Escalations"
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Purpose of this team..."
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={createTeamMutation.isPending}>
                  Save Team
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
