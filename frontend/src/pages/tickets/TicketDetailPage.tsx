import React, { useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketsApi, agentsApi, emailApi, supportHoursApi } from '../../api/index.js';
import { useAuth } from '../../context/AuthContext.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { PriorityBadge } from '../../components/common/PriorityBadge.js';
import { Button } from '../../components/common/Button.js';
import { Spinner } from '../../components/common/Spinner.js';
import {
  ArrowLeft,
  Send,
  Lock,
  Paperclip,
  Check,
  AlertCircle,
  Clock,
  User,
  Building,
  Mail,
  Phone,
  Grid,
  RefreshCw,
  FileText,
  File,
  DollarSign,
  Plus,
  UserPlus,
  AlertTriangle,
  History,
} from 'lucide-react';
import { TicketStatus, TicketPriority } from '../../types/index.js';
import DOMPurify from 'dompurify';

export const TicketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'SUPPORT_MANAGER';

  const [replyText, setReplyText] = useState('');
  const [messageType, setMessageType] = useState<'PUBLIC' | 'INTERNAL_NOTE'>('PUBLIC');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Assignment states
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [assignReason, setAssignReason] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Time logging states
  const [showLogTimeModal, setShowLogTimeModal] = useState(false);
  const [logMinutes, setLogMinutes] = useState('60');
  const [logDesc, setLogDesc] = useState('');
  const [logRate, setLogRate] = useState('1500');
  const [isLoggingTime, setIsLoggingTime] = useState(false);

  // Load ticket details
  const { data: ticketData, isLoading: ticketLoading } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => ticketsApi.getById(id!),
    enabled: !!id,
  });

  // Load conversation messages
  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ['ticket-messages', id],
    queryFn: () => ticketsApi.getMessages(id!),
    enabled: !!id,
    refetchInterval: 5000,
  });

  // Load support time entries
  const { data: timeEntriesData, refetch: refetchTimeEntries } = useQuery({
    queryKey: ['ticket-time-entries', id],
    queryFn: () => supportHoursApi.getTicketTimeEntries(id!),
    enabled: !!id,
  });

  const isAgent = user?.role === 'AGENT';
  const ticketsBasePath = isAgent ? '/agent/tickets' : '/admin/tickets';

  // Load available agents for assignment (Admins / Managers only)
  const { data: agentsData } = useQuery({
    queryKey: ['agents'],
    queryFn: () => agentsApi.list(),
    enabled: !!isAdmin,
  });

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: (status: TicketStatus) => ticketsApi.updateStatus(id!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['ticket-messages', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
    },
  });

  const updatePriorityMutation = useMutation({
    mutationFn: (priority: TicketPriority) => ticketsApi.updatePriority(id!, priority),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['ticket-messages', id] });
    },
  });

  const assignAgentMutation = useMutation({
    mutationFn: (agentId: string) => ticketsApi.assign(id!, { agentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (payload: any) => ticketsApi.addMessage(id!, payload),
    onSuccess: () => {
      setReplyText('');
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['ticket-messages', id] });
    },
  });

  const retryEmailMutation = useMutation({
    mutationFn: (emailId: string) => emailApi.retry(emailId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-messages', id] });
    },
  });

  if (ticketLoading || messagesLoading) {
    return <Spinner size="lg" className="h-96" />;
  }

  const ticket = ticketData?.data;
  const messages = messagesData?.data || [];
  const agents = agentsData?.data || [];

  if (!ticket) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-base font-semibold text-slate-800">Ticket not found</h2>
        <Button onClick={() => navigate(ticketsBasePath)} className="mt-4" size="sm">
          Return to Tickets
        </Button>
      </div>
    );
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() && !selectedFile) return;

    let attachments: any[] = [];
    if (selectedFile) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        const uploadRes = await ticketsApi.uploadAttachment(formData);
        if (uploadRes.data) {
          attachments.push(uploadRes.data);
        }
      } catch (err) {
        alert('File upload failed');
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    sendMessageMutation.mutate({
      bodyText: replyText,
      messageType,
      source: 'WEB',
      attachments: attachments.length > 0 ? attachments : undefined,
    });
  };

  const timeSummary = timeEntriesData?.data || {
    totalHours: 0,
    includedHoursUsed: 0,
    extraHoursUsed: 0,
    extraCharges: 0,
    entries: [],
  };

  const activeMembership = ticket?.customer?.memberships?.[0] || null;

  const handleManualAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgentId) return;

    setIsAssigning(true);
    try {
      await ticketsApi.assign(ticket.id, {
        agentId: selectedAgentId,
        reason: assignReason || 'Manually assigned by Admin',
      });
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['ticket-messages', id] });
      setSelectedAgentId('');
      setAssignReason('');
    } catch (err: any) {
      alert(err.message || 'Failed to assign ticket');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleLogTime = async (e: React.FormEvent) => {
    e.preventDefault();
    const durationMinutes = parseInt(logMinutes, 10);
    if (!durationMinutes || durationMinutes <= 0) {
      alert('Please enter valid work duration');
      return;
    }
    if (!logDesc.trim()) {
      alert('Please enter work description');
      return;
    }

    setIsLoggingTime(true);
    try {
      await supportHoursApi.logTime(ticket.id, {
        agentId: ticket.assignedAgentId || user?.id,
        durationMinutes,
        description: logDesc,
        hourlyRate: logRate ? parseFloat(logRate) : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['ticket-time-entries', id] });
      setShowLogTimeModal(false);
      setLogDesc('');
      setLogMinutes('60');
    } catch (err: any) {
      alert(err.message || 'Failed to log support time');
    } finally {
      setIsLoggingTime(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Warning Banners */}
      {!ticket.assignedAgentId && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 flex items-center justify-between text-xs text-amber-900 shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">UNASSIGNED TICKET:</span> This ticket was received via {ticket.source} and requires manual assignment by an Admin before agent resolution can begin.
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={() => document.getElementById('assign-widget')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-2.5 py-1 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 transition-colors shrink-0 ml-3"
            >
              Assign Agent
            </button>
          )}
        </div>
      )}

      {timeSummary.extraHoursUsed > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3.5 flex items-center justify-between text-xs text-purple-900 shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-purple-600 shrink-0" />
            <div>
              <span className="font-bold">⚠ Extra Support Hours Used:</span> {timeSummary.extraHoursUsed} hrs (Charge: ₹{timeSummary.extraCharges.toLocaleString()}) on this ticket. Sent to Accountant Module for invoicing.
            </div>
          </div>
          <span className="text-[10px] font-bold bg-purple-200/70 text-purple-800 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Billable Extra Hours
          </span>
        </div>
      )}

      {/* Top Navigation & Header */}
      <div className="flex items-center gap-3">
        <Link
          to={ticketsBasePath}
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-lg">{ticket.ticketNumber}</span>
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
              {ticket.application.name}
            </span>
          </div>
          <h1 className="text-sm font-semibold text-slate-700 mt-0.5">{ticket.subject}</h1>
        </div>
      </div>

      {/* Main 2-Column Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Conversation Timeline & Reply Composer */}
        <div className="lg:col-span-2 space-y-4">
          {/* Conversation Timeline Box */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4 pb-2 border-b border-slate-100">
              Conversation History
            </h2>

            <div className="space-y-4">
              {messages.map((m) => {
                const isCustomer = m.senderType === 'CUSTOMER';
                const isSystem = m.senderType === 'SYSTEM';
                const isInternalNote = m.messageType === 'INTERNAL_NOTE';

                if (isSystem) {
                  return (
                    <div key={m.id} className="flex items-center justify-center my-3">
                      <span className="text-[11px] bg-slate-100 text-slate-600 px-3 py-1 rounded-full border border-slate-200">
                        {m.bodyText} • {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                }

                if (isInternalNote) {
                  return (
                    <div
                      key={m.id}
                      className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 space-y-2 shadow-xs"
                    >
                      <div className="flex items-center justify-between text-xs font-semibold text-amber-800">
                        <span className="flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-amber-600" />
                          Internal Note • {m.senderUser?.name || 'Agent'}
                        </span>
                        <span className="text-[11px] font-normal text-amber-600">
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed whitespace-pre-wrap">{m.bodyText}</p>
                    </div>
                  );
                }

                return (
                  <div
                    key={m.id}
                    className={`p-4 rounded-xl border space-y-2.5 shadow-xs ${
                      isCustomer
                        ? 'bg-slate-50/80 border-slate-200 text-slate-900'
                        : 'bg-indigo-50/40 border-indigo-100 text-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] text-white ${
                            isCustomer ? 'bg-slate-700' : 'bg-brand-600'
                          }`}
                        >
                          {isCustomer
                            ? m.senderCustomer?.name?.charAt(0) || 'C'
                            : m.senderUser?.name?.charAt(0) || 'A'}
                        </div>
                        <span className="font-semibold text-slate-800">
                          {isCustomer
                            ? m.senderCustomer?.name || 'Customer'
                            : `${m.senderUser?.name || 'Support Agent'} (Agent)`}
                        </span>
                        {m.source === 'EMAIL' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                            <Mail className="w-3 h-3" /> via Email
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Email Outgoing Status Pill */}
                        {m.emailMessage && !isCustomer && (
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              m.emailMessage.status === 'SENT' || m.emailMessage.status === 'DELIVERED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : m.emailMessage.status === 'PENDING'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                            title={m.emailMessage.failureReason || m.emailMessage.errorMessage || undefined}
                          >
                            {m.emailMessage.status === 'FAILED' ? (
                              <>
                                <AlertCircle className="w-3 h-3 text-rose-600" />
                                <span>Failed to send</span>
                                <button
                                  onClick={() => retryEmailMutation.mutate(m.emailMessage!.id)}
                                  disabled={retryEmailMutation.isPending}
                                  className="ml-1 text-rose-800 underline font-semibold hover:text-rose-950 disabled:opacity-50"
                                >
                                  {retryEmailMutation.isPending ? 'Retrying...' : 'Retry'}
                                </button>
                              </>
                            ) : m.emailMessage.status === 'PENDING' ? (
                              <>
                                <Clock className="w-3 h-3" /> Sending...
                              </>
                            ) : (
                              <>
                                <Check className="w-3 h-3" /> Sent
                              </>
                            )}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400">
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {m.bodyHtml ? (
                      <div
                        className="text-xs leading-relaxed text-slate-800 break-words"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(m.bodyHtml) }}
                      />
                    ) : (
                      <p className="text-xs leading-relaxed whitespace-pre-wrap text-slate-800">
                        {m.bodyText}
                      </p>
                    )}

                    {/* Attachments */}
                    {m.attachments && m.attachments.length > 0 && (
                      <div className="pt-2 flex flex-wrap gap-2">
                        {m.attachments.map((att) => (
                          <a
                            key={att.id}
                            href={att.publicUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-xs text-brand-600 hover:bg-slate-50 shadow-xs"
                          >
                            <File className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate max-w-[180px]">{att.originalName}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reply Composer Box */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
            <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
              <button
                type="button"
                onClick={() => setMessageType('PUBLIC')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  messageType === 'PUBLIC'
                    ? 'bg-brand-50 text-brand-700 border border-brand-200'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                Reply to Customer (Email)
              </button>

              <button
                type="button"
                onClick={() => setMessageType('INTERNAL_NOTE')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  messageType === 'INTERNAL_NOTE'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <Lock className="w-3.5 h-3.5 text-amber-700" />
                Internal Note (Staff only)
              </button>
            </div>

            <form onSubmit={handleSendMessage} className="space-y-3">
              <textarea
                rows={4}
                required
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={
                  messageType === 'PUBLIC'
                    ? 'Type your message to the customer. This will automatically send an email to them with the ticket thread identifier...'
                    : 'Add an internal note visible only to support agents. Customers will never see this.'
                }
                className={`w-full p-3 border rounded-xl text-xs focus:outline-none focus:ring-2 resize-y ${
                  messageType === 'INTERNAL_NOTE'
                    ? 'bg-amber-50/40 border-amber-200 focus:ring-amber-500'
                    : 'bg-white border-slate-300 focus:ring-brand-500'
                }`}
              />

              {/* Attachment Preview */}
              {selectedFile && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-500" />
                    <span className="font-medium text-slate-700">{selectedFile.name}</span>
                    <span className="text-[11px] text-slate-400">
                      ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="text-slate-400 hover:text-red-500 text-xs"
                  >
                    Remove
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={<Paperclip className="w-3.5 h-3.5" />}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Attach File
                  </Button>
                </div>

                <Button
                  type="submit"
                  size="sm"
                  variant={messageType === 'INTERNAL_NOTE' ? 'secondary' : 'primary'}
                  isLoading={sendMessageMutation.isPending || isUploading}
                  icon={<Send className="w-3.5 h-3.5" />}
                >
                  {messageType === 'INTERNAL_NOTE' ? 'Save Internal Note' : 'Send Email Reply'}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Ticket Properties & Metadata Sidebar */}
        <div className="space-y-4">
          {/* 1. MANUAL AGENT ASSIGNMENT CARD (Admin Controls) */}
          <div id="assign-widget" className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5 text-brand-600" />
                <span>Agent Assignment</span>
              </h2>
              {ticket.assignedAgent ? (
                <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                  Assigned
                </span>
              ) : (
                <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200">
                  Unassigned
                </span>
              )}
            </div>

            <div className="text-xs">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200">
                <div className="w-6 h-6 rounded-full bg-slate-800 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                  {ticket.assignedAgent ? ticket.assignedAgent.user.name.charAt(0) : '?'}
                </div>
                <div>
                  <div className="font-semibold text-slate-900">
                    {ticket.assignedAgent ? ticket.assignedAgent.user.name : 'Unassigned'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {ticket.assignedAgent ? ticket.assignedAgent.team?.name || 'General Team' : 'Requires Admin Manual Assignment'}
                  </div>
                </div>
              </div>
            </div>

            {isAdmin && (
              <form onSubmit={handleManualAssign} className="pt-2 border-t border-slate-100 space-y-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                    {ticket.assignedAgent ? 'Reassign Agent' : 'Select Agent to Assign'}
                  </label>
                  <select
                    value={selectedAgentId}
                    onChange={(e) => setSelectedAgentId(e.target.value)}
                    required
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs font-medium bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    <option value="">-- Choose Agent --</option>
                    {agents.map((ag: any) => (
                      <option key={ag.id} value={ag.id}>
                        {ag.user.name} ({ag.team?.name || 'General'}) - Active: {ag.currentLoad || 0}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="Assignment reason (optional)..."
                    value={assignReason}
                    onChange={(e) => setAssignReason(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isAssigning}
                  className="w-full text-xs font-semibold py-1.5"
                >
                  {ticket.assignedAgent ? 'Reassign Ticket' : 'Assign Agent'}
                </Button>
              </form>
            )}

            {/* Assignment History */}
            {ticket.assignments && ticket.assignments.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                  <History className="w-3 h-3" /> Assignment History
                </span>
                <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                  {ticket.assignments.map((as: any) => (
                    <div key={as.id} className="text-[11px] p-1.5 rounded bg-slate-50 border border-slate-100">
                      <div className="font-medium text-slate-800">
                        → {as.newAgent?.user?.name || 'Unassigned'}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center justify-between mt-0.5">
                        <span>{new Date(as.createdAt).toLocaleDateString()}</span>
                        {as.assignedBy && <span>by {as.assignedBy.name}</span>}
                      </div>
                      {as.reason && <div className="text-[10px] text-slate-500 italic mt-0.5">"{as.reason}"</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 2. SUPPORT HOURS & TIME TRACKING CARD */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-brand-600" />
                <span>Support Hours Tracking</span>
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLogTimeModal(true)}
                className="text-[11px] h-6 px-2 py-0 border-brand-200 text-brand-700 hover:bg-brand-50"
              >
                <Plus className="w-3 h-3 mr-1" /> Log Time
              </Button>
            </div>

            {/* Customer Membership Balance */}
            {activeMembership ? (
              <div className="p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-100 text-xs">
                <div className="flex items-center justify-between font-semibold text-indigo-950">
                  <span>{activeMembership.plan.name}</span>
                  <span className="text-[11px] text-indigo-700">₹{activeMembership.plan.extraHourRate}/hr extra</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-indigo-800">
                  <span>Included: {activeMembership.totalHours} hrs</span>
                  <span>Used: {activeMembership.usedHours} hrs</span>
                  <span className="font-bold text-indigo-900">Remaining: {activeMembership.remainingHours} hrs</span>
                </div>
              </div>
            ) : (
              <div className="p-2 rounded bg-slate-50 border border-slate-200 text-[11px] text-slate-500">
                No active membership plan on customer profile. All hours bill as extra hours.
              </div>
            )}

            {/* Hours breakdown for this ticket */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] uppercase text-slate-400 block font-semibold">Total Logged</span>
                <span className="font-bold text-slate-900 text-sm">{timeSummary.totalHours} hrs</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] uppercase text-slate-400 block font-semibold">Plan Consumed</span>
                <span className="font-bold text-slate-700 text-sm">{timeSummary.includedHoursUsed} hrs</span>
              </div>
              <div className="p-2 bg-amber-50 rounded-lg border border-amber-100">
                <span className="text-[10px] uppercase text-amber-700 block font-semibold">Extra Hours</span>
                <span className="font-bold text-amber-900 text-sm">{timeSummary.extraHoursUsed} hrs</span>
              </div>
              <div className="p-2 bg-purple-50 rounded-lg border border-purple-100">
                <span className="text-[10px] uppercase text-purple-700 block font-semibold">Extra Billing</span>
                <span className="font-bold text-purple-900 text-sm">₹{timeSummary.extraCharges.toLocaleString()}</span>
              </div>
            </div>

            {/* List of logged entries */}
            {timeSummary.entries && timeSummary.entries.length > 0 && (
              <div className="pt-2 border-t border-slate-100 space-y-1.5 max-h-36 overflow-y-auto pr-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Logged Sessions ({timeSummary.entries.length})
                </span>
                {timeSummary.entries.map((entry: any) => (
                  <div key={entry.id} className="text-[11px] p-2 rounded bg-slate-50 border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{entry.durationHours} hrs</span>
                      <span className="text-[10px] text-slate-400">{new Date(entry.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="text-slate-600 line-clamp-2">{entry.description}</div>
                    <div className="text-[10px] text-slate-400 flex items-center justify-between pt-0.5">
                      <span>By: {entry.agent?.user?.name || 'Agent'}</span>
                      {entry.extraHoursUsed > 0 && (
                        <span className="text-amber-700 font-semibold font-mono">
                          +{entry.extraHoursUsed}h extra
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status & Priority Controls */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100">
              Ticket Properties
            </h2>

            {/* Status Selector */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
              <select
                value={ticket.status}
                onChange={(e) => updateStatusMutation.mutate(e.target.value as TicketStatus)}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs font-medium bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="NEW">New</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="WAITING_FOR_CUSTOMER">Waiting on Customer</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            {/* Priority Selector */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Priority</label>
              <select
                value={ticket.priority}
                onChange={(e) => updatePriorityMutation.mutate(e.target.value as TicketPriority)}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs font-medium bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            {/* Assigned Agent */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Assigned Agent</label>
              {isAdmin ? (
                <select
                  value={ticket.assignedAgentId || ''}
                  onChange={(e) => assignAgentMutation.mutate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs font-medium bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="">Unassigned</option>
                  {agents.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.user.name} ({ag.team?.name || 'General'})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-2 border border-slate-200 rounded-lg bg-slate-50 text-xs font-semibold text-slate-800 flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-slate-800 text-white text-[10px] flex items-center justify-center">
                    {ticket.assignedAgent ? ticket.assignedAgent.user.name.charAt(0) : '?'}
                  </div>
                  <span>{ticket.assignedAgent ? ticket.assignedAgent.user.name : 'Unassigned'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Customer Profile Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>Customer Information</span>
              <Link to={`/customers/${ticket.customer.id}`} className="text-brand-600 hover:underline">
                View
              </Link>
            </h2>

            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-800">{ticket.customer.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-600">{ticket.customer.email}</span>
              </div>
              {ticket.customer.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-600">{ticket.customer.phone}</span>
                </div>
              )}
              {ticket.customer.company && (
                <div className="flex items-center gap-2">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-600">{ticket.customer.company}</span>
                </div>
              )}
              <div className="pt-1 text-[11px] text-slate-400 font-mono">
                Code: {ticket.customer.customerCode}
              </div>
            </div>
          </div>

          {/* Application Details Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>Connected Product</span>
              <Link to={`/applications/${ticket.application.id}`} className="text-brand-600 hover:underline">
                View
              </Link>
            </h2>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Name</span>
                <span className="font-semibold text-slate-800">{ticket.application.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Code</span>
                <span className="font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                  {ticket.application.code}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Support Email</span>
                <span className="text-slate-700 truncate max-w-[150px]">
                  {ticket.application.supportEmail}
                </span>
              </div>
            </div>
          </div>

          {/* SLA & Timestamps Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-2 text-xs">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100">
              Timestamps & SLAs
            </h2>
            <div className="flex items-center justify-between text-slate-600">
              <span>Created</span>
              <span>{new Date(ticket.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Updated</span>
              <span>{new Date(ticket.updatedAt).toLocaleString()}</span>
            </div>
            {ticket.firstResponseAt && (
              <div className="flex items-center justify-between text-slate-600">
                <span>First Response</span>
                <span>{new Date(ticket.firstResponseAt).toLocaleTimeString()}</span>
              </div>
            )}
            {ticket.resolvedAt && (
              <div className="flex items-center justify-between text-emerald-600 font-medium">
                <span>Resolved At</span>
                <span>{new Date(ticket.resolvedAt).toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Log Support Time Modal */}
      {showLogTimeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-brand-600" />
                <span>Log Support Work Session</span>
              </h3>
              <button
                onClick={() => setShowLogTimeModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Ticket <span className="font-semibold text-slate-800">{ticket.ticketNumber}</span> for customer{' '}
              <span className="font-semibold text-slate-800">{ticket.customer.name}</span>. Time is automatically deducted from customer included hours, with excess billed as extra hours.
            </p>

            <form onSubmit={handleLogTime} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Duration (Minutes)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={logMinutes}
                    onChange={(e) => setLogMinutes(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-brand-500"
                  />
                  <span className="text-xs text-slate-500 whitespace-nowrap">
                    ({(parseFloat(logMinutes || '0') / 60).toFixed(2)} hrs)
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Work Description
                </label>
                <textarea
                  required
                  rows={3}
                  value={logDesc}
                  onChange={(e) => setLogDesc(e.target.value)}
                  placeholder="Detail what was diagnosed, configured, or resolved during this support session..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Hourly Rate (₹) for Extra Hours
                </label>
                <input
                  type="number"
                  step="100"
                  required
                  value={logRate}
                  onChange={(e) => setLogRate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLogTimeModal(false)}
                  disabled={isLoggingTime}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={isLoggingTime}>
                  Record Support Time
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
