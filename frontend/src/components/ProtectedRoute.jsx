import { Navigate } from 'react-router-dom'
import { isLoggedIn } from '../api/auth'

/** Wrap a page so logged-out visitors go to /login instead of seeing 401s. */
export default function ProtectedRoute({ children }) {
  return isLoggedIn() ? children : <Navigate to="/login" replace />
}
