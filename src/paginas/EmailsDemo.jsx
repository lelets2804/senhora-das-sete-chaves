import { useEffect, useState } from 'react'
import api, { MODO_DEMO } from '../lib/api'
import { PaginaInterna } from '../components/Interno'
import { formatarDataHora } from '../lib/horarios'

/* Só no modo demonstração: mostra os e-mails que o site real enviaria */
export default function EmailsDemo() {
  const [emails, setEmails] = useState([])
  const [sel, setSel] = useState(null)
  useEffect(() => { if (MODO_DEMO) api.emailsEnviados().then((l) => { setEmails(l); setSel(l[0] || null) }) }, [])
  if (!MODO_DEMO) return <PaginaInterna><p className="vazio">Disponível só no modo demonstração.</p></PaginaInterna>
  return (
    <PaginaInterna largura={1300}>
      <div className="secao-cabeca compacta">
        <span className="rotulo">Modo demonstração</span>
        <h1 className="titulo">E-mails <em>automáticos</em></h1>
        <p className="texto-suave">Na versão real, estes e-mails chegam de verdade na caixa de entrada.</p>
      </div>
      {emails.length === 0 ? <p className="vazio">Nenhum e-mail ainda. Faça um agendamento de teste para ver.</p> : (
        <div className="caixa-emails">
          <ul className="caixa-lista">
            {emails.map((e) => (
              <li key={e.id}>
                <button className={sel?.id === e.id ? 'ativo' : ''} onClick={() => setSel(e)}>
                  <strong>{e.assunto}</strong>
                  <span>para {e.para}</span>
                  <small>{e.agendadoPara ? `⏰ será enviado em ${formatarDataHora(e.agendadoPara)}` : `enviado ${formatarDataHora(e.em)}`}</small>
                </button>
              </li>
            ))}
          </ul>
          {sel && <iframe className="caixa-previa" title="Prévia do e-mail" srcDoc={sel.html} sandbox="allow-popups" />}
        </div>
      )}
    </PaginaInterna>
  )
}
