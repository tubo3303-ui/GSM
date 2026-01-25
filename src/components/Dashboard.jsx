import React, { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import Breadcrumb from './Breadcrumb'
import KpiCard from './KpiCard'
import ActivityList from './ActivityList'
import StockKpis from './StockKpis'
import SalesKpis from './SalesKpis'
import LowStockAlerts from './LowStockAlerts'
import DecisionCenter from './DecisionCenter'
import Orders from './Orders'
import Sales from './Sales'
import Stock from './Stock'
import Arrivals from './Arrivals'
import SalesChart from './SalesChart'
import SalesDailyChart from './SalesDailyChart'
import ProductCategoriesChart from './ProductCategoriesChart'
import Users from './Users'
import ActivityTracking from './ActivityTracking'
import ToastContainer from './ToastContainer'
import { getCurrentUser, subscribeAuth } from '../lib/authStore'

export default function Dashboard() {
  const [route, setRoute] = useState(window.location.hash || '#/dashboard')
  const [user, setUser] = useState(() => getCurrentUser())

  useEffect(() => {
    const onHash = () => setRoute(window.location.hash || '#/dashboard')
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    const unsub = subscribeAuth(u => setUser(u))
    return unsub
  }, [])

  useEffect(() => {
    // Employees are not allowed to view the main dashboard or decision center
    if (user && user.role === 'employee') {
      if (route === '#/dashboard' || route === '' || route === '#/decisions') {
        window.location.hash = '#/sales'
        setRoute('#/sales')
      }
    }
  }, [user, route])

  const renderContent = () => {
    if (route === '#/user') return <Users />
    if (route === '#/sales') return <Sales />
    if (route === '#/stock') return <Stock />
    if (route === '#/arrivals') return <Arrivals />
    if (route === '#/orders') {
      if (user && user.role === 'employee') return (
        <div className="card"><h3>Accès refusé</h3><div>Vous n'avez pas les droits pour voir ce panneau.</div></div>
      )
      return <Orders />
    }
    if (route === '#/tracking') {
      if (user && user.role !== 'admin') return (
        <div className="card"><h3>Accès refusé</h3><div>Vous n'avez pas les droits pour voir ce panneau.</div></div>
      )
      return <ActivityTracking />
    }
    if (route === '#/decisions') {
      if (user && user.role === 'employee') return (
        <div className="card"><h3>Accès refusé</h3><div>Vous n'avez pas les droits pour voir ce panneau.</div></div>
      )
      return <DecisionCenter />
    }
    // default dashboard
    return (
      <div className="dashboard-container">

        {/* Stock Section */}
        <section className="dashboard-section">
         
                <StockKpis />
          
        </section>

        {/* Sales Section */}
        <section className="dashboard-section">
                <SalesKpis />
        </section>

        {/* Alerts Section */}
        <LowStockAlerts />

        {/* Charts and Activity Section */}
        <section className="widgets">
          <div className="card chart-container">
            <h3 className="chart-title">Ventes par jour (30 jours)</h3>
            <div className="chart-wrapper">
              <SalesDailyChart />
            </div>
          </div>
          <div className="card chart-container">
            <h3 className="chart-title">Graphique des ventes (par mois)</h3>
            <div className="chart-wrapper">
              <SalesChart />
            </div>
          </div>
        </section>

        {/* Categories Section */}
        <section className="widgets">
          <div className="card chart-container">
            <h3 className="chart-title">Catégories de produits</h3>
            <div className="chart-wrapper">
              <ProductCategoriesChart />
            </div>
          </div>
        </section>

        {/* Activity Section */}
       
      </div>
    )
  }

  return (
    <div className="app">
      <Sidebar />
      <div className="main-area ">
        <Topbar />
        <Breadcrumb route={route} />
        <main className="main">
          {renderContent()}
        </main>
        <ToastContainer />
      </div>
    </div>
  )
}
