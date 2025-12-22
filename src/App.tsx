import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { lazy, Suspense } from "react";
import MainLayout from "./components/layout/MainLayout";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import AuthRedirect from './components/auth/AuthRedirect';
import { ToastProvider } from "./components/ui/toast";
import LoadingSpinner from "./components/ui/LoadingSpinner";
import { NotificationProvider } from "./contexts/NotificationContext";

// Lazy loaded pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const FrontDesk = lazy(() => import("./pages/FrontDesk"));
const Settings = lazy(() => import("./pages/Settings"));
const SampleManagement = lazy(() => import("./pages/SampleManagement"));
const HumanResources = lazy(() => import("./pages/HumanResources"));
const HRApprovals = lazy(() => import("./pages/HRApprovals"));
const BusinessManual = lazy(() => import("./pages/BusinessManual"));
const UserManual = lazy(() => import("./pages/UserManual"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Finance = lazy(() => import("./pages/Finance"));
const DriversManagement = lazy(() => import("./components/drivers/DriversManagement"));
const IssueStock = lazy(() => import('./pages/IssueStock'));
const IssueRequisition = lazy(() => import('./pages/IssueRequisition'));
const InventoryHandover = lazy(() => import('./pages/InventoryHandover'));
const ConfirmReceipt = lazy(() => import('./pages/ConfirmReceipt'));
const RequisitionForm = lazy(() => import('./components/inventory/RequisitionForm'));
const Communication = lazy(() => import('./pages/Communication'));
const Reports = lazy(() => import('./pages/Report'));
const FuelManagement = lazy(() => import('./pages/FuelManagement'));

const App = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotificationProvider>
          <ToastProvider>
            <Router>
              <Suspense fallback={<LoadingSpinner fullPage />}>
                <Routes>
                  <Route path="/" element={<LoginPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<SignupPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/issue-stock/:productId" element={<IssueStock />} />
                  <Route path="/issue-requisition/:requisitionId" element={<IssueRequisition />} />
                  <Route path="/inventory-handover/:requisitionId" element={<InventoryHandover />} />
                  <Route path="/confirm-receipt/:requisitionId" element={<ConfirmReceipt />} />
                  <Route
                    path="/app/*"
                    element={
                      <ProtectedRoute>
                        <MainApp />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/auth-redirect" element={<AuthRedirect />} />
                  <Route 
                    path="/inventory/requisition/:id" 
                    element={
                      <ProtectedRoute>
                        <RequisitionForm />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="*" 
                    element={<Navigate to="/" replace />} 
                  />
                </Routes>
              </Suspense>
            </Router>
          </ToastProvider>
        </NotificationProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

const MainApp = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(() => {
    const path = location.pathname.split("/app/")[1]?.split("/")[0];
    return path || "dashboard";
  });

  useEffect(() => {
    if (location.pathname === '/app' || location.pathname === '/app/') {
      navigate('/app/dashboard', { replace: true });
    }
  }, []);

  const handlePageChange = (page: string) => {
    setCurrentPage(page);
  };

  return (
    <MainLayout currentPage={currentPage} onNavigate={handlePageChange}>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="front-desk" element={<FrontDesk />} />
          <Route path="settings" element={<Settings />} />
          <Route path="samples" element={<SampleManagement />} />
          <Route path="hr" element={<HumanResources />} />
          <Route path="hr-approvals" element={<HRApprovals />} />
          <Route path="business-manual" element={<BusinessManual />} />
          <Route path="user-manual" element={<UserManual />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="finance" element={<Finance />} />
          <Route path="drivers" element={<DriversManagement />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="communication" element={<Communication />} />
          <Route path="reports" element={<Reports />} />
          <Route path="fuel-management" element={<FuelManagement />} />
          <Route 
            path="*" 
            element={<Navigate to="/app/dashboard" replace />} 
          />
        </Routes>
      </Suspense>
    </MainLayout>
  );
};

export default App;
