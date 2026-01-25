const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'file:./dev.db'
    }
  }
})

async function reseed() {
  try {
    console.log('🧹 Réinitialisation de la base de données...')

    // Supprimer dans l'ordre
    console.log('   • Suppression des ActionLogs...')
    await prisma.actionLog.deleteMany({})

    console.log('   • Suppression des ArrivalItems...')
    await prisma.arrivalItem.deleteMany({})

    console.log('   • Suppression des Arrivals...')
    await prisma.arrival.deleteMany({})

    console.log('   • Suppression des Sales...')
    await prisma.sale.deleteMany({})

    console.log('   • Suppression des Stocks...')
    await prisma.stock.deleteMany({})

    console.log('   • Suppression des Produits...')
    await prisma.product.deleteMany({})

    console.log('   • Suppression des Utilisateurs...')
    await prisma.user.deleteMany({})

    console.log('\n🌱 Création des données de seed...')

    // Créer les utilisateurs
    console.log('   • Création des utilisateurs...')
    const pw = await bcrypt.hash('admin123', 10)
    await prisma.user.create({ data: { username: 'admin', displayName: 'Administrateur', passwordHash: pw, role: 'admin', store: 'all' } })
    
    const pw2 = await bcrypt.hash('mjpass', 10)
    await prisma.user.create({ data: { username: 'manager_mj', displayName: 'Manager Majunga', passwordHash: pw2, role: 'manager', store: 'majunga' } })
    
    const pw3 = await bcrypt.hash('tmpass', 10)
    await prisma.user.create({ data: { username: 'emp_tm', displayName: 'Employé Tamatave', passwordHash: pw3, role: 'employee', store: 'tamatave' } })

    // Créer les produits avec coût et marge
    console.log('   • Création des produits...')
    const p1 = await prisma.product.create({
      data: {
        sku: 'P-001',
        name: 'Résistance 10k',
        model: 'RES-10K',
        compatibleModels: 'MB-100,MB-101',
        cost: 0.02,
        margin: 150,
        price: 0.05,
        location: 'Entrepôt A',
        category: 'Composants',
        supplier: 'Electronix'
      }
    })

    const p2 = await prisma.product.create({
      data: {
        sku: 'P-002',
        name: 'Coque iPhone 12',
        model: 'CASE-IP12',
        compatibleModels: 'iPhone12',
        cost: 2.50,
        margin: 100,
        price: 5.00,
        location: 'Entrepôt B',
        category: 'Accessoires',
        supplier: 'MobileCases'
      }
    })

    const p3 = await prisma.product.create({
      data: {
        sku: 'P-003',
        name: 'Condensateur 100uF',
        model: 'CAP-100uF',
        cost: 0.05,
        margin: 120,
        price: 0.11,
        location: 'Entrepôt A',
        category: 'Composants',
        supplier: 'Electronix'
      }
    })

    // Créer les stocks avec coût et marge
    console.log('   • Création des stocks...')
    await prisma.stock.create({ data: { productId: p1.id, store: 'majunga', qty: 80, cost: 0.02, margin: 150 } })
    await prisma.stock.create({ data: { productId: p1.id, store: 'tamatave', qty: 40, cost: 0.02, margin: 150 } })
    await prisma.stock.create({ data: { productId: p2.id, store: 'majunga', qty: 20, cost: 2.50, margin: 100 } })
    await prisma.stock.create({ data: { productId: p2.id, store: 'tamatave', qty: 25, cost: 2.50, margin: 100 } })
    await prisma.stock.create({ data: { productId: p3.id, store: 'majunga', qty: 100, cost: 0.05, margin: 120 } })
    await prisma.stock.create({ data: { productId: p3.id, store: 'tamatave', qty: 50, cost: 0.05, margin: 120 } })

    console.log('\n✅ Base de données réinitialisée et seedée avec succès!')
    console.log('\nDonnées créées:')
    console.log('   ✓ Utilisateurs: admin, manager_mj, emp_tm')
    console.log('   ✓ Produits: P-001, P-002, P-003')
    console.log('   ✓ Stocks: 6 entrées (3 produits × 2 magasins)')
    console.log('\nAccès:')
    console.log('   • Utilisateur: admin / Mot de passe: admin123')
    console.log('   • Utilisateur: manager_mj / Mot de passe: mjpass')
    console.log('   • Utilisateur: emp_tm / Mot de passe: tmpass')

  } catch (error) {
    console.error('❌ Erreur lors de la réinitialisation:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

reseed()
