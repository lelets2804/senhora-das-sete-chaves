import { useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import api, { MODO_DEMO, EMAIL_ADMIN_DEMO } from '../lib/api'
import { useAuth } from '../lib/auth'
import { PaginaInterna, Moldura, Erro } from '../components/Interno'

export default function Entrar() {
  const { usuario } = useAuth()
  const [params] = useSearchParams()
  const [modo, setModo] = useState(params.get('modo') === 'cadastro' ? 'cadastro' : 'entrar')
  const [f, setF] = useState({ nome: '', email: '', telefone: '', senha: '' })
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [enviando, setEnviando] = useState(false)
  const voltar = params.get('voltar')

  if (usuario) return <Navigate to={voltar || (usuario.papel === 'admin' ? '/painel' : '/minha-area')} replace />

  const campo = (k) => ({ value: f[k], onChange: (e) => setF({ ...f, [k]: e.target.value }) })
  async function enviar(e) {
    e.preventDefault(); setErro(''); setAviso(''); setEnviando(true)
    try {
      if (modo === 'entrar') await api.entrar(f.email, f.senha)
      else if (modo === 'cadastro') {
        if (f.senha.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.')
        const r = await api.cadastrar(f)
        if (r?.precisaConfirmar) setAviso('Quase lá! Enviamos um link para o seu e-mail. Clique nele para ativar a conta.')
      } else {
        await api.recuperarSenha(f.email)
        setAviso('Se houver uma conta com esse e-mail, você vai receber um link para criar uma nova senha.')
      }
    } catch (err) { setErro(err.message) } finally { setEnviando(false) }
  }

  const titulos = { entrar: ['Bem-vindo de volta', 'Entrar'], cadastro: ['Primeira vez aqui', 'Criar conta'], recuperar: ['Esqueceu a senha?', 'Enviar link'] }
  return (
    <PaginaInterna largura={520} className="entrar">
      <Moldura>
        <div className="entrar-topo">
          <motion.img key={modo} className="entrar-logo" src="/logo.jpg" alt="" initial={{ rotate: -25, scale: 0.85, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }} />
          <span className="rotulo">Área do consulente</span>
          <h1 className="titulo">{titulos[modo][0]}</h1>
        </div>
        {voltar?.startsWith('/agendar') && <p className="aviso-agendar">Para agendar sua consulta, entre na sua conta ou crie uma. É rapidinho. ✦</p>}
        <form onSubmit={enviar} className="formulario">
          <AnimatePresence initial={false}>
            {modo === 'cadastro' && (
              <motion.div key="extra" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="campos-extra">
                <label>Seu nome<input required {...campo('nome')} autoComplete="name" /></label>
                <label>WhatsApp / telefone <small>(opcional)</small><input {...campo('telefone')} autoComplete="tel" inputMode="tel" /></label>
              </motion.div>
            )}
          </AnimatePresence>
          <label>E-mail<input type="email" required {...campo('email')} autoComplete="email" /></label>
          {modo !== 'recuperar' && <label>Senha<input type="password" required {...campo('senha')} autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'} /></label>}
          <Erro>{erro}</Erro>
          {aviso && <p className="sucesso">{aviso}</p>}
          <button className="botao botao-largo" disabled={enviando}>{enviando ? 'Aguarde…' : titulos[modo][1]}</button>
        </form>
        <div className="entrar-trocas">
          {modo !== 'entrar' && <button onClick={() => setModo('entrar')}>Já tenho conta</button>}
          {modo !== 'cadastro' && <button onClick={() => setModo('cadastro')}>Criar uma conta</button>}
          {modo === 'entrar' && <button onClick={() => setModo('recuperar')}>Esqueci a senha</button>}
        </div>
        {MODO_DEMO && (
          <div className="dica-demo">
            <strong>Modo demonstração.</strong> Crie uma conta qualquer para ver como o consulente usa o site.
            Para ver o painel da cartomante: <code>{EMAIL_ADMIN_DEMO}</code> · senha <code>demo</code>
          </div>
        )}
      </Moldura>
    </PaginaInterna>
  )
}