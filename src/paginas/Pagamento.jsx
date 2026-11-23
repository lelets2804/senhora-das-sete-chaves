import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../lib/api'
import { PaginaInterna, Moldura } from '../components/Interno'
import { IconeChave, CartaCigana } from '../components/Basicos'
import { formatarDataHora, reais, liberacaoDaLeitura } from '../lib/horarios'

/* Só no modo demonstração: imita a tela do Mercado Pago */
export function PagamentoDemo() {
  const [params] = useSearchParams()
  const nav = useNavigate()
  const ref = params.get('ref')
  const [ag, setAg] = useState(null)
  const [processando, setProcessando] = useState(false)
  useEffect(() => { api.obterAgendamento(ref).then(setAg).catch(() => {}) }, [ref])
  async function concluir(aprovado) {
    setProcessando(true)
    await api.simularPagamento(ref, aprovado)
    nav(`/pagamento/retorno?external_reference=${ref}&status=${aprovado ? 'approved' : 'rejected'}`)
  }
  return (
    <div className="mp-demo">
      <div className="mp-caixa">
        <div className="mp-topo">mercado pago <small>· simulação</small></div>
        {ag && <p className="mp-valor">{ag.servico?.nome}<strong>{reais(ag.valor)}</strong></p>}
        <div className="mp-qr" aria-hidden>{Array.from({ length: 121 }, (_, i) => <span key={i} style={{ opacity: (i * 7919) % 3 ? 1 : 0 }} />)}</div>
        <p className="mp-legenda">Na versão real o consulente paga aqui com Pix ou cartão.</p>
        <button className="mp-botao" disabled={processando} onClick={() => concluir(true)}>{processando ? 'Processando…' : 'Simular pagamento aprovado'}</button>
        <button className="mp-botao secundario" disabled={processando} onClick={() => concluir(false)}>Simular pagamento recusado</button>
      </div>
    </div>
  )
}

/* Volta do Mercado Pago */
export function RetornoPagamento() {
  const [params] = useSearchParams()
  const ref = params.get('external_reference')
  const statusMp = params.get('status') || params.get('collection_status')
  const [ag, setAg] = useState(null)
  const [tentativas, setTentativas] = useState(0)

  // o aviso do Mercado Pago pode chegar alguns segundos depois: consulta algumas vezes
  useEffect(() => {
    if (!ref) return
    let parar = false
    const buscar = async (n) => {
      const a = await api.obterAgendamento(ref).catch(() => null)
      if (parar) return
      setAg(a); setTentativas(n)
      if (a?.status === 'aguardando_pagamento' && statusMp !== 'rejected' && n < 12) setTimeout(() => buscar(n + 1), 2500)
    }
    buscar(1)
    return () => { parar = true }
  }, [ref, statusMp])

  const confirmado = ag && ['confirmado', 'concluido'].includes(ag.status)
  const recusado = statusMp === 'rejected' || statusMp === 'null'
  const aguardando = !confirmado && !recusado

  return (
    <PaginaInterna largura={640} className="retorno">
      <Moldura className="retorno-caixa">
        {confirmado ? (
          <>
            <motion.div className="retorno-chave" initial={{ rotate: 0 }} animate={{ rotate: 90 }} transition={{ delay: 0.4, duration: 1, ease: 'easeInOut' }}>
              <IconeChave tamanho={30} />
            </motion.div>
            <div className="retorno-cartas">
              {[33, 31, 16].map((n, i) => (
                <motion.div key={n} initial={{ y: 80, opacity: 0, rotate: 0 }} animate={{ y: 0, opacity: 1, rotate: (i - 1) * 12 }} transition={{ delay: 0.9 + i * 0.15, type: 'spring' }}>
                  <CartaCigana n={n} />
                </motion.div>
              ))}
            </div>
            <span className="rotulo">Pagamento aprovado</span>
            <h1 className="titulo">A porta <em>se abriu</em></h1>
            <p className="texto-suave">
              {ag.servico?.modo === 'ao-vivo'
                ? <>Sua consulta <strong>{ag.servico?.nome}</strong> está marcada para <strong>{formatarDataHora(ag.inicio)}</strong>. No horário, entre na Sala de Consulta pela sua área.</>
                : <>
                    {ag.inicio && <>Sua tiragem <strong>{ag.servico?.nome}</strong> está marcada para <strong>{formatarDataHora(ag.inicio)}</strong>. </>}
                    A leitura fica pronta na sua área <strong>24 horas após o pagamento</strong>
                    {liberacaoDaLeitura(ag) && <>: <strong>{formatarDataHora(liberacaoDaLeitura(ag).toISOString())}</strong></>}.
                  </>}
            </p>
            <Link to={`/minha-area/consulta/${ag.id}`} className="botao">Ver minha consulta</Link>
          </>
        ) : recusado ? (
          <>
            <span className="rotulo">Pagamento não aprovado</span>
            <h1 className="titulo">A chave <em>emperrou</em></h1>
            <p className="texto-suave">O pagamento não foi concluído e nada foi cobrado. Você pode tentar de novo com outra forma de pagamento.</p>
            <Link to="/agendar" className="botao">Tentar novamente</Link>
          </>
        ) : (
          <>
            <span className="girando grande">⚷</span>
            <span className="rotulo">{aguardando && tentativas >= 12 ? 'Pagamento em análise' : 'Confirmando pagamento'}</span>
            <h1 className="titulo">Girando <em>a chave…</em></h1>
            <p className="texto-suave">
              {tentativas >= 12
                ? 'Seu pagamento ainda está sendo processado (o Pix pode levar alguns minutos). Assim que for aprovado, a consulta aparece como confirmada na sua área.'
                : 'Aguarde só um instante enquanto o Mercado Pago confirma.'}
            </p>
            <Link to="/minha-area" className="botao botao-vazado">Ir para minha área</Link>
          </>
        )}
      </Moldura>
    </PaginaInterna>
  )
}