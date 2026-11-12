import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import MemberPage from './pages/MemberPage'
import MembersPage from './pages/MembersPage'
import RegisterPage from './pages/RegisterPage'
import Styleguide from './pages/Styleguide'
import TreesPage from './pages/TreesPage'
import TreeView from './pages/TreeView'

const protectedPage = (page) => <ProtectedRoute>{page}</ProtectedRoute>

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/trees" element={protectedPage(<TreesPage />)} />
        <Route path="/trees/:id" element={protectedPage(<TreeView />)} />
        <Route path="/trees/:id/members" element={protectedPage(<MembersPage />)} />
        <Route path="/trees/:id/members/:personId" element={protectedPage(<MemberPage />)} />
        <Route path="/styleguide" element={<Styleguide />} />
        {/* anything unknown goes to the landing page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
