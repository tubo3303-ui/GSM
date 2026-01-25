import React, { useEffect, useState } from 'react'
import { getProducts, subscribe, getProductsForStore, setReorderRequested, isReorderRequested, refreshProducts } from '../lib/productsStore'
import { refreshSales } from '../lib/salesStore'
import { useStore } from '../lib/StoreContext'
import IconButton from './IconButton'

const DEFAULT_THRESHOLD = 5

export default function LowStockAlerts() {
  const [low, setLow] = useState([])
  const [loading, setLoading] = useState(false)
  const [notifyEnabled, setNotifyEnabled] = useState(false)
  const { currentStore } = useStore()

  useEffect(() => {
    let mounted = true
    const compute = () => {
      const list = getProductsForStore(currentStore)
      const items = list.filter(p => (Number(p.qty) || 0) < (p.reorderThreshold || DEFAULT_THRESHOLD))
      setLow(items)
    }

    setLoading(true)
    Promise.all([refreshProducts(currentStore).catch(()=>{}), refreshSales(currentStore).catch(()=>{})]).finally(() => {
      if (!mounted) return
      compute()
      setLoading(false)
    })

    const unsub = subscribe(compute)
    return () => { mounted = false; unsub() }
  }, [currentStore])

  function markOrdered(sku) {
    // mark reorder for current store (or all)
    setReorderRequested(sku, currentStore === 'all' ? 'all' : currentStore, true)
  }

  function clearOrdered(sku) {
    setReorderRequested(sku, currentStore === 'all' ? 'all' : currentStore, false)
  }

  async function enableNotifications() {
    if (!('Notification' in window)) return
    const perm = await Notification.requestPermission()
    setNotifyEnabled(perm === 'granted')
    if (perm === 'granted' && low.length) {
      low.forEach(p => {
        const title = currentStore && currentStore !== 'all' ? `Stock faible (${currentStore}): ${p.sku}` : `Stock faible: ${p.sku}`
        new Notification(title, { body: `${p.name} — Qté: ${p.qty}` })
      })
    }
  }

  if (loading) return <div className="card">Loading alerts...</div>
  if (!low.length) return null

  return (
    <div className="card" style={{marginBottom:12}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <h3 style={{margin:0, color:'#dc2626'}}>Alertes: stock faible ({low.length})</h3>
        <div style={{display:'flex', gap:8}}>
          <button className="btn" onClick={enableNotifications}>{notifyEnabled ? 'Notifications activées' : 'Activer notifications'}</button>
        </div>
      </div>
      <div style={{marginTop:8}}>
        {low.map(p => (
          <div key={p.sku} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderTop:'1px solid #f3f4f6'}}>
              <div>
              <div>{p.sku} — {p.name}</div>
              <div style={{color:'#6b7280', fontSize:13}}>Qté: {p.qty} • Seuil: {p.reorderThreshold || DEFAULT_THRESHOLD}</div>
            </div>
            <div style={{display:'flex', gap:8}}>
              {isReorderRequested(p, currentStore) ? (
                <IconButton onClick={() => clearOrdered(p.sku)} className="" style={{padding:'8px 12px'}} tooltip="Annuler réappro">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" style={{width:16, height:16, marginRight:8}}>
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M8 12h8" />
                  </svg>
                  <span style={{marginLeft:6}}>Annuler réappro</span>
                </IconButton>
              ) : (
                <IconButton onClick={() => markOrdered(p.sku)} className="" style={{padding:'8px 12px', background:'#2563eb', color:'#fff'}} tooltip="Demander réappro">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" style={{width:16, height:16, marginRight:8}}>
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M12 8v8" />
                    <path d="M8 12h8" />
                  </svg>
                  <span style={{marginLeft:6}}>Demander réappro</span>
                </IconButton>
              )}
              <button className="btn" onClick={() => clearOrdered(p.sku)}>Ignorer</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
