import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '../../api/index.js';
import { Button } from '../../components/common/Button.js';
import { Spinner } from '../../components/common/Spinner.js';
import { Mail, ShieldCheck, CheckCircle2, AlertCircle, Save, Send } from 'lucide-react';

export const EmailSettingsPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [host, setHost] = useState('');
  const [port, setPort] = useState(587);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('');
  const [encryption, setEncryption] = useState('STARTTLS');

  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['email-settings'],
    queryFn: () => settingsApi.getEmailSettings(),
  });

  useEffect(() => {
    if (data?.data) {
      setHost(data.data.host || '');
      setPort(data.data.port || 587);
      setUsername(data.data.username || '');
      setFromEmail(data.data.fromEmail || '');
      setFromName(data.data.fromName || '');
      setEncryption(data.data.encryption || 'STARTTLS');
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: (payload: any) => settingsApi.updateEmailSettings(payload),
    onSuccess: () => {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      queryClient.invalidateQueries({ queryKey: ['email-settings'] });
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      host,
      port: Number(port),
      username,
      password: password || undefined,
      fromEmail,
      fromName,
      encryption,
    });
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await settingsApi.testSmtp({
        host,
        port: Number(port),
        username,
        password,
        fromEmail,
      });
      setTestResult(res.data || { success: false, message: 'Unknown test result' });
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'SMTP connection failed' });
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) return <Spinner size="lg" className="h-96" />;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Email & Support Channels Configuration</h1>
        <p className="text-xs text-slate-500">
          Configure outgoing email delivery servers and company customer intake channels.
        </p>
      </div>

      {/* Official Primary Support Channels Card */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-xl p-5 text-white shadow-sm border border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 bg-indigo-500/20 px-2.5 py-0.5 rounded border border-indigo-400/30">
            Official Primary Customer Channels
          </span>
          <span className="text-xs text-slate-300 font-medium">All incoming inquiries convert to Unassigned tickets</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
          <div className="p-3 rounded-lg bg-white/10 border border-white/10 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-500/30 flex items-center justify-center text-brand-300">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Company Support Email</div>
              <div className="text-sm font-bold text-white font-mono">chandra2001ks@gmail.com</div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-white/10 border border-white/10 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/30 flex items-center justify-center text-emerald-300">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Company WhatsApp Support</div>
              <div className="text-sm font-bold text-white font-mono">+91 6303803352</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
        {saveSuccess && (
          <div className="mb-5 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Email configuration updated successfully!
          </div>
        )}

        {testResult && (
          <div
            className={`mb-5 p-3 rounded-lg text-xs flex items-center gap-2 border ${
              testResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {testResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {testResult.message}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                SMTP Host Server *
              </label>
              <input
                type="text"
                required
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="smtp.mailtrap.io"
                className="w-full border border-slate-300 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                SMTP Port *
              </label>
              <input
                type="number"
                required
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
                placeholder="587"
                className="w-full border border-slate-300 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                SMTP Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="smtp-user@yourdomain.com"
                className="w-full border border-slate-300 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                SMTP Password {data?.data?.passwordMasked ? `(Masked: ${data.data.passwordMasked})` : ''}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank to keep existing"
                className="w-full border border-slate-300 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                From Email Address *
              </label>
              <input
                type="email"
                required
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="support@crm.local"
                className="w-full border border-slate-300 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                From Sender Name *
              </label>
              <input
                type="text"
                required
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="Enterprise CRM Support"
                className="w-full border border-slate-300 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Encryption Protocol
            </label>
            <select
              value={encryption}
              onChange={(e) => setEncryption(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="STARTTLS">STARTTLS (Port 587)</option>
              <option value="SSL/TLS">SSL / TLS (Port 465)</option>
              <option value="NONE">None (Port 25)</option>
            </select>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTest}
              isLoading={isTesting}
              icon={<Send className="w-3.5 h-3.5" />}
            >
              Test Connection
            </Button>

            <Button
              type="submit"
              size="sm"
              isLoading={updateMutation.isPending}
              icon={<Save className="w-3.5 h-3.5" />}
            >
              Save Configuration
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
