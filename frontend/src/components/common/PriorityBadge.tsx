import React from 'react';
import { TicketPriority } from '../../types/index.js';
import { AlertCircle, AlertTriangle, ArrowDown, ArrowUp } from 'lucide-react';

interface PriorityBadgeProps {
  priority: TicketPriority;
  showIcon?: boolean;
  className?: string;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, showIcon = true, className = '' }) => {
  const getConfig = () => {
    switch (priority) {
      case 'URGENT':
        return {
          styles: 'bg-rose-50 text-rose-700 border-rose-200',
          icon: <AlertCircle className="w-3.5 h-3.5 mr-1" />,
          label: 'Urgent',
        };
      case 'HIGH':
        return {
          styles: 'bg-orange-50 text-orange-700 border-orange-200',
          icon: <ArrowUp className="w-3.5 h-3.5 mr-1" />,
          label: 'High',
        };
      case 'MEDIUM':
        return {
          styles: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: <AlertTriangle className="w-3.5 h-3.5 mr-1" />,
          label: 'Medium',
        };
      case 'LOW':
        return {
          styles: 'bg-slate-100 text-slate-600 border-slate-200',
          icon: <ArrowDown className="w-3.5 h-3.5 mr-1" />,
          label: 'Low',
        };
      default:
        return {
          styles: 'bg-slate-100 text-slate-600 border-slate-200',
          icon: null,
          label: priority,
        };
    }
  };

  const { styles, icon, label } = getConfig();

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${styles} ${className}`}>
      {showIcon && icon}
      {label}
    </span>
  );
};
