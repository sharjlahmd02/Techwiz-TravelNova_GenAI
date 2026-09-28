import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { ProtectedRoute } from './components/ProtectedRoute'
import { ToastProvider } from './components/ui/Toast'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { UnauthorizedPage } from './pages/UnauthorizedPage'

import { CustomerDashboard } from './pages/customer/CustomerDashboard'
import { SubmitComplaintPage } from './pages/customer/SubmitComplaintPage'
import { ComplaintDetailPage } from './pages/customer/ComplaintDetailPage'

import { AgentDashboard } from './pages/agent/AgentDashboard'
import { AgentComplaintDetail } from './pages/agent/AgentComplaintDetail'

import { ReviewerDashboard } from './pages/reviewer/ReviewerDashboard'
import { ConflictResolutionPage } from './pages/reviewer/ConflictResolutionPage'

import { ManagerDashboard } from './pages/manager/ManagerDashboard'
import { AgentManagement } from './pages/manager/AgentManagement'
import { ManagerComplaintDetail } from './pages/manager/ManagerComplaintDetail'

import { AdminDashboard } from './pages/admin/AdminDashboard'
import { KnowledgeBasePage } from './pages/admin/KnowledgeBasePage'
import { EmailIntakePage } from './pages/admin/EmailIntakePage'
import { RulesEditorPage } from './pages/admin/RulesEditorPage'
import { EscalationRulesPage } from './pages/admin/EscalationRulesPage'
import { CategoriesPage } from './pages/admin/CategoriesPage'
import { DepartmentsPage } from './pages/admin/DepartmentsPage'
import { UserManagementPage } from './pages/admin/UserManagementPage'
import { AuditLogPage } from './pages/admin/AuditLogPage'

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Customer */}
          <Route
            path="/customer/dashboard"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <CustomerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/complaints/new"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <SubmitComplaintPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/complaints/:id"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <ComplaintDetailPage />
              </ProtectedRoute>
            }
          />

          {/* Agent */}
          <Route
            path="/agent/dashboard"
            element={
              <ProtectedRoute allowedRoles={['agent']}>
                <AgentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/agent/complaints/:id"
            element={
              <ProtectedRoute allowedRoles={['agent']}>
                <AgentComplaintDetail />
              </ProtectedRoute>
            }
          />

          {/* Reviewer */}
          <Route
            path="/reviewer/dashboard"
            element={
              <ProtectedRoute allowedRoles={['reviewer']}>
                <ReviewerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reviewer/conflicts/:id"
            element={
              <ProtectedRoute allowedRoles={['reviewer']}>
                <ConflictResolutionPage />
              </ProtectedRoute>
            }
          />

          {/* Manager */}
          <Route
            path="/manager/dashboard"
            element={
              <ProtectedRoute allowedRoles={['manager']}>
                <ManagerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manager/agents"
            element={
              <ProtectedRoute allowedRoles={['manager']}>
                <AgentManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manager/complaints/:id"
            element={
              <ProtectedRoute allowedRoles={['manager']}>
                <ManagerComplaintDetail />
              </ProtectedRoute>
            }
          />

          {/* Admin */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/knowledge-base"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <KnowledgeBasePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/email-intake"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <EmailIntakePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/rules"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <RulesEditorPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/escalation-rules"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <EscalationRulesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/categories"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <CategoriesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/departments"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DepartmentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <UserManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/audit-log"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AuditLogPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}

export default App
