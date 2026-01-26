
import React, { useState, useEffect } from 'react'
import { getProducts, setProducts as storeSetProducts, subscribe, getProductsForStore, setStock, refreshProducts } from '../lib/productsStore'
import { getSales, setSales as storeSetSales, subscribe as subscribeSales, refreshSales } from '../lib/salesStore'
import { getToken } from '../lib/authStore'
import { logAction } from '../lib/actionLogger'
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'
import IconButton from './IconButton'
import { useStore } from '../lib/StoreContext'
import { showToast } from '../lib/toast'



export default function Sales() {
  const [query, setQuery] = useState('')

  const { currentStore } = useStore()

  



 
    
    const [products, setProducts] = useState(() => getProductsForStore(currentStore))
    const [selectedSku, setSelectedSku] = useState('')
    const [qty, setQty] = useState(1)
    const [client, setClient] = useState('')
    const [message, setMessage] = useState('')
    const [sales, setSales] = useState(() => getSales())
    const [selectedProduct, setSelectedProduct] = useState(null)
    const [modalVisible, setModalVisible] = useState(false)
    const [showForm, setShowForm] = useState(false)

    useEffect(() => {
      const unsubP = subscribe(() => setProducts(getProductsForStore(currentStore)))
      const unsubS = subscribeSales(() => setSales(getSales(currentStore)))
      // initial load
      setProducts(getProductsForStore(currentStore))
      setSales(getSales(currentStore))
      return () => { unsubP(); unsubS() }
    }, [currentStore])

    async function handleSell(e) {
        e.preventDefault()
        setMessage('')
        if (!currentStore || currentStore === 'all') { setMessage('Sélectionnez une boutique avant d’enregistrer une vente'); return }
        if (!selectedSku) { setMessage('Sélectionnez un produit'); return }
        const product = products.find(p => p.sku === selectedSku)
        if (!product) { setMessage('Produit introuvable'); return }
        const available = Number(product.qty || 0)
        const sellQty = Number(qty) || 0
        if (available <= 0) { setMessage('Stock épuisé — impossible de vendre ce produit'); return }
        if (sellQty <= 0) { setMessage('Quantité invalide'); return }
        if (sellQty > available) { setMessage(`Quantité demandée supérieure au stock (${available})`); return }

        // call backend to record sale and update stock
        try {
          let token = null
          try { token = getToken && getToken() } catch (e) {}
          const res = await fetch(API_BASE + '/api/sales', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ sku: selectedSku, qty: sellQty, client: client || 'Client inconnu', store: currentStore }) })
          if (!res.ok) {
            const err = await res.json().catch(()=>({ error: 'Erreur enregistre vente' }))
            const msg = err.error || 'Erreur lors de l\'enregistrement'
            setMessage(msg)
            showToast('error', msg)
            return
          }
          const data = await res.json()
          setMessage('Vente enregistrée')
          showToast('success', 'Vente enregistrée')
          // Log the action
          await logAction('VENTE', `Vente de ${sellQty} x ${product.name} (SKU: ${selectedSku}) à ${client} pour ${data.sale.total} ariary`)
          // refresh products and sales cache
          try { refreshProducts(currentStore) } catch (e) {}
          try { refreshSales(currentStore) } catch (e) {}
          // reset form
          setSelectedSku('')
          setQty(1)
          setClient('')
          setShowForm(false)
        } catch (e) {
          setMessage('Erreur réseau')
        }
    }

    function showProductDetails(sku) {
      const p = products.find(x => x.sku === sku)
      if (p) setSelectedProduct(p)
      else setSelectedProduct({ sku, name: 'Produit introuvable' })
      // show modal with animation
      setTimeout(() => setModalVisible(true), 10)
    }

    function closeDetails() {
      // animate hide then clear
      setModalVisible(false)
      setTimeout(() => setSelectedProduct(null), 200)
    }

    useEffect(() => {
      if (!selectedProduct) return
      const onKey = (e) => { if (e.key === 'Escape') closeDetails() }
      window.addEventListener('keydown', onKey)
      return () => window.removeEventListener('keydown', onKey)
    }, [selectedProduct])

    function editProductFromModal(sku) {
      try { sessionStorage.setItem('gsm_focus_sku', sku) } catch (e) {}
      closeDetails()
      window.location.hash = '#/stock'
    }

    const productOptions = products.filter(p => (p.name||'').toLowerCase().includes(query.toLowerCase()) || p.sku.toLowerCase().includes(query.toLowerCase()))

    function exportToCsv(filename, headers, rows) {
      const delimiter = ';'
      const esc = v => (v == null ? '' : String(v).replace(/"/g, '""'))
      const csvBody = [headers.join(delimiter)].concat(rows.map(r => r.map(c => `"${esc(c)}"`).join(delimiter))).join('\n')
      // Add UTF-8 BOM so Excel recognizes encoding and accents correctly
      const csv = '\uFEFF' + csvBody
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    }

    function handleExportSales() {
      const headers = ['Id','Client','Produit','Qté','Prix unitaire','Total','Date','Boutique']
      const rows = sales.map(s => {
        const product = products.find(p => p.sku === s.sku)
        const pricePerUnit = product ? (product.price || '') : ''
        return [s.id, s.client, s.sku, s.qty, pricePerUnit, s.total, new Date(s.date).toLocaleString(), s.store || '']
      })
      exportToCsv('ventes.csv', headers, rows)
    }

    return (
      <div className="sales-container">
        <div className="sales-header">
          <h2 >Ventes</h2>
          <div className="sales-controls">
             <input placeholder="Rechercher produit (nom ou SKU)" value={query} onChange={e=>setQuery(e.target.value)} className="search-input-sales" />
            <button onClick={() => { setShowForm(true); setMessage(''); setSelectedSku(''); setQty(1); setClient(''); }} className="btn btn-primary sales-new-btn" title="Nouvelle vente"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" style={{width:16, height:16}}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Nouvelle vente</button>
            <button onClick={handleExportSales} className="btn sales-export-btn" title="Exporter en CSV">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" style={{width:16, height:16}}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg> Exporter CSV</button>
          </div>
        </div>

        {/* Modal Formulaire de Vente */}
        {showForm && (
          <div className={`modal-overlay show`} onClick={() => setShowForm(false)}>
            <div className={`modal-dialog card show`} onClick={e => e.stopPropagation()}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 16}}>
                <h3 style={{margin: 0}}>Nouvelle vente</h3>
                <button className="icon-btn ghost" onClick={() => setShowForm(false)} aria-label="Fermer">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={(e)=>{ handleSell(e); }} style={{display:'grid', gap:8}}>
                <div>
                  <label className="small">Client</label>
                  <input placeholder="Nom du client" value={client} onChange={e=>setClient(e.target.value)} />
                </div>

                <div>
                  <label className="small">Produit</label>
                  <select value={selectedSku} onChange={e=>setSelectedSku(e.target.value)}>
                    <option value="">-- choisir --</option>
                    {productOptions.map(p => (
                      <option key={p.sku} value={p.sku}>{p.sku} — {p.name} (Qté: {p.qty})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="small">Quantité</label>
                  <input type="number" min="1" value={qty} onChange={e=>setQty(e.target.value)} />
                </div>

                {message && <div style={{marginTop:8, padding: 8, borderRadius: 4, backgroundColor: message.includes('impossible') || message.includes('invalide') ? 'rgba(220, 38, 38, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: message.includes('impossible') || message.includes('invalide') ? '#dc2626' : '#10b981'}}>{message}</div>}

                <div style={{marginTop:12, display:'flex', gap:8}}>
                  <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 px-6 rounded-lg shadow-lg shadow-emerald-500/50 transition-all">Vendre</button>
                  <button type="button" onClick={() => { setShowForm(false); setMessage(''); setSelectedSku(''); setQty(1); setClient(''); }} className="btn">Annuler</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="sales-layout">
          <div className="sales-table-wrapper">
            <div className="card">
              <h3 style={{marginTop:10 , marginBottom:45 , fontSize:18}}>Ventes récentes</h3>
              
              {/* Desktop Table View */}
              <div className="table-responsive hidden-on-sales-mobile">
                <table className="sales-table">
                  <thead>
                    <tr><th>Id</th><th>Client</th><th>Produit</th><th>Qté</th><th>Total</th><th>Date</th><th></th></tr>
                  </thead>
                  <tbody>
                    {sales.map(s => (
                          <tr key={s.id}>
                            <td data-label="Id">{s.id}</td>
                            <td data-label="Client">{s.client}</td>
                            <td data-label="Produit">{s.sku}</td>
                            <td data-label="Qté">{s.qty}</td>
                            <td data-label="Total">{Number(s.total).toFixed(2)}  ariary</td>
                            <td data-label="Date">{new Date(s.date).toLocaleString()}</td>
                            <td data-label="Actions">
                              <IconButton className="ghost" onClick={() => showProductDetails(s.sku)} tooltip="Voir produit">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              </IconButton>
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="sales-cards-grid visible-on-sales-mobile">
                {sales.map(s => (
                  <div key={s.id} className="sales-card">
                    <div className="sales-card-header">
                      <div className="sales-card-id">#{s.id}</div>
                      <div className="sales-card-date">{new Date(s.date).toLocaleDateString()}</div>
                    </div>
                    <div className="sales-card-content">
                      <div className="sales-card-row">
                        <span className="sales-card-label">Client</span>
                        <span className="sales-card-value">{s.client}</span>
                      </div>
                      <div className="sales-card-row">
                        <span className="sales-card-label">Produit</span>
                        <span className="sales-card-value">{s.sku}</span>
                      </div>
                     
                      <div className="sales-card-row">
                        <span className="sales-card-label">Quantité</span>
                        <span className="sales-card-value">{s.qty}</span>
                      </div>
                      <div className="sales-card-row">
                        <span className="sales-card-label">Total</span>
                        <span className="sales-card-value-total">{s.total} ariary</span>
                      </div>
                      <div className="sales-card-row">
                        <span className="sales-card-label">Heure</span>
                        <span className="sales-card-value">{new Date(s.date).toLocaleTimeString()}</span>
                      </div>
                    </div>
                    <div className="sales-card-actions">
                      <button 
                        onClick={() => showProductDetails(s.sku)} 
                        className="sales-card-btn py-2 px-4 bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500 focus:ring-offset-indigo-200 text-white w-full transition ease-in duration-200 text-center text-base font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-lg "
                        title="Voir détails produit"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        Voir produit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {selectedProduct && (
                <div className={`modal-overlay ${modalVisible ? 'show' : ''}`} onClick={closeDetails}>
                  <div className={`modal-dialog card ${modalVisible ? 'show' : ''}`} onClick={e => e.stopPropagation()}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <div>
                        <div style={{fontSize:16}}>{selectedProduct.sku} — {selectedProduct.name}</div>
                        <div style={{color:'#6b7280', fontSize:13}}>{selectedProduct.model || ''} {selectedProduct.category ? `• ${selectedProduct.category}` : ''}</div>
                      </div>
                      <div style={{display:'flex', gap:8}}>
                        <button className="btn btn-primary" onClick={() => editProductFromModal(selectedProduct.sku)}>Modifier</button>
                        <button className="icon-btn ghost" onClick={closeDetails} aria-label="Fermer">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div style={{display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8, marginTop:12}}>
                      <div><strong>Quantité:</strong> {selectedProduct.qty != null ? selectedProduct.qty : '-'}</div>
                      <div><strong>Prix unitaire:</strong> {selectedProduct.price != null ? `${Number(selectedProduct.price).toFixed(2)}` : '-'}</div>
                      <div><strong>Emplacement:</strong> {selectedProduct.location || '-'}</div>
                      <div><strong>Fournisseur:</strong> {selectedProduct.supplier || '-'}</div>
                      <div style={{gridColumn:'1 / -1'}}><strong>Compatibles:</strong> {(selectedProduct.compatibleModels && selectedProduct.compatibleModels.length) ? selectedProduct.compatibleModels.join(', ') : '-'}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    
    )
  }


