import React from 'react'
import { Box, Users, ShoppingBag, AlertTriangle, ArrowRight } from 'lucide-react'

export default function Dashboard({ stats, setActiveSection }) {
  const cards = [
    {
      label: 'Total Products',
      value: stats.total_products,
      icon: Box,
      class: 'products',
      target: 'products'
    },
    {
      label: 'Total Customers',
      value: stats.total_customers,
      icon: Users,
      class: 'customers',
      target: 'customers'
    },
    {
      label: 'Total Orders',
      value: stats.total_orders,
      icon: ShoppingBag,
      class: 'orders',
      target: 'orders'
    },
    {
      label: 'Low Stock Products',
      value: stats.low_stock_count,
      icon: AlertTriangle,
      class: 'warning',
      target: 'products'
    }
  ]

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      {/* Metrics Row */}
      <div className="stats-grid">
        {cards.map((card, idx) => {
          const Icon = card.icon
          return (
            <div
              key={idx}
              className="stat-card"
              onClick={() => setActiveSection(card.target)}
              style={{ cursor: 'pointer' }}
            >
              <div className={`stat-icon ${card.class}`}>
                <Icon size={24} />
              </div>
              <div className="stat-details">
                <span className="stat-value">{card.value}</span>
                <span className="stat-label">{card.label}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Grid: Low Stock Alert & Operational summary */}
      <div className="dashboard-grid">
        {/* Left Panel: Low Stock Monitor */}
        <div className="content-panel">
          <div className="panel-header">
            <h2 className="panel-title">Critical Inventory Monitor</h2>
            <button 
              className="btn btn-secondary" 
              onClick={() => setActiveSection('products')}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
            >
              Manage Products <ArrowRight size={14} />
            </button>
          </div>

          {stats.low_stock_count > 0 ? (
            <div>
              <div className="warning-box">
                <span className="warning-icon">
                  <AlertTriangle size={20} />
                </span>
                <div>
                  <strong>Action Required:</strong> You have {stats.low_stock_count} products with critically low inventory levels (under 10 units).
                </div>
              </div>

              <div className="low-stock-list">
                {stats.low_stock_products.map((prod) => {
                  const isDanger = prod.quantity <= 3
                  return (
                    <div key={prod.id} className="low-stock-item">
                      <div className="low-stock-info">
                        <span className="low-stock-name">{prod.name}</span>
                        <span className="low-stock-sku">SKU: {prod.sku}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                          ${prod.price.toFixed(2)}
                        </span>
                        <span className={`low-stock-qty ${isDanger ? 'danger' : 'warning'}`}>
                          {prod.quantity} units left
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
              <p style={{ fontWeight: 600 }}>All stock levels are currently healthy!</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                No products are running below the critical 10-unit threshold.
              </p>
            </div>
          )}
        </div>

        {/* Right Panel: Operations Overview Card */}
        <div className="content-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h2 className="panel-title" style={{ marginBottom: '1.5rem' }}>Operational Summary</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: 600 }}>
                  <span>Low Stock Margin</span>
                  <span style={{ color: stats.low_stock_count > 0 ? 'var(--accent-warning)' : 'var(--accent-success)' }}>
                    {stats.total_products ? Math.round(((stats.total_products - stats.low_stock_count) / stats.total_products) * 100) : 100}% Healthy
                  </span>
                </div>
                <div style={{ height: '8px', backgroundColor: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      height: '100%', 
                      backgroundColor: stats.low_stock_count > 0 ? 'var(--accent-warning)' : 'var(--accent-success)', 
                      width: `${stats.total_products ? ((stats.total_products - stats.low_stock_count) / stats.total_products) * 100 : 100}%`,
                      transition: 'width 0.5s ease'
                    }} 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'var(--input-bg)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Avg. Product Price</span>
                  <strong style={{ fontSize: '0.9rem' }}>
                    ${stats.low_stock_products.length > 0 
                      ? (stats.low_stock_products.reduce((acc, curr) => acc + curr.price, 0) / stats.low_stock_products.length).toFixed(2)
                      : '0.00'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'var(--input-bg)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Fulfillment Status</span>
                  <span className="badge badge-success">Online & Healthy</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            System state refreshed automatically. Connected to primary PostgreSQL cluster.
          </div>
        </div>
      </div>
    </div>
  )
}
