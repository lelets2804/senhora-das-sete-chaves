import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import { consultas as consultasPadrao, depoimentos } from '../data/consultas'
import api from '../lib/api'
import { useAuth } from '../lib/auth'
import { faseDaLua, conselhos } from './lua'
import { CartaCigana, IconeChave, Revelar, Inclinar } from './Basicos'

const Cena3D = lazy(() => import('./Cena3D'))
const Lua3D = lazy(() => import('./Lua3D'))

const SECOES = [
  ['inicio', 'Início'], ['senhora', 'A Senhora'], ['consultas', 'Consultas'], ['como', 'Como funciona'],
  ['depoimentos', 'Depoimentos'], ['lua', 'A Lua'], ['agendar', 'Agendar'],
]
const ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']

/* Navegação lateral: as 7 chaves */
function NavChaves() {
  const [ativa, setAtiva] = useState('inicio')
  useEffect(() => {
    const obs = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setAtiva(e.target.id)), { rootMargin: '-45% 0px -45% 0px' })
    SECOES.forEach(([id]) => { const el = document.getElementById(id); el && obs.observe(el) })
    return () => obs.disconnect()
  }, [])
  return (
    <nav className="nav-chaves" aria-label="Seções">
      {SECOES.map(([id, nome], i) => (
        <a key={id} href={`#${id}`} className={ativa === id ? 'ativa' : ''}>
          <span className="nav-nome">{nome}</span>
          <span className="nav-num">{ROMANOS[i]}</span>
          <IconeChave tamanho={12} />
        </a>
      ))}
    </nav>
  )
}

function Cabecalho() {
  const { usuario } = useAuth()
  const { scrollY } = useScroll()
  const fundo = useTransform(scrollY, [0, 200], ['rgba(13,19,15,0)', 'rgba(13,19,15,.85)'])
  return (
    <motion.header className="cabecalho" style={{ backgroundColor: fundo }}>
      <a href="#inicio" className="marca">
        <img className="marca-logo" src="/logo.jpg" alt="" />
        <span>Senhora <em>das</em> 7 Chaves</span>
      </a>
      <div className="cabecalho-acoes">
        {usuario?.papel === 'admin' && <Link to="/painel" className="link-sutil">Painel</Link>}
        <Link to={usuario ? '/minha-area' : '/entrar'} className="link-sutil">{usuario ? 'Minha área' : 'Área do consulente'}</Link>
        <Link to="/agendar" className="botao botao-pequeno">Agendar</Link>
      </div>
    </motion.header>
  )
}

function Titulo({ texto, atraso = 0 }) {
  return (
    <span className="titulo-letras" aria-label={texto}>
      {texto.split('').map((l, i) => (
        <motion.span key={i} aria-hidden initial={{ opacity: 0, y: 40, rotateX: -90 }} animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ delay: atraso + i * 0.045, duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}>
          {l === ' ' ? '\u00a0' : l}
        </motion.span>
      ))}
    </span>
  )
}

/* I — Hero com chave 3D */
function Inicio() {
  const ref = useRef()
  const progresso = useRef(0)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  useEffect(() => scrollYProgress.on('change', (v) => { progresso.current = v }), [scrollYProgress])
  const opac = useTransform(scrollYProgress, [0, 0.6], [1, 0])
  const sobe = useTransform(scrollYProgress, [0, 1], [0, -160])
  return (
    <section id="inicio" ref={ref} className="inicio">
      <div className="inicio-3d"><Suspense fallback={null}><Cena3D progresso={progresso} /></Suspense></div>
      <motion.div className="inicio-texto" style={{ opacity: opac, y: sobe }}>
        <motion.span className="rotulo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.6 }}>
          Cartomancia · Baralho Cigano
        </motion.span>
        <h1 className="titulo inicio-titulo">
          <Titulo texto="Senhora" atraso={2.7} />
          <span className="inicio-das"><Titulo texto="das 7 Chaves" atraso={3.1} /></span>
        </h1>
        <motion.p className="inicio-sub" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 3.8, duration: 1 }}>
          Há portas que só se abrem com a chave certa.<br />As cartas mostram qual.
        </motion.p>
        <motion.div className="inicio-botoes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 4.2 }}>
          <Link to="/agendar" className="botao">Agendar consulta</Link>
          <a href="#senhora" className="botao botao-vazado">Conhecer</a>
        </motion.div>
      </motion.div>
      <motion.a href="#senhora" className="rolar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 4.6 }}>
        <span className="rotulo">role</span><span className="rolar-linha" />
      </motion.a>
    </section>
  )
}

/* II — Sobre a cartomante */
function Senhora() {
  const ref = useRef()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const leque = useTransform(scrollYProgress, [0.15, 0.5], [0, 1])
  const cartasLeque = [33, 29, 32, 16, 24, 31, 4]
  return (
    <section id="senhora" ref={ref} className="secao senhora">
      <div className="senhora-grade">
        <Revelar className="senhora-retrato">
          <div className="retrato-arco">
            <img className="retrato-foto" src="/senhora.jpg" alt="A Senhora das 7 Chaves" />
          </div>
          <div className="retrato-placa"><span className="rotulo">Desde 2009 · VII</span></div>
        </Revelar>
        <div className="senhora-texto">
          <Revelar><span className="rotulo">Chave II · A Senhora</span></Revelar>
          <Revelar atraso={0.1}><h2 className="titulo">Quem guarda <em>as chaves</em></h2></Revelar>
          <Revelar atraso={0.2}>
            <p className="texto-suave">
              Aprendi as cartas ciganas ainda menina, na mesa da cozinha da minha avó, entre o cheiro do café e o barulho do
              baralho sendo embaralhado. Há mais de quinze anos faço disso o meu ofício.
            </p>
          </Revelar>
          <Revelar atraso={0.3}>
            <p className="texto-suave">
              Minha leitura é direta e honesta. Não prometo milagres nem trago amores em sete dias: mostro o que as
              cartas revelam, para que você caminhe com mais clareza pelas portas que a vida apresenta.
            </p>
          </Revelar>
          <Revelar atraso={0.4}><p className="assinatura">— Senhora das 7 Chaves</p></Revelar>
          <p className="aviso-provisorio">texto provisório</p>
        </div>
      </div>
      <div className="leque">
        {cartasLeque.map((n, i) => <LequeCarta key={n} n={n} desloc={i - 3} leque={leque} />)}
      </div>
    </section>
  )
}

function LequeCarta({ n, desloc, leque }) {
  const rotate = useTransform(leque, [0, 1], [0, desloc * 11])
  const x = useTransform(leque, [0, 1], ['0vw', `${desloc * 6}vw`])
  const y = useTransform(leque, [0, 1], [0, Math.abs(desloc) * 14])
  return (
    <motion.div className="leque-carta interativo" style={{ rotate, x, y, zIndex: 10 - Math.abs(desloc) }}
      whileHover={{ y: -40, scale: 1.08, zIndex: 20, transition: { duration: 0.3 } }}>
      <CartaCigana n={n} />
    </motion.div>
  )
}

/* III — Consultas como rótulos de botica */
function Consultas() {
  const [consultas, setConsultas] = useState(consultasPadrao)
  useEffect(() => { api.listarServicos().then((l) => l?.length && setConsultas(l)).catch(() => {}) }, [])
  const formatar = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  return (
    <section id="consultas" className="secao">
      <div className="secao-cabeca">
        <Revelar><span className="rotulo">Chave III · O que eu ofereço</span></Revelar>
        <Revelar atraso={0.1}><h2 className="titulo">As <em>consultas</em></h2></Revelar>
        <div className="ornamento">✦</div>
        <p className="aviso-provisorio">consultas e preços imaginários</p>
      </div>
      <div className="consultas-grade">
        {consultas.map((c, i) => (
          <Revelar key={c.id} atraso={i * 0.12}>
            <Inclinar className={`frasco ${c.destaque ? 'destaque' : ''}`}>
              <div className="frasco-brilho" />
              {c.destaque && <span className="frasco-selo">a mais completa</span>}
              <div className="frasco-topo">
                <span className="frasco-chave">{c.chave}</span>
                <CartaCigana n={c.carta} className="frasco-carta" />
              </div>
              <div className="frasco-rotulo">
                <h3>{c.nome}</h3>
                <p>{c.resumo}</p>
                <ul>{c.detalhes.map((d) => <li key={d}>{d}</li>)}</ul>
                <div className="frasco-rodape">
                  <span className="frasco-modo">{c.modo === 'ao-vivo' ? '◉ Ao vivo' : '✉ À distância'}</span>
                  <span className="frasco-preco">{formatar(Number(c.preco))}</span>
                </div>
                <Link to={`/agendar?consulta=${c.id}`} className="botao botao-vazado botao-largo">Escolher</Link>
              </div>
            </Inclinar>
          </Revelar>
        ))}
      </div>
    </section>
  )
}

/* IV — Como funciona: portas se abrindo */
function Como() {
  const ref = useRef()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] })
  const abre = useTransform(scrollYProgress, [0.3, 1], [0, 1])
  const esq = useTransform(abre, [0, 1], [0, -110])
  const dir = useTransform(abre, [0, 1], [0, 110])
  const passos = [
    ['Escolha', 'Escolha a consulta que combina com o seu momento e crie sua conta em poucos segundos.'],
    ['Agende e pague', 'Veja os horários livres na agenda e pague com Pix ou cartão, direto no site.'],
    ['A consulta', 'Ao vivo, na Sala de Consulta do site, por chat ou vídeo. Ou à distância: ela joga e envia a foto da mesa com um áudio explicando.'],
    ['Fica guardado', 'A foto das cartas, os áudios e as anotações ficam na sua área para você rever quando quiser.'],
  ]
  return (
    <section id="como" ref={ref} className="secao como">
      <div className="secao-cabeca">
        <Revelar><span className="rotulo">Chave IV · Tudo pelo site</span></Revelar>
        <Revelar atraso={0.1}><h2 className="titulo">Como <em>funciona</em></h2></Revelar>
        <Revelar atraso={0.2}><p className="texto-suave">Sem precisar de WhatsApp: do agendamento à leitura, tudo acontece aqui.</p></Revelar>
      </div>
      <div className="portal">
        <div className="portal-interior">
          {passos.map(([t, d], i) => (
            <Revelar key={t} atraso={0.15 * i} className="passo">
              <span className="passo-num">{ROMANOS[i]}</span>
              <h3>{t}</h3>
              <p>{d}</p>
            </Revelar>
          ))}
        </div>
        <motion.div className="portal-folha esquerda" style={{ rotateY: esq }}><div className="folha-detalhe" /><span className="macaneta" /></motion.div>
        <motion.div className="portal-folha direita" style={{ rotateY: dir }}><div className="folha-detalhe" /><span className="macaneta" /></motion.div>
      </div>
    </section>
  )
}

/* V — Depoimentos como bilhetes */
function Depoimentos() {
  const [reais, setReais] = useState([])
  useEffect(() => { api.listarDepoimentos().then(setReais).catch(() => {}) }, [])
  const exemplo = reais.length === 0
  const lista = exemplo ? depoimentos : reais.map((d) => ({ nome: d.nome_exibido, cidade: d.cidade, texto: d.texto }))
  return (
    <section id="depoimentos" className="secao">
      <div className="secao-cabeca">
        <Revelar><span className="rotulo">Chave V · Quem já passou por aqui</span></Revelar>
        <Revelar atraso={0.1}><h2 className="titulo">Palavras <em>deixadas</em></h2></Revelar>
        {exemplo && <p className="aviso-provisorio">depoimentos de exemplo</p>}
      </div>
      <div className="bilhetes">
        {lista.map((d, i) => (
          <motion.figure key={`${d.nome}-${i}`} className="bilhete interativo"
            initial={{ opacity: 0, y: 80, rotate: 0 }} whileInView={{ opacity: 1, y: 0, rotate: [-4, 3, -2, 4][i % 4] }}
            viewport={{ once: true }} transition={{ delay: i * 0.12, type: 'spring', stiffness: 60 }}
            whileHover={{ rotate: 0, scale: 1.05, y: -10, zIndex: 5 }}>
            <span className="bilhete-lacre">7</span>
            <blockquote>“{d.texto}”</blockquote>
            <figcaption>{d.nome}{d.cidade && <> · <em>{d.cidade}</em></>}</figcaption>
          </motion.figure>
        ))}
      </div>
    </section>
  )
}

/* VI — A lua de hoje */
function Lua() {
  const f = faseDaLua()
  const data = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })
  return (
    <section id="lua" className="secao lua">
      <div className="lua-grade">
        <div className="lua-3d"><div className="lua-halo" /><Suspense fallback={null}><Lua3D fracao={f.fracao} /></Suspense></div>
        <div>
          <Revelar><span className="rotulo">Chave VI · O céu de hoje</span></Revelar>
          <Revelar atraso={0.1}><h2 className="titulo">{f.nome.split(' ')[0]} <em>{f.nome.split(' ').slice(1).join(' ')}</em></h2></Revelar>
          <Revelar atraso={0.2}>
            <div className="lua-dados">
              <div><span className="rotulo">Iluminada</span><strong>{Math.round(f.iluminacao * 100)}%</strong></div>
              <div><span className="rotulo">Próxima cheia</span><strong>{data(f.proximaCheia)}</strong></div>
              <div><span className="rotulo">Próxima nova</span><strong>{data(f.proximaNova)}</strong></div>
            </div>
          </Revelar>
          <Revelar atraso={0.3}><p className="texto-suave lua-conselho">{conselhos[f.grupo]}</p></Revelar>
        </div>
      </div>
    </section>
  )
}

/* VII — Agendar: a fechadura */
function Agendar() {
  return (
    <section id="agendar" className="secao agendar">
      <Revelar className="fechadura-caixa">
        <Link to="/agendar" className="fechadura interativo" aria-label="Agendar consulta">
          <span className="fechadura-luz" />
          <svg viewBox="0 0 200 300">
            <defs>
              <linearGradient id="placa" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0" stopColor="#e0c48d" /><stop offset=".5" stopColor="#9a7744" /><stop offset="1" stopColor="#5c4527" />
              </linearGradient>
            </defs>
            <rect x="10" y="10" width="180" height="280" rx="90" fill="url(#placa)" />
            <rect x="22" y="22" width="156" height="256" rx="78" fill="none" stroke="#3d2e18" strokeWidth="2" />
            {[[100, 38], [100, 262], [38, 150], [162, 150]].map(([x, y]) => <circle key={x + '' + y} cx={x} cy={y} r="5" fill="#3d2e18" />)}
            <path className="buraco" d="M100 95a30 30 0 0 0-15 56l-12 64h54l-12-64a30 30 0 0 0-15-56z" />
          </svg>
        </Link>
      </Revelar>
      <div className="agendar-texto">
        <Revelar><span className="rotulo">Chave VII · A última porta</span></Revelar>
        <Revelar atraso={0.1}><h2 className="titulo">Sua <em>consulta</em> espera</h2></Revelar>
        <Revelar atraso={0.2}><p className="texto-suave">Escolha o dia, pague com Pix ou cartão e receba tudo na sua área do consulente.</p></Revelar>
        <Revelar atraso={0.3}><Link to="/agendar" className="botao">Girar a chave · Agendar</Link></Revelar>
      </div>
    </section>
  )
}

function Rodape() {
  return (
    <footer className="rodape">
      <motion.img className="rodape-logo" src="/logo.jpg" alt="Senhora das 7 Chaves"
        initial={{ opacity: 0, scale: 0.8, rotate: -20 }} whileInView={{ opacity: 1, scale: 1, rotate: 0 }} viewport={{ once: true }}
        transition={{ duration: 1.2, ease: [0.2, 0.8, 0.2, 1] }} />
      <div className="ornamento">✦ ✦ ✦</div>
      <p className="rodape-legal">
        A cartomancia é uma prática de orientação espiritual e autoconhecimento. Não substitui acompanhamento médico,
        psicológico, jurídico ou financeiro. Atendimento apenas para maiores de 18 anos.
      </p>
      <p className="rotulo">© {new Date().getFullYear()} · Todos os direitos reservados</p>
    </footer>
  )
}

export default function Home() {
  return (
    <>
      <Cabecalho />
      <NavChaves />
      <main>
        <Inicio />
        <Senhora />
        <Consultas />
        <Como />
        <Depoimentos />
        <Lua />
        <Agendar />
      </main>
      <Rodape />
    </>
  )
}