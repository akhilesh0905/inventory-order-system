import React, { useState } from 'react'
import { Plus, Search, Trash2, X, AlertCircle } from 'lucide-react'

export default function CustomerManager({ customers, onAddCustomer, onDeleteCustomer }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  })
  const [formErrors, setFormErrors] = useState({})

  // Open drawer for adding
  const handleOpenAdd = () => {
    setFormData({ name: '', email: '', phone: '' })
    setFormErrors({})
    setIsDrawerOpen(true)
  }

  // Handle Form Change
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error for that field
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  // Form Validation
  const validateForm = () => {
    const errors = {}
    if (!formData.name.trim()) errors.name = 'Full name is required.'
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!formData.email.trim()) {
      errors.email = 'Email address is required.'
    } else if (!emailRegex.test(formData.email.trim())) {
      errors.email = 'Please provide a valid email address.'
    }

    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required.'
    } else if (formData.phone.trim().length < 5) {
      errors.phone = 'Phone number is too short.'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone.trim()
    }

    try {
      await onAddCustomer(payload)
      setIsDrawerOpen(false)
    } catch (err) {
      // Backend error (e.g. duplicate email violation)
      setFormErrors({ api: err.message || 'Operation failed' })
    }
  }

  // Filter customers by name or email
  const filteredCustomers = customers.filter((cust) =>
    cust.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cust.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Get initials for customer avatar
  const getInitials = (name) => {
    if (!name) return 'U'
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name[0].toUpperCase()
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      {/* Action Row */}
      <div className="search-bar-row">
        <div className="search-input-wrapper">
          <Search />
          <input
            type="text"
            className="search-input"
            placeholder="Search customers by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={18} /> Add Customer
        </button>
      </div>

      {/* Customers List Grid */}
      <div className="content-panel">
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Avatar</th>
                <th>Full Name</th>
                <th>Email Address</th>
                <th>Phone Number</th>
                <th style={{ width: '80px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((cust) => (
                  <tr key={cust.id}>
                    <td>
                      <div className="avatar">{getInitials(cust.name)}</div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{cust.name}</td>
                    <td>{cust.email}</td>
                    <td>{cust.phone}</td>
                    <td>
                      <div className="actions-cell" style={{ justifyContent: 'center' }}>
                        <button
                          className="action-btn delete"
                          onClick={() => onDeleteCustomer(cust.id)}
                          title="Delete customer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                    No customers found matching the criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer: Add Customer */}
      {isDrawerOpen && (
        <div className="drawer-backdrop" onClick={() => setIsDrawerOpen(false)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h2 className="drawer-title">Add New Customer</h2>
              <button className="close-btn" onClick={() => setIsDrawerOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {formErrors.api && (
                <div className="warning-box" style={{ padding: '0.75rem 1rem', marginBottom: '1.5rem', gap: '0.5rem' }}>
                  <AlertCircle size={16} style={{ color: 'var(--accent-danger)' }} />
                  <span style={{ fontSize: '0.85rem' }}>{formErrors.api}</span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  name="name"
                  className="form-control"
                  placeholder="e.g. Johnathan Doe"
                  value={formData.name}
                  onChange={handleChange}
                />
                {formErrors.name && <span style={{ color: 'var(--accent-danger)', fontSize: '0.75rem', fontWeight: 600 }}>{formErrors.name}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  name="email"
                  className="form-control"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={handleChange}
                />
                {formErrors.email && <span style={{ color: 'var(--accent-danger)', fontSize: '0.75rem', fontWeight: 600 }}>{formErrors.email}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="text"
                  name="phone"
                  className="form-control"
                  placeholder="+1 (555) 123-4567"
                  value={formData.phone}
                  onChange={handleChange}
                />
                {formErrors.phone && <span style={{ color: 'var(--accent-danger)', fontSize: '0.75rem', fontWeight: 600 }}>{formErrors.phone}</span>}
              </div>

              <div className="drawer-footer">
                <button type="button" className="btn btn-secondary" style={{ flexGrow: 1 }} onClick={() => setIsDrawerOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flexGrow: 1, justifyContent: 'center' }}>
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
