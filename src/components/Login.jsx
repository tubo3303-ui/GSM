/*import React, { useState, useEffect } from 'react'
import { login, getCurrentUser, subscribeAuth } from '../lib/authStore'
import { useStore } from '../lib/StoreContext'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setCurrentStore } = useStore()

  useEffect(() => {
    const unsub = subscribeAuth(user => {
      if (user) {
        if (user.store && user.role !== 'admin') setCurrentStore(user.store)
      }
    })
    return unsub
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(username.trim(), password)
      // keep spinner visible for 4 seconds to show loading animation
      await new Promise(res => setTimeout(res, 4000))
      window.location.hash = '#/dashboard'
    } catch (err) {
      setError(err.message || 'Échec de connexion')
    } finally { setLoading(false) }
  }

  return (
    <div className="login-page min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="login-card w-full max-w-md bg-white/5 border border-white/6 rounded-xl p-6 shadow-2xl text-white">
        <div className="login-brand flex items-center gap-3 mb-4">
          <span className="iconify text-3xl" data-icon="mdi:storefront" data-inline="false"></span>
          <div>
            <div className="brand-title text-xl font-bold text-white">Ntsoa GSM</div>
            <div className="brand-sub text-sm text-slate-300">Gestionnaire de stocks multi-boutiques</div>
          </div>
        </div>

        <form className="login-form " onSubmit={handleSubmit}>
          <label className="small text-slate-300">Nom d'utilisateur</label>
          <input className="mt-1 mb-2 w-full rounded-md border border-white/10 bg-white/3 px-3 py-2 text-white placeholder-slate-300" value={username} onChange={e=>setUsername(e.target.value)} placeholder="admin" />

          <label className="small text-slate-300">Mot de passe</label>
          <input type="password" className="mt-1 mb-2 w-full rounded-md border border-white/10 bg-white/3 px-3 py-2 text-white placeholder-slate-300" value={password} onChange={e=>setPassword(e.target.value)} placeholder="mot de passe" />

          {error && <div className="login-error mt-2">{error}</div>}

          <div className="flex justify-between items-center mt-4">
            <button className="btn btn-secondary flex items-center gap-2 px-3 py-2 rounded-md" type="button" onClick={() => { setUsername(''); setPassword(''); setError('') }}>
              <span className="iconify" data-icon="mdi:eraser" data-inline="false"></span>
              Effacer
            </button>
            <button className="btn btn-primary flex items-center gap-2 px-3 py-2 rounded-md" disabled={loading}>
              {loading ? <span className="spinner" aria-hidden></span> : <span className="iconify" data-icon="mdi:login" data-inline="false"></span>}
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </div>
        </form>

        <div className="login-footer text-center mt-4 text-sm text-slate-300">
          <small>Comptes demo: <b>admin/admin123</b>, <b>manager_mj/mjpass</b>, <b>emp_tm/tmpass</b></small>
        </div>
      </div>
    </div>
  )
}
*/
/*
import React, { useState, useEffect } from 'react'
import { login, subscribeAuth } from '../lib/authStore'
import { useStore } from '../lib/StoreContext'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setCurrentStore } = useStore()

  useEffect(() => {
    const unsub = subscribeAuth(user => {
      if (user && user.store && user.role !== 'admin') {
        setCurrentStore(user.store)
      }
    })
    return unsub
  }, [setCurrentStore])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username.trim(), password)
      // Délai esthétique pour l'animation
      await new Promise(res => setTimeout(res, 2000))
      window.location.hash = '#/dashboard'
    } catch (err) {
      setError(err.message || 'Identifiants incorrects')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0f172a] p-4 relative overflow-hidden">
      
      <div className="absolute top-0 left-1/4 w-64 h-64 bg-blue-600/20 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-indigo-600/20 rounded-full blur-[100px]"></div>

      <div className="w-full max-w-md z-10">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6 md:p-8">
          
        
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg mb-4">
              <span className="iconify text-3xl text-white" data-icon="mdi:storefront"></span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Ntsoa GSM</h1>
            <p className="text-slate-400 text-sm">Gestion de stocks multi-boutiques</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
           
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 ml-1 uppercase tracking-wider">
                Utilisateur
              </label>
              <div className="relative flex items-center">
                <span className="iconify absolute left-3 text-slate-500 text-xl" data-icon="mdi:account-outline"></span>
                <input 
                  type="text"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  placeholder="admin"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 ml-1 uppercase tracking-wider">
                Mot de passe
              </label>
              <div className="relative flex items-center">
                <span className="iconify absolute left-3 text-slate-500 text-xl" data-icon="mdi:lock-outline"></span>
                <input 
                  type="password"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

           
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm py-2 px-3 rounded-lg flex items-center gap-2">
                <span className="iconify" data-icon="mdi:alert-circle"></span>
                {error}
              </div>
            )}

           
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => { setUsername(''); setPassword(''); setError('') }}
                className="sm:w-1/3 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 transition-all text-sm"
              >
                <span className="iconify text-lg" data-icon="mdi:eraser"></span>
                Effacer
              </button>
              
              <button 
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-lg shadow-blue-600/20 disabled:opacity-70"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span className="iconify text-xl" data-icon="mdi:login"></span>
                    Se connecter
                  </>
                )}
              </button>
            </div>
          </form>

         
          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-[11px] text-slate-500 uppercase tracking-widest mb-3 font-semibold">
              Comptes Démo
            </p>
            <div className="grid grid-cols-1 gap-2 text-[12px]">
              <div className="text-slate-400 bg-white/5 py-1.5 rounded-lg border border-white/5">
                <b className="text-blue-400">admin</b> / admin123
              </div>
              <div className="text-slate-400 bg-white/5 py-1.5 rounded-lg border border-white/5">
                <b className="text-blue-400">manager_mj</b> / mjpass
              </div>
            </div>
          </div>
        </div>
        
        <p className="text-center mt-6 text-slate-600 text-xs">
          © 2024 Ntsoa GSM • Solution de gestion intelligente
        </p>
      </div>
    </div>


  )
}
*/

import React, { useState, useEffect } from 'react'
import { subscribeAuth } from '../lib/authStore'
import { useStore } from '../lib/StoreContext'
import { useAuth } from '../lib/AuthContext'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setCurrentStore } = useStore()
  const { login } = useAuth()

  useEffect(() => {
    const unsub = subscribeAuth(user => {
      if (user && user.store && user.role !== 'admin') {
        setCurrentStore(user.store)
      }
    })
    return unsub
  }, [setCurrentStore])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username.trim(), password)
      // La mise à jour d'état se fera automatiquement via useAuth hook
    } catch (err) {
      setError(err.message || 'Identifiants incorrects')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-12  " >
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-b from-blue-100/50 to-transparent -z-10 "></div>
      
      <div className="w-full max-w-[400px]">
        <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-xl shadow-slate-200/60 p-10  ">
          
          {/* Logo & Title */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 mb-4 text-white">
              <svg
                className="h-8 w-8 text-primary-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">Ntsoa GSM</h1>
             <p className="mt-2 text-sm text-muted-foreground">
                Veuillez-vous connecter à votre compte
              </p>
            
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Champ Utilisateur */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 ml-1 uppercase tracking-[0.15em]">
                Utilisateur
              </label>
              <div className="relative group">
                <div className="absolute left-4 inset-y-0 flex items-center justify-center text-slate-400 group-focus-within:text-blue-600 transition-colors pointer-events-none">
                  <span className="absolute left-1 text-slate-500 text-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24"><circle cx={12} cy={6} r={4} fill="currentColor"></circle><path fill="currentColor" d="M20 17.5c0 2.485 0 4.5-8 4.5s-8-2.015-8-4.5S7.582 13 12 13s8 2.015 8 4.5"></path></svg>
                  </span>
                </div>
                <input 
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 transition-all"
                  placeholder="Nom d'utilisateur"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Champ Mot de passe */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 ml-1 uppercase tracking-[0.15em]">
                Mot de passe
              </label>
              <div className="relative group">
                <div className="absolute left-4 inset-y-0 flex items-center justify-center text-slate-400 group-focus-within:text-blue-600 transition-colors pointer-events-none">
                  <span className="absolute left-1 text-slate-500 text-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24"><g fill="none"><path fill="currentColor" fillRule="evenodd" d="M3 12a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3zm10 2a1 1 0 1 0-2 0v3a1 1 0 1 0 2 0z" clipRule="evenodd"></path><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10V7a4 4 0 0 1 4-4v0a4 4 0 0 1 4 4v3"></path></g></svg>
                  </span>
                </div>
                <input 
                  type={showPassword ? "text" : "password"}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-12 pr-12 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 inset-y-0 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                >
                  <span className="text-xl">{showPassword ? <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24"><path fill="currentColor" d="M12 17.5c-3.8 0-7.2-2.1-8.8-5.5H1c1.7 4.4 6 7.5 11 7.5s9.3-3.1 11-7.5h-2.2c-1.6 3.4-5 5.5-8.8 5.5"></path></svg> : <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" d="M9 4.46A9.8 9.8 0 0 1 12 4c4.182 0 7.028 2.5 8.725 4.704C21.575 9.81 22 10.361 22 12c0 1.64-.425 2.191-1.275 3.296C19.028 17.5 16.182 20 12 20s-7.028-2.5-8.725-4.704C2.425 14.192 2 13.639 2 12c0-1.64.425-2.191 1.275-3.296A14.5 14.5 0 0 1 5 6.821"></path><path d="M15 12a3 3 0 1 1-6 0a3 3 0 0 1 6 0Z"></path></g></svg>}</span>
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-[13px] py-3 px-4 rounded-xl flex items-center gap-3">
                <span className="text-lg flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24"><g fill="none"><path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z"></path><path fill="#e11414" d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12S6.477 2 12 2m0 13a1 1 0 1 0 0 2a1 1 0 0 0 0-2m0-9a1 1 0 0 0-.993.883L11 7v6a1 1 0 0 0 1.993.117L13 13V7a1 1 0 0 0-1-1"></path></g></svg>
                </span>
                <p className="font-semibold leading-tight">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button 
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>
                    <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24"><path fill="currentColor" d="M15 2h-1c-2.828 0-4.243 0-5.121.879C8 3.757 8 5.172 8 8v8c0 2.828 0 4.243.879 5.121C9.757 22 11.172 22 14 22h1c2.828 0 4.243 0 5.121-.879C21 20.243 21 18.828 21 16V8c0-2.828 0-4.243-.879-5.121C19.243 2 17.828 2 15 2" opacity={0.6}></path><path fill="currentColor" d="M8 8c0-1.538 0-2.657.141-3.5H8c-2.357 0-3.536 0-4.268.732S3 7.143 3 9.5v5c0 2.357 0 3.535.732 4.268S5.643 19.5 8 19.5h.141C8 18.657 8 17.538 8 16z" opacity={0.4}></path><path fill="currentColor" fillRule="evenodd" d="M14.53 11.47a.75.75 0 0 1 0 1.06l-2 2a.75.75 0 1 1-1.06-1.06l.72-.72H5a.75.75 0 0 1 0-1.5h7.19l-.72-.72a.75.75 0 1 1 1.06-1.06z" clipRule="evenodd"></path></svg>
                  </span>
                  Se connecter
                </>
              )}
            </button>
          </form>

          {/* Test Accounts */}
          {/*
          <div className="mt-10 pt-8 border-t border-slate-100">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest text-center mb-4 font-bold">
              Comptes de test
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button 
                type="button"
                onClick={() => { setUsername('admin'); setPassword('admin123') }}
                className="flex flex-col items-center justify-center bg-slate-50 hover:bg-white border border-transparent hover:border-slate-200 py-3 rounded-2xl transition-all group shadow-sm hover:shadow-md"
              >
                <span className="text-blue-600 text-[10px] font-black">ADMIN</span>
                <span className="text-slate-400 text-[9px] font-medium">admin123</span>
              </button>
              <button 
                type="button"
                onClick={() => { setUsername('manager_mj'); setPassword('mjpass') }}
                className="flex flex-col items-center justify-center bg-slate-50 hover:bg-white border border-transparent hover:border-slate-200 py-3 rounded-2xl transition-all group shadow-sm hover:shadow-md"
              >
                <span className="text-indigo-600 text-[10px] font-black">MANAGER</span>
                <span className="text-slate-400 text-[9px] font-medium">mjpass</span>
              </button>
            </div>
          </div>
          */}
        </div>
        
        
      </div>
    </div>
  )
}