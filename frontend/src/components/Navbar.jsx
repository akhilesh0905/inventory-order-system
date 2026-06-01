import React from 'react'
import { LayoutDashboard, Box, Users, ShoppingBag, Sun, Moon } from 'lucide-react'

export default function Navbar({ activeSection, setActiveSection, theme, toggleTheme }) {
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
        <button className="theme-toggle-btn" onClick={toggleTheme}>
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
      </div>
    </nav>
  )
}
