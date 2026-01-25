import React, { useEffect } from 'react'
import Dashboard from './components/Dashboard'
import Login from './components/Login'
import { useAuth } from './lib/AuthContext'
import { initSocket, closeSocket } from './lib/socketService'

export default function App() {
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (user) {
      // Initialize Socket.IO connection when user is logged in
      initSocket()
      return () => {
        // Close connection when user logs out
        closeSocket()
      }
    }
  }, [user])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="w-8 h-8 border-4 border-slate-600 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  return user ? <Dashboard /> : <Login />
}
