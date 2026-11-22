import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../lib/api'
import { formatarData, formatarDataHora, formatarHora, reais, STATUS, DIAS_SEMANA, hojeLocal, somarDias, diaDaSemana, FUSO, PASSO_MIN, janelasDoDia, ajustesDoDia, deMinutos, liberacaoDaLeitura } from '../lib/horarios'
import { PaginaInterna, Moldura, Erro, AvisoDemo } from '../components/Interno'
import { CartaCigana } from '../components/Basicos'

const ABAS = [['agenda', 'Agenda'], ['horarios', 'Meus horários'], ['consultas', 'Consultas e preços'], ['depoimentos', 'Depoimentos']]

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
      {aba === 'depoimentos' && <Depoimentos />}
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
                    <span>{a.servico?.nome}{liberacaoDaLeitura(a) && !compacto ? ` · entregar em ${formatarDataHora(liberacaoDaLeitura(a).toISOString())}` : ''}{a.pergunta && !compacto ? ` · “${a.pergunta.slice(0, 70)}${a.pergunta.length > 70 ? '…' : ''}”` : ''}</span>
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
const INICIO_GRADE = 6 * 60, FIM_GRADE = 24 * 60   // a grade do dia mostra das 6h à meia-noite
const SEMANA_CURTA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

function Horarios() {
  const [regras, setRegras] = useState(null)
  const [excecoes, setExcecoes] = useState([])
  const [ocupados, setOcupados] = useState([])
  const [dia, setDia] = useState(hojeLocal())
  const [msg, setMsg] = useState('')
  const [salvando, setSalvando] = useState(false)

  const carregar = async () => {
    const d = await api.obterDisponibilidade()
    setRegras(d.regras); setExcecoes(d.excecoes)
    const de = new Date(`${hojeLocal()}T00:00:00${FUSO}`).toISOString()
    const ate = new Date(`${somarDias(hojeLocal(), 62)}T00:00:00${FUSO}`).toISOString()
    setOcupados(await api.horariosOcupados(de, ate))
  }
  useEffect(() => { carregar() }, [])
  if (!regras) return <p className="texto-suave">Carregando…</p>

  const dias = Array.from({ length: 60 }, (_, i) => somarDias(hojeLocal(), i))
  const janelas = (d) => janelasDoDia(d, { regras, excecoes })
  const temAjuste = (d) => excecoes.some((e) => e.data === d)
  const horasAbertas = (d) => janelas(d).reduce((t, [i, f]) => t + (f - i), 0) / 60

  // meias-horas abertas no dia escolhido
  const abertas = new Set()
  for (const [i, f] of janelas(dia)) for (let m = i; m < f; m += PASSO_MIN) abertas.add(m)
  const reservada = (m) => {
    const ini = new Date(`${dia}T${deMinutos(m)}:00${FUSO}`), fim = new Date(ini.getTime() + PASSO_MIN * 60000)
    return ocupados.some((o) => ini < new Date(o.fim) && fim > new Date(o.inicio))
  }

  async function aplicar(novas) {
    setSalvando(true); setMsg('')
    try {
      const ajustes = ajustesDoDia(dia, regras, novas)
      await api.salvarAjustesDoDia(dia, ajustes)
      setExcecoes([...excecoes.filter((e) => e.data !== dia), ...ajustes])
      setMsg('Salvo ✓')
    } catch (e) { setMsg(e.message) } finally { setSalvando(false) }
  }
  const alternar = (m) => { if (reservada(m)) return; const n = new Set(abertas); n.has(m) ? n.delete(m) : n.add(m); aplicar(n) }
  const abrirFaixa = (ini, fim) => { const n = new Set(); for (let m = ini; m < fim; m += PASSO_MIN) n.add(m); aplicar(n) }
  async function voltarPadrao() {
    setSalvando(true)
    await api.salvarAjustesDoDia(dia, [])
    setExcecoes(excecoes.filter((e) => e.data !== dia)); setSalvando(false); setMsg('Voltou ao horário padrão ✓')
  }

  const grade = []
  for (let m = INICIO_GRADE; m < FIM_GRADE; m += PASSO_MIN) grade.push(m)
  const proximosAjustes = [...new Set(excecoes.map((e) => e.data))].filter((d) => d >= hojeLocal()).sort()

  return (
    <>
      <section className="area-bloco">
        <h2 className="area-titulo">Ajustar um dia</h2>
        <p className="texto-suave pequeno">
          Escolha o dia e toque nos horários para <strong>abrir</strong> (dourado) ou <strong>fechar</strong> (apagado).
          Horários já reservados por consulentes aparecem em vinho e não podem ser fechados. Tudo é salvo na hora.
        </p>
        <div className="faixa-dias">
          {dias.map((d) => {
            const h = horasAbertas(d)
            return (
              <button key={d} className={`faixa-dia ${d === dia ? 'ativo' : ''} ${h ? '' : 'fechado'}`} onClick={() => { setDia(d); setMsg('') }}>
                <span className="dia-semana">{SEMANA_CURTA[diaDaSemana(d)]}</span>
                <span className="dia-num">{Number(d.slice(8))}</span>
                <span className="dia-mes">{formatarData(`${d}T12:00:00${FUSO}`, { month: 'short' }).replace('.', '')}</span>
                <span className="faixa-horas">{h ? `${h}h` : 'fechado'}</span>
                {temAjuste(d) && <span className="faixa-marca" title="Dia com ajuste" />}
              </button>
            )
          })}
        </div>

        <Moldura className="dia-editor">
          <div className="dia-editor-topo">
            <div>
              <h3 className="titulo">{formatarData(`${dia}T12:00:00${FUSO}`)}</h3>
              <p className="texto-suave pequeno">
                {horasAbertas(dia) ? `Aberto: ${janelas(dia).map(([i, f]) => `${deMinutos(i)}–${deMinutos(f)}`).join(' · ')}` : 'Fechado neste dia'}
                {temAjuste(dia) && ' · (ajustado)'}
              </p>
            </div>
            <div className="acoes-linha">
              <button className="botao botao-pequeno" disabled={salvando} onClick={() => abrirFaixa(9 * 60, 23 * 60)}>Abrir 9h–23h</button>
              <button className="botao botao-pequeno botao-vazado" disabled={salvando} onClick={() => aplicar(new Set([...abertas].filter(reservada)))}>Fechar o dia</button>
              {temAjuste(dia) && <button className="botao botao-pequeno botao-vazado" disabled={salvando} onClick={voltarPadrao}>Voltar ao padrão</button>}
            </div>
          </div>
          <div className="grade-horas">
            {grade.map((m) => {
              const res = reservada(m), aberto = abertas.has(m)
              return (
                <button key={m} disabled={salvando} onClick={() => alternar(m)}
                  className={`meia-hora ${res ? 'reservada' : aberto ? 'aberta' : ''}`} title={res ? 'Reservado por um consulente' : aberto ? 'Clique para fechar' : 'Clique para abrir'}>
                  {deMinutos(m)}
                </button>
              )
            })}
          </div>
          <div className="legenda">
            <span><i className="aberta" /> aberto</span><span><i /> fechado</span><span><i className="reservada" /> reservado</span>
            {msg && <strong>{msg}</strong>}
          </div>
        </Moldura>

        {proximosAjustes.length > 0 && (
          <p className="texto-suave pequeno ajustes-lista">
            Dias com ajuste: {proximosAjustes.map((d) => (
              <button key={d} className="link-sutil" onClick={() => setDia(d)}>{formatarData(`${d}T12:00:00${FUSO}`, { day: '2-digit', month: '2-digit' })}</button>
            ))}
          </p>
        )}
      </section>

      <SemanaPadrao regras={regras} aoSalvar={(r) => setRegras(r)} />
    </>
  )
}

/* A semana padrão: vale para todos os dias que não tiverem ajuste */
function SemanaPadrao({ regras: iniciais, aoSalvar }) {
  const [regras, setRegras] = useState(iniciais)
  const [msg, setMsg] = useState('')
  const doDia = (d) => regras.filter((r) => r.dia_semana === d)
  const mudar = (i, campo, v) => setRegras(regras.map((r, j) => (j === i ? { ...r, [campo]: v } : r)))
  async function salvar() {
    setMsg('')
    try {
      if (regras.some((r) => r.fim <= r.inicio)) throw new Error('Em algum dia o horário de término está antes do início.')
      await api.salvarRegras(regras); aoSalvar(regras); setMsg('Semana padrão salva ✓')
    } catch (e) { setMsg(e.message) }
  }
  return (
    <section className="area-bloco">
      <h2 className="area-titulo">Semana padrão</h2>
      <p className="texto-suave pequeno">O horário que se repete toda semana. Dias com ajuste (acima) seguem o ajuste. Horário de Brasília.</p>
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
            {!doDia(d).length && <p className="pequeno texto-suave">Fechado (abra dias específicos acima)</p>}
            <button className="link-sutil" onClick={() => setRegras([...regras, { dia_semana: d, inicio: '09:00', fim: '23:00' }])}>+ período</button>
          </Moldura>
        ))}
      </div>
      <div className="salvar-barra"><button className="botao" onClick={salvar}>Salvar semana padrão</button>{msg && <span>{msg}</span>}</div>
    </section>
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

/* ---------- Depoimentos: aprovar antes de aparecer no site ---------- */
function Depoimentos() {
  const [lista, setLista] = useState(null)
  const [erro, setErro] = useState('')
  const carregar = () => api.depoimentosAdmin().then(setLista).catch((e) => setErro(e.message))
  useEffect(() => { carregar() }, [])
  const moderar = async (id, status) => { await api.moderarDepoimento(id, status); carregar() }
  if (erro) return <Erro>{erro}</Erro>
  if (!lista) return <p className="texto-suave">Carregando…</p>
  const grupos = [
    ['pendente', 'Esperando sua aprovação', 'Nenhum depoimento novo. ✦'],
    ['aprovado', 'Publicados no site', 'Nenhum publicado ainda. Enquanto isso, o site mostra os de exemplo.'],
    ['recusado', 'Não publicados', null],
  ]
  return grupos.map(([status, titulo, vazio]) => {
    const itens = lista.filter((d) => d.status === status)
    if (!itens.length && !vazio) return null
    return (
      <section key={status} className="area-bloco">
        <h2 className="area-titulo">{titulo} {itens.length > 0 && <small className="contagem">{itens.length}</small>}</h2>
        {itens.length === 0 ? <p className="vazio">{vazio}</p> : (
          <div className="depoimentos-admin">
            {itens.map((d) => (
              <motion.div key={d.id} className="depoimento-admin" layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <blockquote>“{d.texto}”</blockquote>
                <p className="depoimento-autor">{d.nome_exibido}{d.cidade && ` · ${d.cidade}`} <span>· {d.servico_nome} · {formatarData(d.criado_em, { day: '2-digit', month: '2-digit', year: 'numeric' })}</span></p>
                <div className="acoes-linha">
                  {status !== 'aprovado' && <button className="botao botao-pequeno" onClick={() => moderar(d.id, 'aprovado')}>Publicar no site</button>}
                  {status === 'pendente' && <button className="botao botao-pequeno botao-vazado" onClick={() => moderar(d.id, 'recusado')}>Não publicar</button>}
                  {status === 'aprovado' && <button className="botao botao-pequeno botao-vazado" onClick={() => moderar(d.id, 'recusado')}>Tirar do site</button>}
                  <Link className="link-sutil" to={`/painel/consulta/${d.agendamento_id}`}>ver consulta</Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    )
  })
}