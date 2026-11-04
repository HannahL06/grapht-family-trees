import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Styleguide from './pages/Styleguide'

// Real pages arrive in Tasks 2.3+; for now only the dev styleguide exists.
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/styleguide" element={<Styleguide />} />
        <Route path="*" element={<Navigate to="/styleguide" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
