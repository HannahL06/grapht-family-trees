import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { isLoggedIn } from './api/auth'
import ProtectedRoute from './components/ProtectedRoute'
import { AppShell } from './components/ui'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import Styleguide from './pages/Styleguide'

// Placeholder until Task 2.4
function TreesPlaceholder() {
  return (
    <AppShell>
      <h1 className="font-display text-5xl font-semibold">Trees</h1>
    </AppShell>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/trees"
          element={
            <ProtectedRoute>
              <TreesPlaceholder />
            </ProtectedRoute>
          }
        />
        <Route path="/styleguide" element={<Styleguide />} />
        {/* Landing page arrives in Task 2.10 */}
        <Route path="*" element={<Navigate to={isLoggedIn() ? '/trees' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
