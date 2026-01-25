/**
 * Orders Store
 * Gère les commandes (purchase orders) et leur cycle de vie
 */

const STORAGE_KEY = 'gsm_orders_v1'
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'

// États possibles d'une commande
export const ORDER_STATUSES = {
  DRAFT: 'draft',           // Brouillon (en création)
  PENDING: 'pending',       // En attente (envoyée au fournisseur)
  CONFIRMED: 'confirmed',   // Confirmée par fournisseur
  SHIPPED: 'shipped',       // Expédiée
  DELIVERED: 'delivered',   // Livrée
  CANCELLED: 'cancelled'    // Annulée
}

function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch (e) {
    return []
  }
}

function write(list) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) } catch (e) { }
}

function dispatch(list) {
  const ev = new CustomEvent('orders-updated', { detail: list })
  window.dispatchEvent(ev)
}

/**
 * Crée une nouvelle commande à partir d'une recommandation
 */
export function createOrder(items) {
  const list = read()
  const now = new Date()
  
  const order = {
    id: now.getTime(),
    createdAt: now.toISOString(),
    status: ORDER_STATUSES.DRAFT,
    items: items.map(item => ({
      sku: item.sku,
      name: item.name,
      quantity: item.orderQty || 0,
      unitPrice: Number(item.price || 0),
      totalPrice: (item.orderQty || 0) * Number(item.price || 0),
      supplier: item.supplier || 'À définir'
    })),
    totalAmount: items.reduce((sum, item) => sum + ((item.orderQty || 0) * Number(item.price || 0)), 0),
    notes: '',
    deliveryDate: null,
    targetDate: null
  }
  
  list.push(order)
  write(list)
  dispatch(list)
  return order
}

/**
 * Retourne la liste complète des commandes
 */
export function getOrders() {
  return read()
}

/**
 * Remplace complètement la liste des commandes (utile pour sync Socket.IO)
 */
export function setOrders(list) {
  write(list)
  dispatch(list)
}

/**
 * Retourne une commande spécifique
 */
export function getOrderById(orderId) {
  const list = read()
  return list.find(o => o.id === orderId)
}

/**
 * Met à jour une commande existante
 */
export function updateOrder(orderId, updates) {
  const list = read()
  const index = list.findIndex(o => o.id === orderId)
  if (index === -1) return null
  
  const updated = { ...list[index], ...updates }
  list[index] = updated
  write(list)
  dispatch(list)
  return updated
}

/**
 * Change le statut d'une commande
 */
export function updateOrderStatus(orderId, newStatus) {
  return updateOrder(orderId, {
    status: newStatus,
    updatedAt: new Date().toISOString()
  })
}

/**
 * Ajoute des lignes à une commande
 */
export function addOrderItems(orderId, items) {
  const order = getOrderById(orderId)
  if (!order) return null
  
  const newItems = [
    ...order.items,
    ...items.map(item => ({
      sku: item.sku,
      name: item.name,
      quantity: item.quantity || 1,
      unitPrice: Number(item.price || 0),
      totalPrice: (item.quantity || 1) * Number(item.price || 0),
      supplier: item.supplier || 'À définir'
    }))
  ]
  
  const totalAmount = newItems.reduce((sum, item) => sum + item.totalPrice, 0)
  
  return updateOrder(orderId, { items: newItems, totalAmount })
}

/**
 * Supprime une ligne de commande
 */
export function removeOrderItem(orderId, skuToRemove) {
  const order = getOrderById(orderId)
  if (!order) return null
  
  const newItems = order.items.filter(item => item.sku !== skuToRemove)
  const totalAmount = newItems.reduce((sum, item) => sum + item.totalPrice, 0)
  
  return updateOrder(orderId, { items: newItems, totalAmount })
}

/**
 * Met à jour la quantité d'une ligne
 */
export function updateOrderItemQuantity(orderId, sku, newQuantity) {
  const order = getOrderById(orderId)
  if (!order) return null
  
  const newItems = order.items.map(item => {
    if (item.sku !== sku) return item
    return {
      ...item,
      quantity: newQuantity,
      totalPrice: newQuantity * item.unitPrice
    }
  })
  
  const totalAmount = newItems.reduce((sum, item) => sum + item.totalPrice, 0)
  
  return updateOrder(orderId, { items: newItems, totalAmount })
}

/**
 * Supprime une commande
 */
export function deleteOrder(orderId) {
  const list = read()
  const filtered = list.filter(o => o.id !== orderId)
  write(filtered)
  dispatch(filtered)
}

/**
 * Valide et envoie une commande (passe en PENDING)
 */
export function submitOrder(orderId) {
  const order = getOrderById(orderId)
  if (!order || order.items.length === 0) {
    throw new Error('Commande vide ou invalide')
  }
  return updateOrderStatus(orderId, ORDER_STATUSES.PENDING)
}

/**
 * Retourne les statistiques des commandes
 */
export function getOrderStats() {
  const orders = read()
  
  const stats = {
    total: orders.length,
    byStatus: {},
    totalAmount: 0,
    averageAmount: 0,
    recentOrders: []
  }
  
  Object.keys(ORDER_STATUSES).forEach(key => {
    stats.byStatus[ORDER_STATUSES[key]] = 0
  })
  
  orders.forEach(order => {
    stats.byStatus[order.status] = (stats.byStatus[order.status] || 0) + 1
    stats.totalAmount += order.totalAmount || 0
  })
  
  stats.averageAmount = stats.total > 0 ? stats.totalAmount / stats.total : 0
  
  // Commandes récentes (derniers 7 jours)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  stats.recentOrders = orders.filter(o => new Date(o.createdAt) > sevenDaysAgo)
  
  return stats
}

/**
 * Retourne les commandes par statut
 */
export function getOrdersByStatus(status) {
  const list = read()
  return list.filter(o => o.status === status)
}

/**
 * S'abonne aux changements de commandes
 */
export function subscribe(cb) {
  const handler = (e) => cb(e.detail)
  window.addEventListener('orders-updated', handler)

  const storageHandler = (e) => {
    if (e.key === STORAGE_KEY) {
      try {
        const val = e.newValue ? JSON.parse(e.newValue) : []
        cb(val)
      } catch (err) { /* ignore */ }
    }
  }
  window.addEventListener('storage', storageHandler)

  return () => {
    window.removeEventListener('orders-updated', handler)
    window.removeEventListener('storage', storageHandler)
  }
}

/**
 * Fetch commandes depuis API et met à jour le cache
 * NOTA: Avec Socket.IO, ce refresh est optionnel (les mises à jour arrivent en temps réel)
 */
export async function refreshOrders() {
  // Les données arrivent via Socket.IO, ce refresh est désactivé
  console.log('refreshOrders: Data synced via Socket.IO')
  return getOrders()
}
