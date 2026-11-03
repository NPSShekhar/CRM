import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { ticketsApi, applicationsApi, agentsApi } from '../../api/index.js';
import { useAuth } from '../../context/AuthContext.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { PriorityBadge } from '../../components/common/PriorityBadge.js';
import { Button } from '../../components/common/Button.js';
import { Spinner } from '../../components/common/Spinner.js';
import { EmptyState } from '../../components/common/EmptyState.js';
import {
  Search,
  Plus,
  Filter,
  ArrowUpDown,
  Mail,
  Globe,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  UserCheck,
  Inbox,
  Layers,
} from 'lucide-react';
import { TicketStatus, TicketPriority } from '../../types/index.js';

export const TicketsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAgent = user?.role === 'AGENT';

  // Default scope for Agent is 'my', for Admin is 'all'
  const [scope, setScope] = useState<'my' | 'unassigned' | 'all'>(isAgent ? 'my' : 'all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [appFilter, setAppFilter] = useState<string>('');
  const [agentFilter, setAgentFilter] = useState<string>('');
  const [page, setPage] = useState(1);

  const { data: ticketsData, isLoading } = useQuery({
    queryKey: ['tickets', { scope, search, statusFilter, priorityFilter, appFilter, agentFilter, page }],
    queryFn: () =>
      ticketsApi.list({
        scope,
        search: search || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        applicationId: appFilter || undefined,
        assignedAgentId: agentFilter || undefined,
        page,
        limit: 15,
      }),
  });

  const { data: appsData } = useQuery({
    queryKey: ['applications'],
    queryFn: () => applicationsApi.list(),
  });

  const { data: agentsData } = useQuery({
    queryKey: ['agents'],
    queryFn: () => agentsApi.list(),
    enabled: !isAgent,
  });

  const ticketBasePath = isAgent ? '/agent/tickets' : '/admin/tickets';

  const tickets = ticketsData?.data || [];
  const pagination = ticketsData?.pagination;
  const applications = appsData?.data || [];
  const agents = agentsData?.data || [];

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'EMAIL':
        return (
          <span title="Email">
            <Mail className="w-3.5 h-3.5 text-blue-500" />
          </span>
        );
      case 'WHATSAPP':
        return (
          <span title="WhatsApp">
            <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
          </span>
        );
      default:
        return (
          <span title="Web">
            <Globe className="w-3.5 h-3.5 text-slate-400" />
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Title and Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {scope === 'my'
              ? 'My Assigned Tickets'
              : scope === 'unassigned'
              ? 'Unassigned Ticket Queue'
              : 'All Support Tickets'}
          </h1>
          <p className="text-xs text-slate-500">
            {isAgent && scope === 'my'
              ? `Showing issues assigned specifically to you (${user?.name})`
              : 'Manage inquiries, triage tickets, and collaborate across connected products'}
          </p>
        </div>
        <Button
          onClick={() => navigate(`${ticketBasePath}/new`)}
          icon={<Plus className="w-4 h-4" />}
          size="sm"
        >
          New Ticket
        </Button>
      </div>

      {/* Scope Segmented Control Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => {
            setScope('my');
            setAgentFilter('');
            setPage(1);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            scope === 'my'
              ? 'bg-brand-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>My Assigned Tickets</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setScope('unassigned');
            setAgentFilter('');
            setPage(1);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            scope === 'unassigned'
              ? 'bg-brand-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Inbox className="w-3.5 h-3.5" />
          <span>Unassigned Queue</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setScope('all');
            setPage(1);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            scope === 'all'
              ? 'bg-brand-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>All Organization Tickets</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-2.5 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search tickets by ID, subject, customer, email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="">All Statuses</option>
          <option value="NEW">New</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="WAITING_FOR_CUSTOMER">Waiting Customer</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>

        {/* Priority Filter */}
        <select
          value={priorityFilter}
          onChange={(e) => {
            setPriorityFilter(e.target.value);
            setPage(1);
          }}
          className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="">All Priorities</option>
          <option value="URGENT">Urgent</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>

        {/* Application Filter */}
        <select
          value={appFilter}
          onChange={(e) => {
            setAppFilter(e.target.value);
            setPage(1);
          }}
          className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="">All Applications</option>
          {applications.map((app) => (
            <option key={app.id} value={app.id}>
              {app.name}
            </option>
          ))}
        </select>

        {/* Agent Filter (only in All Tickets scope) */}
        {scope === 'all' && (
          <select
            value={agentFilter}
            onChange={(e) => {
              setAgentFilter(e.target.value);
              setPage(1);
            }}
            className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">All Agents</option>
            <option value="UNASSIGNED">Unassigned Only</option>
            {agents.map((ag) => (
              <option key={ag.id} value={ag.id}>
                {ag.user.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <Spinner size="md" className="h-64" />
        ) : tickets.length === 0 ? (
          <EmptyState
            title={
              scope === 'my'
                ? 'No tickets assigned to you'
                : scope === 'unassigned'
                ? 'No unassigned tickets'
                : 'No tickets found'
            }
            description={
              scope === 'my'
                ? 'You do not have any tickets assigned matching the filter criteria.'
                : 'No support tickets match the current filters or search query.'
            }
            actionText="Create New Ticket"
            onAction={() => navigate(`${ticketBasePath}/new`)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Application</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assigned Agent</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => navigate(`${ticketBasePath}/${t.id}`)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-semibold text-brand-600 whitespace-nowrap">
                      {t.ticketNumber}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate font-medium text-slate-800">
                      {t.subject}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-800">{t.customer?.name}</div>
                      <div className="text-[10px] text-slate-400">{t.customer?.email}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                        {t.application?.name}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <PriorityBadge priority={t.priority} />
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {t.assignedAgent ? (
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-slate-800 text-white text-[10px] flex items-center justify-center font-medium">
                            {t.assignedAgent.user.name.charAt(0)}
                          </span>
                          <span className="text-slate-700">{t.assignedAgent.user.name}</span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-slate-600">
                        {getSourceIcon(t.source)}
                        <span className="text-[11px] capitalize">{t.source.toLowerCase()}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <Link
                        to={`${ticketBasePath}/${t.id}`}
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

        {/* Pagination Controls */}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing page <span className="font-semibold text-slate-700">{pagination.page}</span> of{' '}
              <span className="font-semibold text-slate-700">{pagination.totalPages}</span> ({pagination.total} total)
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
    </div>
  );
};
