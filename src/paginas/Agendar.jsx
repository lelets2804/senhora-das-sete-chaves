import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import api, { MODO_DEMO } from '../lib/api'
import { useAuth } from '../lib/auth'
import { consultas as consultasPadrao } from '../data/consultas'
import { hojeLocal, somarDias, horariosDoDia, formatarHora, formatarData, formatarDataHora, reais, diaDaSemana, FUSO } from '../lib/horarios'
import { PaginaInterna, Moldura, Erro, AvisoDemo } from '../components/Interno'
import { CartaCigana } from '../components/Basicos'

const DIAS_A_FRENTE = 35
const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

export default function Agendar() {
  const [params, setParams] = useSearchParams()
  const { usuario } = useAuth()
  const nav = useNavigate()
  const [servicos, setServicos] = useState(consultasPadrao)
  const [agenda, setAgenda] = useState(null)
  const [diaEscolhido, setDia] = useState(null)
  const [pergunta, setPergunta] = useState(() => sessionStorage.getItem('pergunta-rascunho') || '')
  const [aceite, setAceite] = useState(false)
  const [erro, setErro] = useState('')
  const [pagando, setPagando] = useState(false)

  const servico = servicos.find((s) => s.id === params.get('consulta'))
  const horario = params.get('horario')
  const precisaHorario = servico?.modo === 'ao-vivo'
  const passo = !servico ? 1 : precisaHorario && !horario ? 2 : 3

  useEffect(() => { api.listarServicos().then(setServicos).catch(() => {}) }, [])
  useEffect(() => { sessionStorage.setItem('pergunta-rascunho', pergunta) }, [pergunta])

  useEffect(() => {
    if (!precisaHorario) return
    const de = new Date(`${hojeLocal()}T00:00:00${FUSO}`).toISOString()
    const ate = new Date(`${somarDias(hojeLocal(), DIAS_A_FRENTE + 1)}T00:00:00${FUSO}`).toISOString()
    Promise.all([api.obterDisponibilidade(), api.horariosOcupados(de, ate)])
      .then(([disp, ocupados]) => setAgenda({ ...disp, ocupados }))
      .catch((e) => setErro(e.message))
  }, [precisaHorario, servico?.id])

  const dias = useMemo(() => {
    if (!agenda || !servico) return []
    const hoje = hojeLocal()
    return Array.from({ length: DIAS_A_FRENTE }, (_, i) => {
      const data = somarDias(hoje, i)
      return { data, horarios: horariosDoDia(data, { ...agenda, minutos: servico.minutos }) }
    })
  }, [agenda, servico])
  const diaAtual = dias.find((d) => d.data === diaEscolhido) || dias.find((d) => d.horarios.length)

  const definir = (mud) => {
    const p = new URLSearchParams(params)
    Object.entries(mud).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)))
    setParams(p); setErro('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function pagar() {
    setErro(''); setPagando(true)
    try {
      const { url } = await api.iniciarPagamento({ servicoId: servico.id, inicio: horario, pergunta })
      sessionStorage.removeItem('pergunta-rascunho')
      if (url.startsWith('/')) nav(url); else window.location.href = url
    } catch (e) { setErro(e.message); setPagando(false) }
  }

  return (
    <PaginaInterna className="agendar-pagina">
      <AvisoDemo />
      <div className="secao-cabeca compacta">
        <span className="rotulo">Agendamento</span>
        <h1 className="titulo">Marque sua <em>consulta</em></h1>
      </div>

      <ol className="passos-barra">
        {['A consulta', 'Dia e hora', 'Confirmar e pagar'].map((t, i) => (
          <li key={t} className={passo === i + 1 ? 'atual' : passo > i + 1 ? 'feito' : ''}>
            <span>{['I', 'II', 'III'][i]}</span>{t}
          </li>
        ))}
      </ol>

      <AnimatePresence mode="wait">
        {passo === 1 && (
          <motion.div key="p1" className="escolha-servicos" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
            {servicos.map((s, i) => (
              <motion.button key={s.id} className="servico-opcao" onClick={() => definir({ consulta: s.id, horario: null })}
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} whileHover={{ y: -6 }}>
                <CartaCigana n={s.carta} className="servico-opcao-carta" />
                <div>
                  <h3>{s.nome}</h3>
                  <p>{s.resumo}</p>
                  <span className="servico-meta">{s.modo === 'ao-vivo' ? '◉ Ao vivo' : '✉ À distância'} · {s.duracao}</span>
                </div>
                <strong>{reais(s.preco)}</strong>
              </motion.button>
            ))}
          </motion.div>
        )}

        {passo === 2 && (
          <motion.div key="p2" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
            <Resumo servico={servico} onTrocar={() => definir({ consulta: null, horario: null })} />
            {!agenda ? <p className="texto-suave centro">Abrindo a agenda…</p> : (
              <div className="calendario-grade">
                <div className="dias">
                  {dias.map(({ data, horarios }) => {
                    const livre = horarios.length > 0
                    return (
                      <button key={data} disabled={!livre} onClick={() => setDia(data)}
                        className={`dia ${diaAtual?.data === data ? 'ativo' : ''}`}>
                        <span className="dia-semana">{SEMANA[diaDaSemana(data)]}</span>
                        <span className="dia-num">{Number(data.slice(8))}</span>
                        <span className="dia-mes">{formatarData(`${data}T12:00:00${FUSO}`, { month: 'short' }).replace('.', '')}</span>
                      </button>
                    )
                  })}
                </div>
                <Moldura className="horarios">
                  {diaAtual ? (
                    <>
                      <h3 className="titulo">{formatarData(`${diaAtual.data}T12:00:00${FUSO}`)}</h3>
                      <p className="texto-suave pequeno">Horário de Brasília</p>
                      <div className="horarios-lista">
                        {diaAtual.horarios.map((h, i) => (
                          <motion.button key={h} className="horario" onClick={() => definir({ horario: h })}
                            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.02 }}>
                            {formatarHora(h)}
                          </motion.button>
                        ))}
                      </div>
                    </>
                  ) : <p className="texto-suave">Nenhum horário livre nas próximas semanas.</p>}
                </Moldura>
              </div>
            )}
          </motion.div>
        )}

        {passo === 3 && (
          <motion.div key="p3" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="confirmar">
            <Resumo servico={servico} horario={horario}
              onTrocar={() => definir({ consulta: null, horario: null })}
              onTrocarHorario={precisaHorario ? () => definir({ horario: null }) : null} />
            <Moldura className="confirmar-form">
              <label>
                {servico.modo === 'distancia' ? 'Sua pergunta' : 'Sobre o que você quer falar? (opcional)'}
                <textarea rows={5} value={pergunta} onChange={(e) => setPergunta(e.target.value)} maxLength={2000}
                  placeholder={servico.modo === 'distancia' ? 'Escreva sua pergunta com o máximo de clareza.' : 'Se quiser, adiante o assunto da consulta.'} />
              </label>
              <label className="aceite">
                <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} />
                <span>Tenho mais de 18 anos e entendo que a cartomancia é uma orientação espiritual, que não substitui
                  acompanhamento médico, psicológico, jurídico ou financeiro.</span>
              </label>
              <Erro>{erro}</Erro>
              {usuario ? (
                <button className="botao botao-largo" onClick={pagar}
                  disabled={pagando || !aceite || (servico.modo === 'distancia' && pergunta.trim().length < 5)}>
                  {pagando ? 'Abrindo o pagamento…' : `Pagar ${reais(servico.preco)} · Pix ou cartão`}
                </button>
              ) : (
                <div className="precisa-login">
                  <p>Para concluir, entre na sua conta. Sua escolha fica guardada.</p>
                  <Link className="botao" to={`/entrar?modo=cadastro&voltar=${encodeURIComponent(`/agendar?${params}`)}`}>Criar conta</Link>
                  <Link className="botao botao-vazado" to={`/entrar?voltar=${encodeURIComponent(`/agendar?${params}`)}`}>Já tenho conta</Link>
                </div>
              )}
              <p className="seguro">🔒 Pagamento processado pelo Mercado Pago{MODO_DEMO && ' (simulado na demonstração)'}</p>
            </Moldura>
          </motion.div>
        )}
      </AnimatePresence>
    </PaginaInterna>
  )
}

function Resumo({ servico, horario, onTrocar, onTrocarHorario }) {
  return (
    <div className="resumo">
      <CartaCigana n={servico.carta} className="resumo-carta" />
      <div className="resumo-info">
        <span className="rotulo">Sua escolha</span>
        <h3>{servico.nome}</h3>
        <p>
          {servico.modo === 'ao-vivo' ? `Ao vivo · ${servico.duracao}` : 'À distância · entregue 24h após o pagamento'} · <strong>{reais(servico.preco)}</strong>
        </p>
        {horario && <p className="resumo-horario">📅 {formatarDataHora(horario)}</p>}
      </div>
      <div className="resumo-acoes">
        <button className="link-sutil" onClick={onTrocar}>trocar consulta</button>
        {onTrocarHorario && <button className="link-sutil" onClick={onTrocarHorario}>trocar horário</button>}
      </div>
    </div>
  )
}