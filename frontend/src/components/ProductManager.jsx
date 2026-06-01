import React, { useState } from 'react'
import { Plus, Search, Edit, Trash2, X, AlertCircle } from 'lucide-react'

export default function ProductManager({ products, onAddProduct, onUpdateProduct, onDeleteProduct, addToast }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    price: '',
    quantity: ''
  })
  const [formErrors, setFormErrors] = useState({})

  // Open drawer for adding
  const handleOpenAdd = () => {
    setEditingProduct(null)
    setFormData({ name: '', sku: '', price: '', quantity: '' })
    setFormErrors({})
    setIsDrawerOpen(true)
  }

  // Open drawer for editing
  const handleOpenEdit = (product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      sku: product.sku,
      price: product.price.toString(),
      quantity: product.quantity.toString()
    })
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
    if (!formData.name.trim()) errors.name = 'Product name is required.'
    
    if (!formData.sku.trim()) {
      errors.sku = 'SKU code is required.'
    } else if (formData.sku.trim().length < 2) {
      errors.sku = 'SKU must be at least 2 characters.'
    }

    const priceNum = parseFloat(formData.price)
    if (!formData.price) {
      errors.price = 'Price is required.'
    } else if (isNaN(priceNum) || priceNum <= 0) {
      errors.price = 'Price must be a positive number.'
    }

    const qtyNum = parseInt(formData.quantity, 10)
    if (!formData.quantity) {
      errors.quantity = 'Quantity is required.'
    } else if (isNaN(qtyNum) || qtyNum < 0) {
      errors.quantity = 'Quantity cannot be negative.'
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
      sku: formData.sku.trim().toUpperCase(),
      price: parseFloat(formData.price),
      quantity: parseInt(formData.quantity, 10)
    }

    try {
      if (editingProduct) {
        await onUpdateProduct(editingProduct.id, payload)
      } else {
        await onAddProduct(payload)
      }
      setIsDrawerOpen(false)
    } catch (err) {
      // Backend error (e.g. unique SKU violation)
      setFormErrors({ api: err.message || 'Operation failed' })
    }
  }

  // Filter products by name or SKU
  const filteredProducts = products.filter((prod) =>
    prod.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prod.sku.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      {/* Action Row */}
      <div className="search-bar-row">
        <div className="search-input-wrapper">
          <Search />
          <input
            type="text"
            className="search-input"
            placeholder="Search products by name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={18} /> Add Product
        </button>
      </div>

      {/* Products Grid Table */}
      <div className="content-panel">
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>SKU Code</th>
                <th>Unit Price</th>
                <th>In Stock</th>
                <th>Status</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length > 0 ? (
                filteredProducts.map((prod) => {
                  const isLow = prod.quantity < 10
                  const isOut = prod.quantity === 0
                  return (
                    <tr key={prod.id}>
                      <td style={{ fontWeight: 600 }}>{prod.name}</td>
                      <td>
                        <span style={{ fontFamily: 'monospace', padding: '0.2rem 0.4rem', backgroundColor: 'var(--border-color)', borderRadius: '4px', fontSize: '0.85rem' }}>
                          {prod.sku}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500 }}>${prod.price.toFixed(2)}</td>
                      <td style={{ fontWeight: 700 }}>{prod.quantity}</td>
                      <td>
                        {isOut ? (
                          <span className="badge badge-warning" style={{ backgroundColor: 'var(--accent-danger-bg)', color: 'var(--accent-danger)' }}>Out of Stock</span>
                        ) : isLow ? (
                          <span className="badge badge-warning">Low Stock</span>
                        ) : (
                          <span className="badge badge-success">In Stock</span>
                        )}
                      </td>
                      <td>
                        <div className="actions-cell">
                          <button
                            className="action-btn edit"
                            onClick={() => handleOpenEdit(prod)}
                            title="Edit details"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            className="action-btn delete"
                            onClick={() => onDeleteProduct(prod.id)}
                            title="Delete product"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                    No products found matching the criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer: Add / Edit Product */}
      {isDrawerOpen && (
        <div className="drawer-backdrop" onClick={() => setIsDrawerOpen(false)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h2 className="drawer-title">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
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
                <label className="form-label">Product Name</label>
                <input
                  type="text"
                  name="name"
                  className="form-control"
                  placeholder="e.g. Wireless Noise-Cancelling Headphones"
                  value={formData.name}
                  onChange={handleChange}
                />
                {formErrors.name && <span style={{ color: 'var(--accent-danger)', fontSize: '0.75rem', fontWeight: 600 }}>{formErrors.name}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">SKU / Code</label>
                <input
                  type="text"
                  name="sku"
                  className="form-control"
                  placeholder="e.g. HP-NC-900"
                  value={formData.sku}
                  onChange={handleChange}
                  disabled={!!editingProduct} // SKU cannot be modified on edit (standard best practice)
                />
                {formErrors.sku && <span style={{ color: 'var(--accent-danger)', fontSize: '0.75rem', fontWeight: 600 }}>{formErrors.sku}</span>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Unit Price ($)</label>
                  <input
                    type="number"
                    name="price"
                    step="0.01"
                    className="form-control"
                    placeholder="299.99"
                    value={formData.price}
                    onChange={handleChange}
                  />
                  {formErrors.price && <span style={{ color: 'var(--accent-danger)', fontSize: '0.75rem', fontWeight: 600 }}>{formErrors.price}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Quantity In Stock</label>
                  <input
                    type="number"
                    name="quantity"
                    className="form-control"
                    placeholder="150"
                    value={formData.quantity}
                    onChange={handleChange}
                  />
                  {formErrors.quantity && <span style={{ color: 'var(--accent-danger)', fontSize: '0.75rem', fontWeight: 600 }}>{formErrors.quantity}</span>}
                </div>
              </div>

              <div className="drawer-footer">
                <button type="button" className="btn btn-secondary" style={{ flexGrow: 1 }} onClick={() => setIsDrawerOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flexGrow: 1, justifyContent: 'center' }}>
                  {editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
