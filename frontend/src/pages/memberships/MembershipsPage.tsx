import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { membershipsApi, customersApi } from '../../api/index.js';
import { Award, Plus, Check, Users, Clock, DollarSign, Calendar } from 'lucide-react';
import { Button } from '../../components/common/Button.js';
import { Spinner } from '../../components/common/Spinner.js';

export const MembershipsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form states
  const [assignCustomerId, setAssignCustomerId] = useState('');
  const [assignPlanId, setAssignPlanId] = useState('');
  const [customHours, setCustomHours] = useState('');

  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanDesc, setNewPlanDesc] = useState('');
  const [newPlanHours, setNewPlanHours] = useState('20');
  const [newPlanPrice, setNewPlanPrice] = useState('25000');
  const [newPlanRate, setNewPlanRate] = useState('1500');
  const [newPlanValidity, setNewPlanValidity] = useState('365');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch plans
  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['membershipPlans'],
    queryFn: () => membershipsApi.listPlans(),
  });

  // Fetch customers for assignment dropdown
  const { data: customersData } = useQuery({
    queryKey: ['customersDropdown'],
    queryFn: () => customersApi.list({ limit: 100 }),
  });

  const plans = plansData?.data || [];
  const customers = customersData?.data || [];

  const handleAssignPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignCustomerId || !assignPlanId) return;

    setIsSubmitting(true);
    try {
      await membershipsApi.assign({
        customerId: assignCustomerId,
        planId: assignPlanId,
        customHours: customHours ? parseFloat(customHours) : undefined,
      });
      alert('Membership plan assigned successfully!');
      setShowAssignModal(false);
      setAssignCustomerId('');
      setAssignPlanId('');
      setCustomHours('');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['membershipPlans'] });
    } catch (err: any) {
      alert(err.message || 'Failed to assign membership');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanName) return;

    setIsSubmitting(true);
    try {
      await membershipsApi.createPlan({
        name: newPlanName,
        description: newPlanDesc,
        includedHours: parseFloat(newPlanHours),
        price: parseFloat(newPlanPrice),
        extraHourRate: parseFloat(newPlanRate),
        validityDays: parseInt(newPlanValidity, 10),
      });
      alert('Membership plan created successfully!');
      setShowCreateModal(false);
      setNewPlanName('');
      setNewPlanDesc('');
      queryClient.invalidateQueries({ queryKey: ['membershipPlans'] });
    } catch (err: any) {
      alert(err.message || 'Failed to create plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (plansLoading) {
    return <Spinner size="lg" className="h-96" />;
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Customer Support Memberships</h1>
            <span className="px-2 py-0.5 text-xs font-semibold bg-brand-100 text-brand-800 rounded">
              Plans & Entitlements
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure support hour packages, included annual hours, and extra-hour billing tariffs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 border-slate-300"
          >
            <Plus className="w-4 h-4" />
            <span>Create Plan</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAssignModal(true)}
            className="flex items-center gap-1.5"
          >
            <Award className="w-4 h-4" />
            <span>Assign to Customer</span>
          </Button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan: any) => (
          <div
            key={plan.id}
            className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-2 py-0.5 rounded">
                  Plan
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {plan._count?.memberships || 0} active
                </span>
              </div>

              <h3 className="mt-3 text-lg font-bold text-slate-900">{plan.name}</h3>
              <p className="mt-1 text-xs text-slate-500 line-clamp-2">{plan.description}</p>

              <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-600">
                  <span className="flex items-center gap-1 text-slate-500">
                    <Clock className="w-3.5 h-3.5 text-brand-500" /> Included Hours:
                  </span>
                  <span className="font-bold text-slate-900">{plan.includedHours} hrs</span>
                </div>

                <div className="flex justify-between items-center text-slate-600">
                  <span className="flex items-center gap-1 text-slate-500">
                    <Calendar className="w-3.5 h-3.5 text-blue-500" /> Validity:
                  </span>
                  <span className="font-semibold text-slate-900">{plan.validityDays} days</span>
                </div>

                <div className="flex justify-between items-center text-slate-600">
                  <span className="flex items-center gap-1 text-slate-500">
                    <DollarSign className="w-3.5 h-3.5 text-amber-500" /> Extra Hour Rate:
                  </span>
                  <span className="font-bold text-amber-700">₹{plan.extraHourRate}/hr</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Annual Fee</span>
                <span className="text-base font-bold text-slate-900">₹{plan.price.toLocaleString()}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAssignPlanId(plan.id);
                  setShowAssignModal(true);
                }}
                className="text-xs"
              >
                Assign
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Assign Plan Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6">
            <h3 className="text-base font-bold text-slate-900 mb-2">Assign Support Plan to Customer</h3>
            <p className="text-xs text-slate-500 mb-4">
              Activates support hours balance and extra-hour tracking for this customer.
            </p>

            <form onSubmit={handleAssignPlan} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Select Customer</label>
                <select
                  value={assignCustomerId}
                  onChange={(e) => setAssignCustomerId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-brand-500"
                  required
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email}) {c.company ? `- ${c.company}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Select Plan</label>
                <select
                  value={assignPlanId}
                  onChange={(e) => setAssignPlanId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-brand-500"
                  required
                >
                  <option value="">-- Choose Plan --</option>
                  {plans.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.includedHours}h included, ₹{p.extraHourRate}/hr extra)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Custom Hours Override (Optional)
                </label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="Leave blank to use plan default"
                  value={customHours}
                  onChange={(e) => setCustomHours(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAssignModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
                  Confirm Assignment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Plan Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6">
            <h3 className="text-base font-bold text-slate-900 mb-2">Create New Membership Plan</h3>

            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Plan Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dedicated Priority Support"
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="What is included in this tier..."
                  value={newPlanDesc}
                  onChange={(e) => setNewPlanDesc(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Included Hours</label>
                  <input
                    type="number"
                    required
                    value={newPlanHours}
                    onChange={(e) => setNewPlanHours(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Extra Rate (₹/hr)</label>
                  <input
                    type="number"
                    required
                    value={newPlanRate}
                    onChange={(e) => setNewPlanRate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={newPlanPrice}
                    onChange={(e) => setNewPlanPrice(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Validity (Days)</label>
                  <input
                    type="number"
                    required
                    value={newPlanValidity}
                    onChange={(e) => setNewPlanValidity(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
                  Create Plan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
