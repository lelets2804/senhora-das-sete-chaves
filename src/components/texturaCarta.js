import * as THREE from 'three'
import { carta, USAR_IMAGENS, caminhoImagem } from '../data/cartas'

// Desenha uma carta provisória (estilo Lenormand antigo) num canvas para usar no 3D.
export function desenharCarta(n, largura = 512) {
  const c = carta(n)
  const altura = Math.round(largura * 1.5)
  const cv = document.createElement('canvas')
  cv.width = largura; cv.height = altura
  const g = cv.getContext('2d')
  const u = largura / 100

  // papel envelhecido
  const fundo = g.createRadialGradient(largura / 2, altura / 2, 10, largura / 2, altura / 2, altura * 0.7)
  fundo.addColorStop(0, '#f1e7d1'); fundo.addColorStop(1, '#c9b48c')
  g.fillStyle = fundo; g.fillRect(0, 0, largura, altura)
  for (let i = 0; i < 2200; i++) {
    g.fillStyle = `rgba(90,60,30,${Math.random() * 0.06})`
    g.fillRect(Math.random() * largura, Math.random() * altura, 1.5, 1.5)
  }
  // molduras
  g.strokeStyle = '#6f5631'; g.lineWidth = u * 1.2
  g.strokeRect(u * 4, u * 4, largura - u * 8, altura - u * 8)
  g.lineWidth = u * 0.4
  g.strokeRect(u * 6.5, u * 6.5, largura - u * 13, altura - u * 13)

  g.textAlign = 'center'; g.textBaseline = 'middle'
  // número
  g.fillStyle = '#7a2232'; g.font = `${u * 11}px "IM Fell English", serif`
  g.fillText(String(c.n), largura / 2, u * 16)
  // naipe (canto, como nos baralhos do séc. XIX)
  g.fillStyle = '#fbf6ea'; g.strokeStyle = '#6f5631'; g.lineWidth = u * 0.5
  g.fillRect(u * 10, u * 10, u * 18, u * 24); g.strokeRect(u * 10, u * 10, u * 18, u * 24)
  const vermelho = /[♥♦]/.test(c.naipe)
  g.fillStyle = vermelho ? '#9b1f2e' : '#1c2820'
  g.font = `${u * 8}px Georgia, serif`
  g.fillText(c.naipe.slice(0, -1), u * 19, u * 17)
  g.fillText(c.naipe.slice(-1), u * 19, u * 27)
  // medalhão central
  g.beginPath(); g.ellipse(largura / 2, altura * 0.5, u * 30, u * 38, 0, 0, Math.PI * 2)
  g.fillStyle = 'rgba(122,34,50,.08)'; g.fill()
  g.strokeStyle = '#6f5631'; g.lineWidth = u * 0.6; g.stroke()
  g.fillStyle = '#3b2b16'; g.font = `${u * 34}px "Segoe UI Symbol", "Noto Sans Symbols", serif`
  g.fillText(c.simbolo, largura / 2, altura * 0.5)
  // nome
  g.fillStyle = '#2a1f10'; g.font = `${u * 8}px "IM Fell English SC", serif`
  g.fillText(c.nome.toUpperCase(), largura / 2, altura - u * 16)
  return cv
}

export function versoCarta(largura = 512) {
  const altura = Math.round(largura * 1.5)
  const cv = document.createElement('canvas')
  cv.width = largura; cv.height = altura
  const g = cv.getContext('2d')
  const u = largura / 100
  g.fillStyle = '#1c2820'; g.fillRect(0, 0, largura, altura)
  g.strokeStyle = '#b08d57'; g.lineWidth = u * 1
  g.strokeRect(u * 4, u * 4, largura - u * 8, altura - u * 8)
  g.globalAlpha = 0.35; g.lineWidth = u * 0.3
  for (let i = -altura; i < altura * 2; i += u * 5) {
    g.beginPath(); g.moveTo(0, i); g.lineTo(largura, i + largura); g.stroke()
    g.beginPath(); g.moveTo(0, i); g.lineTo(largura, i - largura); g.stroke()
  }
  g.globalAlpha = 1
  g.fillStyle = '#1c2820'
  g.beginPath(); g.arc(largura / 2, altura / 2, u * 20, 0, Math.PI * 2); g.fill()
  g.strokeStyle = '#e0c48d'; g.lineWidth = u * 0.8; g.stroke()
  g.fillStyle = '#e0c48d'; g.textAlign = 'center'; g.textBaseline = 'middle'
  g.font = `${u * 22}px "IM Fell English", serif`; g.fillText('VII', largura / 2, altura / 2 + u)
  return cv
}

const cache = new Map()
export function texturaCarta(n) {
  if (cache.has(n)) return cache.get(n)
  let tex
  if (USAR_IMAGENS) {
    tex = new THREE.TextureLoader().load(caminhoImagem(n))
  } else {
    tex = new THREE.CanvasTexture(desenharCarta(n))
  }
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  cache.set(n, tex)
  return tex
}
let verso
export function texturaVerso() {
  if (!verso) { verso = new THREE.CanvasTexture(versoCarta()); verso.colorSpace = THREE.SRGBColorSpace }
  return verso
}