import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'

function Placeholder({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[--bg] text-[--text-primary]">
      <p className="text-lg font-medium">{label}</p>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/customer/dashboard"
          element={
            <ProtectedRoute allowedRoles={['customer']}>
              <Placeholder label="Customer Dashboard" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/complaints/new"
          element={
            <ProtectedRoute allowedRoles={['customer']}>
              <Placeholder label="Submit New Complaint" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/complaints/:id"
          element={
            <ProtectedRoute allowedRoles={['customer']}>
              <Placeholder label="Complaint Detail" />
            </ProtectedRoute>
          }
        />

        <Route
          path="/agent/dashboard"
          element={
            <ProtectedRoute allowedRoles={['agent']}>
              <Placeholder label="Agent Dashboard" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/agent/complaints/:id"
          element={
            <ProtectedRoute allowedRoles={['agent']}>
              <Placeholder label="Agent Complaint Detail" />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reviewer/dashboard"
          element={
            <ProtectedRoute allowedRoles={['reviewer']}>
              <Placeholder label="Reviewer Dashboard" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reviewer/conflicts/:id"
          element={
            <ProtectedRoute allowedRoles={['reviewer']}>
              <Placeholder label="Conflict Resolution" />
            </ProtectedRoute>
          }
        />

        <Route
          path="/manager/dashboard"
          element={
            <ProtectedRoute allowedRoles={['manager']}>
              <Placeholder label="Manager Dashboard" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/agents"
          element={
            <ProtectedRoute allowedRoles={['manager']}>
              <Placeholder label="Agent Management" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/complaints/:id"
          element={
            <ProtectedRoute allowedRoles={['manager']}>
              <Placeholder label="Manager Complaint Detail" />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Placeholder label="Admin Dashboard" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/complaints"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Placeholder label="Admin — All Complaints" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/knowledge-base"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Placeholder label="Knowledge Base" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/rules"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Placeholder label="Resolution Rules Editor" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/escalation-rules"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Placeholder label="Escalation Rules Editor" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/categories"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Placeholder label="Categories" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/departments"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Placeholder label="Departments" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Placeholder label="User Management" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/audit-log"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Placeholder label="Audit Log" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Placeholder label="Settings" />
            </ProtectedRoute>
          }
        />

        <Route path="/unauthorized" element={<Placeholder label="Unauthorized" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
