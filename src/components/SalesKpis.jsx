import React, { useEffect, useState } from 'react'
import { getSales, subscribe } from '../lib/salesStore'
import { useStore } from '../lib/StoreContext'

function compute(list) {
  const itemsSold = list.reduce((s, sale) => s + (Number(sale.qty) || 0), 0)
  const revenue = list.reduce((s, sale) => s + (Number(sale.total) || 0), 0)
  const orders = list.length
  return { itemsSold, revenue, orders }
}

export default function SalesKpis() {
  const { currentStore } = useStore()
  const [kpis, setKpis] = useState(() => compute(getSales(currentStore)))

  useEffect(() => {
    const handler = () => setKpis(compute(getSales(currentStore)))
    // initial
    handler()
    const unsub = subscribe(handler)
    return unsub
  }, [currentStore])

  return (
    <div className="kpi-grid-sales">
      <div className="kpi-card kpi-revenue">
        <div className="kpi-header">
          <div className="kpi-icon revenue-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
          <div className="kpi-title">Chiffre d'affaires {currentStore && currentStore !== 'all' ? `(${currentStore})` : ''}</div>
        </div>
        <div className="kpi-value">{kpis.revenue.toLocaleString('fr-FR', {maximumFractionDigits: 2})}</div>
        <div className="kpi-unit">Ar</div>
      </div>
      
      <div className="kpi-card kpi-sold">
        <div className="kpi-header">
          <div className="kpi-icon sold-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 1H5a2 2 0 0 0-2 2v4"></path>
              <path d="M15 1h4a2 2 0 0 1 2 2v4"></path>
              <path d="M9 23H5a2 2 0 0 1-2-2v-4"></path>
              <path d="M15 23h4a2 2 0 0 0 2-2v-4"></path>
              <circle cx="12" cy="12" r="2"></circle>
              <path d="M8 12h8M12 8v8"></path>
            </svg>
          </div>
          <div className="kpi-title">Articles vendus</div>
        </div>
        <div className="kpi-value">{kpis.itemsSold}</div>
        <div className="kpi-unit">unités</div>
      </div>
      
      <div className="kpi-card kpi-orders">
        <div className="kpi-header">
          <div className="kpi-icon orders-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
          </div>
          <div className="kpi-title">Ventes effectuées</div>
        </div>
        <div className="kpi-value">{kpis.orders}</div>
        <div className="kpi-unit">total</div>
      </div>
    </div>
  )
}
