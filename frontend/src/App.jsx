import React, { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import Dashboard from './components/Dashboard'
import ProductManager from './components/ProductManager'
import CustomerManager from './components/CustomerManager'
import OrderManager from './components/OrderManager'
import Toast from './components/Toast'
import AuthPage from './components/AuthPage'

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || null)
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

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

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

  const handleLogout = () => {
    setToken(null)
    localStorage.removeItem('token')
    addToast('Logged out successfully.', 'success')
  }

  const handleLoginSuccess = (newToken) => {
    setToken(newToken)
    localStorage.setItem('token', newToken)
    addToast('Authenticated successfully.', 'success')
  }

  const getAuthHeaders = () => {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }

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

  const fetchAllData = async () => {
    if (!token) return;
    setLoading(true)
    try {
      const [prodRes, custRes, orderRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/products`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/customers`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/orders`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/dashboard/stats`, { headers: getAuthHeaders() })
      ])

      // If token is invalid/expired
      if (prodRes.status === 401) {
          handleLogout();
          throw new Error('Session expired. Please log in again.');
      }

      if (!prodRes.ok || !custRes.ok || !orderRes.ok || !statsRes.ok) {
        throw new Error('One or more network requests failed to load.')
      }

      const prods = await prodRes.json()
      const custs = await custRes.json()
      const ords = await orderRes.json()
      const stats = await statsRes.json()

      setProducts(prods)
      setCustomers(custs)
      
      const mappedOrders = ords.map((ord) => ({
        ...ord,
        customer: custs.find((c) => c.id === ord.customer_id)
      }))
      setOrders(mappedOrders)
      setDashboardStats(stats)
    } catch (err) {
      addToast(err.message, 'error')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      fetchAllData()
    }
  }, [token])

  // PRODUCT OPERATIONS
  const handleAddProduct = async (payload) => {
    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.detail || 'Failed to create product.')
    addToast(`Product '${payload.name}' added successfully!`, 'success')
    fetchAllData()
  }

  const handleUpdateProduct = async (id, payload) => {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.detail || 'Failed to update product details.')
    addToast('Product details updated successfully.', 'success')
    fetchAllData()
  }

  const handleDeleteProduct = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/products/${id}`, { method: 'DELETE', headers: getAuthHeaders() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to delete product.')
      addToast('Product successfully removed from catalogue.', 'success')
      fetchAllData()
    } catch (err) {
      addToast(err.message, 'error')
    }
  }

  // CUSTOMER OPERATIONS
  const handleAddCustomer = async (payload) => {
    const res = await fetch(`${API_BASE}/customers`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.detail || 'Failed to register customer.')
    addToast(`Customer '${payload.name}' registered successfully!`, 'success')
    fetchAllData()
  }

  const handleDeleteCustomer = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/customers/${id}`, { method: 'DELETE', headers: getAuthHeaders() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to delete customer.')
      addToast('Customer record and associated orders removed.', 'success')
      fetchAllData()
    } catch (err) {
      addToast(err.message, 'error')
    }
  }

  // ORDER OPERATIONS
  const handleCreateOrder = async (payload) => {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.detail || 'Failed to place order.')
    addToast(`Order placed successfully! Total bill: $${data.total_amount.toFixed(2)}`, 'success')
    fetchAllData()
  }

  const handleDeleteOrder = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/orders/${id}`, { method: 'DELETE', headers: getAuthHeaders() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to delete order.')
      addToast(`Order cancelled. Inventory levels successfully restored!`, 'success')
      fetchAllData()
    } catch (err) {
      addToast(err.message, 'error')
    }
  }

  // If not logged in, render only the Auth page
  if (!token) {
    return (
      <div className="app-container">
        <AuthPage onLoginSuccess={handleLoginSuccess} />
        <Toast toasts={toasts} removeToast={removeToast} />
      </div>
    )
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
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {loading && (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Synchronizing with server...
              </span>
            )}
            <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
              Logout
            </button>
          </div>
        </header>

        {/* Dynamic section viewport */}
        {renderSection()}
      </main>

      {/* Slide-in notification alerts */}
      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  )
}
