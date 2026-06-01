import React, { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import Dashboard from './components/Dashboard'
import ProductManager from './components/ProductManager'
import CustomerManager from './components/CustomerManager'
import OrderManager from './components/OrderManager'
import Toast from './components/Toast'

export default function App() {
  const [activeSection, setActiveSection] = useState('dashboard')
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark')
  
  // Entities State
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [orders, setOrders] = useState([])
  const [dashboardStats, setDashboardStats] = useState({
    total_products: 0,
    total_customers: 0,
    total_orders: 0,
    low_stock_count: 0,
    low_stock_products: []
  })
  
  const [toasts, setToasts] = useState([])
  const [loading, setLoading] = useState(true)

  // Configure API Base Endpoint
  // Vite proxy handles '/api' local redirection. In production, we read VITE_API_URL or use relative paths.
  const API_BASE = '/api'

  // Toast Helper
  const addToast = (message, type = 'success') => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      removeToast(id)
    }, 4000)
  }

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  // Handle Theme Switching
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'light') {
      root.classList.add('light-mode')
    } else {
      root.classList.remove('light-mode')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  // Centralized Data Fetcher
  const fetchAllData = async () => {
    try {
      const [prodRes, custRes, orderRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/products`),
        fetch(`${API_BASE}/customers`),
        fetch(`${API_BASE}/orders`),
        fetch(`${API_BASE}/dashboard/stats`)
      ])

      if (!prodRes.ok || !custRes.ok || !orderRes.ok || !statsRes.ok) {
        throw new Error('One or more network requests failed to load.')
      }

      const prods = await prodRes.json()
      const custs = await custRes.json()
      const ords = await orderRes.json()
      const stats = await statsRes.json()

      setProducts(prods)
      setCustomers(custs)
      
      // Inject resolved customer references into orders for clean display
      const mappedOrders = ords.map((ord) => ({
        ...ord,
        customer: custs.find((c) => c.id === ord.customer_id)
      }))
      setOrders(mappedOrders)
      setDashboardStats(stats)
    } catch (err) {
      addToast('Failed to synchronize database state with API.', 'error')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllData()
  }, [])

  // ==========================================
  // PRODUCT OPERATIONS
  // ==========================================
  const handleAddProduct = async (payload) => {
    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to create product.')
    }
    addToast(`Product '${payload.name}' added successfully!`, 'success')
    fetchAllData()
  }

  const handleUpdateProduct = async (id, payload) => {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to update product details.')
    }
    addToast('Product details updated successfully.', 'success')
    fetchAllData()
  }

  const handleDeleteProduct = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/products/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to delete product.')
      }
      addToast('Product successfully removed from catalogue.', 'success')
      fetchAllData()
    } catch (err) {
      addToast(err.message, 'error')
    }
  }

  // ==========================================
  // CUSTOMER OPERATIONS
  // ==========================================
  const handleAddCustomer = async (payload) => {
    const res = await fetch(`${API_BASE}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to register customer.')
    }
    addToast(`Customer '${payload.name}' registered successfully!`, 'success')
    fetchAllData()
  }

  const handleDeleteCustomer = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/customers/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to delete customer.')
      }
      addToast('Customer record and associated orders removed.', 'success')
      fetchAllData()
    } catch (err) {
      addToast(err.message, 'error')
    }
  }

  // ==========================================
  // ORDER OPERATIONS
  // ==========================================
  const handleCreateOrder = async (payload) => {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to place order.')
    }
    addToast(`Order placed successfully! Total bill: $${data.total_amount.toFixed(2)}`, 'success')
    fetchAllData()
  }

  const handleDeleteOrder = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/orders/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to delete order.')
      }
      addToast(`Order cancelled. Inventory levels successfully restored!`, 'success')
      fetchAllData()
    } catch (err) {
      addToast(err.message, 'error')
    }
  }

  // Render Component mapping
  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard stats={dashboardStats} setActiveSection={setActiveSection} />
      case 'products':
        return (
          <ProductManager
            products={products}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            addToast={addToast}
          />
        )
      case 'customers':
        return (
          <CustomerManager
            customers={customers}
            onAddCustomer={handleAddCustomer}
            onDeleteCustomer={handleDeleteCustomer}
          />
        )
      case 'orders':
        return (
          <OrderManager
            orders={orders}
            customers={customers}
            products={products}
            onCreateOrder={handleCreateOrder}
            onDeleteOrder={handleDeleteOrder}
          />
        )
      default:
        return <Dashboard stats={dashboardStats} setActiveSection={setActiveSection} />
    }
  }

  const getSectionTitle = () => {
    switch (activeSection) {
      case 'dashboard':
        return { title: 'Operational Analytics Dashboard', sub: 'At-a-glance stock status and product flows' }
      case 'products':
        return { title: 'Product Inventory Catalogue', sub: 'Register products, monitor items, and adjust prices' }
      case 'customers':
        return { title: 'Customer Database Directory', sub: 'Manage customers and view contact directories' }
      case 'orders':
        return { title: 'Order Fulfillment & Logs', sub: 'Create custom multi-item orders and cancel drafts' }
      default:
        return { title: 'Operational Dashboard', sub: 'General metrics' }
    }
  }

  const headerMeta = getSectionTitle()

  return (
    <div className="app-container">
      {/* Side Dock Navbar */}
      <Navbar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      {/* Main Layout Area */}
      <main className="main-wrapper">
        <header className="top-header">
          <div className="header-title">
            <h1>{headerMeta.title}</h1>
            <p>{headerMeta.sub}</p>
          </div>
          {loading && (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Synchronizing with server...
            </span>
          )}
        </header>

        {/* Dynamic section viewport */}
        {renderSection()}
      </main>

      {/* Slide-in notification alerts */}
      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  )
}
