import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext.js';
import { NotificationRealtimeProvider } from './context/NotificationRealtimeContext.js';
import { GlobalNotificationContainer } from './components/notifications/GlobalNotificationContainer.js';
import { AppRoutes } from './routes/AppRoutes.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5000,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <NotificationRealtimeProvider>
            <AppRoutes />
            <GlobalNotificationContainer />
          </NotificationRealtimeProvider>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};
