import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatarDataHora, formatarData, reais, STATUS } from '../lib/horarios'
import { PaginaInterna, Moldura, Erro, AvisoDemo } from '../components/Interno'
import { CartaCigana, Revelar } from '../components/Basicos'

export default function MinhaArea() {
  const { usuario } = useAuth()
  const [lista, setLista] = useState(null)
  const [erro, setErro] = useState('')
  useEffect(() => { api.meusAgendamentos().then(setLista).catch((e) => setErro(e.message)) }, [])

  const leituras = (lista || []).filter((a) => a.leitura)
  const proximas = (lista || []).filter((a) => !a.leitura && ['confirmado', 'aguardando_pagamento', 'conflito'].includes(a.status))
    .filter((a) => a.status !== 'aguardando_pagamento' || Date.now() - new Date(a.criado_em) < 30 * 60000)
    .sort((a, b) => new Date(a.inicio || a.criado_em) - new Date(b.inicio || b.criado_em))
  const primeiroNome = usuario?.nome?.split(' ')[0]

  return (
    <PaginaInterna>
      <AvisoDemo />
      <div className="area-topo">
        <div>
          <span className="rotulo">Área do consulente</span>
          <h1 className="titulo">Olá{primeiroNome ? <>, <em>{primeiroNome}</em></> : ''}</h1>
        </div>
        <Link to="/agendar" className="botao">Nova consulta</Link>
      </div>
      <Erro>{erro}</Erro>

      <section className="area-bloco">
        <h2 className="area-titulo"><span>I</span> Próximas consultas</h2>
        {!lista ? <p className="texto-suave">Carregando…</p> : proximas.length === 0 ? (
          <p className="vazio">Nenhuma consulta marcada. <Link to="/agendar">Agendar agora →</Link></p>
        ) : (
          <div className="proximas">
            {proximas.map((a, i) => (
              <motion.div key={a.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <Link to={`/minha-area/consulta/${a.id}`} className="proxima">
                  <CartaCigana n={a.servico?.carta || 33} className="proxima-carta" />
                  <div>
                    <h3>{a.servico?.nome}</h3>
                    <p>{a.inicio ? formatarDataHora(a.inicio) : 'À distância · leitura em até 24h'}</p>
                    <span className={`etiqueta ${a.status}`}>{STATUS[a.status]}</span>
                  </div>
                  <span className="seta">→</span>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      <section className="area-bloco">
        <h2 className="area-titulo"><span>II</span> Minhas leituras</h2>
        {lista && leituras.length === 0 && <p className="vazio">Quando a Senhora enviar sua leitura, ela aparece aqui: a foto da mesa, o áudio e as anotações.</p>}
        <div className="leituras-grade">
          {leituras.map((a, i) => (
            <Revelar key={a.id} atraso={i * 0.08}>
              <Link to={`/minha-area/consulta/${a.id}`} className="leitura-cartao">
                <div className="leitura-foto" style={{ backgroundImage: a.leitura.foto_url ? `url(${a.leitura.foto_url})` : undefined }}>
                  {!a.leitura.foto_url && <div className="leitura-cartas-mini">{(a.leitura.cartas || []).slice(0, 3).map((n) => <CartaCigana key={n} n={n} />)}</div>}
                  {a.leitura.audio_url && <span className="leitura-icone">♪ áudio</span>}
                </div>
                <div className="leitura-info">
                  <span className="rotulo">{formatarData(a.leitura.enviada_em, { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                  <h3>{a.servico?.nome}</h3>
                  {a.pergunta && <p>“{a.pergunta}”</p>}
                </div>
              </Link>
            </Revelar>
          ))}
        </div>
      </section>

      <MinhaConta />
      <Historico lista={lista} />
    </PaginaInterna>
  )
}

function Historico({ lista }) {
  const outros = (lista || []).filter((a) => !a.leitura && ['concluido', 'cancelado'].includes(a.status))
  if (!outros.length) return null
  return (
    <section className="area-bloco">
      <h2 className="area-titulo"><span>IV</span> Histórico</h2>
      <ul className="historico">
        {outros.map((a) => (
          <li key={a.id}><Link to={`/minha-area/consulta/${a.id}`}>{a.servico?.nome}</Link> · {a.inicio ? formatarDataHora(a.inicio) : formatarData(a.criado_em)} · {reais(a.valor)} · {STATUS[a.status]}</li>
        ))}
      </ul>
    </section>
  )
}

function MinhaConta() {
  const { usuario } = useAuth()
  const [f, setF] = useState({ nome: usuario?.nome || '', telefone: usuario?.telefone || '' })
  const [msg, setMsg] = useState('')
  const [senha, setSenha] = useState('')
  async function salvar(e) {
    e.preventDefault(); setMsg('')
    try {
      await api.atualizarPerfil(f)
      if (senha && api.trocarSenha) { await api.trocarSenha(senha); setSenha('') }
      setMsg('Dados salvos.')
    } catch (err) { setMsg(err.message) }
  }
  return (
    <section className="area-bloco">
      <h2 className="area-titulo"><span>III</span> Minha conta</h2>
      <Moldura>
        <form className="formulario linha" onSubmit={salvar}>
          <label>Nome<input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></label>
          <label>Telefone<input value={f.telefone} onChange={(e) => setF({ ...f, telefone: e.target.value })} /></label>
          <label>E-mail<input value={usuario?.email || ''} disabled /></label>
          {api.trocarSenha && <label>Nova senha <small>(opcional)</small><input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} minLength={6} /></label>}
          <button className="botao botao-vazado">Salvar</button>
          {msg && <span className="texto-suave pequeno">{msg}</span>}
        </form>
      </Moldura>
    </section>
  )
}
