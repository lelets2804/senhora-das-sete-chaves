import { createContext, useContext, useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import api from './api'

const Ctx = createContext({ usuario: null, carregando: true })

export function ProvedorAuth({ children }) {
  const [estado, setEstado] = useState({ usuario: null, carregando: true })
  useEffect(() => {
    let vivo = true
    api.obterSessao().then((u) => vivo && setEstado({ usuario: u, carregando: false }))
    const parar = api.aoMudarSessao((u) => vivo && setEstado({ usuario: u, carregando: false }))
    return () => { vivo = false; parar() }
  }, [])
  return <Ctx.Provider value={estado}>{children}</Ctx.Provider>
}
export const useAuth = () => useContext(Ctx)

export function Protegida({ children, admin = false }) {
  const { usuario, carregando } = useAuth()
  const loc = useLocation()
  if (carregando) return <div className="carregando-pagina"><span className="girando">⚷</span></div>
  if (!usuario) return <Navigate to={`/entrar?voltar=${encodeURIComponent(loc.pathname + loc.search)}`} replace />
  if (admin && usuario.papel !== 'admin') return <Navigate to="/minha-area" replace />
  return children
}