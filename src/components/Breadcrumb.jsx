import React from 'react'
import { ChevronRight, Home } from 'lucide-react'

export default function Breadcrumb({ route }) {
  const getBreadcrumbs = () => {
    const breadcrumbs = [{ label: 'Accueil', href: '#/dashboard' }]
    
    const routes = {
      '#/dashboard': { label: 'Tableau de bord' },
      '#/sales': { label: 'Ventes' },
      '#/stock': { label: 'Stock' },
      '#/decisions': { label: 'Décisions (réappro)' },
      '#/orders': { label: 'Commandes' },
      '#/tracking': { label: 'Suivi des actions' },
      '#/user': { label: 'Utilisateurs' },
    }

    const current = routes[route] || { label: 'Page' }
    if (route !== '#/dashboard') {
      breadcrumbs.push(current)
    }

    return breadcrumbs
  }

  const breadcrumbs = getBreadcrumbs()

  return (
    <nav className="breadcrumb-container" aria-label="Fil d'Ariane">
      <ol className="breadcrumb-list">
        {breadcrumbs.map((crumb, index) => (
          <li key={index} className="breadcrumb-item">
            {index > 0 && (
              <ChevronRight className="breadcrumb-separator" size={16} />
            )}
            {index === breadcrumbs.length - 1 ? (
              <span className="breadcrumb-current">
                {index === 0 && <Home size={16} className="breadcrumb-icon" />}
                {crumb.label}
              </span>
            ) : (
              <a href={crumb.href} className="breadcrumb-link">
                {index === 0 && <Home size={16} className="breadcrumb-icon" />}
                {crumb.label}
              </a>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
