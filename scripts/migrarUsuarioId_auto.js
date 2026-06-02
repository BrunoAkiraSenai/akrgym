import admin from 'firebase-admin'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { resolve } from 'path'

console.log('🔍 Diretório atual:', process.cwd())
console.log('🔍 Arquivos .json:', readdirSync(process.cwd()).filter(f => f.endsWith('.json')))

let serviceAccountPath
for (const p of ['./serviceAccountKey.json', resolve(process.cwd(), 'serviceAccountKey.json'), '/home/akira/projetos/AkrGym/serviceAccountKey.json', 'serviceAccountKey.json']) {
  if (existsSync(p)) { serviceAccountPath = p; break }
}
if (!serviceAccountPath) { console.error('❌ serviceAccountKey.json não encontrado.'); process.exit(1) }
console.log('✅ serviceAccountKey.json encontrado em:', serviceAccountPath)

const sa = JSON.parse(readFileSync(serviceAccountPath, 'utf8'))
admin.initializeApp({ credential: admin.credential.cert(sa) })
const db = admin.firestore()
const COLECOES = ['historico_treinos', 'diario_dieta', 'historico_corporal']

async function run() {
  console.log('\n' + '='.repeat(60))
  console.log('MIGRAÇÃO AUTOMÁTICA DE usuarioId')
  console.log('='.repeat(60) + '\n')

  const usersSnap = await db.collection('users').listDocuments()
  const uids = usersSnap.map(ref => ref.id)
  console.log(`👥 Usuários: ${uids.length}\n`)

  // FASE 1 — Backup
  console.log('📦 FASE 1: Backup')
  for (const uid of uids) {
    const ref = db.collection('backup_migracao').doc(uid)
    const backup = { usuarioId: uid, timestamp: admin.firestore.FieldValue.serverTimestamp(), colecoes: {} }
    for (const col of COLECOES) {
      const snap = await db.collection(`users/${uid}/${col}`).get()
      backup.colecoes[col] = snap.docs.map(d => ({ id: d.id, data: d.data() }))
    }
    const configSnap = await db.doc(`users/${uid}/config/data`).get()
    if (configSnap.exists) backup.colecoes.config = [{ id: 'data', data: configSnap.data() }]
    await ref.set(backup)
    console.log(`   ✅ Backup de ${uid} — ${Object.keys(backup.colecoes).length} coleções`)
  }
  console.log('   ✅ Backup concluído em backup_migracao/data\n')

  // FASE 2 — Migração
  console.log('✏️  FASE 2: Preenchendo usuarioId')
  let totalMigrados = 0
  let totalPulados = 0

  for (const uid of uids) {
    for (const col of COLECOES) {
      const snap = await db.collection(`users/${uid}/${col}`).get()
      const batch = db.batch()
      let count = 0

      for (const doc of snap.docs) {
        const data = doc.data()
        if (data.usuarioId === undefined || data.usuarioId === null || data.usuarioId === '') {
          batch.update(doc.ref, { usuarioId: uid })
          totalMigrados++
          count++
          if (count >= 400) {
            await batch.commit()
            console.log(`   🔄 Lote de 400 — ${totalMigrados} migrados até agora`)
            count = 0
          }
        } else {
          totalPulados++
        }
      }
      if (count > 0) {
        await batch.commit()
        console.log(`   ✅ users/${uid}/${col}: ${count} atualizados`)
      } else {
        console.log(`   ⏭️  users/${uid}/${col}: todos já têm usuarioId`)
      }
    }
  }

  console.log(`\n📊 Resultado:`)
  console.log(`   ✅ Migrados: ${totalMigrados}`)
  console.log(`   ⏭️  Já existiam: ${totalPulados}`)
  console.log('\n✅ Concluído!')
  process.exit(0)
}

run().catch(err => { console.error('❌ Erro:', err); process.exit(1) })
