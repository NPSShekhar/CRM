import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { Button } from '../../components/common/Button.js';
import { useAuth } from '../../context/AuthContext.js';

export const AccessDeniedPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAgent = user?.role === 'AGENT';

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-6">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <h1 className="text-3xl font-extrabold text-white tracking-tight">403 — Access Forbidden</h1>
      <p className="mt-2 text-slate-400 max-w-md text-sm">
        You do not have permission to access administrative settings or organization-level agent configuration.
        This incident has been logged for security audits.
      </p>

      <div className="mt-8 flex items-center gap-3">
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          icon={<ArrowLeft className="w-4 h-4" />}
          className="bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
        >
          Go Back
        </Button>
        <Button
          variant="primary"
          onClick={() => navigate(isAgent ? '/agent/workload' : '/admin/overview')}
          icon={<Home className="w-4 h-4" />}
        >
          Return to {isAgent ? 'My Workload' : 'Admin Overview'}
        </Button>
      </div>
    </div>
  );
};
