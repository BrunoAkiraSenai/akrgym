import { iniciaisPerfil } from '../../utils/social'

export default function Avatar({ nome, foto, grande = false }) {
  return (
    <span className={`social-avatar${grande ? ' social-avatar-lg' : ''}`} aria-hidden="true">
      {foto ? <img src={foto} alt="" width={grande ? 72 : 40} height={grande ? 72 : 40} /> : iniciaisPerfil(nome)}
    </span>
  )
}
