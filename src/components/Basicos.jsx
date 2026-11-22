import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion'
import { carta as dadosCarta, USAR_IMAGENS, caminhoImagem } from '../data/cartas'
import { desenharCarta } from './texturaCarta'

/* Ícone de chave em SVG */
export function IconeChave({ tamanho = 28, ...p }) {
  return (
    <svg width={tamanho} height={tamanho * 2} viewBox="0 0 20 40" fill="none" stroke="currentColor" strokeWidth="1.4" {...p}>
      <circle cx="10" cy="8" r="6" /><circle cx="10" cy="8" r="2.2" />
      <path d="M10 14v23M10 29h5v3M10 34h4" />
    </svg>
  )
}

/* Carta cigana em HTML (imagem real ou provisória desenhada) */
const urls = new Map()
export function CartaCigana({ n, className = '', style }) {
  const c = dadosCarta(n)
  const src = useMemo(() => {
    if (USAR_IMAGENS) return caminhoImagem(n)
    if (!urls.has(n)) urls.set(n, desenharCarta(n, 360).toDataURL('image/jpeg', 0.85))
    return urls.get(n)
  }, [n])
  return <img className={`carta-cigana ${className}`} style={style} src={src} alt={`Carta ${c.n} — ${c.nome}`} draggable="false" />
}

/* Abertura: a chave gira na fechadura e as portas se abrem */
export function Abertura() {
  const [visivel, setVisivel] = useState(true)
  useEffect(() => { const t = setTimeout(() => setVisivel(false), 2600); return () => clearTimeout(t) }, [])
  return (
    <AnimatePresence>
      {visivel && (
        <motion.div className="abertura" exit={{ opacity: 0 }} transition={{ duration: 0.6, delay: 0.9 }}>
          <motion.div className="porta esquerda" exit={{ rotateY: -105 }} transition={{ duration: 1.3, ease: [0.7, 0, 0.2, 1] }} />
          <motion.div className="porta direita" exit={{ rotateY: 105 }} transition={{ duration: 1.3, ease: [0.7, 0, 0.2, 1] }} />
          <motion.div className="abertura-centro" exit={{ scale: 1.4, opacity: 0 }} transition={{ duration: 0.5 }}>
            <svg viewBox="0 0 100 160" width="90">
              <defs>
                <radialGradient id="brilho"><stop offset="0" stopColor="#ffe6b0" /><stop offset="1" stopColor="#ffe6b0" stopOpacity="0" /></radialGradient>
              </defs>
              <motion.circle cx="50" cy="60" r="60" fill="url(#brilho)" initial={{ opacity: 0 }} animate={{ opacity: [0, 0, 0.9] }} transition={{ duration: 2.2, times: [0, 0.7, 1] }} />
              <path d="M50 30a22 22 0 0 0-11 41L30 130h40l-9-59a22 22 0 0 0-11-41z" fill="#0a0f0c" stroke="#b08d57" strokeWidth="2" />
            </svg>
            <motion.div className="abertura-chave" initial={{ y: 60, opacity: 0, rotate: 0 }}
              animate={{ y: [60, 0, 0], opacity: [0, 1, 1], rotate: [0, 0, 90] }} transition={{ duration: 2, times: [0, 0.45, 1], ease: 'easeInOut' }}>
              <IconeChave tamanho={26} />
            </motion.div>
            <motion.p className="rotulo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>girando a chave…</motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* Cursor de latão */
export function Cursor() {
  const x = useMotionValue(-100), y = useMotionValue(-100)
  const sx = useSpring(x, { stiffness: 350, damping: 30 }), sy = useSpring(y, { stiffness: 350, damping: 30 })
  const [sobre, setSobre] = useState(false)
  const [ativo, setAtivo] = useState(false)
  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return
    setAtivo(true); document.body.classList.add('cursor-custom')
    const mover = (e) => { x.set(e.clientX); y.set(e.clientY); setSobre(!!e.target.closest('a, button, .interativo')) }
    window.addEventListener('pointermove', mover)
    return () => { window.removeEventListener('pointermove', mover); document.body.classList.remove('cursor-custom') }
  }, [x, y])
  if (!ativo) return null
  return (
    <>
      <motion.div className="cursor-anel" style={{ x: sx, y: sy }} animate={{ scale: sobre ? 2.2 : 1, opacity: sobre ? 0.9 : 0.6 }} />
      <motion.div className="cursor-ponto" style={{ x, y }} />
    </>
  )
}

/* Revelar ao rolar */
export function Revelar({ children, atraso = 0, y = 40, className, as = 'div' }) {
  const M = motion[as]
  return (
    <M className={className} initial={{ opacity: 0, y, filter: 'blur(6px)' }} whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-80px' }} transition={{ duration: 1, delay: atraso, ease: [0.2, 0.8, 0.2, 1] }}>
      {children}
    </M>
  )
}

/* Inclinação 3D seguindo o mouse */
export function Inclinar({ children, className, forca = 12 }) {
  const rx = useMotionValue(0), ry = useMotionValue(0)
  const srx = useSpring(rx, { stiffness: 200, damping: 20 }), sry = useSpring(ry, { stiffness: 200, damping: 20 })
  const gx = useMotionValue(50), gy = useMotionValue(50)
  return (
    <motion.div className={`inclinar ${className || ''}`} style={{ rotateX: srx, rotateY: sry, '--gx': gx, '--gy': gy }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height
        ry.set((px - 0.5) * forca); rx.set(-(py - 0.5) * forca)
        e.currentTarget.style.setProperty('--gx', `${px * 100}%`); e.currentTarget.style.setProperty('--gy', `${py * 100}%`)
      }}
      onPointerLeave={() => { rx.set(0); ry.set(0) }}>
      {children}
    </motion.div>
  )
}