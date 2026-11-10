
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './contexts/useAuth'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import Home from './pages/Home'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import Biblioteca from './pages/Biblioteca'
import Libros from './pages/Libros'
import NuevaPropuesta from './pages/NuevaPropuesta'
import MotorLibros from './pages/MotorLibros'


function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) {
    return <p>Verificando sesión...</p>
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return children
}

function AppRoutes() {
  const { session, loading } = useAuth()

  if (loading) {
    return <p>Verificando sesión...</p>
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Navigate to={session ? '/home' : '/login'} replace />
        }
      />

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/biblioteca/libros"
        element={
          <ProtectedRoute>
            <Libros />
          </ProtectedRoute>
        }
      />
      <Route
        path="/biblioteca/libros/editor"
        element={<ProtectedRoute><MotorLibros /></ProtectedRoute>}
      />
      <Route
        path="/biblioteca/libros/nueva-propuesta"
        element={
          <ProtectedRoute>
            <NuevaPropuesta />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/biblioteca/libros/editar-propuesta/:libroId"
        
        element={
          <ProtectedRoute>
            <NuevaPropuesta />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/biblioteca/libros/editar-borrador/:propuestaId"
        element={
          <ProtectedRoute>
            <NuevaPropuesta />
          </ProtectedRoute>
        }
      />


      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/biblioteca"
        element={
          <ProtectedRoute>
            <Biblioteca />
          </ProtectedRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />

      <Route
        path="/reset-password"
        element={<ResetPassword />}
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
