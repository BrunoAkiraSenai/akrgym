import admin from 'firebase-admin'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { resolve } from 'path'
import { createInterface } from 'readline'

const rl = createInterface({ input: process.stdin, output: process.stdout })

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

function perguntar(texto) {
  return new Promise(resolve => rl.question(texto, resolve))
}

async function migrar() {
  console.log('\n' + '='.repeat(60))
  console.log('MIGRAÇÃO DE usuarioId NO FIRESTORE')
  console.log('='.repeat(60) + '\n')

  const usersSnap = await db.collection('users').listDocuments()
  const uids = usersSnap.map(ref => ref.id)
  console.log(`👥 Usuários: ${uids.length}`)

  // FASE 1 — Backup
  console.log('\n📦 FASE 1: Backup')
  const resp1 = await perguntar('Criar backup na coleção backup_migracao/data? (s/N) ')
  if (resp1.toLowerCase() === 's') {
    for (const uid of uids) {
      const ref = db.collection('backup_migracao').doc(uid)
      const backup = { usuarioId: uid, timestamp: admin.firestore.FieldValue.serverTimestamp(), colecoes: {} }

      for (const colecao of COLECOES) {
        const snap = await db.collection(`users/${uid}/${colecao}`).get()
        backup.colecoes[colecao] = snap.docs.map(d => ({ id: d.id, data: d.data() }))
      }

      const configSnap = await db.doc(`users/${uid}/config/data`).get()
      if (configSnap.exists) {
        backup.colecoes.config = [{ id: 'data', data: configSnap.data() }]
      }

      await ref.set(backup)
      console.log(`   ✅ Backup de ${uid} salvo (${Object.keys(backup.colecoes).length} coleções)`)
    }
    console.log('   ✅ Backup concluído em backup_migracao/data')
  } else {
    console.log('   ⏭️  Backup pulado')
  }

  // FASE 2 — Migração
  console.log('\n✏️  FASE 2: Migração')
  const resp2 = await perguntar('Preencher usuarioId nos documentos que não possuem? (s/N) ')
  if (resp2.toLowerCase() === 's') {
    let totalMigrados = 0
    let totalPulados = 0

    for (const uid of uids) {
      for (const colecao of COLECOES) {
        const snap = await db.collection(`users/${uid}/${colecao}`).get()
        const batch = db.batch()
        let countBatch = 0

        for (const doc of snap.docs) {
          const data = doc.data()
          if (data.usuarioId === undefined || data.usuarioId === null || data.usuarioId === '') {
            batch.update(doc.ref, { usuarioId: uid })
            totalMigrados++
            countBatch++

            if (countBatch >= 400) {
              await batch.commit()
              countBatch = 0
              console.log(`   🔄 Lote de 400 commitado (${totalMigrados} até agora)`)
            }
          } else {
            totalPulados++
          }
        }

        if (countBatch > 0) {
          await batch.commit()
          console.log(`   ✅ users/${uid}/${colecao}: ${countBatch} documentos atualizados`)
        } else {
          console.log(`   ⏭️  users/${uid}/${colecao}: todos já têm usuarioId`)
        }
      }
    }

    console.log(`\n📊 Resultado:`)
    console.log(`   ✅ Migrados: ${totalMigrados}`)
    console.log(`   ⏭️  Já existiam: ${totalPulados}`)
  } else {
    console.log('   ⏭️  Migração pulada')
  }

  console.log('\n✅ Concluído!')
  rl.close()
  process.exit(0)
}

migrar().catch(err => {
  console.error('❌ Erro:', err)
  process.exit(1)
})
