import React from 'react'
import { LayoutDashboard, Box, Users, ShoppingBag, Sun, Moon, LogOut } from 'lucide-react'

export default function Navbar({ activeSection, setActiveSection, theme, toggleTheme, user, onLogout }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Products', icon: Box },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'orders', label: 'Orders', icon: ShoppingBag }
  ]

  return (
    <nav className="sidebar">
      <div className="brand-section">
        <div className="brand-logo">AP</div>
        <span className="brand-name">Apex Inventory</span>
      </div>

      <ul className="nav-list">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <li key={item.id}>
              <button
                className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
                onClick={() => setActiveSection(item.id)}
                style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left' }}
              >
                <Icon />
                <span>{item.label}</span>
              </button>
            </li>
          )
        })}
      </ul>

      <div className="sidebar-footer">
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0 0.75rem 0', borderBottom: '1px solid var(--border-color)', marginBottom: '0.75rem' }}>
            <div className="avatar" style={{ width: '32px', height: '32px', fontSize: '0.8rem', flexShrink: 0 }}>
              {user.username[0].toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {user.username}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {user.email}
              </span>
            </div>
          </div>
        )}

        <button className="theme-toggle-btn" onClick={toggleTheme} style={{ width: '100%' }}>
          {theme === 'dark' ? (
            <>
              <Sun size={18} />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon size={18} />
              <span>Dark Mode</span>
            </>
          )}
        </button>

        {user && (
          <button 
            className="theme-toggle-btn" 
            onClick={onLogout} 
            style={{ 
              marginTop: '0.5rem', 
              width: '100%', 
              border: '1px solid rgba(239, 68, 68, 0.2)', 
              color: 'var(--accent-danger)',
              backgroundColor: 'var(--accent-danger-bg)'
            }}
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        )}
      </div>
    </nav>
  )
}
