import React, { useEffect, useState } from 'react'
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
          {/* Desktop Table View */}
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

          {/* Mobile Card View */}
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
