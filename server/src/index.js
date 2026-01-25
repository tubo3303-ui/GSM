require('dotenv').config()
const express = require('express')
const cors = require('cors')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')
const path = require('path')
const { Server } = require('socket.io')
const http = require('http')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'file:./dev.db'
    }
  }
})
const app = express()
const server = http.createServer(app)
const PORT = process.env.PORT || 4000
const JWT_SECRET = process.env.JWT_SECRET || 'change_me_local'

// Socket.IO initialization
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:5173',
      'http://localhost:4000',
      'https://localhost:5173',
      'https://ntsoagsm-mada.netlify.app',
      process.env.FRONTEND_URL || ''
    ].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  },
  transports: ['websocket', 'polling']
})

// Configuration CORS pour production
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:4000',
    'https://localhost:5173',
    'https://ntsoagsm-mada.netlify.app',
    process.env.FRONTEND_URL || ''
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}

app.use(cors(corsOptions))
app.use(express.json())

// Simple auth - returns JWT
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' })
  const user = await prisma.user.findUnique({ where: { username } })
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' })
  const token = jwt.sign({ sub: user.id, role: user.role, store: user.store }, JWT_SECRET, { expiresIn: '8h' })
  res.json({ token, user: { id: user.id, username: user.username, displayName: user.displayName, role: user.role, store: user.store } })
})

// User management endpoints (admin only)
app.get('/api/users', auth, async (req, res) => {
  try {
    // only admin can list users
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' })
    const users = await prisma.user.findMany({ select: { id: true, username: true, displayName: true, role: true, store: true } })
    res.json(users)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/users', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' })
    const { username, password, displayName, role, store } = req.body
    if (!username || !password) return res.status(400).json({ error: 'Missing username or password' })
    const hash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({ data: { username, passwordHash: hash, displayName: displayName || username, role: role || 'employee', store: store || 'all' } })
    broadcastUsers() // Notifier tous les clients
    res.json({ id: user.id, username: user.username, displayName: user.displayName, role: user.role, store: user.store })
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Username already exists' })
    res.status(500).json({ error: e.message })
  }
})

app.put('/api/users/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' })
    const id = Number(req.params.id)
    const { username, password, displayName, role, store } = req.body
    const data = {}
    if (username != null) data.username = username
    if (displayName != null) data.displayName = displayName
    if (role != null) data.role = role
    if (store != null) data.store = store
    if (password != null) data.passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.update({ where: { id }, data })
    broadcastUsers() // Notifier tous les clients
    res.json({ id: user.id, username: user.username, displayName: user.displayName, role: user.role, store: user.store })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.delete('/api/users/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' })
    const id = Number(req.params.id)
    await prisma.user.delete({ where: { id } })
    broadcastUsers() // Notifier tous les clients
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Middleware to protect routes (optional)
function auth(req, res, next) {
  const hdr = req.headers.authorization
  if (!hdr) return res.status(401).json({ error: 'Missing token' })
  const parts = hdr.split(' ')
  if (parts.length !== 2) return res.status(401).json({ error: 'Invalid token' })
  try {
    const payload = jwt.verify(parts[1], JWT_SECRET)
    req.user = payload
    return next()
  } catch (e) { return res.status(401).json({ error: 'Invalid token' }) }
}

// Products list; optional ?store=majunga to include qty and prices for that store
app.get('/api/products', async (req, res) => {
  const store = req.query.store
  const prods = await prisma.product.findMany({ include: { stocks: true } })
  const mapped = prods.map(p => {
    // Créer des maps pour qty, cost, margin par store
    const stockMap = (p.stocks || []).reduce((acc, s) => { 
      acc[s.store] = { qty: s.qty, cost: s.cost, margin: s.margin }
      return acc 
    }, {})
    
    // Create a simple stockByStore with just quantities for frontend compatibility
    const stockByStore = {}
    for (const [storeName, stockData] of Object.entries(stockMap)) {
      stockByStore[storeName] = stockData.qty
    }
    
    // Si store spécifié, récupérer les prix de ce store sinon utiliser globaux
    let cost = p.cost
    let margin = p.margin
    if (store && stockMap[store]) {
      cost = stockMap[store].cost != null ? stockMap[store].cost : p.cost
      margin = stockMap[store].margin != null ? stockMap[store].margin : p.margin
    }
    
    // Calcul du prix: price = cost * (1 + margin/100)
    const calculatedPrice = (cost != null && margin != null) ? Number(cost) * (1 + Number(margin) / 100) : p.price
    
    const qty = store ? (stockMap[store] != null ? stockMap[store].qty : 0) : Object.values(stockMap).reduce((a,b)=>a+(b.qty||0), 0)
    
    return { 
      id: p.id, sku: p.sku, name: p.name, model: p.model, compatibleModels: p.compatibleModels ? p.compatibleModels.split(',') : [], 
      price: calculatedPrice, cost: cost, margin: margin, 
      location: p.location, category: p.category, supplier: p.supplier, 
      stockByStore: stockByStore, qty 
    }
  })
  // If store provided, filter out products that don't have an explicit entry for that store (behaviour matching frontend expectation)
  const result = store ? mapped.filter(p => p.stockByStore && Object.prototype.hasOwnProperty.call(p.stockByStore, store)) : mapped
  res.json(result)
})

// Create product with optional stock entries
app.post('/api/products', auth, async (req, res) => {
  const data = req.body
  try {
    // Calcul du prix: price = cost * (1 + margin/100)
    const cost = data.cost != null ? Number(data.cost) : null
    const margin = data.margin != null ? Number(data.margin) : null
    const calculatedPrice = data.price != null ? Number(data.price) : (cost != null && margin != null ? cost * (1 + margin / 100) : null)
    const p = await prisma.product.create({ data: {
      sku: data.sku,
      name: data.name,
      model: data.model || null,
      compatibleModels: (data.compatibleModels || []).join ? (data.compatibleModels.join(',')) : (data.compatibleModels || null),
      cost: cost,
      margin: margin,
      price: calculatedPrice,
      location: data.location || null,
      category: data.category || null,
      supplier: data.supplier || null,
    }})
    // create stock rows if provided
    if (data.stocks && Array.isArray(data.stocks)) {
      for (const s of data.stocks) {
        await prisma.stock.create({ data: { productId: p.id, store: s.store, qty: Number(s.qty || 0), cost: cost, margin: margin } })
      }
    }
    broadcastProducts() // Notifier tous les clients
    res.json({ ok: true, product: p })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Update product by SKU (partial update). Accepts fields and optional stocks array to upsert stock rows with store-specific pricing
app.put('/api/products/:sku', auth, async (req, res) => {
  const sku = req.params.sku
  const data = req.body || {}
  const store = data.store // Store optionnel pour les mises à jour par boutique
  try {
    const product = await prisma.product.findUnique({ where: { sku } })
    if (!product) return res.status(404).json({ error: 'Product not found' })
    
    // Si store est fourni, mettre à jour uniquement pour ce store
    if (store) {
      const existing = await prisma.stock.findUnique({ where: { productId_store: { productId: product.id, store } } }).catch(()=>null)
      if (!existing) return res.status(404).json({ error: 'Stock entry for this store not found' })
      
      const newCost = data.cost != null ? Number(data.cost) : existing.cost
      const newMargin = data.margin != null ? Number(data.margin) : existing.margin
      
      await prisma.stock.update({ where: { id: existing.id }, data: { 
        qty: data.qty != null ? Number(data.qty) : existing.qty,
        cost: newCost,
        margin: newMargin
      }})
    } else {
      // Sinon, mettre à jour le produit global (compatibilité)
      const newCost = data.cost != null ? Number(data.cost) : product.cost
      const newMargin = data.margin != null ? Number(data.margin) : product.margin
      const newPrice = data.price != null ? Number(data.price) : (newCost != null && newMargin != null ? newCost * (1 + newMargin / 100) : product.price)
      
      await prisma.product.update({ where: { id: product.id }, data: {
        sku: data.sku || product.sku,
        name: data.name != null ? data.name : product.name,
        model: data.model != null ? data.model : product.model,
        compatibleModels: data.compatibleModels ? (Array.isArray(data.compatibleModels) ? data.compatibleModels.join(',') : data.compatibleModels) : product.compatibleModels,
        cost: newCost,
        margin: newMargin,
        price: newPrice,
        location: data.location != null ? data.location : product.location,
        category: data.category != null ? data.category : product.category,
        supplier: data.supplier != null ? data.supplier : product.supplier,
      }})
      
      // upsert stocks if provided
      if (data.stocks && Array.isArray(data.stocks)) {
        for (const s of data.stocks) {
          const existing = await prisma.stock.findUnique({ where: { productId_store: { productId: product.id, store: s.store } } }).catch(()=>null)
          if (existing) {
            await prisma.stock.update({ where: { id: existing.id }, data: { qty: Number(s.qty || 0) } })
          } else {
            await prisma.stock.create({ data: { productId: product.id, store: s.store, qty: Number(s.qty || 0) } })
          }
        }
      }
    }
    
    broadcastProducts() // Notifier tous les clients
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Delete product and related stocks/sales
app.delete('/api/products/:sku', auth, async (req, res) => {
  const sku = req.params.sku
  try {
    const product = await prisma.product.findUnique({ where: { sku } })
    if (!product) return res.status(404).json({ error: 'Product not found' })
    // delete stocks and sales first
    await prisma.stock.deleteMany({ where: { productId: product.id } })
    await prisma.sale.deleteMany({ where: { productId: product.id } })
    await prisma.product.delete({ where: { id: product.id } })
    broadcastProducts() // Notifier tous les clients
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Get stock rows for a store
app.get('/api/stock', async (req, res) => {
  const store = req.query.store
  const where = store ? { where: { store } } : undefined
  const stocks = await prisma.stock.findMany(where)
  res.json(stocks)
})

// Get sales list, optional ?store=majunga
app.get('/api/sales', async (req, res) => {
  const store = req.query.store
  const where = store ? { where: { store } } : undefined
  const sales = await prisma.sale.findMany({ ...(where||{}), include: { product: true } })
  const mapped = sales.map(s => ({ id: s.id, productId: s.productId, sku: s.product ? s.product.sku : null, qty: s.qty, total: s.total, client: s.client, date: s.date, store: s.store }))
  res.json(mapped)
})

// Get orders list (orders are stored client-side via ordersStore)
app.get('/api/orders', async (req, res) => {
  res.json([])
})

// set stock for a product (create or update)
app.post('/api/stock', auth, async (req, res) => {
  const { sku, store, qty } = req.body
  if (!sku || !store) return res.status(400).json({ error: 'Missing sku or store' })
  try {
    const product = await prisma.product.findUnique({ where: { sku } })
    if (!product) return res.status(404).json({ error: 'Product not found' })
    const existing = await prisma.stock.findUnique({ where: { productId_store: { productId: product.id, store } } }).catch(()=>null)
    let row
    if (existing) {
      row = await prisma.stock.update({ where: { id: existing.id }, data: { qty: Number(qty || 0) } })
    } else {
      row = await prisma.stock.create({ data: { productId: product.id, store, qty: Number(qty || 0) } })
    }
    broadcastProducts() // Notifier tous les clients
    res.json({ ok: true, stock: row })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Record a sale: decrement stock and create sale row
app.post('/api/sales', auth, async (req, res) => {
  const { productId, sku, qty, client, store } = req.body
  try {
    // find product
    const product = productId ? await prisma.product.findUnique({ where: { id: Number(productId) } }) : await prisma.product.findUnique({ where: { sku } })
    if (!product) return res.status(404).json({ error: 'Product not found' })
    // find stock row for store
    const stockRow = await prisma.stock.findUnique({ where: { productId_store: { productId: product.id, store } } }).catch(()=>null)
    if (!stockRow) return res.status(400).json({ error: 'No stock entry for this store' })
    if (stockRow.qty < qty) return res.status(400).json({ error: 'Not enough stock' })
    // update stock
    await prisma.stock.update({ where: { id: stockRow.id }, data: { qty: stockRow.qty - Number(qty) } })
    const total = (product.price || 0) * Number(qty)
    const sale = await prisma.sale.create({ data: { productId: product.id, qty: Number(qty), total: total, client: client || 'Client inconnu', store: store || 'unknown' } })
    broadcastProducts() // Notifier du changement de stock
    broadcastSales() // Notifier du changement de ventes
    res.json({ ok: true, sale })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Log an action
app.post('/api/logs', auth, async (req, res) => {
  try {
    const { action, description } = req.body
    if (!action || !description) return res.status(400).json({ error: 'Missing action or description' })
    const log = await prisma.actionLog.create({
      data: {
        userId: req.user.sub,
        action,
        description,
        store: req.user.store
      }
    })
    broadcastLogs() // Notifier tous les clients
    res.json({ ok: true, log })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Get action logs (admin only)
app.get('/api/logs', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' })
    const logs = await prisma.actionLog.findMany({
      include: {
        user: { select: { id: true, username: true, displayName: true, store: true } }
      },
      orderBy: { timestamp: 'desc' }
    })
    res.json(logs)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Get action logs for a specific user (admin only)
app.get('/api/logs/user/:userId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' })
    const userId = Number(req.params.userId)
    const logs = await prisma.actionLog.findMany({
      where: { userId },
      include: {
        user: { select: { id: true, username: true, displayName: true, store: true } }
      },
      orderBy: { timestamp: 'desc' }
    })
    res.json(logs)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Get action logs for a store (admin only)
app.get('/api/logs/store/:store', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' })
    const store = req.params.store
    const logs = await prisma.actionLog.findMany({
      where: { store },
      include: {
        user: { select: { id: true, username: true, displayName: true, store: true } }
      },
      orderBy: { timestamp: 'desc' }
    })
    res.json(logs)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ===== ARRIVALS ENDPOINTS =====

// Get all arrivals for a store
app.get('/api/arrivals', auth, async (req, res) => {
  try {
    const store = req.query.store || req.user.store
    console.log(`[DEBUG] GET /api/arrivals - store: ${store}, user: ${req.user.sub}`)
    const arrivals = await prisma.arrival.findMany({
      where: { store },
      include: {
        items: {
          include: { product: true }
        },
        user: { select: { id: true, username: true, displayName: true } }
      },
      orderBy: { arrivalDate: 'desc' }
    })
    console.log(`[DEBUG] Found ${arrivals.length} arrivals`)
    const mapped = arrivals.map(a => ({
      id: a.id,
      referenceNumber: a.referenceNumber,
      supplier: a.supplier,
      arrivalDate: a.arrivalDate,
      receivedBy: a.receivedBy,
      receivedByUser: a.user,
      status: a.status,
      notes: a.notes,
      store: a.store,
      items: a.items.map(i => ({
        id: i.id,
        productId: i.productId,
        sku: i.product?.sku,
        productName: i.product?.name,
        qtyReceived: i.qtyReceived,
        costPrice: i.costPrice,
        notes: i.notes
      })),
      createdAt: a.createdAt,
      updatedAt: a.updatedAt
    }))
    res.json(mapped)
  } catch (e) { 
    console.error(`[ERROR] GET /api/arrivals:`, e)
    res.status(500).json({ error: e.message }) 
  }
})

// Get single arrival by ID
app.get('/api/arrivals/:id', auth, async (req, res) => {
  try {
    const id = Number(req.params.id)
    const arrival = await prisma.arrival.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: true }
        },
        user: { select: { id: true, username: true, displayName: true } }
      }
    })
    if (!arrival) return res.status(404).json({ error: 'Arrival not found' })
    const mapped = {
      id: arrival.id,
      referenceNumber: arrival.referenceNumber,
      supplier: arrival.supplier,
      arrivalDate: arrival.arrivalDate,
      receivedBy: arrival.receivedBy,
      receivedByUser: arrival.user,
      status: arrival.status,
      notes: arrival.notes,
      store: arrival.store,
      items: arrival.items.map(i => ({
        id: i.id,
        productId: i.productId,
        sku: i.product?.sku,
        productName: i.product?.name,
        qtyReceived: i.qtyReceived,
        costPrice: i.costPrice,
        notes: i.notes
      })),
      createdAt: arrival.createdAt,
      updatedAt: arrival.updatedAt
    }
    res.json(mapped)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Create new arrival with items
app.post('/api/arrivals', auth, async (req, res) => {
  try {
    const { referenceNumber, supplier, arrivalDate, notes, items, store } = req.body
    if (!referenceNumber || !supplier || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Missing or invalid required fields' })
    }
    
    // Check if reference number already exists
    const existing = await prisma.arrival.findUnique({ where: { referenceNumber } }).catch(() => null)
    if (existing) return res.status(409).json({ error: 'Reference number already exists' })
    
    // Créer l'arrivage avec les items
    const arrival = await prisma.arrival.create({
      data: {
        referenceNumber,
        supplier,
        arrivalDate: arrivalDate ? new Date(arrivalDate) : new Date(),
        receivedBy: req.user.sub,
        notes: notes || null,
        status: 'pending',
        store: store || req.user.store,
        items: {
          create: items.map(item => ({
            productId: Number(item.productId),
            qtyReceived: Number(item.qtyReceived),
            costPrice: Number(item.costPrice),
            notes: item.notes || null
          }))
        }
      },
      include: {
        items: { include: { product: true } },
        user: { select: { id: true, username: true, displayName: true } }
      }
    })
    
    // Log the action
    await prisma.actionLog.create({
      data: {
        userId: req.user.sub,
        action: 'ARRIVAL_CREATED',
        description: `Arrivage créé: ${referenceNumber} de ${supplier} (${items.length} articles)`,
        store: store || req.user.store
      }
    })
    
    broadcastArrivals()
    broadcastLogs()
    
    const mapped = {
      id: arrival.id,
      referenceNumber: arrival.referenceNumber,
      supplier: arrival.supplier,
      arrivalDate: arrival.arrivalDate,
      receivedBy: arrival.receivedBy,
      receivedByUser: arrival.user,
      status: arrival.status,
      notes: arrival.notes,
      store: arrival.store,
      items: arrival.items.map(i => ({
        id: i.id,
        productId: i.productId,
        sku: i.product?.sku,
        productName: i.product?.name,
        qtyReceived: i.qtyReceived,
        costPrice: i.costPrice,
        notes: i.notes
      })),
      createdAt: arrival.createdAt,
      updatedAt: arrival.updatedAt
    }
    
    res.json({ ok: true, arrival: mapped })
  } catch (e) {
    console.error('Error creating arrival:', e)
    res.status(500).json({ error: e.message })
  }
})

// Confirm arrival (change status to confirmed and update stock)
app.put('/api/arrivals/:id/confirm', auth, async (req, res) => {
  try {
    const id = Number(req.params.id)
    const arrival = await prisma.arrival.findUnique({
      where: { id },
      include: { items: true, user: { select: { id: true, username: true, displayName: true } } }
    })
    if (!arrival) return res.status(404).json({ error: 'Arrival not found' })
    if (arrival.status !== 'pending') return res.status(400).json({ error: 'Arrival is not in pending status' })
    
    // Update stock for each item with weighted average cost calculation
    for (const item of arrival.items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId }
      })
      
      const stockRow = await prisma.stock.findUnique({
        where: { productId_store: { productId: item.productId, store: arrival.store } }
      }).catch(() => null)
      
      // Calculate weighted average cost: (old_cost * old_qty + new_cost * new_qty) / (old_qty + new_qty)
      let newCost = item.costPrice
      if (stockRow && stockRow.cost != null && stockRow.qty > 0) {
        newCost = (Number(stockRow.cost) * stockRow.qty + Number(item.costPrice) * item.qtyReceived) / (stockRow.qty + item.qtyReceived)
      }
      
      // Calculate new price based on margin: price = cost * (1 + margin/100)
      let newPrice = product.price
      if (newCost != null) {
        const margin = stockRow?.margin != null ? Number(stockRow.margin) : (product.margin != null ? Number(product.margin) : 0)
        newPrice = newCost * (1 + margin / 100)
      }
      
      if (stockRow) {
        await prisma.stock.update({
          where: { id: stockRow.id },
          data: { 
            qty: stockRow.qty + item.qtyReceived,
            cost: newCost,
            margin: stockRow.margin != null ? stockRow.margin : product.margin
          }
        })
      } else {
        // Create new stock row if it doesn't exist
        await prisma.stock.create({
          data: {
            productId: item.productId,
            store: arrival.store,
            qty: item.qtyReceived,
            cost: newCost,
            margin: product.margin
          }
        })
      }
      
      // Update product price (global)
      await prisma.product.update({
        where: { id: item.productId },
        data: { 
          price: newPrice,
          cost: newCost
        }
      })
    }
    
    // Update arrival status
    const updated = await prisma.arrival.update({
      where: { id },
      data: { status: 'confirmed' },
      include: { items: { include: { product: true } }, user: { select: { id: true, username: true, displayName: true } } }
    })
    
    // Log the action
    await prisma.actionLog.create({
      data: {
        userId: req.user.sub,
        action: 'ARRIVAL_CONFIRMED',
        description: `Arrivage confirmé: ${arrival.referenceNumber} - Stock augmenté`,
        store: arrival.store
      }
    })
    
    broadcastArrivals()
    broadcastProducts()
    broadcastLogs()
    
    res.json({ ok: true })
  } catch (e) {
    console.error('Error confirming arrival:', e)
    res.status(500).json({ error: e.message })
  }
})

// Cancel arrival
app.put('/api/arrivals/:id/cancel', auth, async (req, res) => {
  try {
    const id = Number(req.params.id)
    const arrival = await prisma.arrival.findUnique({ where: { id }, include: { items: true } })
    if (!arrival) return res.status(404).json({ error: 'Arrival not found' })
    if (arrival.status === 'confirmed') return res.status(400).json({ error: 'Cannot cancel confirmed arrival' })
    
    const updated = await prisma.arrival.update({
      where: { id },
      data: { status: 'cancelled' }
    })
    
    // Log the action
    await prisma.actionLog.create({
      data: {
        userId: req.user.sub,
        action: 'ARRIVAL_CANCELLED',
        description: `Arrivage annulé: ${arrival.referenceNumber}`,
        store: arrival.store
      }
    })
    
    broadcastArrivals()
    broadcastLogs()
    
    res.json({ ok: true })
  } catch (e) {
    console.error('Error cancelling arrival:', e)
    res.status(500).json({ error: e.message })
  }
})

// ===== SOCKET.IO SETUP =====

// Middleware d'authentification Socket.IO
io.use((socket, next) => {
  const token = socket.handshake.auth.token
  if (!token) return next(new Error('Authentication error'))
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    socket.user = payload
    next()
  } catch (e) {
    next(new Error('Authentication error'))
  }
})

// Connection handler
io.on('connection', (socket) => {
  console.log(`✓ Client connected: ${socket.id} (user: ${socket.user.sub})`)

  // Envoyer une synchronisation complète au connexion
  socket.on('sync:request', async () => {
    console.log(`📡 Sync request from ${socket.id}`)
    try {
      const users = await prisma.user.findMany({ select: { id: true, username: true, displayName: true, role: true, store: true } })
      const products = await prisma.product.findMany({ include: { stocks: true } })
      const orders = await prisma.order.findMany().catch(() => [])
      const sales = await prisma.sale.findMany({ include: { product: true } })
      const logs = await prisma.actionLog.findMany({ include: { user: { select: { id: true, username: true, displayName: true, store: true } } }, orderBy: { timestamp: 'desc' }, take: 100 })
      const arrivals = await prisma.arrival.findMany({ include: { items: { include: { product: true } }, user: { select: { id: true, username: true, displayName: true } } }, orderBy: { arrivalDate: 'desc' } })

      socket.emit('sync:full', {
        users,
        products: products.map(p => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          model: p.model,
          compatibleModels: p.compatibleModels ? p.compatibleModels.split(',') : [],
          price: p.price,
          cost: p.cost,
          location: p.location,
          category: p.category,
          supplier: p.supplier,
          stockByStore: (p.stocks || []).reduce((acc, s) => { acc[s.store] = s.qty; return acc }, {})
        })),
        orders,
        sales,
        logs,
        arrivals
      })
    } catch (e) {
      console.error('Error syncing:', e)
    }
  })

  socket.on('disconnect', () => {
    console.log(`✗ Client disconnected: ${socket.id}`)
  })
})

// Fonction pour émettre des changements à tous les clients
function broadcastUsers() {
  prisma.user.findMany({ select: { id: true, username: true, displayName: true, role: true, store: true } }).then(users => {
    io.emit('users:updated', users)
  })
}

function broadcastProducts() {
  prisma.product.findMany({ include: { stocks: true } }).then(products => {
    io.emit('products:updated', products.map(p => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      model: p.model,
      compatibleModels: p.compatibleModels ? p.compatibleModels.split(',') : [],
      price: p.price,
      cost: p.cost,
      location: p.location,
      category: p.category,
      supplier: p.supplier,
      stockByStore: (p.stocks || []).reduce((acc, s) => { acc[s.store] = s.qty; return acc }, {})
    })))
  })
}

function broadcastSales() {
  prisma.sale.findMany({ include: { product: true } }).then(sales => {
    io.emit('sales:updated', sales.map(s => ({
      id: s.id,
      productId: s.productId,
      sku: s.product ? s.product.sku : null,
      qty: s.qty,
      total: s.total,
      client: s.client,
      date: s.date,
      store: s.store
    })))
  })
}

function broadcastLogs() {
  prisma.actionLog.findMany({ include: { user: { select: { id: true, username: true, displayName: true, store: true } } }, orderBy: { timestamp: 'desc' }, take: 100 }).then(logs => {
    io.emit('logs:updated', logs)
  })
}

function broadcastArrivals() {
  prisma.arrival.findMany({ include: { items: { include: { product: true } }, user: { select: { id: true, username: true, displayName: true } } }, orderBy: { arrivalDate: 'desc' } }).then(arrivals => {
    io.emit('arrivals:updated', arrivals)
  })
}

// ===== START SERVER =====
server.listen(PORT, () => console.log(`🚀 Server listening on http://localhost:${PORT}`))
