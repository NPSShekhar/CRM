import React from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { AdminLayout } from '../layouts/AdminLayout.js';
import { AgentLayout } from '../layouts/AgentLayout.js';
import { LoginPage } from '../pages/auth/LoginPage.js';
import { AccessDeniedPage } from '../pages/auth/AccessDeniedPage.js';
import { AdminOverviewPage } from '../pages/dashboard/AdminOverviewPage.js';
import { AgentWorkloadPage } from '../pages/dashboard/AgentWorkloadPage.js';
import { TicketsListPage } from '../pages/tickets/TicketsListPage.js';
import { TicketDetailPage } from '../pages/tickets/TicketDetailPage.js';
import { NewTicketPage } from '../pages/tickets/NewTicketPage.js';
import { CustomersListPage } from '../pages/customers/CustomersListPage.js';
import { CustomerDetailPage } from '../pages/customers/CustomerDetailPage.js';
import { ApplicationsListPage } from '../pages/applications/ApplicationsListPage.js';
import { ApplicationDetailPage } from '../pages/applications/ApplicationDetailPage.js';
import { AgentsListPage } from '../pages/agents/AgentsListPage.js';
import { TeamsListPage } from '../pages/teams/TeamsListPage.js';
import { ReportsPage } from '../pages/reports/ReportsPage.js';
import { EmailSettingsPage } from '../pages/settings/EmailSettingsPage.js';
import { EmailSimulatorPage } from '../pages/simulator/EmailSimulatorPage.js';
import { AccountantBillingPage } from '../pages/billing/AccountantBillingPage.js';
import { MembershipsPage } from '../pages/memberships/MembershipsPage.js';
import { Spinner } from '../components/common/Spinner.js';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <Spinner size="lg" className="h-screen" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const RequireAdmin: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const isAuthorized =
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'ADMIN' ||
    user?.role === 'SUPPORT_MANAGER' ||
    user?.role === 'ACCOUNTANT';

  if (!isAuthorized) {
    return <AccessDeniedPage />;
  }

  return <>{children}</>;
};

// Shorthand redirect for tickets/:id
const TicketIdRedirect: React.FC = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const isAgent = user?.role === 'AGENT';
  return <Navigate to={isAgent ? `/agent/tickets/${id}` : `/admin/tickets/${id}`} replace />;
};

// Shorthand redirect for customers/:id
const CustomerIdRedirect: React.FC = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const isAgent = user?.role === 'AGENT';
  return <Navigate to={isAgent ? `/agent/customers/${id}` : `/admin/customers/${id}`} replace />;
};

// Shorthand redirect for applications/:id
const ApplicationIdRedirect: React.FC = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const isAgent = user?.role === 'AGENT';
  return <Navigate to={isAgent ? `/agent/applications/${id}` : `/admin/applications/${id}`} replace />;
};

export const AppRoutes: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <Spinner size="lg" className="h-screen" />;
  }

  const isAgent = user?.role === 'AGENT';
  const isAccountant = user?.role === 'ACCOUNTANT';
  const defaultHome = isAgent ? '/agent/workload' : isAccountant ? '/admin/billing' : '/admin/overview';

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to={defaultHome} replace /> : <LoginPage />}
      />

      <Route path="/403" element={<AccessDeniedPage />} />

      {/* ========================================================= */}
      {/* 1. ADMIN & ACCOUNTANT PORTAL ROUTES (/admin/*)            */}
      {/* ========================================================= */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to={isAccountant ? '/admin/billing' : '/admin/dashboard'} replace />} />
        <Route path="dashboard" element={<AdminOverviewPage />} />
        <Route path="overview" element={<AdminOverviewPage />} />
        <Route path="tickets" element={<TicketsListPage />} />
        <Route path="tickets/new" element={<NewTicketPage />} />
        <Route path="tickets/:id" element={<TicketDetailPage />} />
        <Route path="customers" element={<CustomersListPage />} />
        <Route path="customers/:id" element={<CustomerDetailPage />} />
        <Route path="applications" element={<ApplicationsListPage />} />
        <Route path="applications/:id" element={<ApplicationDetailPage />} />
        <Route path="agents" element={<AgentsListPage />} />
        <Route path="teams" element={<TeamsListPage />} />
        <Route path="memberships" element={<MembershipsPage />} />
        <Route path="billing" element={<AccountantBillingPage />} />
        <Route path="accountant" element={<AccountantBillingPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="email-simulator" element={<EmailSimulatorPage />} />
        <Route path="settings" element={<EmailSettingsPage />} />
        <Route path="settings/email" element={<EmailSettingsPage />} />
      </Route>

      {/* ========================================================= */}
      {/* 2. AGENT PORTAL ROUTES (/agent/*)                         */}
      {/* ========================================================= */}
      <Route
        path="/agent"
        element={
          <ProtectedRoute>
            <AgentLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/agent/dashboard" replace />} />
        <Route path="dashboard" element={<AgentWorkloadPage />} />
        <Route path="workload" element={<AgentWorkloadPage />} />
        <Route path="tickets" element={<TicketsListPage />} />
        <Route path="tickets/new" element={<NewTicketPage />} />
        <Route path="tickets/:id" element={<TicketDetailPage />} />
        <Route path="customers" element={<CustomersListPage />} />
        <Route path="customers/:id" element={<CustomerDetailPage />} />
        <Route path="applications" element={<ApplicationsListPage />} />
        <Route path="applications/:id" element={<ApplicationDetailPage />} />
      </Route>

      {/* ========================================================= */}
      {/* 3. CONVENIENCE REDIRECTS FOR LEGACY / UNIVERSAL PATHS    */}
      {/* ========================================================= */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Navigate to={defaultHome} replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Navigate to={defaultHome} replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tickets"
        element={
          <ProtectedRoute>
            <Navigate to={isAgent ? '/agent/tickets' : '/admin/tickets'} replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tickets/new"
        element={
          <ProtectedRoute>
            <Navigate to={isAgent ? '/agent/tickets/new' : '/admin/tickets/new'} replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tickets/:id"
        element={
          <ProtectedRoute>
            <TicketIdRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customers"
        element={
          <ProtectedRoute>
            <Navigate to={isAgent ? '/agent/customers' : '/admin/customers'} replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customers/:id"
        element={
          <ProtectedRoute>
            <CustomerIdRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/applications"
        element={
          <ProtectedRoute>
            <Navigate to={isAgent ? '/agent/applications' : '/admin/applications'} replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/applications/:id"
        element={
          <ProtectedRoute>
            <ApplicationIdRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/agents"
        element={
          <ProtectedRoute>
            <Navigate to="/admin/agents" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teams"
        element={
          <ProtectedRoute>
            <Navigate to="/admin/teams" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Navigate to="/admin/reports" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/simulator"
        element={
          <ProtectedRoute>
            <Navigate to="/admin/email-simulator" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Navigate to="/admin/settings" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/email"
        element={
          <ProtectedRoute>
            <Navigate to="/admin/settings" replace />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to={defaultHome} replace />} />
    </Routes>
  );
};
