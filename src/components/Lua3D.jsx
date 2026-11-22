import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function texturaLunar() {
  const w = 1024, h = 512
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h
  const g = cv.getContext('2d')
  g.fillStyle = '#cfc6b4'; g.fillRect(0, 0, w, h)
  // desenha repetindo nas bordas para não aparecer emenda na esfera
  const emTodaVolta = (x, fn) => { fn(x); fn(x - w); fn(x + w) }
  // "mares" escuros
  for (let i = 0; i < 22; i++) {
    const x0 = Math.random() * w, y = h * 0.2 + Math.random() * h * 0.6, r = 40 + Math.random() * 120
    emTodaVolta(x0, (x) => {
      const gr = g.createRadialGradient(x, y, 0, x, y, r)
      gr.addColorStop(0, 'rgba(110,102,90,.45)'); gr.addColorStop(1, 'rgba(110,102,90,0)')
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill()
    })
  }
  // crateras suaves
  for (let i = 0; i < 260; i++) {
    const x0 = Math.random() * w, y = h * 0.08 + Math.random() * h * 0.84, r = Math.random() ** 3 * 14 + 1.2
    emTodaVolta(x0, (x) => {
      const gr = g.createRadialGradient(x + r * 0.2, y + r * 0.2, 0, x, y, r)
      gr.addColorStop(0, 'rgba(80,74,64,.35)'); gr.addColorStop(0.8, 'rgba(80,74,64,.15)'); gr.addColorStop(1, 'rgba(240,234,220,.25)')
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill()
    })
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace
  return t
}

function Esfera({ fracao }) {
  const ref = useRef()
  const mapa = useMemo(texturaLunar, [])
  // Hemisfério sul (Brasil): a lua crescente aparece iluminada à esquerda
  const ang = fracao * Math.PI * 2
  const luz = [-Math.sin(ang) * 10, 0, -Math.cos(ang) * 10]
  useFrame((_, d) => { ref.current.rotation.y += d * 0.05 })
  return (
    <>
      <directionalLight position={luz} intensity={3.2} color="#fff4dc" />
      <mesh ref={ref}>
        <sphereGeometry args={[1.6, 96, 96]} />
        <meshStandardMaterial map={mapa} bumpMap={mapa} bumpScale={0.04} roughness={1} />
      </mesh>
    </>
  )
}

export default function Lua3D({ fracao }) {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 40 }} dpr={[1, 2]} gl={{ alpha: true }}>
      <ambientLight intensity={0.03} />
      <Esfera fracao={fracao} />
    </Canvas>
  )
}