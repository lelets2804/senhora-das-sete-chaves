import { Link, NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../lib/auth'
import api, { MODO_DEMO } from '../lib/api'

export function CabecalhoInterno() {
  const { usuario } = useAuth()
  const nav = useNavigate()
  return (
    <header className="cabecalho cabecalho-interno">
      <Link to="/" className="marca">
        <img className="marca-logo" src="/logo.jpg" alt="" />
        <span>Senhora <em>das</em> 7 Chaves</span>
      </Link>
      <nav className="cabecalho-acoes">
        {usuario?.papel === 'admin' && <NavLink to="/painel" className="link-sutil">Painel</NavLink>}
        {usuario && <NavLink to="/minha-area" end className="link-sutil">Minha área</NavLink>}
        {usuario
          ? <button className="link-sutil" onClick={async () => { await api.sair(); nav('/') }}>Sair</button>
          : <NavLink to="/entrar" className="link-sutil">Entrar</NavLink>}
        <Link to="/agendar" className="botao botao-pequeno">Agendar</Link>
      </nav>
    </header>
  )
}

export function AvisoDemo() {
  if (!MODO_DEMO) return null
  return (
    <div className="aviso-demo">
      Modo demonstração · os dados ficam só neste navegador e o pagamento é simulado ·{' '}
      <Link to="/demo/emails">ver e-mails enviados</Link>
    </div>
  )
}

export function PaginaInterna({ children, largura = 1100, className = '' }) {
  return (
    <>
      <CabecalhoInterno />
      <motion.main className={`pagina-interna ${className}`} style={{ maxWidth: largura }}
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}>
        {children}
      </motion.main>
    </>
  )
}

export function Moldura({ children, className = '', ...p }) {
  return (
    <div className={`moldura ${className}`} {...p}>
      <span className="canto a" /><span className="canto b" /><span className="canto c" /><span className="canto d" />
      {children}
    </div>
  )
}

export function Erro({ children }) {
  if (!children) return null
  return <motion.p className="erro" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>{children}</motion.p>
}