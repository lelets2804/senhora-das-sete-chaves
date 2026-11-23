import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import api from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatarDataHora, formatarData, reais, STATUS, liberacaoDaLeitura, leituraLiberada } from '../lib/horarios'
import { cartas as todasCartas } from '../data/cartas'
import { PaginaInterna, Moldura, Erro, AvisoDemo } from '../components/Interno'
import { CartaCigana } from '../components/Basicos'

export default function Consulta({ admin = false }) {
  const { id } = useParams()
  const [ag, setAg] = useState(null)
  const [erro, setErro] = useState('')
  const recarregar = () => api.obterAgendamento(id).then(setAg).catch((e) => setErro(e.message))
  useEffect(() => { recarregar() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (erro) return <PaginaInterna><Erro>{erro}</Erro></PaginaInterna>
  if (!ag) return <PaginaInterna><p className="texto-suave centro"><span className="girando">⚷</span></p></PaginaInterna>

  const aoVivo = ag.servico?.modo === 'ao-vivo'
  const salaAberta = aoVivo && ['confirmado', 'concluido'].includes(ag.status)

  return (
    <PaginaInterna>
      <AvisoDemo />
      <Link to={admin ? '/painel' : '/minha-area'} className="link-sutil voltar">← {admin ? 'Painel' : 'Minha área'}</Link>
      <header className="consulta-topo">
        <CartaCigana n={ag.servico?.carta || 33} className="consulta-carta" />
        <div>
          <span className="rotulo">{aoVivo ? 'Consulta ao vivo' : 'Consulta à distância'}</span>
          <h1 className="titulo">{ag.servico?.nome}</h1>
          <p className="consulta-meta">
            {ag.inicio ? formatarDataHora(ag.inicio) : `Pedida em ${formatarData(ag.criado_em, { day: '2-digit', month: 'long' })}`}
            {' · '}{reais(ag.valor)} {!admin && !leituraLiberada(ag)
              ? <span className="etiqueta confirmado">Leitura em preparo</span>
              : <span className={`etiqueta ${ag.status}`}>{STATUS[ag.status]}</span>}
          </p>
          {admin && ag.cliente && (
            <p className="consulta-cliente">👤 <strong>{ag.cliente.nome}</strong> · {ag.cliente.email}{ag.cliente.telefone && ` · ${ag.cliente.telefone}`}</p>
          )}
        </div>
      </header>

      {ag.pergunta && (
        <Moldura className="pergunta">
          <span className="rotulo">{admin ? 'Pergunta do consulente' : 'Sua pergunta'}</span>
          <p>“{ag.pergunta}”</p>
        </Moldura>
      )}

      {ag.status === 'aguardando_pagamento' && !admin && (
        <p className="vazio">Esta reserva ainda aguarda a confirmação do pagamento. Reservas não pagas expiram em 30 minutos.</p>
      )}
      {ag.status === 'conflito' && (
        <p className="erro">{admin ? 'Duas pessoas pagaram por este horário ao mesmo tempo. Combine um novo horário com o consulente ou faça o estorno pelo Asaas.' : 'Houve um conflito de horário. A Senhora vai entrar em contato para remarcar.'}</p>
      )}

      {admin && <AcoesAdmin ag={ag} aoMudar={recarregar} />}
      {salaAberta && <Sala ag={ag} admin={admin} />}
      {ag.leitura && <Leitura ag={ag} admin={admin} />}
      {admin && ['confirmado', 'concluido'].includes(ag.status) && <EnviarLeitura ag={ag} aoEnviar={recarregar} />}
      {ag.status === 'concluido' && leituraLiberada(ag) && (!admin || ag.depoimento) && <Depoimento ag={ag} admin={admin} aoEnviar={recarregar} />}
      {!admin && !ag.leitura && !aoVivo && ['confirmado', 'concluido'].includes(ag.status) && <Aguardando ag={ag} />}
    </PaginaInterna>
  )
}

/* ---------- Consulta à distância: a leitura chega 24h após o pagamento ---------- */
function Aguardando({ ag }) {
  const libera = liberacaoDaLeitura(ag)
  const [agora, setAgora] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setAgora(Date.now()), 30000); return () => clearInterval(t) }, [])
  const falta = libera ? Math.max(0, libera.getTime() - agora) : 0
  const h = Math.floor(falta / 3600000), m = Math.floor((falta % 3600000) / 60000)
  return (
    <Moldura className="aguardando">
      <motion.span className="girando grande" aria-hidden>⚷</motion.span>
      <span className="rotulo">Sua leitura está sendo preparada</span>
      {libera && <h2 className="titulo">Chega em <em>{formatarDataHora(libera.toISOString())}</em></h2>}
      {libera && falta > 0 && <p className="contagem-regressiva">faltam {h}h {String(m).padStart(2, '0')}min</p>}
      <p className="texto-suave">
        A Senhora já recebeu sua pergunta. As consultas à distância são entregues <strong>24 horas após o pagamento</strong>:
        a foto da mesa e a explicação aparecem aqui, e você recebe um aviso por e-mail. 🔑
      </p>
    </Moldura>
  )
}

/* ---------- Sala de Consulta: vídeo + chat ---------- */
function Sala({ ag, admin }) {
  const { usuario } = useAuth()
  const [msgs, setMsgs] = useState([])
  const [texto, setTexto] = useState('')
  const fim = useRef()
  const linkVideo = ag.link_video || `https://meet.jit.si/SeteChaves-${ag.id.replace(/-/g, '').slice(0, 16)}`
  const falta = new Date(ag.inicio) - Date.now()

  useEffect(() => {
    api.listarMensagens(ag.id).then(setMsgs).catch(() => {})
    return api.assinarMensagens(ag.id, setMsgs)
  }, [ag.id])
  useEffect(() => { fim.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [msgs.length])

  async function enviar(e) {
    e.preventDefault()
    const t = texto.trim(); if (!t) return
    setTexto('')
    await api.enviarMensagem(ag.id, t)
    setMsgs(await api.listarMensagens(ag.id))
  }
  return (
    <section className="sala">
      <h2 className="area-titulo"><span>⚷</span> Sala de Consulta</h2>
      <div className="sala-grade">
        <Moldura className="sala-video">
          <span className="rotulo">Por vídeo</span>
          <p className="texto-suave">
            {falta > 15 * 60000
              ? `A sala abre no horário marcado: ${formatarDataHora(ag.inicio)}.`
              : 'Clique para entrar na chamada de vídeo. Permita o uso da câmera e do microfone.'}
          </p>
          <a className="botao" href={linkVideo} target="_blank" rel="noreferrer">Entrar na chamada</a>
          <p className="pequeno texto-suave">Prefere só conversar por escrito? Use o chat ao lado.</p>
        </Moldura>
        <div className="chat">
          <div className="chat-mensagens">
            {msgs.length === 0 && <p className="chat-vazio">As mensagens desta consulta aparecem aqui.</p>}
            <AnimatePresence initial={false}>
              {msgs.map((m) => {
                const minha = m.autor_id === usuario.id
                return (
                  <motion.div key={m.id} className={`msg ${minha ? 'minha' : ''}`} initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}>
                    <span className="msg-autor">{minha ? 'Você' : admin ? (m.autor_nome || 'Consulente') : 'Senhora das 7 Chaves'}</span>
                    <p>{m.texto}</p>
                    <time>{new Date(m.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time>
                  </motion.div>
                )
              })}
            </AnimatePresence>
            <div ref={fim} />
          </div>
          <form className="chat-envio" onSubmit={enviar}>
            <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escreva sua mensagem…" maxLength={4000} />
            <button className="botao botao-pequeno">Enviar</button>
          </form>
        </div>
      </div>
    </section>
  )
}

/* ---------- A leitura recebida ---------- */
function Leitura({ ag, admin }) {
  const l = ag.leitura
  const [zoom, setZoom] = useState(false)
  const [nota, setNota] = useState(ag.anotacao_cliente || '')
  const [salvo, setSalvo] = useState('')
  useEffect(() => {
    if (admin || nota === (ag.anotacao_cliente || '')) return
    setSalvo('salvando…')
    const t = setTimeout(() => api.salvarAnotacao(ag.id, nota).then(() => setSalvo('salvo ✓')).catch(() => setSalvo('não salvou')), 900)
    return () => clearTimeout(t)
  }, [nota]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="leitura">
      <h2 className="area-titulo"><span>✦</span> {admin ? 'Leitura enviada' : 'Sua leitura'}</h2>
      <p className="texto-suave pequeno">Enviada em {formatarDataHora(l.enviada_em)}</p>
      {l.foto_url && (
        <motion.button className="leitura-mesa" onClick={() => setZoom(true)} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
          <img src={l.foto_url} alt="Foto da mesa com as cartas" />
          <span className="rotulo">ampliar</span>
        </motion.button>
      )}
      {l.cartas?.length > 0 && (
        <div className="cartas-sairam">
          <span className="rotulo">As cartas que saíram</span>
          <div className="cartas-fila">
            {l.cartas.map((n, i) => (
              <motion.div key={`${n}-${i}`} className="carta-virando" initial={{ rotateY: 180, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }}
                transition={{ delay: i * 0.12, duration: 0.8 }}>
                <CartaCigana n={n} />
              </motion.div>
            ))}
          </div>
        </div>
      )}
      {l.audio_url && (
        <Moldura className="leitura-audio">
          <span className="rotulo">♪ Áudio da Senhora</span>
          <audio controls src={l.audio_url} preload="metadata" />
        </Moldura>
      )}
      {l.texto && <div className="leitura-texto">{l.texto.split('\n').map((p, i) => p ? <p key={i}>{p}</p> : <br key={i} />)}</div>}
      {!admin ? (
        <Moldura className="anotacoes">
          <span className="rotulo">Minhas anotações {salvo && <em className="salvo">· {salvo}</em>}</span>
          <textarea rows={5} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Escreva o que sentiu, o que aconteceu depois… só você vê." />
        </Moldura>
      ) : null}
      <AnimatePresence>
        {zoom && (
          <motion.div className="zoom" onClick={() => setZoom(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.img src={l.foto_url} alt="" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

/* ---------- Admin: status e link de vídeo ---------- */
function AcoesAdmin({ ag, aoMudar }) {
  const [link, setLink] = useState(ag.link_video || '')
  const mudar = async (campos) => { await api.atualizarAgendamento(ag.id, campos); aoMudar() }
  return (
    <Moldura className="acoes-admin">
      <span className="rotulo">Ações da cartomante</span>
      <div className="acoes-linha">
        {ag.status === 'confirmado' && <button className="botao botao-pequeno botao-vazado" onClick={() => mudar({ status: 'concluido' })}>Marcar como concluída</button>}
        {['confirmado', 'conflito'].includes(ag.status) && (
          <button className="botao botao-pequeno botao-vazado perigo" onClick={() => confirm('Cancelar esta consulta? O estorno do valor é feito no painel do Asaas.') && mudar({ status: 'cancelado' })}>Cancelar</button>
        )}
      </div>
      {ag.servico?.modo === 'ao-vivo' && (
        <form className="formulario linha" onSubmit={(e) => { e.preventDefault(); mudar({ link_video: link || null }) }}>
          <label>Link da chamada de vídeo <small>(vazio = sala automática)</small><input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" /></label>
          <button className="botao botao-pequeno botao-vazado">Salvar link</button>
        </form>
      )}
    </Moldura>
  )
}

/* ---------- Admin: enviar a leitura (foto da mesa + áudio + texto + cartas) ---------- */
function EnviarLeitura({ ag, aoEnviar }) {
  const l = ag.leitura || {}
  const [foto, setFoto] = useState(null)
  const [audio, setAudio] = useState(null)
  const [texto, setTexto] = useState(l.texto || '')
  const [cartas, setCartas] = useState(l.cartas || [])
  const [enviando, setEnviando] = useState(false)
  const [msg, setMsg] = useState('')
  const previa = foto ? URL.createObjectURL(foto) : l.foto_url

  async function enviar(e) {
    e.preventDefault(); setEnviando(true); setMsg('')
    try {
      await api.enviarLeitura(ag.id, { foto, audio, texto, cartas })
      setFoto(null); setAudio(null)
      setMsg(leituraLiberada(ag) ? 'Leitura enviada! O consulente já pode ver na área dele.' : `Leitura salva! O consulente vê a partir de ${formatarDataHora(liberacaoDaLeitura(ag).toISOString())}.`)
      aoEnviar()
    } catch (err) { setMsg(err.message) } finally { setEnviando(false) }
  }
  return (
    <section className="enviar-leitura">
      <h2 className="area-titulo"><span>✉</span> {ag.leitura ? 'Atualizar a leitura' : 'Enviar a leitura'}</h2>
      {liberacaoDaLeitura(ag) && (
        <p className="texto-suave pequeno">
          {leituraLiberada(ag)
            ? 'O consulente já pode ver a leitura assim que você enviar.'
            : `Pode enviar quando quiser: o consulente vê a leitura a partir de ${formatarDataHora(liberacaoDaLeitura(ag).toISOString())} (24h após o pagamento) e recebe o aviso por e-mail nessa hora.`}
        </p>
      )}
      <form onSubmit={enviar} className="enviar-grade">
        <label className="envio-foto">
          <input type="file" accept="image/*" capture="environment" onChange={(e) => setFoto(e.target.files[0] || null)} hidden />
          {previa ? <img src={previa} alt="" /> : <span>📷<br />Foto da mesa<br /><small>toque para escolher ou fotografar</small></span>}
        </label>
        <div className="envio-campos">
          <Gravador audio={audio} setAudio={setAudio} existente={l.audio_url} />
          <label className="formulario-campo">Explicação por escrito <small>(opcional)</small>
            <textarea rows={6} value={texto} onChange={(e) => setTexto(e.target.value)} />
          </label>
        </div>
      </form>
      <SeletorCartas valor={cartas} onChange={setCartas} />
      {msg && <p className={msg.startsWith('Leitura') ? 'sucesso' : 'erro'}>{msg}</p>}
      <button className="botao" onClick={enviar} disabled={enviando || (!foto && !audio && !texto && !l.foto_url)}>
        {enviando ? 'Enviando…' : ag.leitura ? 'Salvar alterações' : 'Enviar para o consulente'}
      </button>
    </section>
  )
}

function Gravador({ audio, setAudio, existente }) {
  const [gravando, setGravando] = useState(false)
  const [segundos, setSegundos] = useState(0)
  const rec = useRef(null)
  useEffect(() => {
    if (!gravando) return
    const t = setInterval(() => setSegundos((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [gravando])
  async function iniciar() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const r = new MediaRecorder(stream); const partes = []
      r.ondataavailable = (e) => partes.push(e.data)
      r.onstop = () => { setAudio(new Blob(partes, { type: r.mimeType })); stream.getTracks().forEach((t) => t.stop()) }
      r.start(); rec.current = r; setSegundos(0); setGravando(true)
    } catch { alert('Não foi possível acessar o microfone.') }
  }
  const parar = () => { rec.current?.stop(); setGravando(false) }
  const url = audio ? URL.createObjectURL(audio) : existente
  return (
    <div className="gravador">
      <span className="rotulo">Áudio explicando a leitura</span>
      <div className="gravador-linha">
        {gravando
          ? <button type="button" className="botao botao-pequeno gravando" onClick={parar}>■ Parar · {Math.floor(segundos / 60)}:{String(segundos % 60).padStart(2, '0')}</button>
          : <button type="button" className="botao botao-pequeno" onClick={iniciar}>● Gravar</button>}
        <label className="botao botao-pequeno botao-vazado">Enviar arquivo
          <input type="file" accept="audio/*" hidden onChange={(e) => setAudio(e.target.files[0] || null)} />
        </label>
        {audio && <button type="button" className="link-sutil" onClick={() => setAudio(null)}>descartar</button>}
      </div>
      {url && <audio controls src={url} />}
    </div>
  )
}

function SeletorCartas({ valor, onChange }) {
  const [aberto, setAberto] = useState(false)
  const alternar = (n) => onChange(valor.includes(n) ? valor.filter((x) => x !== n) : [...valor, n])
  return (
    <div className="seletor-cartas">
      <button type="button" className="link-sutil" onClick={() => setAberto(!aberto)}>
        {aberto ? '▾' : '▸'} Marcar as cartas que saíram <small>(opcional · {valor.length} escolhidas, na ordem do clique)</small>
      </button>
      <AnimatePresence>
        {aberto && (
          <motion.div className="seletor-grade" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            {todasCartas.map((c) => {
              const pos = valor.indexOf(c.n)
              return (
                <button type="button" key={c.n} className={`seletor-item ${pos >= 0 ? 'marcada' : ''}`} onClick={() => alternar(c.n)} title={c.nome}>
                  <CartaCigana n={c.n} />
                  {pos >= 0 && <span className="seletor-pos">{pos + 1}</span>}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ---------- Depoimento do consulente ---------- */
const ROTULO_DEP = { pendente: 'aguardando aprovação', aprovado: 'publicado no site ✓', recusado: 'não publicado' }
function Depoimento({ ag, admin, aoEnviar }) {
  const { usuario } = useAuth()
  const d = ag.depoimento
  const nomeSugerido = (() => {
    const partes = (usuario?.nome || '').trim().split(/\s+/)
    return partes.length > 1 ? `${partes[0]} ${partes[partes.length - 1][0]}.` : partes[0] || ''
  })()
  const [f, setF] = useState({ texto: '', nome: nomeSugerido, cidade: '' })
  const [autorizo, setAutorizo] = useState(false)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(e) {
    e.preventDefault(); setErro(''); setEnviando(true)
    try { await api.enviarDepoimento(ag.id, f); aoEnviar() } catch (err) { setErro(err.message) } finally { setEnviando(false) }
  }
  if (d) {
    return (
      <section className="depoimento-bloco">
        <h2 className="area-titulo"><span>✎</span> {admin ? 'Depoimento do consulente' : 'Seu depoimento'}</h2>
        <motion.figure className="bilhete bilhete-solto" initial={{ rotate: 0, opacity: 0 }} animate={{ rotate: -1.5, opacity: 1 }}>
          <span className="bilhete-lacre">7</span>
          <blockquote>“{d.texto}”</blockquote>
          <figcaption>{d.nome_exibido}{d.cidade && <> · <em>{d.cidade}</em></>}</figcaption>
        </motion.figure>
        <p className="texto-suave pequeno">Situação: <span className={`etiqueta dep-${d.status}`}>{ROTULO_DEP[d.status]}</span></p>
        {!admin && d.status === 'pendente' && <p className="texto-suave pequeno">Obrigada! Ele aparece no site assim que a Senhora aprovar. ✦</p>}
      </section>
    )
  }
  return (
    <section className="depoimento-bloco">
      <h2 className="area-titulo"><span>✎</span> Deixe seu depoimento</h2>
      <p className="texto-suave">Como foi a sua consulta? Suas palavras ajudam outras pessoas a chegarem até aqui.</p>
      <Moldura>
        <form className="formulario" onSubmit={enviar}>
          <label>Seu depoimento
            <textarea rows={4} required minLength={10} maxLength={800} value={f.texto} onChange={(e) => setF({ ...f, texto: e.target.value })}
              placeholder="Conte como você se sentiu, o que a leitura trouxe para você…" />
          </label>
          <div className="formulario linha">
            <label>Como seu nome aparece<input required minLength={2} maxLength={60} value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></label>
            <label>Cidade <small>(opcional)</small><input maxLength={60} value={f.cidade} onChange={(e) => setF({ ...f, cidade: e.target.value })} /></label>
          </div>
          <label className="check"><input type="checkbox" checked={autorizo} onChange={(e) => setAutorizo(e.target.checked)} />
            Autorizo publicar este depoimento no site com o nome acima.</label>
          <Erro>{erro}</Erro>
          <button className="botao" disabled={!autorizo || enviando || f.texto.trim().length < 10}>{enviando ? 'Enviando…' : 'Enviar depoimento'}</button>
          <p className="texto-suave pequeno">Dica: você pode usar só as iniciais, como “M. A.”, se preferir não se identificar.</p>
        </form>
      </Moldura>
    </section>
  )
}