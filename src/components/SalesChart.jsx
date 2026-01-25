/*import React, { useEffect, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

import { getSales, subscribe, refreshSales } from '../lib/salesStore'
import { useStore } from '../lib/StoreContext'

function monthKey(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function lastNMonths(n = 6) {
  const res = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    res.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleString(undefined, { month: 'short' }) })
  }
  return res
}

const options = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: { 
      position: 'top',
      labels: {
        font: { size: 12 },
        padding: 12,
      }
    },
    title: { display: false },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: { font: { size: 11 } }
    },
    x: {
      ticks: { font: { size: 11 } }
    }
  }
}

export default function SalesChart() {
  const { currentStore } = useStore()
  const [chartData, setChartData] = useState(() => {
    const months = lastNMonths(6)
    return {
      labels: months.map(m => m.label),
      datasets: [{ label: 'Chiffre d\'affaires', data: months.map(() => 0), borderColor: 'rgb(59, 246, 184)', backgroundColor: 'rgb(29, 99, 212)', tension: 0.3 }]
    }
  })

  useEffect(() => {
    let mounted = true
    const compute = (sales) => {
      const months = lastNMonths(6)
      const map = new Map(months.map(m => [m.key, 0]))
      for (const s of sales) {
        try {
          const k = monthKey(s.date)
          if (map.has(k)) {
            map.set(k, map.get(k) + (Number(s.total) || 0))
          }
        } catch (e) { }
      }
      const labels = months.map(m => m.label)
      const data = months.map(m => map.get(m.key) || 0)
      setChartData({ labels, datasets: [{ label: "Chiffre d'affaires", data, borderColor: 'rgb(59, 246, 146)', backgroundColor: 'rgba(59,130,246,0.2)', tension: 0.3 }] })
    }

    setTimeout(() => {
      // refresh then compute
      refreshSales(currentStore).catch(()=>{}).finally(() => {
        if (!mounted) return
        compute(getSales(currentStore))
      })
    }, 0)
    const unsub = subscribe(() => compute(getSales(currentStore)))
    return () => { mounted = false; unsub() }
  }, [currentStore])

  return <Line options={options} data={chartData} />
}
*/
import React, { useEffect, useState, useRef } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler, // Requis pour le remplissage sous la courbe
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

import { getSales, subscribe, refreshSales } from '../lib/salesStore'
import { useStore } from '../lib/StoreContext'

// --- Helpers de date restants identiques ---
function monthKey(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function lastNMonths(n = 6) {
  const res = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    res.push({ 
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, 
      label: d.toLocaleString('fr-FR', { month: 'short' }) 
    })
  }
  return res
}

// --- Options de Design Améliorées ---
const options = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false,
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderColor: 'rgba(59, 246, 184, 0.5)',
      borderWidth: 1,
      padding: 14,
      titleFont: { size: 13, weight: 'bold', family: 'Inter, sans-serif' },
      bodyFont: { size: 12, family: 'Inter, sans-serif' },
      displayColors: false,
      titleColor: '#f0fdfa',
      bodyColor: '#d1fae5',
      callbacks: {
        label: (context) => ` ${context.parsed.y.toLocaleString('fr-FR')} Ar`
      }
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: { 
        color: 'rgba(14, 165, 233, 0.08)', 
        drawBorder: false,
        lineWidth: 1
      },
      ticks: { 
        font: { size: 11, family: 'Inter, sans-serif', weight: '500' },
        color: '#64748b',
        callback: (value) => value.toLocaleString('fr-FR')
      }
    },
    x: {
      grid: { display: false, drawBorder: false },
      ticks: { 
        font: { size: 11, family: 'Inter, sans-serif', weight: '500' },
        color: '#64748b'
      }
    }
  }
}

export default function SalesChart() {
  const { currentStore } = useStore()
  const chartRef = useRef(null)
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: []
  })

  useEffect(() => {
    let mounted = true
    
    const compute = (sales) => {
      const months = lastNMonths(3)
      const map = new Map(months.map(m => [m.key, 0]))
      
      sales.forEach(s => {
        const k = monthKey(s.date)
        if (map.has(k)) map.set(k, map.get(k) + (Number(s.total) || 0))
      })

      const chart = chartRef.current
      if (!chart) return

      // Création du dégradé avec des couleurs plus modernes
      const gradient = chart.ctx.createLinearGradient(0, 0, 0, 400)
      gradient.addColorStop(0, 'rgba(34, 197, 94, 0.25)') // Vert lumineux
      gradient.addColorStop(0.5, 'rgba(34, 197, 94, 0.1)')
      gradient.addColorStop(1, 'rgba(34, 197, 94, 0)')

      setChartData({
        labels: months.map(m => m.label),
        datasets: [{
          fill: true,
          label: "Chiffre d'affaires",
          data: months.map(m => map.get(m.key) || 0),
          borderColor: '#16a34a', // Vert principal (Green 600)
          backgroundColor: gradient,
          tension: 0.4,
          pointRadius: 5,
          pointBackgroundColor: '#fff',
          pointBorderColor: '#16a34a',
          pointBorderWidth: 2,
          pointHoverRadius: 7,
          pointHoverBackgroundColor: '#22c55e',
          borderWidth: 2.5,
        }]
      })
    }

    refreshSales(currentStore).finally(() => {
      if (mounted) compute(getSales(currentStore))
    })

    const unsub = subscribe(() => compute(getSales(currentStore)))
    return () => { mounted = false; unsub() }
  }, [currentStore])

  return (
    <div style={{ height: '280px', width: '100%', position: 'relative' }}>
      <Line ref={chartRef} options={options} data={chartData} />
    </div>
  )
}