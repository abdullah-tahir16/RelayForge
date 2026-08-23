import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { theme } from './theme/theme';
import AuthProvider from './infrastructure/useCases/Auth/AuthProvider';
import ProjectProvider from './infrastructure/useCases/Project/ProjectProvider';
import ToastProvider from './presentation/toast/ToastProvider';
import AuthGuard from './presentation/routes/AuthGuard';
import DashboardLayout from './presentation/components/DashboardLayout';
import LoginContainer from './presentation/containers/Login';
import EventsContainer from './presentation/containers/Events';
import EventDetailContainer from './presentation/containers/EventDetail';
import EndpointsContainer from './presentation/containers/Endpoints';
import EndpointDetailContainer from './presentation/containers/EndpointDetail';
import DeadLetterQueueContainer from './presentation/containers/DeadLetterQueue';

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <ProjectProvider>
            <ToastProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/login" element={<LoginContainer />} />
                  <Route path="/" element={<Navigate to="/events" replace />} />
                  <Route
                    path="/events"
                    element={
                      <AuthGuard>
                        <DashboardLayout>
                          <EventsContainer />
                        </DashboardLayout>
                      </AuthGuard>
                    }
                  />
                  <Route
                    path="/events/:eventId"
                    element={
                      <AuthGuard>
                        <DashboardLayout>
                          <EventDetailContainer />
                        </DashboardLayout>
                      </AuthGuard>
                    }
                  />
                  <Route
                    path="/dlq"
                    element={
                      <AuthGuard>
                        <DashboardLayout>
                          <DeadLetterQueueContainer />
                        </DashboardLayout>
                      </AuthGuard>
                    }
                  />
                  <Route
                    path="/endpoints"
                    element={
                      <AuthGuard>
                        <DashboardLayout>
                          <EndpointsContainer />
                        </DashboardLayout>
                      </AuthGuard>
                    }
                  />
                  <Route
                    path="/endpoints/:endpointId"
                    element={
                      <AuthGuard>
                        <DashboardLayout>
                          <EndpointDetailContainer />
                        </DashboardLayout>
                      </AuthGuard>
                    }
                  />
                </Routes>
              </BrowserRouter>
            </ToastProvider>
          </ProjectProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
