import React, { useEffect, useState } from 'react'
import { getProducts, subscribe, getProductsForStore, refreshProducts } from '../lib/productsStore'
import { refreshSales } from '../lib/salesStore'
import { useStore } from '../lib/StoreContext'

function computeKpis(list) {
  const totalItems = list.reduce((s, p) => s + (Number(p.qty) || 0), 0)
  const totalValue = list.reduce((s, p) => s + ((Number(p.qty) || 0) * (Number(p.price) || 0)), 0)
  const productsCount = list.length
  const lowStock = list.filter(p => (Number(p.qty) || 0) < 5).length
  return { totalItems, totalValue, productsCount, lowStock }
}

export default function StockKpis() {
  const { currentStore } = useStore()
  const [kpis, setKpis] = useState(() => computeKpis([]))
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let mounted = true
    const handler = () => setKpis(computeKpis(getProductsForStore(currentStore)))
    setLoading(true)
    Promise.all([refreshProducts(currentStore).catch(()=>{}), refreshSales(currentStore).catch(()=>{})]).finally(() => {
      if (!mounted) return
      handler()
      setLoading(false)
    })
    const unsub = subscribe(handler)
    return () => { mounted = false; unsub() }
  }, [currentStore])

  return (
    <div className="kpi-grid-stock">
      <div className="kpi-card kpi-products">
        <div className="kpi-header">
          <div className="kpi-icon products-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
          </div>
          <div className="kpi-title">Produits</div>
        </div>
        <div className="kpi-value">{loading ? '…' : kpis.productsCount}</div>
        <div className="kpi-unit">total</div>
      </div>
      
      <div className="kpi-card kpi-quantity">
        <div className="kpi-header">
          <div className="kpi-icon quantity-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </div>
          <div className="kpi-title">Quantité totale</div>
        </div>
        <div className="kpi-value">{loading ? '…' : kpis.totalItems}</div>
        <div className="kpi-unit">unités</div>
      </div>
      
      <div className="kpi-card kpi-value-stock">
        <div className="kpi-header">
          <div className="kpi-icon value-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
          <div className="kpi-title">Valeur totale</div>
        </div>
        <div className="kpi-value">{loading ? '…' : kpis.totalValue.toLocaleString('fr-FR', {maximumFractionDigits: 2})}</div>
        <div className="kpi-unit">Ar</div>
      </div>
      
      <div className="kpi-card kpi-low-stock">
        <div className="kpi-header">
          <div className="kpi-icon lowstock-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3.05h16.94a2 2 0 0 0 1.71-3.05L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <div className="kpi-title">Bas stock (&lt;5)</div>
        </div>
        <div className="kpi-value">{loading ? '…' : kpis.lowStock}</div>
        <div className="kpi-unit">alerte</div>
      </div>
    </div>
  )
}
