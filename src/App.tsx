
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './contexts/useAuth'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import Home from './pages/Home'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import Biblioteca from './pages/Biblioteca'
import Libros from './pages/Libros'
import LectorLibro from './pages/LectorLibro'
import NuevaPropuesta from './pages/NuevaPropuesta'
import MotorLibros from './pages/MotorLibros'
import Administracion from './pages/Administracion'



// Compara los archivos versionados por Vite con los de la página actualmente abierta.
// No recarga automáticamente: así no se pierden cambios de formularios sin guardar.
function AvisoNuevaVersion() {
  const [hayNuevaVersion, setHayNuevaVersion] = useState(false)

  useEffect(() => {
    const archivos = (html: string) =>
      [...html.matchAll(/(?:\\/assets\\/)[^"'\\s<>]+\\.(?:js|css)/g)]
        .map(match => match[0])
        .sort()
        .join('|')

    const actuales = [...document.querySelectorAll<HTMLScriptElement>('script[src], link[rel="stylesheet"]')]
      .map(element => element.getAttribute('src') || element.getAttribute('href') || '')
      .filter(url => url.includes('/assets/') && /\\.(?:js|css)(?:\\?|$)/.test(url))
      .map(url => url.split('?')[0])
      .sort()
      .join('|')

    if (!actuales) return

    let activo = true
    const comprobar = async () => {
      if (document.visibilityState === 'hidden') return
      try {
        const respuesta = await fetch('/?chronicle_version=' + Date.now(), { cache: 'no-store' })
        if (!respuesta.ok || !activo) return
        const nuevos = archivos(await respuesta.text())
        if (activo && nuevos && nuevos !== actuales) setHayNuevaVersion(true)
      } catch {
        // La conexión puede fallar temporalmente: se vuelve a intentar.
      }
    }

    void comprobar()
    const intervalo = window.setInterval(() => void comprobar(), 60_000)
    document.addEventListener('visibilitychange', comprobar)
    return () => {
      activo = false
      window.clearInterval(intervalo)
      document.removeEventListener('visibilitychange', comprobar)
    }
  }, [])

  if (!hayNuevaVersion) return null

  return (
    <div role="status" style={{
      position: 'fixed', bottom: 20, right: 20, zIndex: 10000,
      background: '#211d19', color: '#f4e8cf', border: '1px solid #b79a5a',
      borderRadius: 12, padding: 16, boxShadow: '0 8px 30px #0008',
      maxWidth: 340
    }}>
      <strong>Nueva versión de Chronicle disponible</strong>
      <p style={{ margin: '8px 0 12px' }}>Guardá tu trabajo antes de actualizar.</p>
      <button type="button" onClick={() => window.location.reload()}
        style={{ background: '#b79a5a', color: '#17130e', border: 0, borderRadius: 6, padding: '8px 14px', cursor: 'pointer' }}>
        Actualizar
      </button>
    </div>
  )
}

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
      <Route path="/biblioteca/libros/leer/:libroId" element={<ProtectedRoute><LectorLibro /></ProtectedRoute>} />
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


      <Route path="/administracion" element={<ProtectedRoute><Administracion /></ProtectedRoute>} />
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
        <AvisoNuevaVersion />
      </AuthProvider>
    </BrowserRouter>
  )
}
