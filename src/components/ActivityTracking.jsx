/*import React, { useState, useEffect } from 'react'
import { getToken } from '../lib/authStore'
import { showToast } from '../lib/toast'

export default function ActivityTracking() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all') // all, user, store
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedStore, setSelectedStore] = useState('')
  const [users, setUsers] = useState([])
  const [stores, setStores] = useState(new Set())

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const token = getToken()
      let url = '/api/logs'
      
      if (filter === 'user' && selectedUser) {
        url = `/api/logs/user/${selectedUser}`
      } else if (filter === 'store' && selectedStore) {
        url = `/api/logs/store/${selectedStore}`
      }

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch logs')
      const data = await res.json()
      setLogs(data)

      // Extract unique stores and users
      const storeSet = new Set()
      const userList = []
      data.forEach(log => {
        if (log.user) userList.push(log.user)
        if (log.store) storeSet.add(log.store)
      })
      
      // Remove duplicates from userList
      const uniqueUsers = Array.from(new Map(userList.map(u => [u.id, u])).values())
      setUsers(uniqueUsers)
      setStores(storeSet)
    } catch (e) {
      console.error('Error fetching logs:', e)
      showToast('error', 'Erreur lors du chargement des journaux')
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter)
    if (newFilter === 'all') {
      setSelectedUser('')
      setSelectedStore('')
    }
  }

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <div className="container mx-auto p-6 bg-white rounded-lg shadow">
      <h1 className="text-3xl font-bold mb-6">Suivi des actions</h1>

     
      <div className="mb-6 p-4 bg-gray-50 rounded border border-gray-200">
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => handleFilterChange('all')}
            className={`px-4 py-2 rounded ${
              filter === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Toutes les actions
          </button>
          <button
            onClick={() => handleFilterChange('user')}
            className={`px-4 py-2 rounded ${
              filter === 'user'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Par employé
          </button>
          <button
            onClick={() => handleFilterChange('store')}
            className={`px-4 py-2 rounded ${
              filter === 'store'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Par magasin
          </button>
        </div>

        {filter === 'user' && (
          <div className="flex gap-4 items-center">
            <label className="font-semibold">Employé:</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded"
            >
              <option value="">Sélectionner un employé</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.displayName} ({user.username})
                </option>
              ))}
            </select>
            <button
              onClick={fetchLogs}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              disabled={!selectedUser}
            >
              Filtrer
            </button>
          </div>
        )}

        {filter === 'store' && (
          <div className="flex gap-4 items-center">
            <label className="font-semibold">Magasin:</label>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded"
            >
              <option value="">Sélectionner un magasin</option>
              {Array.from(stores).sort().map(store => (
                <option key={store} value={store}>
                  {store}
                </option>
              ))}
            </select>
            <button
              onClick={fetchLogs}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              disabled={!selectedStore}
            >
              Filtrer
            </button>
          </div>
        )}
      </div>

     
      {loading ? (
        <div className="text-center py-8 text-gray-500">Chargement...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Aucune action enregistrée
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-gray-300 px-4 py-2 text-left">Date et heure</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Employé</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Action</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Description</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Magasin</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-2 whitespace-nowrap text-sm">
                    {formatDate(log.timestamp)}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    {log.user ? (
                      <div>
                        <div className="font-semibold">{log.user.displayName}</div>
                        <div className="text-sm text-gray-500">{log.user.username}</div>
                      </div>
                    ) : (
                      'Utilisateur supprimé'
                    )}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-semibold">
                      {log.action}
                    </span>
                  </td>
                  <td className="border border-gray-300 px-4 py-2">{log.description}</td>
                  <td className="border border-gray-300 px-4 py-2">{log.store || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-4 text-sm text-gray-600">
        Total:{logs.length} action{logs.length !== 1?'s' : ''}
      </div>
    </div>
  )
}
*/
import React, { useState, useEffect } from 'react'
import { getToken } from '../lib/authStore'
import { showToast } from '../lib/toast'
import { fetchAllLogs, fetchUserLogs, fetchStoreLogs } from '../lib/actionLogStore'

// Utilitaire pour la couleur des badges selon l'action
const getActionStyle = (action) => {
  const base = "px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider";
  switch (action?.toLowerCase()) {
    case 'delete': return `${base} bg-red-100 text-red-700 border border-red-200`;
    case 'update': return `${base} bg-amber-100 text-amber-700 border border-amber-200`;
    case 'create': return `${base} bg-green-100 text-green-700 border border-green-200`;
    default: return `${base} bg-blue-100 text-blue-700 border border-blue-200`;
  }
}

export default function ActivityTracking() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all')
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedStore, setSelectedStore] = useState('')
  const [users, setUsers] = useState([])
  const [stores, setStores] = useState(new Set())

  useEffect(() => {
    // Ne charger les logs que si l'utilisateur est authentifié
    const token = getToken()
    if (token) {
      fetchLogs()
    }
  }, [])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      let data = []
      
      if (filter === 'user' && selectedUser) {
        data = await fetchUserLogs(selectedUser)
      } else if (filter === 'store' && selectedStore) {
        data = await fetchStoreLogs(selectedStore)
      } else {
        data = await fetchAllLogs()
      }
      
      setLogs(data)

      const storeSet = new Set()
      const userMap = new Map()
      data.forEach(log => {
        if (log.user) userMap.set(log.user.id, log.user)
        if (log.store) storeSet.add(log.store)
      })
      setUsers(Array.from(userMap.values()))
      setStores(storeSet)
    } catch (e) {
      showToast('error', 'Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString('fr-FR', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    })
  }

  return (
    <div className="max-w-100 mx-auto p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">
          Historique d'activité
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Consultez et filtrez les actions effectuées sur l'ensemble de vos points de vente.
        </p>
      </div>

      {/* Barre de Filtres Moderne */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 mb-8 flex flex-wrap items-end gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-gray-500 uppercase">Filtrer par</label>
          <div className="inline-flex p-1 bg-gray-100 rounded-lg">
            {['all', 'user', 'store'].map((f) => (
              <button
                key={f}
                onClick={() => { setFilter(f); if(f==='all') fetchLogs(); }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  filter === f ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {f === 'all' ? 'Tout' : f === 'user' ? 'Employé' : 'Magasin'}
              </button>
            ))}
          </div>
        </div>

        {filter !== 'all' && (
          <div className="flex flex-col gap-2 flex-grow max-w-xs animate-in fade-in slide-in-from-left-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Sélectionner {filter === 'user' ? 'un employé' : 'un magasin'}</label>
            <div className="flex gap-2">
              <select
                value={filter === 'user' ? selectedUser : selectedStore}
                onChange={(e) => filter === 'user' ? setSelectedUser(e.target.value) : setSelectedStore(e.target.value)}
                className="block w-full rounded-lg border-gray-300 bg-gray-50 text-sm focus:ring-blue-500 focus:border-blue-500 p-2"
              >
                <option value="">Choisir...</option>
                {filter === 'user' 
                  ? users.map(u => <option key={u.id} value={u.id}>{u.displayName}</option>)
                  : Array.from(stores).map(s => <option key={s} value={s}>{s}</option>)
                }
              </select>
              <button
                onClick={fetchLogs}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Appliquer
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Utilisateur</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Magasin</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                 [...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan="5" className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-full"></div></td>
                    </tr>
                 ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-400 italic">
                    Aucune donnée disponible
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs mr-3">
                          {log.user?.displayName?.charAt(0) || '?'}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{log.user?.displayName || 'Supprimé'}</div>
                          <div className="text-xs text-gray-400">@{log.user?.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getActionStyle(log.action)}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-md">
                      <span className="line-clamp-1 group-hover:line-clamp-none transition-all">
                        {log.description}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                      {log.store ? (
                        <span className="bg-gray-100 px-2 py-1 rounded text-gray-600">{log.store}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footer de la table */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <span className="text-sm text-gray-500 font-medium">
            Total : <span className="text-blue-600">{logs.length}</span> actions enregistrées
          </span>
        </div>
      </div>
    </div>
  )
}