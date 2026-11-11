import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { isLoggedIn } from './api/auth'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import Styleguide from './pages/Styleguide'
import TreesPage from './pages/TreesPage'
import TreeView from './pages/TreeView'

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
              <TreesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trees/:id"
          element={
            <ProtectedRoute>
              <TreeView />
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
