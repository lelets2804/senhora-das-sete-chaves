import { useEffect, useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Home from './components/Home'
import EmBreve from './components/EmBreve'
import { Abertura, Cursor } from './components/Basicos'
import { ProvedorAuth, Protegida } from './lib/auth'
import Entrar from './paginas/Entrar'
import Agendar from './paginas/Agendar'
import { PagamentoDemo, RetornoPagamento } from './paginas/Pagamento'
import MinhaArea from './paginas/MinhaArea'
import Consulta from './paginas/Consulta'
import EmailsDemo from './paginas/EmailsDemo'
import './styles/home.css'
import './styles/app.css'

export default function App() {
  const { pathname } = useLocation()
  const [abertura] = useState(() => pathname === '/')
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return (
    <ProvedorAuth>
      {abertura && <Abertura />}
      <Cursor />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/entrar" element={<Entrar />} />
        <Route path="/agendar" element={<Agendar />} />
        <Route path="/pagamento/demo" element={<Protegida><PagamentoDemo /></Protegida>} />
        <Route path="/pagamento/retorno" element={<Protegida><RetornoPagamento /></Protegida>} />
        <Route path="/minha-area" element={<Protegida><MinhaArea /></Protegida>} />
        <Route path="/minha-area/consulta/:id" element={<Protegida><Consulta /></Protegida>} />
        <Route path="/demo/emails" element={<EmailsDemo />} />
        <Route path="*" element={<EmBreve />} />
      </Routes>
      <div className="grao" />
      <div className="vinheta" />
    </ProvedorAuth>
  )
}