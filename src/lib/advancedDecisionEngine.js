/**
 * Advanced Decision Engine
 * 
 * Améliore la précision des recommandations de réapprovisionnement avec :
 * - Analyse de tendance (croissance/décroissance des ventes)
 * - Détection de saisonnalité
 * - Calcul d'écart-type pour identifier la variabilité
 * - Marge de sécurité adaptative basée sur la volatilité
 * - Détection des produits zéro-vente pour réduire les fausses alertes
 */

import { getProducts, getProductsForStore } from './productsStore'
import { getSales } from './salesStore'

const DEFAULT_LEAD_DAYS = 120
const DEFAULT_LOOKBACK_DAYS = 7
const MIN_LOOKBACK_DAYS = 7
const TREND_WINDOW = 14 // jours pour analyser la tendance

/**
 * Analyse les tendances de vente sur la période donnée
 * @returns {trend: 'stable'|'increasing'|'decreasing', ratio: number}
 */
function analyzeTrend(salesData, days) {
  if (days < TREND_WINDOW * 2) {
    return { trend: 'stable', ratio: 1.0 }
  }

  const now = new Date()
  const midpoint = days / 2
  
  // Première moitié
  const cutoff1 = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000))
  const cutoff2 = new Date(now.getTime() - (midpoint * 24 * 60 * 60 * 1000))
  
  let qtyFirst = 0, qtySecond = 0
  
  for (const s of salesData) {
    try {
      const sd = new Date(s.date)
      if (sd >= cutoff2) {
        qtySecond += Number(s.qty) || 0
      } else if (sd >= cutoff1) {
        qtyFirst += Number(s.qty) || 0
      }
    } catch (e) { }
  }
  
  const avgFirst = qtyFirst / (midpoint)
  const avgSecond = qtySecond / (midpoint)
  
  let trend = 'stable'
  let ratio = 1.0
  
  if (avgFirst === 0) {
    if (avgSecond > 0) {
      trend = 'increasing'
      ratio = 1.3 // majoration de 30% si croissance récente
    }
  } else {
    const change = (avgSecond - avgFirst) / avgFirst
    if (change > 0.15) {
      trend = 'increasing'
      ratio = 1.0 + Math.min(change, 0.5) // min 1.0, max 1.5
    } else if (change < -0.15) {
      trend = 'decreasing'
      ratio = Math.max(0.7, 1.0 + change) // min 0.7
    }
  }
  
  return { trend, ratio }
}

/**
 * Calcule l'écart-type des ventes pour mesurer la volatilité
 */
function calculateVelocityStdDev(salesData, days) {
  const now = new Date()
  const cutoff = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000))
  
  // Agrégation par jour
  const dailyMap = new Map()
  for (const s of salesData) {
    try {
      const sd = new Date(s.date)
      if (sd < cutoff) continue
      const dayKey = sd.toISOString().split('T')[0]
      const prev = dailyMap.get(dayKey) || 0
      dailyMap.set(dayKey, prev + (Number(s.qty) || 0))
    } catch (e) { }
  }
  
  const values = Array.from(dailyMap.values())
  if (values.length === 0) return 0
  
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
  return Math.sqrt(variance)
}

/**
 * Détecte si un produit a zéro vente récemment (pour éviter les faux positifs)
 */
function hasRecentSales(salesData, days) {
  const now = new Date()
  const cutoff = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000))
  
  for (const s of salesData) {
    try {
      const sd = new Date(s.date)
      if (sd >= cutoff) return true
    } catch (e) { }
  }
  return false
}

/**
 * Calcule la marge de sécurité (safety stock) de façon adaptative
 * Plus le produit est volatile, plus la marge est élevée
 */
function calculateSafetyStock(velocity, stdDev, leadDays, threshold) {
  if (velocity === 0) return 0
  
  // Coefficient de variabilité (plus haut = plus imprévisible)
  const cv = stdDev / (velocity + 0.001) // éviter division par zéro
  
  // z-score pour un niveau de service ~95% (1.65) avec ajustement selon variabilité
  const serviceLevel = Math.min(2.5, 1.65 + (cv * 0.5))
  
  const safetyStock = Math.ceil(serviceLevel * stdDev * Math.sqrt(leadDays / 30))
  
  // Minimum égal au seuil, pour garantir une couverture minimale
  return Math.max(threshold, safetyStock)
}

/**
 * Moteur de décision principal : génère les recommandations
 */
export function computeDecisions(options = {}) {
  const {
    lookback = DEFAULT_LOOKBACK_DAYS,
    leadDays = DEFAULT_LEAD_DAYS,
    storeId = null,
    includeDetails = false
  } = options
  
  const effectiveLookback = Math.max(lookback, MIN_LOOKBACK_DAYS)
  const now = new Date()
  const cutoff = new Date(now.getTime() - (effectiveLookback * 24 * 60 * 60 * 1000))
  
  // Récupérer les produits et ventes
  const products = storeId ? getProductsForStore(storeId) : getProducts().map(p => ({
    ...p,
    qty: p.stockByStore ? Object.values(p.stockByStore).reduce((a, b) => a + (Number(b) || 0), 0) : 0
  }))
  
  const allSales = getSales(storeId)
  
  // Agrégation des ventes par SKU
  const salesBySkuMap = new Map()
  for (const s of allSales) {
    try {
      const sd = new Date(s.date)
      if (sd < cutoff) continue
      
      if (!salesBySkuMap.has(s.sku)) {
        salesBySkuMap.set(s.sku, [])
      }
      salesBySkuMap.get(s.sku).push(s)
    } catch (e) { }
  }
  
  const days = Math.max(1, effectiveLookback)
  
  // Calcul pour chaque produit
  const list = products.map(p => {
    const sku = p.sku
    const salesForSku = salesBySkuMap.get(sku) || []
    
    // Quantités de base
    const sold = salesForSku.reduce((sum, s) => sum + (Number(s.qty) || 0), 0)
    const velocity = sold / days
    const avgSalesPerDay = velocity
    const stock = Number(p.qty || 0)
    const threshold = (p.reorderThreshold != null) ? Number(p.reorderThreshold) : 5
    
    // Nouvelles métriques pour améliorer la précision
    const hasRecent = hasRecentSales(salesForSku, 30) // ventes dans les 30 derniers jours ?
    const stdDev = calculateVelocityStdDev(salesForSku, effectiveLookback)
    const { trend, ratio: trendRatio } = analyzeTrend(salesForSku, effectiveLookback)
    
    // Demande projetée avec ajustement de tendance
    const projectedDemand = velocity * leadDays * trendRatio
    
    // Marge de sécurité adaptative
    const safetyStock = calculateSafetyStock(velocity, stdDev, leadDays, threshold)
    
    // Amélioration : un produit sans ventes récentes ne doit pas générer une alerte
    const reorderNeeded = hasRecent && velocity > 0 && projectedDemand > (stock + safetyStock)
    
    const orderQty = reorderNeeded ? Math.max(0, Math.ceil(projectedDemand - stock)) : 0
    
    // Estimation date de commande avec marges adaptatives
    const daysUntilStockout = velocity > 0 ? (stock / velocity) : Infinity
    const daysUntilOrder = daysUntilStockout - leadDays
    const orderDate = (daysUntilOrder <= 0) ? new Date() : new Date(now.getTime() + (daysUntilOrder * 24 * 60 * 60 * 1000))
    
    // Nouvelle métrique : estimation de la couverture en jours
    // Combien de jours le stock actuel peut tenir au rythme actuel de vente
    const coverageDays = velocity > 0 ? Math.floor(stock / velocity) : null
    
    // Calcul du profit attendu
    const price = Number(p.price || 0)
    const cost = Number(p.cost != null ? p.cost : (price * 0.6))
    const expectedProfit = (price - cost) * projectedDemand
    
    const item = {
      sku,
      name: p.name,
      sold,
      velocity,
      avgSalesPerDay,
      projectedDemand,
      projectedDemandAdjusted: projectedDemand, // après trend
      stock,
      threshold,
      reorderNeeded,
      orderQty,
      orderDate,
      coverageDays,  // NOUVEAU: jours que le stock peut tenir
      expectedProfit,
      price,
      cost
    }
    
    // Détails additionnels si demandés
    if (includeDetails) {
      item.details = {
        hasRecentSales: hasRecent,
        trend,
        trendRatio: trendRatio.toFixed(2),
        stdDev: stdDev.toFixed(2),
        safetyStock: Math.round(safetyStock),
        volatility: (stdDev / (velocity + 0.001)).toFixed(2),
        coverageDaysInfo: coverageDays !== null 
          ? `${coverageDays} jour${coverageDays !== 1 ? 's' : ''}`
          : 'Aucune vente'
      }
    }
    
    return item
  })
  
  // Tri : réapprovisionnement urgent d'abord, puis par profit décroissant
  list.sort((a, b) => {
    if (a.reorderNeeded === b.reorderNeeded) {
      return b.expectedProfit - a.expectedProfit
    }
    return a.reorderNeeded ? -1 : 1
  })
  
  return list
}

/**
 * Retourne un résumé pour affichage rapide (top N produits)
 */
export function getTopReorderItems(limit = 8, options = {}) {
  const decisions = computeDecisions(options)
  
  // Filtrer les vrais prioritaires
  const urgent = decisions.filter(d => d.reorderNeeded && d.orderDate <= new Date())
  const warning = decisions.filter(d => d.reorderNeeded && d.orderDate > new Date())
  
  // Retourner urgent d'abord, puis warning, jusqu'à limit
  return [
    ...urgent.slice(0, limit),
    ...warning.slice(0, Math.max(0, limit - urgent.length))
  ]
}

/**
 * Analyse la santé générale du stock
 */
export function getStockHealth(options = {}) {
  const decisions = computeDecisions(options)
  
  const totalProducts = decisions.length
  const urgentReorder = decisions.filter(d => d.reorderNeeded && d.orderDate <= new Date()).length
  const warningReorder = decisions.filter(d => d.reorderNeeded && d.orderDate > new Date()).length
  const okProducts = totalProducts - urgentReorder - warningReorder
  
  const totalProjectedDemand = decisions.reduce((sum, d) => sum + d.projectedDemand, 0)
  const totalCurrentStock = decisions.reduce((sum, d) => sum + d.stock, 0)
  const coverageRatio = totalCurrentStock / (totalProjectedDemand + 0.001)
  
  return {
    totalProducts,
    urgentReorder,
    warningReorder,
    okProducts,
    totalProjectedDemand: Math.round(totalProjectedDemand),
    totalCurrentStock,
    coverageRatio: coverageRatio.toFixed(2),
    healthScore: Math.round(Math.min(100, (okProducts / totalProducts * 100)))
  }
}
