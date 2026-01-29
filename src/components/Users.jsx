/*import React, { useEffect, useState } from 'react'
import { refreshUsers, createUser, updateUser, deleteUser, subscribe } from '../lib/usersStore'
import { showToast } from '../lib/toast'
import { logAction } from '../lib/actionLogger'
import IconButton from './IconButton'
import { getToken } from '../lib/authStore'

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ username: '', displayName: '', password: '', role: 'employee', store: 'majunga' })
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    setLoading(true)
    refreshUsers().catch(()=>{}).finally(() => {
      if (!mounted) return
      setLoading(false)
    })
    const unsub = subscribe(list => setUsers(list || []))
    // initial read from cache
    // subscribe will populate
    return () => unsub()
  }, [])

  function openCreate() {
    setEditing(null)
    setForm({ username: '', displayName: '', password: '', role: 'employee', store: 'majunga' })
    setError('')
    setShowForm(true)
  }

  function openEdit(u) {
    setEditing(u)
    setForm({ username: u.username, displayName: u.displayName || '', password: '', role: u.role || 'employee', store: u.store || 'majunga' })
    setError('')
    setShowForm(true)
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const token = getToken()
    try {
      if (editing) {
        const payload = { displayName: form.displayName, role: form.role, store: form.store }
        if (form.password) payload.password = form.password
        await updateUser(editing.id, payload, token)
        await logAction('MODIFICATION_UTILISATEUR', `Utilisateur ${editing.username} modifié - Rôle: ${form.role}, Magasin: ${form.store}`)
        showToast('success', 'Utilisateur mis à jour')
      } else {
        if (!form.username || !form.password) { setError('Username and password required'); return }
        await createUser({ username: form.username, password: form.password, displayName: form.displayName, role: form.role, store: form.store }, token)
        await logAction('CREATION_UTILISATEUR', `Nouvel utilisateur créé: ${form.username} (${form.displayName}) - Rôle: ${form.role}`)
        showToast('success', 'Utilisateur créé')
      }
      setShowForm(false)
      await refreshUsers()
    } catch (err) {
      setError(err.message || 'Erreur')
      showToast('error', err.message || 'Erreur')
    }
  }

  async function handleDelete(u) {
    if (!confirm(`Supprimer l'utilisateur ${u.username} ?`)) return
    const token = getToken()
    try {
      await deleteUser(u.id, token)
      await logAction('SUPPRESSION_UTILISATEUR', `Utilisateur ${u.username} supprimé`)
      await refreshUsers()
      showToast('success', 'Utilisateur supprimé')
    } catch (err) {
      alert(err.message || 'Erreur suppression')
      showToast('error', err.message || 'Erreur suppression')
    }
  }

  return (
    <div className="users-container">
      <div className="users-header">
        <h2>Utilisateurs</h2>
        <div className="users-controls">
          <IconButton onClick={() => refreshUsers()} tooltip="Rafraîchir" className="icon-btn-secondary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" style={{width:18, height:18}}>
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.13-3.36L23 10" />
              <path d="M20.49 15a9 9 0 0 1-14.13 3.36L1 14" />
            </svg>
          </IconButton>
          <IconButton onClick={openCreate} className="btn btn-primary" tooltip="Créer utilisateur">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" style={{width:18, height:18}}>
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </IconButton>
        </div>
      </div>

      {loading ? <div>Chargement...</div> : (
        <>
          
          
          <div className="card hidden-on-mobile">
            
            <div className="table-responsive">
              <table className="users-table">
                <thead>
                  <tr><th>Id</th><th>Nom d'utilisateur</th><th>Nom affiché</th><th>Rôle</th><th>Boutique</th><th></th></tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td data-label="Id">
                        <span style={{background: '#f3f4f6', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace'}}>{u.id}</span>
                      </td>
                      <td data-label="Nom d'utilisateur">{u.username}</td>
                      <td data-label="Nom affiché">{u.displayName || '—'}</td>
                      <td data-label="Rôle">
                        <span className={`role-badge ${u.role}`}>{u.role}</span>
                      </td>
                      <td data-label="Boutique">
                        <span className="store-badge">{u.store}</span>
                      </td>
                      <td data-label="Actions" className="actions-cell">
                        <IconButton onClick={() => openEdit(u)} className="ghost" tooltip="Modifier">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                          </svg>
                        </IconButton>
                        {u.username !== 'admin' && (
                          <IconButton onClick={() => handleDelete(u)} className="ghost" tooltip="Supprimer">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                              <path d="M10 11v6" />
                              <path d="M14 11v6" />
                              <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                            </svg>
                          </IconButton>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          
          <div className="user-cards-grid visible-on-mobile">
            {users.map(u => (
              <div key={u.id} className="user-card">
                
                <div className="user-card-content">
                  
                    <span className="iconify" data-icon="mdi:account-circle" style={{fontSize: '48px'}}></span>
                  
                  <div className='user-content-text'>
                    <h3 className="user-card-name">{u.displayName || u.username}</h3>
                    <p className="user-card-username">@{u.username}</p>
                  </div>
                  <div className="user-card-badges">
                    <span className={`role-badge ${u.role}`}>{u.role}</span>
                    <span className="store-badge">{u.store}</span>
                  </div>
                </div>
                <div className="user-card-actions">
                  <button 
                    onClick={() => openEdit(u)} 
                    className="user-card-btn user-card-btn-edit"
                    title="Modifier"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                    Modifier
                  </button>
                  {u.username !== 'admin' && (
                    <button 
                      onClick={() => handleDelete(u)} 
                      className="user-card-btn user-card-btn-delete"
                      title="Supprimer"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                        <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                      </svg>
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showForm && (
        <div className={`modal-overlay show`} onClick={() => setShowForm(false)}>
          <div className={`modal-dialog card show`} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleSubmit}>
              <h3 style={{marginTop:0}}>{editing ? 'Modifier utilisateur' : 'Créer utilisateur'}</h3>
              <div className="form-grid">
                <div className="form-field">
                  <label>Nom d'utilisateur</label>
                  <input name="username" value={form.username} onChange={handleChange} disabled={!!editing} />
                </div>
                <div className="form-field">
                  <label>Nom affiché</label>
                  <input name="displayName" value={form.displayName} onChange={handleChange} />
                </div>
                <div className="form-field">
                  <label>Mot de passe {editing ? '(laisser vide pour garder)' : ''}</label>
                  <input name="password" value={form.password} onChange={handleChange} />
                </div>
                <div className="form-field">
                  <label>Rôle</label>
                  <select name="role" value={form.role} onChange={handleChange}>
                    <option value="admin">admin</option>
                    <option value="manager">manager</option>
                    <option value="employee">employee</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>Boutique</label>
                  <input name="store" value={form.store} onChange={handleChange} />
                </div>
              </div>
              {error && <div style={{color:'crimson', marginTop:8}}>{error}</div>}
              <div style={{marginTop:12, display:'flex', gap:8, justifyContent:'flex-end'}}>
                <button type="submit" className="btn btn-primary">{editing ? 'Sauvegarder' : 'Créer'}</button>
                <button type="button" onClick={()=>{ setShowForm(false); setEditing(null) }} className="btn">Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
*/

import React, { useEffect, useState } from 'react'
import { refreshUsers, createUser, updateUser, deleteUser, subscribe } from '../lib/usersStore'
import { showToast } from '../lib/toast'
import { logAction } from '../lib/actionLogger'
import IconButton from './IconButton'
import { getToken } from '../lib/authStore'
import { 
  UserPlus, RefreshCw, ShieldCheck, MapPin, 
  User, Mail, Trash2, Edit2, X, Lock, Fingerprint
} from 'lucide-react'

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ username: '', displayName: '', password: '', role: 'employee', store: 'majunga' })
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    setLoading(true)
    refreshUsers().catch(()=>{}).finally(() => {
      if (mounted) setLoading(false)
    })
    const unsub = subscribe(list => setUsers(list || []))
    return () => unsub()
  }, [])

  const handleOpenForm = (u = null) => {
    if (u) {
      setEditing(u)
      setForm({ username: u.username, displayName: u.displayName || '', password: '', role: u.role || 'employee', store: u.store || 'majunga' })
    } else {
      setEditing(null)
      setForm({ username: '', displayName: '', password: '', role: 'employee', store: 'majunga' })
    }
    setError('')
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const token = getToken()
    try {
      if (editing) {
        const payload = { displayName: form.displayName, role: form.role, store: form.store }
        if (form.password) payload.password = form.password
        await updateUser(editing.id, payload, token)
        showToast('success', 'Profil mis à jour')
      } else {
        if (!form.username || !form.password) throw new Error('Identifiant et mot de passe requis')
        await createUser(form, token)
        showToast('success', 'Nouvel utilisateur créé')
      }
      setShowForm(false)
      refreshUsers()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="max-w-7xl mx-15 p-4 sm:p-6 lg:p-8 space-y-8 bg-gray-50/50 min-h-screen">
      
      {/* Header Professionnel */}
      <div className="flex flex-col mx-15 sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Utilisateurs</h1>
          <p className="text-gray-500 font-medium">Contrôlez les accès et les permissions de votre équipe.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => refreshUsers()} 
            className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-white rounded-xl border border-transparent hover:border-gray-200 transition-all shadow-sm bg-white"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
          <button 
            onClick={() => handleOpenForm()} 
            className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-gray-200 transition-all active:scale-95"
          >
            <UserPlus size={19} />
            <span>Ajouter un membre</span>
          </button>
        </div>
      </div>

      {/* Grid de Cartes Utilisateurs */}
      {loading && users.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1,2,3].map(i => <div key={i} className="h-48 bg-gray-200 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {users.map(u => (
            <div key={u.id} className="group bg-white border border-gray-200 rounded-2xl p-6 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 relative">
              
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl shadow-inner ${
                  u.role === 'admin' ? 'bg-indigo-50 text-indigo-600' : 'bg-blue-50 text-blue-600'
                }`}>
                  {u.role === 'admin' ? <ShieldCheck size={28} /> : <User size={28} />}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleOpenForm(u)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <Edit2 size={16} />
                  </button>
                  {u.username !== 'admin' && (
                    <button onClick={() => handleDelete(u)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-bold text-gray-900 truncate">{u.displayName || u.username}</h3>
                <div className="flex items-center gap-1.5 text-sm text-gray-400 font-medium">
                  <Mail size={14} />
                  <span>{u.username}</span>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border shadow-sm ${
                  u.role === 'admin' ? 'bg-indigo-600 text-white border-indigo-600' : 
                  u.role === 'manager' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                  'bg-gray-50 text-gray-600 border-gray-200'
                }`}>
                  {u.role}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-500 shadow-sm">
                  <MapPin size={10} /> {u.store}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal - Design Side-Panel ou Center-Card */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md" onClick={() => setShowForm(false)} />
          
          <div className="relative bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden transform transition-all animate-in slide-in-from-bottom-8 duration-300">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-200">
                  <Fingerprint size={24} />
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  {editing ? 'Modifier le membre' : 'Nouveau membre'}
                </h3>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 text-gray-400 hover:bg-white hover:text-gray-600 rounded-full transition-all border border-transparent hover:border-gray-200">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Nom d'affichage</label>
                  <input 
                    name="displayName" 
                    value={form.displayName} 
                    onChange={e => setForm({...form, displayName: e.target.value})}
                    placeholder="Jean Dupont"
                    className="w-full bg-gray-50 border-gray-200 border rounded-2xl p-3 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-gray-300"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Identifiant</label>
                  <input 
                    name="username" 
                    value={form.username} 
                    onChange={e => setForm({...form, username: e.target.value})}
                    disabled={!!editing}
                    className="w-full bg-gray-50 border-gray-200 border rounded-2xl p-3 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Mot de passe</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                    <input 
                      name="password" 
                      type="password"
                      value={form.password} 
                      onChange={e => setForm({...form, password: e.target.value})}
                      placeholder={editing ? "••••••••" : "Requis"}
                      className="w-full bg-gray-50 border-gray-200 border rounded-2xl p-3 pl-10 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Rôle</label>
                  <select 
                    name="role" 
                    value={form.role} 
                    onChange={e => setForm({...form, role: e.target.value})}
                    className="w-full bg-gray-50 border-gray-200 border rounded-2xl p-3 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                  >
                    <option value="admin">Administrateur</option>
                    <option value="manager">Manager</option>
                    <option value="employee">Employé</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Boutique</label>
                  <input 
                    name="store" 
                    value={form.store} 
                    onChange={e => setForm({...form, store: e.target.value})}
                    className="w-full bg-gray-50 border-gray-200 border rounded-2xl p-3 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 text-red-600 text-sm rounded-2xl border border-red-100 flex items-center gap-2 animate-bounce">
                  <X size={16} className="shrink-0" /> {error}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowForm(false)} 
                  className="flex-1 px-6 py-3.5 text-gray-500 font-bold hover:bg-gray-100 rounded-2xl transition-all"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xl shadow-blue-200 transition-all active:scale-95"
                >
                  {editing ? 'Mettre à jour' : 'Créer le compte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
