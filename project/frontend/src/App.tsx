import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

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
        <Route path="/" element={<Placeholder label="SupportNova — Landing / Login" />} />
        <Route path="/register" element={<Placeholder label="Customer Registration" />} />
        <Route path="/login" element={<Placeholder label="Sign In" />} />

        <Route path="/customer/dashboard" element={<Placeholder label="Customer Dashboard" />} />
        <Route path="/customer/complaints/new" element={<Placeholder label="Submit New Complaint" />} />
        <Route path="/customer/complaints/:id" element={<Placeholder label="Complaint Detail" />} />

        <Route path="/agent/dashboard" element={<Placeholder label="Agent Dashboard" />} />
        <Route path="/agent/complaints/:id" element={<Placeholder label="Agent Complaint Detail" />} />

        <Route path="/reviewer/dashboard" element={<Placeholder label="Reviewer Dashboard" />} />
        <Route path="/reviewer/conflicts/:id" element={<Placeholder label="Conflict Resolution" />} />

        <Route path="/manager/dashboard" element={<Placeholder label="Manager Dashboard" />} />
        <Route path="/manager/agents" element={<Placeholder label="Agent Management" />} />
        <Route path="/manager/complaints/:id" element={<Placeholder label="Manager Complaint Detail" />} />

        <Route path="/admin/dashboard" element={<Placeholder label="Admin Dashboard" />} />
        <Route path="/admin/complaints" element={<Placeholder label="Admin — All Complaints" />} />
        <Route path="/admin/knowledge-base" element={<Placeholder label="Knowledge Base" />} />
        <Route path="/admin/rules" element={<Placeholder label="Resolution Rules Editor" />} />
        <Route path="/admin/escalation-rules" element={<Placeholder label="Escalation Rules Editor" />} />
        <Route path="/admin/categories" element={<Placeholder label="Categories" />} />
        <Route path="/admin/departments" element={<Placeholder label="Departments" />} />
        <Route path="/admin/users" element={<Placeholder label="User Management" />} />
        <Route path="/admin/audit-log" element={<Placeholder label="Audit Log" />} />
        <Route path="/admin/settings" element={<Placeholder label="Settings" />} />

        <Route path="/unauthorized" element={<Placeholder label="Unauthorized" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
