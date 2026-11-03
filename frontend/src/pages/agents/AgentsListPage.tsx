import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agentsApi, teamsApi } from '../../api/index.js';
import { Spinner } from '../../components/common/Spinner.js';
import { Button } from '../../components/common/Button.js';
import {
  UserCheck,
  Plus,
  Mail,
  Lock,
  Phone,
  CheckCircle,
  XCircle,
  KeyRound,
  Edit2,
  Power,
  Layers,
  LayoutGrid,
  Table as TableIcon,
  Ticket,
} from 'lucide-react';

export const AgentsListPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Add Agent Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [teamId, setTeamId] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [phone, setPhone] = useState('');
  const [skills, setSkills] = useState('');
  const [maxCapacity, setMaxCapacity] = useState('15');
  const [formError, setFormError] = useState<string | null>(null);

  // Edit Agent Modal State
  const [editingAgent, setEditingAgent] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editTeamId, setEditTeamId] = useState('');
  const [editMaxCapacity, setEditMaxCapacity] = useState('15');

  // Reset Password Modal State
  const [resettingAgent, setResettingAgent] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);

  // Confirmation Modal State
  const [confirmAction, setConfirmAction] = useState<{
    agentId: string;
    agentName: string;
    action: 'ACTIVATE' | 'DEACTIVATE';
  } | null>(null);

  // Fetch agents workload & list
  const { data: workloadData, isLoading } = useQuery({
    queryKey: ['agents-workload'],
    queryFn: () => agentsApi.getWorkload(),
  });

  const { data: teamsData } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamsApi.list(),
  });

  const teams = teamsData?.data || [];
  const workload = workloadData?.data || [];

  // Mutations
  const createAgentMutation = useMutation({
    mutationFn: (data: any) => agentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents-workload'] });
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      setShowAddModal(false);
      resetAddForm();
    },
    onError: (err: any) => {
      setFormError(err?.message || 'Failed to create agent');
    },
  });

  const updateAgentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => agentsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents-workload'] });
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      setEditingAgent(null);
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'INACTIVE' }) =>
      agentsApi.toggleStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents-workload'] });
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      setConfirmAction(null);
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      agentsApi.resetPassword(id, password),
    onSuccess: () => {
      setResettingAgent(null);
      setNewPassword('');
      setConfirmNewPassword('');
      setResetError(null);
      alert('Password has been securely reset!');
    },
    onError: (err: any) => {
      setResetError(err?.message || 'Failed to reset password');
    },
  });

  const resetAddForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setTeamId('');
    setStatus('ACTIVE');
    setPhone('');
    setSkills('');
    setMaxCapacity('15');
    setFormError(null);
  };

  const handleCreateAgent = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setFormError('Password must be at least 6 characters long');
      return;
    }

    createAgentMutation.mutate({
      name,
      email,
      password,
      status,
      phone: phone || undefined,
      teamId: teamId || null,
      skills: skills ? skills.split(',').map((s) => s.trim()).filter(Boolean) : [],
      maxCapacity: parseInt(maxCapacity, 10) || 15,
    });
  };

  const handleOpenEdit = (agent: any) => {
    setEditingAgent(agent);
    setEditName(agent.name);
    setEditPhone('');
    const teamObj = teams.find((t: any) => t.name === agent.team);
    setEditTeamId(teamObj ? teamObj.id : '');
    setEditMaxCapacity(String(agent.maxCapacity || 15));
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgent) return;
    updateAgentMutation.mutate({
      id: editingAgent.agentId,
      data: {
        name: editName,
        phone: editPhone || undefined,
        teamId: editTeamId || null,
        maxCapacity: parseInt(editMaxCapacity, 10) || 15,
      },
    });
  };

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    if (newPassword !== confirmNewPassword) {
      setResetError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setResetError('Password must be at least 6 characters long');
      return;
    }
    resetPasswordMutation.mutate({
      id: resettingAgent.agentId,
      password: newPassword,
    });
  };

  if (isLoading) return <Spinner size="lg" className="h-96" />;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Agent Management</h1>
            <span className="text-xs bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-full">
              {workload.length} total
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Create, configure, and monitor customer support agent accounts and capacities.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${
                viewMode === 'table' ? 'bg-white shadow-xs text-slate-800' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Table View"
            >
              <TableIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${
                viewMode === 'grid' ? 'bg-white shadow-xs text-slate-800' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              resetAddForm();
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Agent</span>
          </Button>
        </div>
      </div>

      {/* Main Content: Table or Grid */}
      {workload.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <UserCheck className="w-6 h-6" />
          </div>
          <h2 className="text-sm font-bold text-slate-800">No Support Agents Yet</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Click "Add Agent" to register your first support representative with credentials.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Agent</span>
          </Button>
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Agent Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Team</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assigned Tickets</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {workload.map((agent: any) => {
                  const isActive = agent.status !== 'INACTIVE';
                  return (
                    <tr key={agent.agentId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
                          {agent.name.charAt(0)}
                        </div>
                        <span>{agent.name}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{agent.email}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          <Layers className="w-3 h-3 text-slate-400" />
                          {agent.team}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {isActive ? (
                            <>
                              <CheckCircle className="w-3 h-3 text-emerald-600" /> Active
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-slate-400" /> Inactive
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        <span className="inline-flex items-center gap-1 text-slate-800 font-semibold">
                          <Ticket className="w-3.5 h-3.5 text-slate-400" />
                          {agent.currentLoad}
                        </span>
                        <span className="text-slate-400 text-[11px] ml-1">/ {agent.maxCapacity}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {agent.createdAt
                          ? new Date(agent.createdAt).toLocaleDateString([], {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(agent)}
                            title="Edit Agent Profile"
                            className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setResettingAgent(agent);
                              setNewPassword('');
                              setConfirmNewPassword('');
                              setResetError(null);
                            }}
                            title="Reset Agent Password"
                            className="p-1.5 rounded-md text-slate-600 hover:text-indigo-600 hover:bg-indigo-50"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              setConfirmAction({
                                agentId: agent.agentId,
                                agentName: agent.name,
                                action: isActive ? 'DEACTIVATE' : 'ACTIVATE',
                              })
                            }
                            title={isActive ? 'Deactivate Agent' : 'Activate Agent'}
                            className={`p-1.5 rounded-md ${
                              isActive
                                ? 'text-rose-600 hover:bg-rose-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {workload.map((item: any) => {
            const isActive = item.status !== 'INACTIVE';
            return (
              <div
                key={item.agentId}
                className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-sm">
                      {item.name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">{item.name}</h2>
                      <p className="text-[11px] text-slate-400">{item.email}</p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Team:</span>
                    <span className="font-semibold text-slate-800">{item.team}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span>Active Load:</span>
                    <span className="font-semibold text-slate-800">
                      {item.currentLoad} / {item.maxCapacity} tickets
                    </span>
                  </div>

                  <div className="pt-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span>Capacity</span>
                      <span>{item.capacityPercentage}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          item.capacityPercentage > 85
                            ? 'bg-rose-500'
                            : item.capacityPercentage > 60
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${item.capacityPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleOpenEdit(item)}>
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setResettingAgent(item);
                      setNewPassword('');
                      setConfirmNewPassword('');
                      setResetError(null);
                    }}
                  >
                    Reset Password
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={isActive ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'}
                    onClick={() =>
                      setConfirmAction({
                        agentId: item.agentId,
                        agentName: item.name,
                        action: isActive ? 'DEACTIVATE' : 'ACTIVATE',
                      })
                    }
                  >
                    {isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* ADD NEW AGENT MODAL                                       */}
      {/* ========================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6">
            <h2 className="text-base font-bold text-slate-900 mb-1">Add Support Agent</h2>
            <p className="text-xs text-slate-500 mb-4">
              Create an Agent account. Passwords are encrypted before storage.
            </p>

            {formError && (
              <div className="mb-4 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateAgent} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Chandra"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-brand-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="agent@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-brand-500 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-brand-500 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Confirm Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-brand-500 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Team</label>
                  <select
                    value={teamId}
                    onChange={(e) => setTeamId(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs focus:ring-1 focus:ring-brand-500 text-slate-900 bg-white"
                  >
                    <option value="">-- Unassigned --</option>
                    {teams.map((t: any) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs focus:ring-1 focus:ring-brand-500 text-slate-900 bg-white"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Max Capacity</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={maxCapacity}
                    onChange={(e) => setMaxCapacity(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-brand-500 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="+91-9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-brand-500 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Skills (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Email Support, Billing, Technical Troubleshooting"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-brand-500 text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                  disabled={createAgentMutation.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={createAgentMutation.isPending}>
                  Create Agent
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* EDIT AGENT MODAL                                          */}
      {/* ========================================================= */}
      {editingAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6">
            <h2 className="text-base font-bold text-slate-900 mb-1">Edit Agent Profile</h2>
            <p className="text-xs text-slate-500 mb-4">{editingAgent.email}</p>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-brand-500 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Team</label>
                  <select
                    value={editTeamId}
                    onChange={(e) => setEditTeamId(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs focus:ring-1 focus:ring-brand-500 text-slate-900 bg-white"
                  >
                    <option value="">-- Unassigned --</option>
                    {teams.map((t: any) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Max Capacity</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={editMaxCapacity}
                    onChange={(e) => setEditMaxCapacity(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-brand-500 text-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingAgent(null)}
                  disabled={updateAgentMutation.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={updateAgentMutation.isPending}>
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* RESET PASSWORD MODAL                                      */}
      {/* ========================================================= */}
      {resettingAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-sm w-full p-6">
            <h2 className="text-base font-bold text-slate-900 mb-1">Reset Agent Password</h2>
            <p className="text-xs text-slate-500 mb-4">
              Enter a new password for <span className="font-semibold text-slate-700">{resettingAgent.name}</span>.
            </p>

            {resetError && (
              <div className="mb-4 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {resetError}
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">New Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-brand-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-brand-500 text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setResettingAgent(null)}
                  disabled={resetPasswordMutation.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={resetPasswordMutation.isPending}>
                  Reset Password
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* CONFIRMATION DIALOG FOR ACTIVATION/DEACTIVATION           */}
      {/* ========================================================= */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 text-center">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
                confirmAction.action === 'DEACTIVATE' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
              }`}
            >
              <Power className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {confirmAction.action === 'DEACTIVATE' ? 'Deactivate Agent?' : 'Activate Agent?'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-5">
              Are you sure you want to {confirmAction.action.toLowerCase()}{' '}
              <span className="font-semibold text-slate-800">{confirmAction.agentName}</span>?
              {confirmAction.action === 'DEACTIVATE' && ' The agent will not be able to log in or receive tickets.'}
            </p>

            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmAction(null)}
                disabled={toggleStatusMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant={confirmAction.action === 'DEACTIVATE' ? 'danger' : 'primary'}
                size="sm"
                isLoading={toggleStatusMutation.isPending}
                onClick={() =>
                  toggleStatusMutation.mutate({
                    id: confirmAction.agentId,
                    status: confirmAction.action === 'DEACTIVATE' ? 'INACTIVE' : 'ACTIVE',
                  })
                }
              >
                Confirm {confirmAction.action === 'DEACTIVATE' ? 'Deactivate' : 'Activate'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
