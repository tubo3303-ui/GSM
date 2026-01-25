import React, { useEffect, useState } from 'react'
import { getProducts, subscribe as subscribeProducts, refreshProducts } from '../lib/productsStore'
import { getSales, subscribe as subscribeSales, refreshSales } from '../lib/salesStore'
import { computeDecisions, getStockHealth } from '../lib/advancedDecisionEngine'
import { createOrder, getOrders } from '../lib/ordersStore'
import { getCurrentUser } from '../lib/authStore'
import { useStore } from '../lib/StoreContext'

export default function DecisionCenter() {
  const user = getCurrentUser()
  if (user && user.role === 'employee') {
    return (
      <div className="card">
        <h3>Accès refusé</h3>
        <div>Vous n'avez pas les droits pour accéder à ce panneau.</div>
      </div>
    )
  }
  const { currentStore } = useStore()
  const [products, setProducts] = useState([])
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(false)
  const [leadDays, setLeadDays] = useState(120) // default 4 months
  const [lookback, setLookback] = useState(7) // base on one week by default
  const [items, setItems] = useState([])
  const [health, setHealth] = useState(null)
  const [selectedItems, setSelectedItems] = useState([])

  useEffect(() => {
    let mounted = true
    const compute = () => {
      // Utiliser le moteur de décision amélioré
      const decisions = computeDecisions({
        lookback,
        leadDays,
        storeId: currentStore === 'all' ? null : currentStore,
        includeDetails: true
      })

      const healthData = getStockHealth({ lookback, leadDays, storeId: currentStore === 'all' ? null : currentStore })
      
      setItems(decisions)
      setHealth(healthData)
    }

    setLoading(true)
    Promise.all([refreshProducts().catch(()=>{}), refreshSales().catch(()=>{})]).finally(() => {
      if (!mounted) return
      setProducts(getProducts())
      setSales(getSales())
      compute()
      setLoading(false)
    })

    const unsubP = subscribeProducts(compute)
    const unsubS = subscribeSales(compute)
    return () => { mounted = false; unsubP(); unsubS() }
  }, [leadDays, lookback, currentStore])

  const handleSelectItem = (sku) => {
    setSelectedItems(prev => 
      prev.includes(sku) 
        ? prev.filter(s => s !== sku)
        : [...prev, sku]
    )
  }

  const handleCreateOrder = () => {
    if (selectedItems.length === 0) {
      alert('Sélectionnez au moins un produit à commander')
      return
    }

    const itemsToOrder = items.filter(item => selectedItems.includes(item.sku))
    try {
      const order = createOrder(itemsToOrder)
      alert(`Commande créée (#${order.id}). Allez dans "Commandes" pour la finaliser.`)
      setSelectedItems([])
    } catch (e) {
      alert('Erreur: ' + e.message)
    }
  }

  return (
    <div className="card decision-container" style={{marginBottom:12}}>
      <div className="decision-header">
        <div className="decision-controls">
          <div className="decision-input-group">
            <label className="small">Période d'analyse (jours)</label>
            <input type="number" value={lookback} onChange={e => setLookback(Math.max(1, Number(e.target.value || 1)))} className="decision-input" />
          </div>
          <div className="decision-input-group">
            <label className="small">Délai d'importation (jours)</label>
            <input type="number" value={leadDays} onChange={e => setLeadDays(Math.max(1, Number(e.target.value || 1)))} className="decision-input" />
          </div>
        </div>
      </div>

      {health && (
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px'}}>
          <div style={{padding: '12px', backgroundColor: '#f3f4f6', borderRadius: '4px'}}>
            <div className="small" style={{color: '#666'}}>Score de santé</div>
            <div style={{fontSize: '24px', fontWeight: 'bold', color: health.healthScore >= 70 ? '#16a34a' : health.healthScore >= 40 ? '#ca8a04' : '#dc2626'}}>
              {health.healthScore}%
            </div>
          </div>
          <div style={{padding: '12px', backgroundColor: '#f3f4f6', borderRadius: '4px'}}>
            <div className="small" style={{color: '#666'}}>Stock / Demande</div>
            <div style={{fontSize: '24px', fontWeight: 'bold'}}>{health.coverageRatio}x</div>
          </div>
          <div style={{padding: '12px', backgroundColor: '#fef2f2', borderRadius: '4px'}}>
            <div className="small" style={{color: '#666'}}>Urgent</div>
            <div style={{fontSize: '24px', fontWeight: 'bold', color: '#dc2626'}}>{health.urgentReorder}</div>
          </div>
          <div style={{padding: '12px', backgroundColor: '#fef3c7', borderRadius: '4px'}}>
            <div className="small" style={{color: '#666'}}>Attention</div>
            <div style={{fontSize: '24px', fontWeight: 'bold', color: '#ca8a04'}}>{health.warningReorder}</div>
          </div>
        </div>
      )}

      {selectedItems.length > 0 && (
        <div style={{padding: '12px', marginBottom: '16px', backgroundColor: '#dbeafe', border: '1px solid #0284c7', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div>
            <strong>{selectedItems.length} produit(s) sélectionné(s)</strong>
            <div className="small">Montant estimé: {items.filter(it => selectedItems.includes(it.sku)).reduce((sum, it) => sum + (it.orderQty * it.price), 0).toFixed(2)} Ar</div>
          </div>
          <button className="btn btn-primary" onClick={handleCreateOrder}>
            Créer une commande
          </button>
        </div>
      )}

      <div className="decision-table-wrapper">
        {/* Desktop Table View */}
        <div className="table-responsive hidden-on-decision-mobile">
          <table className="decision-table">
            <thead>
              <tr>
                <th style={{width: '30px'}}>
                  <input 
                    type="checkbox" 
                    checked={selectedItems.length === items.filter(it => it.reorderNeeded).length && items.filter(it => it.reorderNeeded).length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedItems(items.filter(it => it.reorderNeeded).map(it => it.sku))
                      } else {
                        setSelectedItems([])
                      }
                    }}
                  />
                </th>
                <th>SKU</th>
                <th>Produit</th>
                <th>Stock</th>
                <th>Vente/{Math.max(lookback, 7)}j</th>
                <th>Moyenne (u/j)</th>
                <th>Couverture (jours)</th>
                <th>Qté à commander</th>
                <th>Quand commander</th>
              </tr>
            </thead>
            <tbody>
              {items.map(it => {
                const now = new Date()
                const status = it.reorderNeeded ? (it.orderDate <= now ? 'critical' : 'warning') : 'ok'
                return (
                <tr key={it.sku} className={`decision-row ${status}`}>
                  <td style={{width: '30px'}}>
                    <input 
                      type="checkbox" 
                      checked={selectedItems.includes(it.sku)}
                      onChange={() => handleSelectItem(it.sku)}
                      disabled={!it.reorderNeeded}
                    />
                  </td>
                  <td data-label="SKU">
                    <span className={`decision-dot ${status}`} />
                    {it.sku}
                  </td>
                  <td data-label="Produit">{it.name}</td>
                  <td data-label="Stock">{it.stock}</td>
                  <td data-label="Vente">{it.sold}</td>
                  <td data-label="Moyenne">{it.avgSalesPerDay != null ? it.avgSalesPerDay.toFixed(2) : '-'}</td>
                  <td data-label="Couverture" title={`Le stock peut tenir ${it.coverageDays} jours au rythme actuel`}>
                    {it.coverageDays !== null ? (
                      <span style={{fontWeight: 'bold', color: it.coverageDays <= it.details?.stdDev ? '#dc2626' : it.coverageDays < 15 ? '#ca8a04' : '#16a34a'}}>
                        {it.coverageDays} j
                      </span>
                    ) : '-'}
                  </td>
                  <td data-label="Qté">{it.reorderNeeded ? it.orderQty : '-'}</td>
                  <td data-label="Quand">{it.reorderNeeded ? (it.orderDate <= now ? 'Commander maintenant' : it.orderDate.toLocaleDateString()) : '-'}</td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="decision-cards-grid visible-on-decision-mobile">
          {items.map(it => {
            const now = new Date()
            const status = it.reorderNeeded ? (it.orderDate <= now ? 'critical' : 'warning') : 'ok'
            return (
              <div key={it.sku} className="decision-card">
                <div className="decision-card-header">
                  <div className="decision-card-sku">
                    <span className={`decision-dot ${status}`} style={{marginRight: 8}} />
                    {it.sku}
                  </div>
                  <input 
                    type="checkbox" 
                    checked={selectedItems.includes(it.sku)}
                    onChange={() => handleSelectItem(it.sku)}
                    disabled={!it.reorderNeeded}
                    style={{width: 18, height: 18, cursor: 'pointer'}}
                  />
                </div>
                <div className="decision-card-content">
                  <div className="decision-card-title">{it.name}</div>
                  <div className="decision-card-row">
                    <span className="decision-card-label">Stock</span>
                    <span className="decision-card-value">{it.stock} unités</span>
                  </div>
                  <div className="decision-card-row">
                    <span className="decision-card-label">Vente ({Math.max(lookback, 7)}j)</span>
                    <span className="decision-card-value">{it.sold}</span>
                  </div>
                  <div className="decision-card-row">
                    <span className="decision-card-label">Moyenne (u/j)</span>
                    <span className="decision-card-value">{it.avgSalesPerDay != null ? it.avgSalesPerDay.toFixed(2) : '-'}</span>
                  </div>
                  <div className="decision-card-row">
                    <span className="decision-card-label">Couverture</span>
                    <span className={`decision-card-value ${it.coverageDays <= it.details?.stdDev ? 'critical' : it.coverageDays < 15 ? 'warning' : 'ok'}`}>
                      {it.coverageDays !== null ? `${it.coverageDays} j` : '-'}
                    </span>
                  </div>
                  <div className="decision-card-row">
                    <span className="decision-card-label">Qté commander</span>
                    <span className="decision-card-value">{it.reorderNeeded ? it.orderQty : '-'}</span>
                  </div>
                  <div className="decision-card-row">
                    <span className="decision-card-label">Quand</span>
                    <span className={`decision-card-value ${status}`}>
                      {it.reorderNeeded ? (it.orderDate <= now ? 'Maintenant' : it.orderDate.toLocaleDateString()) : '-'}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

