import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'

import Sidebar from './components/layout/Sidebar.jsx'
import Topbar from './components/layout/Topbar.jsx'
import Nestro from './components/Nestro.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Employees from './pages/Employees.jsx'
import Expenses from './pages/Expenses.jsx'
import Inventory from './pages/Inventory.jsx'
import Login from './pages/Login.jsx'
import Quotations from './pages/Quotations.jsx'
import Reports from './pages/Reports.jsx'
import Sales from './pages/Sales.jsx'
import Settings from './pages/Settings.jsx'
import { useAuth } from './context/AuthContext.jsx'

const ProtectedLayout = () => {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex min-h-screen bg-background text-slate-800">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar />
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <Nestro />
    </div>
  )
}

const HomeRedirect = () => {
  const { user } = useAuth()
  
  // Redirect cashiers to /sales, others to /dashboard
  if (user?.role === 'cashier') {
    return <Navigate to="/sales" replace />
  }
  
  return <Dashboard />
}

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/quotations" element={<Quotations />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
