import { useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, Float, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { texturaCarta, texturaVerso } from './texturaCarta'

const latao = new THREE.MeshStandardMaterial({ color: '#c9a063', metalness: 1, roughness: 0.28 })
const lataoEscuro = new THREE.MeshStandardMaterial({ color: '#8a6a3a', metalness: 1, roughness: 0.45 })

// Chave antiga modelada com formas simples
function Chave(props) {
  const dentes = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(0, 0); s.lineTo(0.62, 0); s.lineTo(0.62, -0.18); s.lineTo(0.48, -0.18); s.lineTo(0.48, -0.32)
    s.lineTo(0.3, -0.32); s.lineTo(0.3, -0.2); s.lineTo(0.18, -0.2); s.lineTo(0.18, -0.4); s.lineTo(0, -0.4); s.lineTo(0, 0)
    return new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2 })
  }, [])
  return (
    <group {...props}>
      {/* argola */}
      <mesh material={latao} position={[0, 1.35, 0]}><torusGeometry args={[0.55, 0.085, 24, 80]} /></mesh>
      <mesh material={lataoEscuro} position={[0, 1.35, 0]}><torusGeometry args={[0.4, 0.03, 12, 60]} /></mesh>
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4
        return (
          <mesh key={i} material={latao} position={[Math.cos(a) * 0.2, 1.35 + Math.sin(a) * 0.2, 0]}>
            <torusGeometry args={[0.14, 0.025, 12, 40]} />
          </mesh>
        )
      })}
      <mesh material={latao} position={[0, 1.35, 0]}><sphereGeometry args={[0.07, 24, 24]} /></mesh>
      {/* pescoço */}
      <mesh material={latao} position={[0, 0.78, 0]}><cylinderGeometry args={[0.15, 0.11, 0.08, 32]} /></mesh>
      <mesh material={lataoEscuro} position={[0, 0.68, 0]}><torusGeometry args={[0.11, 0.035, 12, 32]} /></mesh>
      <mesh material={latao} position={[0, 0.58, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.13, 0.03, 12, 32]} /></mesh>
      {/* haste */}
      <mesh material={latao} position={[0, -0.4, 0]}><cylinderGeometry args={[0.075, 0.075, 2.0, 32]} /></mesh>
      <mesh material={lataoEscuro} position={[0, -0.1, 0]}><torusGeometry args={[0.085, 0.022, 12, 32]} /></mesh>
      {/* dentes */}
      <mesh geometry={dentes} material={latao} position={[0.04, -0.98, -0.04]} />
      <mesh material={latao} position={[0, -1.42, 0]}><sphereGeometry args={[0.085, 24, 24]} /></mesh>
    </group>
  )
}

function CartaOrbitando({ n, indice, total }) {
  const ref = useRef()
  const [frente, verso] = useMemo(() => [texturaCarta(n), texturaVerso()], [n])
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 0.18 + (indice / total) * Math.PI * 2
    const r = 2.9
    ref.current.position.set(Math.cos(t) * r, Math.sin(t * 2 + indice) * 0.25, Math.sin(t) * r)
    ref.current.rotation.y = -t + Math.PI / 2
    ref.current.rotation.z = Math.sin(t + indice) * 0.08
  })
  return (
    <group ref={ref}>
      <mesh>
        <planeGeometry args={[0.8, 1.2]} />
        <meshStandardMaterial map={frente} roughness={0.8} side={THREE.FrontSide} />
      </mesh>
      <mesh rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[0.8, 1.2]} />
        <meshStandardMaterial map={verso} roughness={0.6} metalness={0.2} />
      </mesh>
    </group>
  )
}

function Conjunto({ progresso }) {
  const grupo = useRef()
  const chave = useRef()
  const largura = useThree((s) => s.viewport.width)
  const base = Math.min(1, Math.max(0.68, largura / 7.5))
  useFrame((state, delta) => {
    const p = progresso.current
    const { x, y } = state.pointer
    grupo.current.rotation.y = THREE.MathUtils.damp(grupo.current.rotation.y, x * 0.35, 3, delta)
    grupo.current.rotation.x = THREE.MathUtils.damp(grupo.current.rotation.x, -y * 0.2 + p * 0.5, 3, delta)
    grupo.current.position.y = THREE.MathUtils.damp(grupo.current.position.y, p * 2.2, 4, delta)
    chave.current.rotation.y += delta * (0.35 + p * 4)
    const s = base * (1 + p * 0.6)
    grupo.current.scale.setScalar(THREE.MathUtils.damp(grupo.current.scale.x, s, 4, delta))
  })
  const setes = [33, 29, 32, 16, 24, 31, 4]
  return (
    <group ref={grupo}>
      <Float speed={1.6} rotationIntensity={0.25} floatIntensity={0.6}>
        <group ref={chave} rotation={[0, 0, -0.18]} scale={1.15}><Chave /></group>
      </Float>
      <group rotation={[0.28, 0, 0.1]}>
        {setes.map((n, i) => <CartaOrbitando key={n} n={n} indice={i} total={setes.length} />)}
      </group>
    </group>
  )
}

export default function Cena3D({ progresso }) {
  return (
    <Canvas camera={{ position: [0, 0.1, 7.8], fov: 40 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.25} />
      <spotLight position={[4, 6, 5]} angle={0.5} penumbra={1} intensity={60} color="#ffe2b0" />
      <pointLight position={[-4, -2, 2]} intensity={12} color="#a23a4c" />
      <Conjunto progresso={progresso} />
      <Sparkles count={120} scale={[10, 7, 6]} size={2.2} speed={0.35} color="#e0c48d" opacity={0.7} />
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={3} color="#ffe6bf" position={[0, 5, -6]} scale={[10, 3, 1]} />
        <Lightformer form="rect" intensity={2} color="#ffd9a0" position={[-6, 1, 0]} rotation-y={Math.PI / 2} scale={[8, 2, 1]} />
        <Lightformer form="ring" intensity={2.5} color="#ffffff" position={[5, 2, 3]} scale={2} />
        <Lightformer form="rect" intensity={0.8} color="#7a2232" position={[0, -4, 3]} rotation-x={-Math.PI / 2} scale={[10, 10, 1]} />
      </Environment>
    </Canvas>
  )
}