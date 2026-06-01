import React, { useState } from 'react'
import { Plus, Search, Trash2, Eye, X, AlertCircle, ShoppingBag, PlusCircle, MinusCircle } from 'lucide-react'

export default function OrderManager({ orders, customers, products, onCreateOrder, onDeleteOrder }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [viewingOrder, setViewingOrder] = useState(null)
  
  // Create Order Wizard State
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [orderLines, setOrderLines] = useState([
    { product_id: '', quantity: 1, max_stock: 0, price: 0.0 }
  ])
  const [formErrors, setFormErrors] = useState({})

  // Open creation wizard
  const handleOpenAdd = () => {
    setSelectedCustomerId('')
    setOrderLines([{ product_id: '', quantity: 1, max_stock: 0, price: 0.0 }])
    setFormErrors({})
    setIsDrawerOpen(true)
  }

  // Add a line item to the order draft
  const addOrderLine = () => {
    setOrderLines((prev) => [...prev, { product_id: '', quantity: 1, max_stock: 0, price: 0.0 }])
  }

  // Remove a line item from the order draft
  const removeOrderLine = (index) => {
    if (orderLines.length === 1) return
    setOrderLines((prev) => prev.filter((_, idx) => idx !== index))
  }

  // Update specific field in a draft line item
  const updateOrderLine = (index, field, value) => {
    const lines = [...orderLines]
    
    if (field === 'product_id') {
      const prodId = parseInt(value, 10)
      const selectedProduct = products.find((p) => p.id === prodId)
      
      if (selectedProduct) {
        lines[index] = {
          product_id: value,
          quantity: 1,
          max_stock: selectedProduct.quantity,
          price: selectedProduct.price
        }
      } else {
        lines[index] = { product_id: '', quantity: 1, max_stock: 0, price: 0.0 }
      }
    } else if (field === 'quantity') {
      const qty = parseInt(value, 10) || 1
      lines[index].quantity = qty
    }
    
    setOrderLines(lines)
    if (formErrors.lines) {
      setFormErrors((prev) => ({ ...prev, lines: '' }))
    }
  }

  // Calculate rolling total dynamically
  const calculateRollingTotal = () => {
    return orderLines.reduce((acc, curr) => acc + (curr.quantity * curr.price), 0)
  }

  // Validate Wizard Form
  const validateForm = () => {
    const errors = {}
    if (!selectedCustomerId) {
      errors.customer = 'Please select a customer.'
    }

    const hasEmptyProduct = orderLines.some((line) => !line.product_id)
    if (hasEmptyProduct) {
      errors.lines = 'All items in the list must have a selected product.'
    }

    // Check duplicate products in different lines
    const productIds = orderLines.map((l) => l.product_id).filter(Boolean)
    const uniqueIds = new Set(productIds)
    if (productIds.length !== uniqueIds.size) {
      errors.lines = 'Please do not add the same product multiple times. Increase quantity instead.'
    }

    // Validate quantities against current stock levels
    for (let i = 0; i < orderLines.length; i++) {
      const line = orderLines[i]
      if (line.product_id) {
        const qty = parseInt(line.quantity, 10)
        if (isNaN(qty) || qty <= 0) {
          errors.lines = `Line ${i + 1}: Quantity must be greater than zero.`
          break
        }
        if (qty > line.max_stock) {
          const prodName = products.find((p) => p.id === parseInt(line.product_id, 10))?.name || 'Product'
          errors.lines = `Line ${i + 1} (${prodName}): Insufficient stock. Only ${line.max_stock} available.`
          break
        }
      }
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Submit Order Creation
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    const payload = {
      customer_id: parseInt(selectedCustomerId, 10),
      items: orderLines.map((line) => ({
        product_id: parseInt(line.product_id, 10),
        quantity: parseInt(line.quantity, 10)
      }))
    }

    try {
      await onCreateOrder(payload)
      setIsDrawerOpen(false)
    } catch (err) {
      setFormErrors({ api: err.message || 'Failed to place order' })
    }
  }

  // Filter orders by customer name or Order ID
  const filteredOrders = orders.filter((order) => {
    const custName = order.customer?.name || ''
    const orderIdStr = `#${order.id}`
    return (
      custName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      orderIdStr.includes(searchTerm)
    )
  })

  // Format date cleanly
  const formatDate = (isoString) => {
    if (!isoString) return ''
    const d = new Date(isoString)
    return d.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
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
            placeholder="Search orders by customer or ID (e.g. #3)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <ShoppingBag size={18} /> New Order
        </button>
      </div>

      {/* Orders List Panel */}
      <div className="content-panel">
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer Name</th>
                <th>Placement Date</th>
                <th>Items Ordered</th>
                <th>Total Bill</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>#{order.id}</td>
                    <td style={{ fontWeight: 600 }}>{order.customer?.name || 'Deleted Customer'}</td>
                    <td>{formatDate(order.created_at)}</td>
                    <td>{order.items?.length || 0} unique item(s)</td>
                    <td style={{ fontWeight: 700 }}>${order.total_amount.toFixed(2)}</td>
                    <td>
                      <div className="actions-cell">
                        <button
                          className="action-btn edit"
                          onClick={() => setViewingOrder(order)}
                          title="View order details"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          className="action-btn delete"
                          onClick={() => onDeleteOrder(order.id)}
                          title="Cancel / Delete Order"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                    No orders placed yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-out Drawer: Place New Order */}
      {isDrawerOpen && (
        <div className="drawer-backdrop" onClick={() => setIsDrawerOpen(false)}>
          <div className="drawer" style={{ width: '560px' }} onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h2 className="drawer-title">Place New Order</h2>
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

              {/* Customer Selector */}
              <div className="form-group">
                <label className="form-label">Select Customer</label>
                <select
                  className="form-control"
                  value={selectedCustomerId}
                  onChange={(e) => {
                    setSelectedCustomerId(e.target.value)
                    setFormErrors((prev) => ({ ...prev, customer: '' }))
                  }}
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((cust) => (
                    <option key={cust.id} value={cust.id}>
                      {cust.name} ({cust.email})
                    </option>
                  ))}
                </select>
                {formErrors.customer && <span style={{ color: 'var(--accent-danger)', fontSize: '0.75rem', fontWeight: 600 }}>{formErrors.customer}</span>}
              </div>

              {/* Dynamic Order Line Builder */}
              <div className="order-items-builder">
                <div className="builder-header">Order Items Checklist</div>

                {orderLines.map((line, idx) => (
                  <div key={idx} className="builder-row">
                    {/* Product Dropdown */}
                    <select
                      className="form-control"
                      value={line.product_id}
                      onChange={(e) => updateOrderLine(idx, 'product_id', e.target.value)}
                    >
                      <option value="">-- Select Product --</option>
                      {products.map((prod) => (
                        <option key={prod.id} value={prod.id} disabled={prod.quantity === 0}>
                          {prod.name} (Stock: {prod.quantity})
                        </option>
                      ))}
                    </select>

                    {/* Quantity Field */}
                    <input
                      type="number"
                      min="1"
                      className="form-control"
                      placeholder="Qty"
                      value={line.quantity}
                      onChange={(e) => updateOrderLine(idx, 'quantity', e.target.value)}
                      disabled={!line.product_id}
                    />

                    {/* Dynamic line item subtotal */}
                    <div className="builder-subtotal">
                      ${(line.quantity * line.price).toFixed(2)}
                    </div>

                    {/* Delete Line Button */}
                    <button
                      type="button"
                      className="action-btn delete"
                      onClick={() => removeOrderLine(idx)}
                      disabled={orderLines.length === 1}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}

                {formErrors.lines && <span style={{ color: 'var(--accent-danger)', fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>{formErrors.lines}</span>}

                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '0.5rem', width: '100%', fontSize: '0.85rem', justifyContent: 'center' }}
                  onClick={addOrderLine}
                >
                  <PlusCircle size={14} /> Add Product Line
                </button>

                {/* Rolling Grand Total */}
                <div className="order-rolling-total">
                  <span className="rolling-label">Rolling Order Total:</span>
                  <span className="rolling-value">${calculateRollingTotal().toFixed(2)}</span>
                </div>
              </div>

              <div className="drawer-footer">
                <button type="button" className="btn btn-secondary" style={{ flexGrow: 1 }} onClick={() => setIsDrawerOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flexGrow: 1, justifyContent: 'center' }}>
                  Submit Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Overlay Modal: Order Breakdown Details */}
      {viewingOrder && (
        <div className="modal-backdrop" onClick={() => setViewingOrder(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShoppingBag size={22} style={{ color: 'var(--primary)' }} /> Order Invoice Details
              </h2>
              <button className="close-btn" onClick={() => setViewingOrder(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {/* Meta information */}
              <div className="order-details-meta">
                <div className="meta-item">
                  <span className="meta-label">Customer</span>
                  <span className="meta-value">{viewingOrder.customer?.name || 'Deleted Customer'}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Customer Email</span>
                  <span className="meta-value">{viewingOrder.customer?.email || 'N/A'}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Order Reference ID</span>
                  <span className="meta-value" style={{ color: 'var(--primary)' }}>#{viewingOrder.id}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Placement Date</span>
                  <span className="meta-value">{formatDate(viewingOrder.created_at)}</span>
                </div>
              </div>

              {/* Order items breakdown list */}
              <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem', fontWeight: 600 }}>
                Products Ordered
              </h3>
              
              <div className="table-container">
                <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th>Quantity</th>
                      <th>Unit Price</th>
                      <th style={{ textAlign: 'right' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingOrder.items?.map((item) => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 600 }}>{item.product?.name || 'Deleted Product'}</td>
                        <td>
                          <span style={{ fontFamily: 'monospace', padding: '0.1rem 0.3rem', backgroundColor: 'var(--border-color)', borderRadius: '3px', fontSize: '0.8rem' }}>
                            {item.product?.sku || 'N/A'}
                          </span>
                        </td>
                        <td>{item.quantity}</td>
                        <td>${item.unit_price.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>
                          ${(item.quantity * item.unit_price).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Final sum */}
              <div 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  marginTop: '1.5rem', 
                  borderTop: '1px dashed var(--border-color)', 
                  paddingTop: '1rem' 
                }}
              >
                <strong style={{ fontSize: '1.05rem', color: 'var(--text-secondary)' }}>Grand Total Charged:</strong>
                <strong style={{ fontSize: '1.6rem', color: 'var(--primary)', fontFamily: 'var(--font-display)', fontWeight: 800 }}>
                  ${viewingOrder.total_amount.toFixed(2)}
                </strong>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setViewingOrder(null)}>
                Dismiss invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
