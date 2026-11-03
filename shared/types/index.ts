export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT_MANAGER' | 'AGENT' | 'CUSTOMER' | 'ACCOUNTANT';

export type BillingStatus = 'PENDING' | 'INVOICED' | 'PAID' | 'CANCELLED';

export type MembershipStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

export type TicketStatus =
  | 'NEW'
  | 'ASSIGNED'
  | 'ACKNOWLEDGED'
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_CUSTOMER'
  | 'ESCALATED'
  | 'RESOLVED'
  | 'CUSTOMER_CONFIRMED'
  | 'CLOSED';

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type TicketSource = 'EMAIL' | 'WHATSAPP' | 'WEB' | 'CUSTOMER_PORTAL';

export type MessageType = 'PUBLIC' | 'INTERNAL_NOTE';

export type SenderType = 'CUSTOMER' | 'AGENT' | 'SYSTEM';

export type AssignmentStrategy =
  | 'ROUND_ROBIN'
  | 'LEAST_ASSIGNED'
  | 'APPLICATION_BASED'
  | 'TEAM_BASED'
  | 'MANUAL';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: string;
}

export interface ApplicationSummary {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  logoUrl?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  supportEmail: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    tickets: number;
    customers: number;
  };
}

export interface MembershipPlanSummary {
  id: string;
  name: string;
  description?: string | null;
  includedHours: number;
  validityDays: number;
  price: number;
  extraHourRate: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerMembershipSummary {
  id: string;
  customerId: string;
  planId: string;
  plan: MembershipPlanSummary;
  totalHours: number;
  usedHours: number;
  remainingHours: number;
  startDate: string;
  expiryDate: string;
  status: MembershipStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ExtraHourRecordSummary {
  id: string;
  customerId: string;
  customer?: CustomerSummary | { id: string; name: string; email: string; company?: string | null };
  ticketId: string;
  ticket?: { id: string; ticketNumber: string; subject: string };
  agentId: string;
  agent?: { id: string; user: { name: string; email: string } };
  timeEntryId?: string | null;
  membershipId?: string | null;
  date: string;
  durationMinutes: number;
  durationHours: number;
  hourlyRate: number;
  amount: number;
  status: BillingStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupportTimeEntrySummary {
  id: string;
  ticketId: string;
  agentId: string;
  agent?: AgentSummary | { id: string; user: { name: string; email: string } };
  customerId: string;
  customer?: CustomerSummary | { id: string; name: string; email: string };
  customerMembershipId?: string | null;
  startTime: string;
  endTime?: string | null;
  durationMinutes: number;
  durationHours: number;
  description: string;
  includedHoursUsed: number;
  extraHoursUsed: number;
  createdAt: string;
  extraHourRecord?: ExtraHourRecordSummary | null;
}

export interface AccountantBillingSummary {
  totalCustomers: number;
  totalSupportHours: number;
  includedHoursUsed: number;
  extraHours: number;
  totalExtraBilling: number;
  pendingAmount: number;
  paidAmount: number;
  invoicedAmount: number;
  records: ExtraHourRecordSummary[];
}

export interface CustomerSummary {
  id: string;
  customerCode: string;
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  lastContactedAt?: string | null;
  createdAt: string;
  memberships?: CustomerMembershipSummary[];
  activeMembership?: CustomerMembershipSummary | null;
  totalIncludedHours?: number;
  usedIncludedHours?: number;
  remainingIncludedHours?: number;
  totalExtraHours?: number;
  applications?: {
    application: ApplicationSummary;
  }[];
  tickets?: any[];
  _count?: {
    tickets: number;
  };
}

export interface AgentSummary {
  id: string;
  userId: string;
  user: UserSummary;
  teamId?: string | null;
  team?: {
    id: string;
    name: string;
  } | null;
  maxCapacity: number;
  currentLoad: number;
  isAvailable: boolean;
  skills?: string[];
}

export interface CustomerFeedbackSummary {
  id: string;
  ticketId: string;
  customerId: string;
  customer?: { id: string; name: string; email: string };
  agentId?: string | null;
  rating: number; // 1 to 5
  comment?: string | null;
  submittedAt: string;
}

export interface TicketSummary {
  id: string;
  ticketNumber: string;
  customerId: string;
  customer: CustomerSummary;
  applicationId: string;
  application: ApplicationSummary;
  categoryId?: string | null;
  category?: { id: string; name: string } | null;
  subject: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  source: TicketSource;
  assignedAgentId?: string | null;
  assignedAgent?: AgentSummary | null;
  assignedTeamId?: string | null;
  assignedTeam?: { id: string; name: string } | null;

  // SLA & Timestamps
  firstResponseAt?: string | null;
  slaDueAt?: string | null;
  slaBreachedAt?: string | null;

  // Workflow milestones
  acknowledgedAt?: string | null;
  acknowledgedBy?: UserSummary | null;
  escalatedAt?: string | null;
  escalatedBy?: UserSummary | null;
  escalatedToTeam?: { id: string; name: string } | null;
  escalationReason?: string | null;
  resolvedAt?: string | null;
  resolvedBy?: UserSummary | null;
  resolutionSummary?: string | null;
  resolutionCategory?: string | null;
  rootCause?: string | null;
  customerConfirmedAt?: string | null;
  customerConfirmed?: boolean | null;
  closedAt?: string | null;
  closedBy?: UserSummary | null;
  reopenedAt?: string | null;
  reopenReason?: string | null;
  reopenCount?: number;

  // Support Hours & Time Tracking
  timeEntries?: SupportTimeEntrySummary[];
  extraHours?: ExtraHourRecordSummary[];
  assignments?: any[];
  totalTimeMinutes?: number;
  totalTimeHours?: number;
  includedHoursUsed?: number;
  extraHoursUsed?: number;
  extraCharges?: number;

  createdAt: string;
  updatedAt: string;

  feedbacks?: CustomerFeedbackSummary[];
  _count?: {
    messages: number;
    attachments: number;
  };
}

export interface AttachmentSummary {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  publicUrl: string;
  createdAt: string;
}

export interface TicketMessageSummary {
  id: string;
  ticketId: string;
  senderType: SenderType;
  messageType: MessageType;
  senderUserId?: string | null;
  senderUser?: UserSummary | null;
  senderCustomerId?: string | null;
  senderCustomer?: CustomerSummary | null;
  bodyHtml?: string | null;
  bodyText: string;
  source: TicketSource;
  direction?: string;
  externalMessageId?: string | null;
  createdAt: string;
  attachments?: AttachmentSummary[];
  emailMessage?: {
    id: string;
    direction: 'INBOUND' | 'OUTBOUND';
    providerMessageId?: string | null;
    status: 'DELIVERED' | 'SENT' | 'FAILED' | 'RECEIVED' | 'PENDING';
    errorMessage?: string | null;
    failureReason?: string | null;
    fromAddress: string;
    toAddress: string;
    sentAt?: string | null;
    messageId?: string | null;
  } | null;
}

export interface SLAConfigItem {
  id: string;
  name: string;
  priority: TicketPriority;
  firstResponseHours: number;
  resolutionHours: number;
  warningThresholdMinutes: number;
  isActive: boolean;
}

export interface IntegrationItem {
  id: string;
  name: string;
  type: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  enabled: boolean;
  config?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardMetrics {
  isAgentView?: boolean;
  agentInfo?: {
    name?: string;
    email?: string;
    teamName?: string;
    maxCapacity?: number;
    currentLoad?: number;
    skills?: string[];
  };
  urgentTickets?: number;
  activeTickets?: any[];
  totalCustomers?: number;
  totalApplications?: number;
  totalTickets: number;
  openTickets: number;
  myOpenTickets?: number;
  inProgress?: number;
  newAssignments?: number;
  waitingForCustomer?: number;
  pendingTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  unassignedTickets: number;
  ticketsToday: number;
  ticketsThisWeek: number;
  slaAtRisk?: number;
  slaBreached?: number;
  resolvedToday?: number;
  currentWorkload?: number;
  todayAssignments?: number;
  avgResponseTimeHours: number;
  avgResolutionTimeHours: number;
  ticketsByStatus: { status: TicketStatus; count: number }[];
  ticketsByPriority: { priority: TicketPriority; count: number }[];
  ticketsByApplication: { name: string; count: number; code: string }[];
  ticketsByAgent: { name: string; count: number }[];
  ticketsBySource?: { source: TicketSource; count: number }[];
  ticketsOverTime: { date: string; count: number }[];
  customerIssuesByCategory?: { category: string; count: number }[];
  customerSatisfaction?: {
    averageRating: number;
    totalFeedback: number;
    satisfactionRate: number;
  };
}

export type NotificationType =
  | 'TICKET_CREATED'
  | 'TICKET_ASSIGNED'
  | 'TICKET_REASSIGNED'
  | 'TICKET_REPLY'
  | 'CUSTOMER_REPLY'
  | 'TICKET_STATUS_CHANGED'
  | 'TICKET_PRIORITY_CHANGED'
  | 'TICKET_RESOLVED'
  | 'TICKET_REOPENED'
  | 'INTERNAL_NOTE'
  | 'SLA_WARNING'
  | 'SLA_BREACH'
  | 'EMAIL_SENT'
  | 'EMAIL_FAILED'
  | 'SYSTEM'
  | 'INFO';

export interface NotificationItem {
  id: string;
  userId?: string;
  title: string;
  message: string;
  type: NotificationType | string;
  link?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface AuditLogItem {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  performedBy?: UserSummary | null;
  details?: Record<string, unknown> | null;
  createdAt: string;
}

// Reporting Endpoint Types (Section 16)
export interface TicketReportData {
  summary: {
    total: number;
    new: number;
    assigned: number;
    acknowledged: number;
    inProgress: number;
    waitingForCustomer: number;
    escalated: number;
    resolved: number;
    closed: number;
    reopened: number;
    escalationRate: number;
    reopenRate: number;
    closureRate: number;
  };
  byStatus: { status: TicketStatus; count: number }[];
  byPriority: { priority: TicketPriority; count: number }[];
  byCategory: { category: string; count: number }[];
  bySource: { source: TicketSource; count: number }[];
  byApplication: { name: string; code: string; count: number }[];
  tickets: TicketSummary[];
}

export interface AgentReportData {
  agents: {
    id: string;
    name: string;
    email: string;
    team: string;
    assignedTickets: number;
    acknowledgedTickets: number;
    resolvedTickets: number;
    closedTickets: number;
    reopenedTickets: number;
    escalations: number;
    avgResponseTimeHours: number;
    avgResolutionTimeHours: number;
    slaCompliancePercentage: number;
    customerSatisfactionAvg: number;
    currentWorkload: number;
    maxCapacity: number;
  }[];
}

export interface SLAReportData {
  summary: {
    targetCompliance: number;
    overallCompliancePercentage: number;
    totalTickets: number;
    withinSla: number;
    breached: number;
    breachPercentage: number;
    avgFirstResponseHours: number;
    avgResolutionHours: number;
  };
  byPriority: {
    priority: TicketPriority;
    targetResponseHours: number;
    targetResolutionHours: number;
    total: number;
    breached: number;
    compliancePercentage: number;
  }[];
  breachedTickets: TicketSummary[];
}

export interface CSATReportData {
  summary: {
    totalResponses: number;
    averageRating: number;
    csatPercentage: number; // % rating 4 or 5
    ratingDistribution: { rating: number; count: number; percentage: number }[];
  };
  byAgent: {
    agentId: string;
    agentName: string;
    averageRating: number;
    totalResponses: number;
  }[];
  byApplication: {
    applicationId: string;
    applicationName: string;
    averageRating: number;
    totalResponses: number;
  }[];
  feedbacks: CustomerFeedbackSummary[];
}
