import { Link } from 'react-router-dom'
import { IconeChave } from './Basicos'
import { PaginaInterna, Moldura } from './Interno'

export default function EmBreve() {
  return (
    <PaginaInterna largura={560}>
      <Moldura className="em-breve-caixa">
        <IconeChave tamanho={28} style={{ color: 'var(--latao-claro)' }} />
        <span className="rotulo">Página não encontrada</span>
        <h1 className="titulo">Esta porta <em>não existe</em></h1>
        <Link to="/" className="botao botao-vazado">Voltar ao início</Link>
      </Moldura>
    </PaginaInterna>
  )
}