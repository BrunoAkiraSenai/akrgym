import admin from 'firebase-admin'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { resolve } from 'path'

console.log('🔍 Diretório atual:', process.cwd())
console.log('🔍 Arquivos .json:', readdirSync(process.cwd()).filter(f => f.endsWith('.json')))

let serviceAccountPath
const possiblePaths = [
  './serviceAccountKey.json',
  resolve(process.cwd(), 'serviceAccountKey.json'),
  '/home/akira/projetos/AkrGym/serviceAccountKey.json',
  'serviceAccountKey.json',
]

for (const p of possiblePaths) {
  if (existsSync(p)) {
    serviceAccountPath = p
    break
  }
}

if (!serviceAccountPath) {
  console.error('❌ Arquivo serviceAccountKey.json não encontrado. Verifique:')
  console.error('   - Está na raiz do projeto?')
  console.error('   - O nome é exatamente "serviceAccountKey.json"?')
  console.error('   - Executando no diretório:', process.cwd())
  process.exit(1)
}

console.log('✅ serviceAccountKey.json encontrado em:', serviceAccountPath)
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'))

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

const db = admin.firestore()

const COLECOES = ['historico_treinos', 'diario_dieta', 'historico_corporal']

async function verificar() {
  console.log('\n' + '='.repeat(60))
  console.log('VERIFICAÇÃO DE usuarioId NO FIRESTORE')
  console.log('='.repeat(60) + '\n')

  const usersSnap = await db.collection('users').listDocuments()
  const uids = usersSnap.map(ref => ref.id)
  console.log(`👥 Usuários encontrados: ${uids.length}`)
  if (uids.length === 0) {
    console.log('⚠️  Nenhum usuário encontrado. Encerrando.')
    return
  }
  uids.forEach(uid => console.log(`   - ${uid}`))
  console.log('')

  let totalGeral = 0
  let totalComId = 0
  let totalSemId = 0
  const semIdLista = []

  for (const colecao of COLECOES) {
    let totalColecao = 0
    let comId = 0
    let semId = 0
    const semIdExemplos = []

    for (const uid of uids) {
      const snap = await db.collection(`users/${uid}/${colecao}`).get()

      for (const doc of snap.docs) {
        totalColecao++
        const data = doc.data()

        if (data.usuarioId !== undefined && data.usuarioId !== null && data.usuarioId !== '') {
          comId++
        } else {
          semId++
          if (semIdExemplos.length < 10) {
            semIdExemplos.push(`  users/${uid}/${colecao}/${doc.id}`)
          }
        }
      }
    }

    console.log(`📁 ${colecao}`)
    console.log(`   Total: ${totalColecao}`)
    console.log(`   ✅ Com usuarioId: ${comId}`)
    console.log(`   ❌ Sem usuarioId: ${semId}`)
    if (semIdExemplos.length > 0) {
      console.log(`   🏷️  Primeiros sem usuarioId:`)
      semIdExemplos.forEach(p => console.log(p))
    }
    console.log('')

    totalGeral += totalColecao
    totalComId += comId
    totalSemId += semId
    if (semId > 0) semIdLista.push(...semIdExemplos)
  }

  console.log('='.repeat(60))
  console.log('📊 RESUMO FINAL')
  console.log('='.repeat(60))
  console.log(`   Total de documentos: ${totalGeral}`)
  console.log(`   ✅ Com usuarioId:     ${totalComId}`)
  console.log(`   ❌ Sem usuarioId:     ${totalSemId}`)
  console.log(`   🏷️  ${semIdLista.length} caminhos listados`)

  if (totalSemId === 0) {
    console.log('\n🎉 Todos os documentos já possuem usuarioId!')
  } else {
    console.log('\n⚠️  Execute scripts/migrarUsuarioId.js para preencher os campos faltantes.')
  }

  process.exit(0)
}

verificar().catch(err => {
  console.error('❌ Erro:', err)
  process.exit(1)
})
