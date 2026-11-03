import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { emailApi, applicationsApi } from '../../api/index.js';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../../components/common/Button.js';
import {
  Send,
  Mail,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Inbox,
  Repeat,
} from 'lucide-react';

export const EmailSimulatorPage: React.FC = () => {
  const navigate = useNavigate();

  const [from, setFrom] = useState('john.smith@acmecorp.com');
  const [fromName, setFromName] = useState('John Smith');
  const [to, setTo] = useState('support@skillbridge.com');
  const [subject, setSubject] = useState('Unable to login to SkillBridge portal');
  const [bodyText, setBodyText] = useState('Hello, I am getting an authentication error when trying to access the exam portal. Please help.');
  const [messageId, setMessageId] = useState(`<sim-${Date.now()}@acmecorp.com>`);
  const [inReplyTo, setInReplyTo] = useState('');
  const [references, setReferences] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [responseResult, setResponseResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: appsData } = useQuery({
    queryKey: ['applications'],
    queryFn: () => applicationsApi.list(),
  });

  const applications = appsData?.data || [];

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResponseResult(null);

    try {
      const res = await emailApi.simulateIncoming({
        from,
        fromName,
        to,
        subject,
        bodyText,
        messageId,
        inReplyTo: inReplyTo.trim() || undefined,
        references: references.trim() || undefined,
      });
      setResponseResult(res.data);
      // Auto-regenerate next fresh messageId for convenience
      setMessageId(`<sim-${Date.now() + 10}@acmecorp.com>`);
    } catch (err: any) {
      setError(err.message || 'Failed to simulate incoming email');
    } finally {
      setIsLoading(false);
    }
  };

  // Preset Loaders
  const loadNewTicketPreset = () => {
    setFrom('alexandra.vance@techfirm.io');
    setFromName('Alexandra Vance');
    setTo('support@bizone.com');
    setSubject('Invoice generation error in Q4 GST filing');
    setBodyText('When exporting our Q4 GST summary, the tax rates appear inverted for inter-state transactions. Can someone assist?');
    setMessageId(`<sim-${Date.now()}@techfirm.io>`);
    setInReplyTo('');
    setReferences('');
  };

  const loadReplyPreset = () => {
    setFrom('john@example.com');
    setFromName('John Doe');
    setTo('support@skillbridge.com');
    setSubject('Re: [CRM-000001] Unable to login to SkillBridge student portal');
    setBodyText('Hi Ravi, I cleared my cache and reset my browser cookies as instructed, and now it works smoothly! Thank you.');
    setMessageId(`<sim-${Date.now()}@example.com>`);
    setInReplyTo('<crm-reply-001@crm.local>');
    setReferences('<email-001@example.com> <crm-reply-001@crm.local>');
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Two-Way Email Ingestion Simulator</h1>
        <p className="text-xs text-slate-500">
          Test real-time automatic ticket creation, customer resolution, duplicate idempotency, and email thread detection
        </p>
      </div>

      {/* Preset Quick Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-2">Presets:</span>
        <button
          type="button"
          onClick={loadNewTicketPreset}
          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          New Customer Ticket (BizOne)
        </button>

        <button
          type="button"
          onClick={loadReplyPreset}
          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 shadow-xs"
        >
          <Repeat className="w-3.5 h-3.5 text-brand-600" />
          Reply to Existing CRM-000001 Thread
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Email Simulation Form */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <form onSubmit={handleSimulate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  From (Sender Email) *
                </label>
                <input
                  type="email"
                  required
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Sender Name
                </label>
                <input
                  type="text"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                To (Recipient Support Email) *
              </label>
              <select
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                {applications.map((app) => (
                  <option key={app.id} value={app.supportEmail}>
                    {app.supportEmail} ({app.name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Email Subject *
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Plain Text Message Body *
              </label>
              <textarea
                rows={4}
                required
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            {/* Email Headers (Message-ID, In-Reply-To, References) */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <span className="text-[11px] font-semibold uppercase text-slate-500 block">
                MIME / RFC 822 Email Headers
              </span>

              <div>
                <label className="block text-[11px] text-slate-600 mb-0.5">Message-ID (Unique provider ID)</label>
                <input
                  type="text"
                  required
                  value={messageId}
                  onChange={(e) => setMessageId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-1.5 text-xs font-mono text-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-600 mb-0.5">In-Reply-To</label>
                  <input
                    type="text"
                    value={inReplyTo}
                    onChange={(e) => setInReplyTo(e.target.value)}
                    placeholder="<parent-id@server.com>"
                    className="w-full border border-slate-300 rounded-lg p-1.5 text-xs font-mono text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-0.5">References</label>
                  <input
                    type="text"
                    value={references}
                    onChange={(e) => setReferences(e.target.value)}
                    placeholder="<ancestor-id@server.com>"
                    className="w-full border border-slate-300 rounded-lg p-1.5 text-xs font-mono text-slate-700"
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              size="sm"
              isLoading={isLoading}
              icon={<Send className="w-3.5 h-3.5" />}
              className="w-full mt-2"
            >
              Simulate Inbound Email Ingestion
            </Button>
          </form>
        </div>

        {/* Live Server Response Status Box */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100 mb-3">
              Ingestion Result
            </h2>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs space-y-1">
                <div className="font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Simulation Failed
                </div>
                <p>{error}</p>
              </div>
            )}

            {responseResult && (
              <div className="space-y-3 text-xs">
                <div
                  className={`p-3 rounded-lg border flex items-start gap-2 ${
                    responseResult.isDuplicate
                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold block">{responseResult.message}</span>
                    <span className="text-[11px] mt-0.5 block">
                      Ticket Assigned: <strong>{responseResult.ticketNumber}</strong>
                    </span>
                  </div>
                </div>

                <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-600">
                  <div className="text-xs font-bold text-emerald-700 flex items-center gap-1 pb-1.5 border-b border-slate-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Email received ✓</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Customer:</span>
                    <strong className="text-slate-900">{responseResult.customerName || fromName || from}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Application:</span>
                    <strong className="text-slate-900">{responseResult.applicationName || 'SkillBridge'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Ticket:</span>
                    <span className="font-mono font-bold text-brand-600">{responseResult.ticketNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status:</span>
                    <strong className="text-slate-900">{responseResult.status || 'NEW'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Assigned Agent:</span>
                    <strong className="text-slate-900">{responseResult.assignedAgent || 'Auto Assigned'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Thread:</span>
                    <strong className="text-slate-900">{responseResult.threadStatus || (responseResult.isNewTicket ? 'Created' : 'Updated')}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">New Ticket:</span>
                    <strong className={responseResult.isNewTicket ? 'text-indigo-600 font-bold' : 'text-slate-700'}>
                      {responseResult.isNewTicket ? 'YES' : 'NO'}
                    </strong>
                  </div>
                </div>

                {responseResult.ticketId && (
                  <Button
                    onClick={() => navigate(`/tickets/${responseResult.ticketId}`)}
                    size="sm"
                    className="w-full"
                    icon={<ExternalLink className="w-3.5 h-3.5" />}
                  >
                    Open Ticket in CRM
                  </Button>
                )}
              </div>
            )}

            {!responseResult && !error && (
              <div className="p-6 text-center text-xs text-slate-400">
                <Inbox className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                Submit an email or choose a preset above to test the ingestion pipeline.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
