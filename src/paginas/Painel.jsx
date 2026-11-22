import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../lib/api'
import { formatarData, formatarHora, reais, STATUS, DIAS_SEMANA, hojeLocal, FUSO } from '../lib/horarios'
import { PaginaInterna, Moldura, Erro, AvisoDemo } from '../components/Interno'
import { CartaCigana } from '../components/Basicos'

const ABAS = [['agenda', 'Agenda'], ['horarios', 'Horários'], ['consultas', 'Consultas e preços']]

export default function Painel() {
  const [aba, setAba] = useState('agenda')
  return (
    <PaginaInterna largura={1200}>
      <AvisoDemo />
      <div className="area-topo">
        <div>
          <span className="rotulo">Painel da cartomante</span>
          <h1 className="titulo">Suas <em>chaves</em></h1>
        </div>
      </div>
      <div className="abas">
        {ABAS.map(([id, nome]) => (
          <button key={id} className={aba === id ? 'ativa' : ''} onClick={() => setAba(id)}>
            {nome}{aba === id && <motion.span layoutId="aba-linha" className="aba-linha" />}
          </button>
        ))}
      </div>
      {aba === 'agenda' && <Agenda />}
      {aba === 'horarios' && <Horarios />}
      {aba === 'consultas' && <Servicos />}
    </PaginaInterna>
  )
}

/* ---------- Agenda ---------- */
function Agenda() {
  const [lista, setLista] = useState(null)
  const [erro, setErro] = useState('')
  useEffect(() => { api.todosAgendamentos().then(setLista).catch((e) => setErro(e.message)) }, [])

  const g = useMemo(() => {
    const l = lista || []
    const agora = Date.now() - 2 * 3600000
    return {
      distancia: l.filter((a) => !a.inicio && a.status === 'confirmado').sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em)),
      proximas: l.filter((a) => a.inicio && ['confirmado', 'conflito'].includes(a.status) && new Date(a.fim) > agora).sort((a, b) => new Date(a.inicio) - new Date(b.inicio)),
      semLeitura: l.filter((a) => a.inicio && a.status === 'confirmado' && new Date(a.fim) <= agora),
      historico: l.filter((a) => ['concluido', 'cancelado'].includes(a.status)).slice(0, 30),
      ganhosMes: l.filter((a) => ['confirmado', 'concluido'].includes(a.status) && (a.inicio || a.criado_em).slice(0, 7) === hojeLocal().slice(0, 7))
        .reduce((s, a) => s + Number(a.valor), 0),
    }
  }, [lista])

  if (erro) return <Erro>{erro}</Erro>
  if (!lista) return <p className="texto-suave">Carregando…</p>
  return (
    <>
      <div className="numeros">
        {[['Ao vivo marcadas', g.proximas.length], ['Perguntas para responder', g.distancia.length], ['Recebido este mês', reais(g.ganhosMes)]].map(([t, v], i) => (
          <motion.div key={t} className="numero" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <strong>{v}</strong><span className="rotulo">{t}</span>
          </motion.div>
        ))}
      </div>
      <Bloco titulo="Perguntas à distância para responder" itens={g.distancia} vazio="Nenhuma pergunta esperando. ✦" />
      <Bloco titulo="Próximas consultas ao vivo" itens={g.proximas} vazio="Nenhuma consulta marcada." agruparPorDia />
      {g.semLeitura.length > 0 && <Bloco titulo="Já aconteceram (falta marcar como concluída)" itens={g.semLeitura} />}
      <Bloco titulo="Histórico recente" itens={g.historico} vazio="Ainda sem histórico." compacto />
    </>
  )
}

function Bloco({ titulo, itens, vazio, agruparPorDia, compacto }) {
  let ultimoDia = ''
  return (
    <section className="area-bloco">
      <h2 className="area-titulo">{titulo}</h2>
      {itens.length === 0 ? <p className="vazio">{vazio}</p> : (
        <div className={`agenda-lista ${compacto ? 'compacta' : ''}`}>
          {itens.map((a) => {
            const dia = a.inicio ? a.inicio && formatarData(a.inicio) : ''
            const cabecalho = agruparPorDia && dia !== ultimoDia ? dia : null
            ultimoDia = dia
            return (
              <div key={a.id}>
                {cabecalho && <h3 className="agenda-dia">{cabecalho}</h3>}
                <Link to={`/painel/consulta/${a.id}`} className="agenda-item">
                  <span className="agenda-hora">{a.inicio ? formatarHora(a.inicio) : formatarData(a.criado_em, { day: '2-digit', month: '2-digit' })}</span>
                  {!compacto && <CartaCigana n={a.servico?.carta || 33} className="agenda-carta" />}
                  <span className="agenda-info">
                    <strong>{a.cliente?.nome || 'Consulente'}</strong>
                    <span>{a.servico?.nome}{a.pergunta && !compacto ? ` · “${a.pergunta.slice(0, 70)}${a.pergunta.length > 70 ? '…' : ''}”` : ''}</span>
                  </span>
                  <span className={`etiqueta ${a.status}`}>{STATUS[a.status]}</span>
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

/* ---------- Horários de atendimento ---------- */
function Horarios() {
  const [regras, setRegras] = useState(null)
  const [bloqueios, setBloqueios] = useState([])
  const [novaData, setNovaData] = useState('')
  const [msg, setMsg] = useState('')
  useEffect(() => { api.obterDisponibilidade().then((d) => { setRegras(d.regras); setBloqueios(d.bloqueios) }) }, [])
  if (!regras) return <p className="texto-suave">Carregando…</p>

  const doDia = (d) => regras.filter((r) => r.dia_semana === d)
  const mudar = (i, campo, v) => setRegras(regras.map((r, j) => (j === i ? { ...r, [campo]: v } : r)))
  async function salvar() {
    setMsg('')
    try {
      if (regras.some((r) => r.fim <= r.inicio)) throw new Error('Em algum dia o horário de término está antes do início.')
      await api.salvarRegras(regras); await api.salvarBloqueios(bloqueios); setMsg('Agenda salva ✓')
    } catch (e) { setMsg(e.message) }
  }
  return (
    <>
      <section className="area-bloco">
        <h2 className="area-titulo">Dias e horários em que você atende</h2>
        <p className="texto-suave pequeno">Os consulentes só conseguem marcar dentro destes horários (horário de Brasília). Pode ter mais de um período por dia, por exemplo manhã e noite.</p>
        <div className="semana">
          {DIAS_SEMANA.map((nome, d) => (
            <Moldura key={d} className={`semana-dia ${doDia(d).length ? '' : 'folga'}`}>
              <h3>{nome}</h3>
              {regras.map((r, i) => r.dia_semana === d && (
                <div key={i} className="periodo">
                  <input type="time" value={r.inicio} step={1800} onChange={(e) => mudar(i, 'inicio', e.target.value)} />
                  <span>às</span>
                  <input type="time" value={r.fim} step={1800} onChange={(e) => mudar(i, 'fim', e.target.value)} />
                  <button className="remover" onClick={() => setRegras(regras.filter((_, j) => j !== i))} aria-label="Remover">×</button>
                </div>
              ))}
              {!doDia(d).length && <p className="pequeno texto-suave">Folga</p>}
              <button className="link-sutil" onClick={() => setRegras([...regras, { dia_semana: d, inicio: '10:00', fim: '18:00' }])}>+ período</button>
            </Moldura>
          ))}
        </div>
      </section>
      <section className="area-bloco">
        <h2 className="area-titulo">Dias bloqueados</h2>
        <p className="texto-suave pequeno">Feriados, viagens, descanso… Nesses dias ninguém consegue marcar.</p>
        <div className="bloqueios">
          {bloqueios.sort().map((b) => (
            <span key={b} className="bloqueio">{formatarData(`${b}T12:00:00${FUSO}`, { weekday: 'short', day: '2-digit', month: 'short' })}
              <button onClick={() => setBloqueios(bloqueios.filter((x) => x !== b))}>×</button></span>
          ))}
          <input type="date" value={novaData} min={hojeLocal()} onChange={(e) => setNovaData(e.target.value)} />
          <button className="botao botao-pequeno botao-vazado" disabled={!novaData} onClick={() => { setBloqueios([...new Set([...bloqueios, novaData])]); setNovaData('') }}>Bloquear dia</button>
        </div>
      </section>
      <div className="salvar-barra"><button className="botao" onClick={salvar}>Salvar agenda</button>{msg && <span>{msg}</span>}</div>
    </>
  )
}

/* ---------- Consultas e preços ---------- */
function Servicos() {
  const [lista, setLista] = useState(null)
  const [editando, setEditando] = useState(null)
  const carregar = () => api.listarServicos({ todos: true }).then(setLista)
  useEffect(() => { carregar() }, [])
  if (!lista) return <p className="texto-suave">Carregando…</p>
  return (
    <section className="area-bloco">
      <p className="texto-suave pequeno">O que você mudar aqui aparece no site e no agendamento.</p>
      <div className="servicos-admin">
        {lista.map((s) => (
          <button key={s.id} className={`servico-admin ${s.ativo ? '' : 'inativo'}`} onClick={() => setEditando({ ...s, detalhes: s.detalhes.join('\n') })}>
            <CartaCigana n={s.carta || 33} />
            <div><strong>{s.nome}</strong><span>{reais(s.preco)} · {s.modo === 'ao-vivo' ? `ao vivo, ${s.minutos} min` : 'à distância'}{!s.ativo && ' · oculta'}</span></div>
            <span className="link-sutil">editar</span>
          </button>
        ))}
        <button className="servico-admin novo" onClick={() => setEditando({ id: '', nome: '', resumo: '', detalhes: '', modo: 'ao-vivo', minutos: 30, duracao: '30 min', preco: 100, carta: 1, destaque: false, ativo: true, chave: '', novo: true })}>
          + Nova consulta
        </button>
      </div>
      {editando && <EditarServico s={editando} fechar={() => setEditando(null)} aoSalvar={() => { setEditando(null); carregar() }} />}
    </section>
  )
}

function EditarServico({ s, fechar, aoSalvar }) {
  const [f, setF] = useState(s)
  const [erro, setErro] = useState('')
  const c = (k, tipo) => ({
    value: f[k] ?? '',
    onChange: (e) => setF({ ...f, [k]: tipo === 'n' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value }),
  })
  async function salvar(e) {
    e.preventDefault(); setErro('')
    try {
      const { novo, ...resto } = f
      const id = resto.id || resto.nome.toLowerCase().normalize('NFD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-')
      if (!id || !resto.nome) throw new Error('Dê um nome à consulta.')
      if (!(resto.preco > 0)) throw new Error('Preço inválido.')
      if (resto.modo === 'ao-vivo' && !(resto.minutos >= 10)) throw new Error('Informe a duração em minutos.')
      await api.salvarServico({
        ...resto, id, minutos: resto.modo === 'ao-vivo' ? resto.minutos : null,
        detalhes: String(resto.detalhes).split('\n').map((x) => x.trim()).filter(Boolean),
        ...(novo ? { ordem: 99 } : {}),
      })
      aoSalvar()
    } catch (err) { setErro(err.message) }
  }
  return (
    <motion.div className="modal-fundo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={fechar}>
      <motion.form className="modal moldura" onClick={(e) => e.stopPropagation()} onSubmit={salvar} initial={{ y: 40, scale: 0.97 }} animate={{ y: 0, scale: 1 }}>
        <h2 className="titulo">{s.novo ? 'Nova consulta' : 'Editar consulta'}</h2>
        <div className="formulario grade-2">
          <label>Nome<input required {...c('nome')} /></label>
          <label>Preço (R$)<input type="number" min="1" step="0.01" required {...c('preco', 'n')} /></label>
          <label>Formato
            <select {...c('modo')}><option value="ao-vivo">Ao vivo (com horário)</option><option value="distancia">À distância (foto + áudio)</option></select>
          </label>
          {f.modo === 'ao-vivo'
            ? <label>Duração (minutos)<input type="number" min="10" step="5" {...c('minutos', 'n')} /></label>
            : <label>Prazo de entrega<input {...c('duracao')} placeholder="Entrega em 24h" /></label>}
          {f.modo === 'ao-vivo' && <label>Duração (como aparece no site)<input {...c('duracao')} placeholder="40 min" /></label>}
          <label>Carta ilustrativa (1 a 36)<input type="number" min="1" max="36" {...c('carta', 'n')} /></label>
          <label className="col-2">Frase curta<input {...c('resumo')} /></label>
          <label className="col-2">Itens (um por linha)<textarea rows={4} {...c('detalhes')} /></label>
          <label className="check"><input type="checkbox" checked={f.destaque} onChange={(e) => setF({ ...f, destaque: e.target.checked })} /> Destacar como “a mais completa”</label>
          <label className="check"><input type="checkbox" checked={f.ativo} onChange={(e) => setF({ ...f, ativo: e.target.checked })} /> Visível no site</label>
        </div>
        <Erro>{erro}</Erro>
        <div className="modal-acoes">
          <button type="button" className="botao botao-vazado" onClick={fechar}>Cancelar</button>
          <button className="botao">Salvar</button>
        </div>
      </motion.form>
    </motion.div>
  )
}
