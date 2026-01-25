import React, { useState, useEffect } from 'react'
import { getProducts, setProducts as storeSetProducts, subscribe, getProductsForStore, toggleReorderRequested, isReorderRequested, refreshProducts } from '../lib/productsStore'
import { refreshSales } from '../lib/salesStore'
import IconButton from './IconButton'
import { showToast } from '../lib/toast'
import { getToken } from '../lib/authStore'
import { logAction } from '../lib/actionLogger'
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'
import { useStore } from '../lib/StoreContext'
import { AlertCircle, Package, Edit2, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react'

export default function Stock() {
  const { currentStore } = useStore()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const DEFAULT_THRESHOLD = 5
  const [q, setQ] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ sku: '', name: '', model: '', compatibleModels: '', qty: '', location: '', category: '', supplier: '', cost: '', margin: '' })
  const [filters, setFilters] = useState({ model: '', location: '', category: '' })
  const [sortPrice, setSortPrice] = useState('')
  const [editingSku, setEditingSku] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    const update = () => setProducts(getProductsForStore(currentStore))
    setLoading(true)
    Promise.all([refreshProducts(currentStore).catch(()=>{}), refreshSales(currentStore).catch(()=>{})]).finally(() => {
      if (!mounted) return
      update()
      setLoading(false)
    })
    const unsub = subscribe(update)
    return () => { mounted = false; unsub() }
  }, [currentStore])

  if (loading) return <div>Loading stock...</div>

  const filtered = products.filter(p => {
    const qMatch = (!q) || p.name.toLowerCase().includes(q.toLowerCase()) || p.sku.toLowerCase().includes(q.toLowerCase())
    if (!qMatch) return false

    // model filter
    if (filters.model && !(p.model || '').toLowerCase().includes(filters.model.toLowerCase())) return false

    // location filter
    if (filters.location && !(p.location || '').toLowerCase().includes(filters.location.toLowerCase())) return false

    // category filter
    if (filters.category && (p.category || '').toLowerCase() !== filters.category.toLowerCase()) return false

    return true
  })

  // apply sorting by price if requested
  const displayed = (() => {
    const copy = filtered.slice()
    if (sortPrice === 'asc') return copy.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0))
    if (sortPrice === 'desc') return copy.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0))
    return copy
  })()

  function handleFilterChange(e) {
    const { name, value } = e.target
    setFilters(f => ({ ...f, [name]: value }))
  }

  function resetFilters() {
    setFilters({ model: '', location: '', category: '' })
    setSortPrice('')
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    setError('')
  }

  async function handleAdd(e) {
    e.preventDefault()
    // basic validation
    if (!form.sku.trim() || !form.name.trim()) { setError('SKU et nom requis'); return }
    const token = getToken()
    try {
      if (editingSku) {
        // update existing product via API
        // Si on modifie cost ou margin et qu'on est dans une boutique spécifique, mettre à jour par store
        const hasStorePricing = (form.cost || form.margin) && currentStore && currentStore !== 'all'
        
        const res = await fetch(`${API_BASE}/api/products/${encodeURIComponent(editingSku)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({
            ...(hasStorePricing && { store: currentStore }), // Ajouter store pour les mises à jour par boutique
            sku: !hasStorePricing ? form.sku.trim() : undefined,
            name: !hasStorePricing ? form.name.trim() : undefined,
            model: !hasStorePricing ? (form.model.trim() || null) : undefined,
            compatibleModels: !hasStorePricing ? (form.compatibleModels ? form.compatibleModels.split(',').map(s=>s.trim()).filter(Boolean) : []) : undefined,
            location: !hasStorePricing ? (form.location.trim() || null) : undefined,
            category: !hasStorePricing ? (form.category.trim() || null) : undefined,
            supplier: !hasStorePricing ? (form.supplier.trim() || null) : undefined,
            cost: form.cost || null,
            margin: form.margin || null,
            qty: Number(form.qty) || 0,
            ...(hasStorePricing ? {} : { stocks: [{ store: currentStore === 'all' ? 'majunga' : currentStore, qty: Number(form.qty) || 0 }] })
          })
        })
        if (!res.ok) {
          const err = await res.json().catch(()=>({ error: 'Erreur mise à jour' }))
          setError(err.error || 'Erreur lors de la mise à jour')
          return
        }
        await logAction('MISE_A_JOUR_PRODUIT', `Produit ${editingSku} mis à jour: ${form.name}`)
        await refreshProducts(currentStore)
        showToast('success', 'Produit mis à jour')
        setEditingSku(null)
        setForm({ sku: '', name: '', model: '', compatibleModels: '', qty: '', location: '', category: '', supplier: '', cost: '', margin: '' })
        return
      }

      // create new product via API
      const stockKey = currentStore === 'all' ? 'majunga' : currentStore
      const payload = {
        sku: form.sku.trim(),
        name: form.name.trim(),
        model: form.model.trim() || null,
        compatibleModels: form.compatibleModels ? form.compatibleModels.split(',').map(s=>s.trim()).filter(Boolean) : [],
        location: form.location.trim() || null,
        category: form.category.trim() || null,
        supplier: form.supplier.trim() || null,
        cost: form.cost || null,
        margin: form.margin || null,
        stocks: [{ store: stockKey, qty: Number(form.qty) || 0 }]
      }
      const res = await fetch(`${API_BASE}/api/products`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(payload) })
      if (!res.ok) {
        const err = await res.json().catch(()=>({ error: 'Erreur création' }))
        setError(err.error || 'Erreur lors de la création')
        return
      }
      await logAction('CREATION_PRODUIT', `Produit créé: ${form.sku} - ${form.name} (Qté: ${form.qty})`)
      await refreshProducts(currentStore)
      showToast('success', 'Produit créé')
      setForm({ sku: '', name: '', model: '', compatibleModels: '', qty: '', location: '', category: '', supplier: '', cost: '', margin: '' })
    } catch (e) {
      setError('Erreur réseau')
    }
  }

  function handleEdit(sku) {
    const p = products.find(x => x.sku === sku)
    if (!p) return
    setForm({ sku: p.sku, name: p.name, model: p.model || '', compatibleModels: (p.compatibleModels || []).join(', '), qty: String(p.qty || ''), location: p.location || '', category: p.category || '', supplier: p.supplier || '', cost: p.cost || '', margin: p.margin || '' })
    setEditingSku(sku)
    setError('')
    // open the modal form for editing
    setShowForm(true)
  }

  function handleDelete(sku) {
    if (!confirm(`Supprimer le produit ${sku} ?`)) return
    const token = getToken()
    fetch(`${API_BASE}/api/products/${encodeURIComponent(sku)}`, { method: 'DELETE', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
      .then(async res => {
        if (!res.ok) {
          const err = await res.json().catch(()=>({ error: 'Erreur suppression' }))
          alert(err.error || 'Erreur lors de la suppression')
          return
        }
        await logAction('SUPPRESSION_PRODUIT', `Produit ${sku} supprimé`)
        await refreshProducts(currentStore)
        setProducts(getProductsForStore(currentStore))
        showToast('success', 'Produit supprimé')
      }).catch(()=>alert('Erreur réseau'))
  }

  function toggleReorder(sku) {
    try {
      // toggle per-store (if currentStore is 'all' we toggle for all stores)
      toggleReorderRequested(sku, currentStore === 'all' ? 'all' : currentStore)
      setProducts(getProductsForStore(currentStore))
    } catch (e) { /* ignore */ }
  }

  return (
    <div className="stock-container">
      <div className="stock-header">
        <h2>Stock</h2>
        <div className="stock-controls">
          <input placeholder="Rechercher produit" value={q} onChange={e=>setQ(e.target.value)} className="search-input-stock" />
          <div className="stock-buttons-group">
            <button onClick={() => {
            const delimiter = ';'
            const headers = ['SKU','Produit','Modèle','Compatibles','Qté','Emplacement','Prix d\'achat','Marge bénéficière','Prix de vente','Catégorie','Fournisseur']
            const rows = products.map(p => [p.sku, p.name, p.model || '', (p.compatibleModels||[]).join(', '), p.qty, p.location || '', p.cost || '', p.margin || '', p.price || '', p.category || '', p.supplier || ''])
            const esc = v => (v == null ? '' : String(v).replace(/"/g, '""'))
            const csvBody = [headers.join(delimiter)].concat(rows.map(r => r.map(c => `"${esc(c)}"`).join(delimiter))).join('\n')
            const csv = '\uFEFF' + csvBody
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'stock.csv'
            document.body.appendChild(a)
            a.click()
            a.remove()
            URL.revokeObjectURL(url)
          }} className="btn btn-secondary stock-export-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" style={{width:16, height:16}}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              <span>Exporter</span>
            </button>
          <button onClick={() => { setShowForm(true); setEditingSku(null); setForm({ sku: '', name: '', model: '', compatibleModels: '', qty: '', location: '', category: '', supplier: '', cost: '', margin: '' }) }} className="btn btn-primary stock-add-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" style={{width:16, height:16}}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            <span>Ajouter</span>
          </button>          </div>        </div>
      </div>

      <div className="stock-filters-section">
          <div className="stock-filters">
          <input name="model" placeholder="Filtrer par modèle" value={filters.model} onChange={handleFilterChange} className="filter-input" />
          <input name="location" placeholder="Filtrer par emplacement" value={filters.location} onChange={handleFilterChange} className="filter-input" />
          <select name="category" value={filters.category} onChange={handleFilterChange} className="filter-select">
            <option value="">Toutes catégories</option>
            {Array.from(new Set(products.map(p => p.category || 'Autre'))).map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select name="sortPrice" value={sortPrice} onChange={e => setSortPrice(e.target.value)} className="filter-select">
            <option value="">Trier par prix</option>
            <option value="asc">Prix croissant</option>
            <option value="desc">Prix décroissant</option>
          </select>
          <button type="button" onClick={resetFilters} className="icon-btn secondary" title="Réinitialiser" aria-label="Réinitialiser">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 12a9 9 0 1 1-3-6.71" />
              <path d="M21 3v6h-6" />
            </svg>
          </button>
        </div>

        {/* Product Cards Grid for Mobile */}
        <div className="stock-products-grid">
          {displayed.map(p => {
            const thresh = (p.reorderThreshold != null) ? Number(p.reorderThreshold) : DEFAULT_THRESHOLD
            const qty = Number(p.qty || 0)
            const isLow = qty > 0 && qty < thresh
            const isCritical = qty <= 0
            const requested = isReorderRequested(p, currentStore)

            let statusBadge = { label: 'En Stock', class: 'normal' }
            if (isCritical) {
              statusBadge = { label: 'Stock Critique', class: 'critical' }
            } 
            else if (isLow) {
              statusBadge = { label: 'Stock Faible', class: 'low' }
            }

            return (
              <div key={p.sku} className="product-card">
                <div className="product-card-header">
                  <div className="product-card-title">
                    <div className="product-card-name">{p.name}</div>
                    <div className="product-card-sku">{p.sku}</div>
                  </div>
                  <div className="product-card-badges">
                    <span className={`product-status-badge ${statusBadge.class}`}>
                      {isCritical ? <AlertCircle size={14} /> : isLow ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />} {statusBadge.label}
                    </span>
                    {requested && <span className="product-status-badge reorder"><Package size={14} /> Réappro</span>}
                  </div>
                </div>

                <div className="product-card-info">
                  <div className="product-info-item">
                    <span className="product-info-label">Quantité</span>
                    <span className={`product-info-value quantity ${isCritical ? 'critical-stock' : isLow ? 'low-stock' : ''}`}>
                      {String(p.qty || 0)}
                    </span>
                  </div>
                  <div className="product-info-item">
                    <span className="product-info-label">Catégorie</span>
                    <span className="product-info-value">{p.category || '-'}</span>
                  </div>
                  <div className="product-info-item">
                    <span className="product-info-label">Prix</span>
                    <span className="product-info-value">{p.price ? `${Number(p.price).toFixed(2)}` : '-'}</span>
                  </div>
                  <div className="product-info-item">
                    <span className="product-info-label">Coût</span>
                    <span className="product-info-value">{p.cost != null ? `${Number(p.cost).toFixed(2)}` : '-'}</span>
                  </div>
                  <div className="product-info-item">
                    <span className="product-info-label">Modèle</span>
                    <span className="product-info-value">{p.model || '-'}</span>
                  </div>
                  <div className="product-info-item">
                    <span className="product-info-label">Emplacement</span>
                    <span className="product-info-value">{p.location || '-'}</span>
                  </div>
                  <div className="product-info-item">
                    <span className="product-info-label">Fournisseur</span>
                    <span className="product-info-value">{p.supplier || '-'}</span>
                  </div>
                  {p.compatibleModels && p.compatibleModels.length > 0 && (
                    <div className="product-info-item product-info-item-full">
                      <span className="product-info-label">Modèles Compatibles</span>
                      <span className="product-info-value">{p.compatibleModels.join(', ')}</span>
                    </div>
                  )}
                </div>

                <div className="product-card-actions">
                  <button className="product-card-btn product-card-btn-edit" onClick={() => handleEdit(p.sku)}>
                    <Edit2 size={16} />
                    Modifier
                  </button>
                  <button className="product-card-btn product-card-btn-delete" onClick={() => handleDelete(p.sku)} title="Supprimer">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="card">
          <div className="table-responsive">
            <table className="stock-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Produit</th>
                <th>Modèle</th>
                <th>Compatibles</th>
                <th>Qté</th>
                <th>Emplacement</th>
                <th>Prix d'achat</th>
                <th>Marge bénéficière</th>
                <th>Prix de vente</th>
                <th>Catégorie</th>
                <th>Fournisseur</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(p => {
                const thresh = (p.reorderThreshold != null) ? Number(p.reorderThreshold) : DEFAULT_THRESHOLD
                const qty = Number(p.qty || 0)
                const isLow = qty > 0 && qty < thresh
                const isCritical = qty <= 0
                const classes = []
                if (p.sku === editingSku) classes.push('editing-row')
                if (isCritical) classes.push('critical-stock')
                else if (isLow) classes.push('low-stock')
                const requested = isReorderRequested(p, currentStore)
                if (requested) classes.push('reorder-row')
                return (
                <tr key={p.sku} className={classes.join(' ')}>
                  <td data-label="SKU">
                      {(isCritical) ? <span className="status-dot critical" /> : (isLow ? <span className="status-dot low" /> : null)}
                      {p.sku}
                      {requested && <span className="reorder-badge">Réappro demandé</span>}
                    </td>
                  <td data-label="Produit">{p.name}</td>
                  <td data-label="Modèle">{p.model || '-'}</td>
                  <td data-label="Compatibles">{(p.compatibleModels && p.compatibleModels.length) ? p.compatibleModels.join(', ') : '-'}</td>
                  <td className="qty" data-label="Qté">{String(p.qty || 0)}</td>
                  <td data-label="Emplacement">{p.location}</td>
                  <td data-label="Prix d'achat">{p.cost != null ? `${Number(p.cost).toFixed(2)}` : '-'}</td>
                  <td data-label="Marge bénéficière">{p.margin != null ? `${Number(p.margin).toFixed(2)}` : '-'}</td>
                  <td data-label="Prix de vente">{p.price ? `${Number(p.price).toFixed(2)}` : '-'}</td>
                  <td data-label="Catégorie">{p.category}</td>
                  <td data-label="Fournisseur">{p.supplier}</td>
                  <td data-label="Actions" className="actions-cell">
                    <IconButton onClick={()=>handleEdit(p.sku)} className="ghost" tooltip="Modifier">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                    </IconButton>
                    <IconButton onClick={() => toggleReorder(p.sku)} className="ghost" tooltip={requested ? 'Annuler réappro' : 'Marquer réappro'}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" style={{width:16, height:16}}>
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        {requested ? <path d="M8 12h8" /> : <>
                          <path d="M12 8v8" />
                          <path d="M8 12h8" />
                        </>}
                      </svg>
                    </IconButton>
                    <IconButton onClick={()=>handleDelete(p.sku)} className="ghost" tooltip="Supprimer">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                        <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                      </svg>
                    </IconButton>
                  </td>
                </tr>
              )})}
            </tbody>
            </table>
          </div>
        </div>
      </div>

      

      {showForm && (
        <div className={`modal-overlay show`} onClick={() => setShowForm(false)}>
          <div className={`modal-dialog card show`} onClick={e => e.stopPropagation()}>
            <form onSubmit={(e)=>{ handleAdd(e); setShowForm(false); }}>
              <h3 style={{marginTop:0}}>{editingSku ? 'Modifier le produit' : 'Ajouter un produit'}</h3>
              <div className="form-grid">
                <div className="form-field">
                  <label>SKU</label>
                  <input name="sku" placeholder="Ex: P-010" value={form.sku} onChange={handleChange} />
                </div>
                <div className="form-field">
                  <label>Nom du produit</label>
                  <input name="name" placeholder="Nom descriptif" value={form.name} onChange={handleChange} />
                </div>

                <div className="form-field">
                  <label>Modèle</label>
                  <input name="model" placeholder="Ex: RES-10K" value={form.model} onChange={handleChange} />
                </div>
                <div className="form-field">
                  <label>Modèles compatibles</label>
                  <input name="compatibleModels" placeholder="Séparez par des virgules (ex: MB-100, MB-101)" value={form.compatibleModels} onChange={handleChange} />
                </div>

                <div className="form-field">
                  <label>Quantité</label>
                  <input name="qty" placeholder="0" value={form.qty} onChange={handleChange} />
                </div>
                <div className="form-field">
                  <label>Emplacement</label>
                  <input name="location" placeholder="Entrepôt A" value={form.location} onChange={handleChange} />
                </div>

                <div className="form-field">
                  <label>Catégorie</label>
                  <input name="category" placeholder="Composants / Accessoires" value={form.category} onChange={handleChange} />
                </div>
                <div className="form-field">
                  <label>Fournisseur</label>
                  <input name="supplier" placeholder="Fournisseur" value={form.supplier} onChange={handleChange} />
                </div>

                <div className="form-field">
                  <label>Prix d'achat (coût)</label>
                  <input name="cost" placeholder="0.00" value={form.cost} onChange={handleChange} />
                </div>
                <div className="form-field">
                  <label>Marge bénéficière unitaire</label>
                  <input name="margin" placeholder="0.00" value={form.margin} onChange={handleChange} />
                </div>
                <div className="form-field">
                  <label>Prix de vente (calculé)</label>
                  <input type="text" disabled value={form.cost && form.margin ? (Number(form.cost) * (1 + Number(form.margin) / 100)).toFixed(2) : '-'} placeholder="Sera calculé automatiquement" />
                </div>
              </div>
              {error && <div style={{color:'crimson', marginTop:8}}>{error}</div>}
              <div style={{marginTop:12, display:'flex', gap:8, justifyContent:'flex-end'}}>
                <button type="submit" className="btn btn-primary">{editingSku ? 'Sauvegarder' : 'Ajouter'}</button>
                <button type="button" onClick={()=>{ setShowForm(false); setEditingSku(null); setForm({ sku: '', name: '', model: '', compatibleModels: '', qty: '', location: '', category: '', supplier: '', cost: '', margin: '' }) }} className="btn">Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}



