
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { lazy, Suspense, useEffect, useState, type ComponentType } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './contexts/useAuth'
// Las pantallas de acceso son livianas y se usan al entrar: van en el paquete inicial.
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'

const RECARGA_POR_VERSION = 'chronicle.recargaPorVersion'

/**
 * Carga una página recién cuando se visita. Si el archivo ya no existe
 * (porque se publicó una versión nueva mientras la pestaña estaba abierta),
 * recarga la página una sola vez para traer la versión actual.
 */
function cargarPagina<T extends ComponentType>(importar: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      const modulo = await importar()
      sessionStorage.removeItem(RECARGA_POR_VERSION)
      return modulo
    } catch (error) {
      if (!sessionStorage.getItem(RECARGA_POR_VERSION)) {
        sessionStorage.setItem(RECARGA_POR_VERSION, 'true')
        window.location.reload()
        return new Promise<{ default: T }>(() => {})
      }
      throw error
    }
  })
}

const Home = cargarPagina(() => import('./pages/Home'))
const Biblioteca = cargarPagina(() => import('./pages/Biblioteca'))
const CatalogoConjuros = cargarPagina(() => import('./pages/CatalogoConjuros'))
const CatalogoClases = cargarPagina(() => import('./pages/CatalogoClases'))
const Libros = cargarPagina(() => import('./pages/Libros'))
const RevisionPropuesta = cargarPagina(() => import('./pages/RevisionPropuesta'))
const LectorLibro = cargarPagina(() => import('./pages/LectorLibro'))
const NuevaPropuesta = cargarPagina(() => import('./pages/NuevaPropuesta'))
const MotorLibros = cargarPagina(() => import('./pages/MotorLibros'))
const Administracion = cargarPagina(() => import('./pages/Administracion'))
const Profile = cargarPagina(() => import('./pages/Profile'))
const Settings = cargarPagina(() => import('./pages/Settings'))



// Compara los archivos versionados por Vite con los de la página actualmente abierta.
// No recarga automáticamente: así no se pierden cambios de formularios sin guardar.
function AvisoNuevaVersion() {
  const [hayNuevaVersion, setHayNuevaVersion] = useState(false)

  useEffect(() => {
    // Sólo se compara el script de entrada: las páginas se cargan por separado
    // y sus archivos no figuran en index.html. El nombre de la entrada cambia
    // cuando cambia cualquier parte de la app.
    const archivos = (html: string) =>
      [...html.matchAll(/<script[^>]+src="(\/assets\/[^"]+\.js)"/g)]
        .map(match => match[1])
        .sort()
        .join('|')

    const actuales = Array.from(document.querySelectorAll<HTMLScriptElement>('script[type="module"][src]'))
      .map(element => element.getAttribute('src') || '')
      .filter(url => url.startsWith('/assets/') && url.endsWith('.js'))
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
  const { session, loading, isPasswordRecovery } = useAuth()
  const location = useLocation()

  if (loading) {
    return <p>Verificando sesión...</p>
  }

  // Una sesión abierta desde un enlace de recuperación sólo sirve para
  // cambiar la contraseña: no da acceso al resto de la app.
  if (
    session &&
    isPasswordRecovery &&
    location.pathname !== '/reset-password'
  ) {
    return <Navigate to="/reset-password" replace />
  }

  return (
    <Suspense fallback={<p>Cargando...</p>}>
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
      <Route path="/biblioteca/clases" element={<ProtectedRoute><CatalogoClases /></ProtectedRoute>} />
      <Route path="/biblioteca/conjuros" element={<ProtectedRoute><CatalogoConjuros /></ProtectedRoute>} />
      <Route path="/biblioteca/libros/leer/:libroId" element={<ProtectedRoute><LectorLibro /></ProtectedRoute>} />
      <Route path="/biblioteca/libros/revision/:propuestaId" element={<ProtectedRoute><RevisionPropuesta /></ProtectedRoute>} />
      <Route path="/biblioteca/libros/leer-borrador/:propuestaId" element={<ProtectedRoute><LectorLibro /></ProtectedRoute>} />
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


      <Route path="/perfil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/configuracion" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
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
    </Suspense>
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
