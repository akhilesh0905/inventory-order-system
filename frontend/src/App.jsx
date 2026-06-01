import React, { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import Dashboard from './components/Dashboard'
import ProductManager from './components/ProductManager'
import CustomerManager from './components/CustomerManager'
import OrderManager from './components/OrderManager'
import Toast from './components/Toast'
import AuthPages from './components/AuthPages'

export default function App() {
  const [activeSection, setActiveSection] = useState('dashboard')
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark')
  
  // Auth Session State
  const [token, setToken] = useState(localStorage.getItem('token') || null)
  const [user, setUser] = useState(null)

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

  // ==========================================
  // AUTHORIZATION NETWORK INTERCEPTOR
  // ==========================================
  const authFetch = async (url, options = {}) => {
    const headers = options.headers || {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    
    const mergedOptions = {
      ...options,
      headers: {
        ...headers,
        'Content-Type': headers['Content-Type'] || 'application/json'
      }
    }

    if (!options.body) {
      delete mergedOptions.headers['Content-Type']
    }

    return fetch(url, mergedOptions)
  }

  // Centralized Data Fetcher
  const fetchAllData = async () => {
    try {
      const [prodRes, custRes, orderRes, statsRes] = await Promise.all([
        authFetch(`${API_BASE}/products`),
        authFetch(`${API_BASE}/customers`),
        authFetch(`${API_BASE}/orders`),
        authFetch(`${API_BASE}/dashboard/stats`)
      ])

      if (prodRes.status === 401 || custRes.status === 401 || orderRes.status === 401 || statsRes.status === 401) {
        handleLogout()
        return
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
      addToast('Failed to synchronize database state with API.', 'error')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch logged in profile details
  const fetchCurrentUser = async (authToken) => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })
      if (res.ok) {
        const profile = await res.json()
        setUser(profile)
        return profile
      } else {
        // Token expired or invalid, wipe session
        handleLogout()
        return null
      }
    } catch (err) {
      console.error(err)
      handleLogout()
      return null
    }
  }

  // Verification & loading on initial boot
  useEffect(() => {
    if (token) {
      fetchCurrentUser(token).then((profile) => {
        if (profile) {
          fetchAllData()
        } else {
          setLoading(false)
        }
      })
    } else {
      setLoading(false)
    }
  }, [token])

  // ==========================================
  // SESSION CALLBACK HANDLERS
  // ==========================================
  const handleLogin = async (username, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.detail || 'Login failed')
    }
    
    localStorage.setItem('token', data.access_token)
    setToken(data.access_token)
    // Fetch profile and synchronise list data
    await fetchCurrentUser(data.access_token)
    addToast('Welcome back! Successfully logged in.', 'success')
  }

  const handleRegister = async (username, email, password) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.detail || 'Registration failed')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
    setProducts([])
    setCustomers([])
    setOrders([])
    addToast('Signed out successfully.', 'success')
  }

  // ==========================================
  // PRODUCT OPERATIONS
  // ==========================================
  const handleAddProduct = async (payload) => {
    const res = await authFetch(`${API_BASE}/products`, {
      method: 'POST',
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
    const res = await authFetch(`${API_BASE}/products/${id}`, {
      method: 'PUT',
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
      const res = await authFetch(`${API_BASE}/products/${id}`, { method: 'DELETE' })
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
    const res = await authFetch(`${API_BASE}/customers`, {
      method: 'POST',
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
      const res = await authFetch(`${API_BASE}/customers/${id}`, { method: 'DELETE' })
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
    const res = await authFetch(`${API_BASE}/orders`, {
      method: 'POST',
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
      const res = await authFetch(`${API_BASE}/orders/${id}`, { method: 'DELETE' })
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

  // Intercept view if unauthenticated
  if (!token || !user) {
    if (loading) {
      return (
        <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.5rem', animation: 'pulse 1.5s infinite' }}>
              Apex Inventory
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Verifying active admin session...
            </div>
          </div>
        </div>
      )
    }

    return (
      <>
        <AuthPages onLogin={handleLogin} onRegister={handleRegister} addToast={addToast} />
        <Toast toasts={toasts} removeToast={removeToast} />
      </>
    )
  }

  const headerMeta = getSectionTitle()

  return (
    <div className="app-container" style={{ animation: 'fadeIn 0.4s ease' }}>
      {/* Side Dock Navbar */}
      <Navbar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        theme={theme}
        toggleTheme={toggleTheme}
        user={user}
        onLogout={handleLogout}
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

