import { FOTO_PERFIL_MAX_CHARS } from './social.js'

const TAMANHO_MAXIMO_ARQUIVO = 15 * 1024 * 1024

async function abrirImagem(file) {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }) } catch { /* Cai no carregamento clássico abaixo. */ }
  }
  const url = URL.createObjectURL(file)
  try {
    return await new Promise((resolve, reject) => {
      const imagem = new Image()
      imagem.onload = () => resolve(imagem)
      imagem.onerror = () => reject(new Error('imagem inválida'))
      imagem.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Reduz a foto escolhida a um quadrado pequeno e devolve um data URL.
 * A foto fica no próprio documento do perfil, então precisa ser leve.
 */
export async function prepararFotoPerfil(file, lado = 160) {
  if (!file || !String(file.type || '').startsWith('image/')) throw new Error('Escolha um arquivo de imagem.')
  if (file.size > TAMANHO_MAXIMO_ARQUIVO) throw new Error('A imagem é grande demais. Escolha uma foto de até 15 MB.')

  let imagem
  try { imagem = await abrirImagem(file) }
  catch { throw new Error('Não foi possível abrir essa imagem. Tente outra foto.') }

  const largura = imagem.width || imagem.naturalWidth
  const altura = imagem.height || imagem.naturalHeight
  if (!largura || !altura) throw new Error('Não foi possível abrir essa imagem. Tente outra foto.')
  const corte = Math.min(largura, altura)

  const canvas = document.createElement('canvas')
  canvas.width = lado
  canvas.height = lado
  const contexto = canvas.getContext('2d')
  contexto.imageSmoothingQuality = 'high'
  contexto.drawImage(imagem, (largura - corte) / 2, (altura - corte) / 2, corte, corte, 0, 0, lado, lado)
  imagem.close?.()

  for (const qualidade of [0.85, 0.7, 0.55, 0.4]) {
    const dataUrl = canvas.toDataURL('image/jpeg', qualidade)
    if (dataUrl.startsWith('data:image/jpeg;base64,') && dataUrl.length <= FOTO_PERFIL_MAX_CHARS) return dataUrl
  }
  throw new Error('Não foi possível reduzir essa imagem. Tente outra foto.')
}
