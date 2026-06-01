import React, { useState } from 'react'
import { LogIn, UserPlus, Key, Mail, User, ShieldAlert, ArrowRight } from 'lucide-react'

export default function AuthPages({ onLogin, onRegister, addToast }) {
  const [view, setView] = useState('login') // 'login' or 'register'
  
  // Login Form State
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [loginErrors, setLoginErrors] = useState({})
  const [loginLoading, setLoginLoading] = useState(false)

  // Register Form State
  const [registerForm, setRegisterForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [registerErrors, setRegisterErrors] = useState({})
  const [registerLoading, setRegisterLoading] = useState(false)

  // Toggle between Login & Register views
  const handleToggleView = (targetView) => {
    setView(targetView)
    setLoginErrors({})
    setRegisterErrors({})
  }

  // ==========================================
  // LOGIN SUBMISSION HANDLER
  // ==========================================
  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    const errors = {}
    
    if (!loginForm.username.trim()) {
      errors.username = 'Username or email is required.'
    }
    if (!loginForm.password) {
      errors.password = 'Password is required.'
    }

    if (Object.keys(errors).length > 0) {
      setLoginErrors(errors)
      return
    }

    setLoginErrors({})
    setLoginLoading(true)
    try {
      await onLogin(loginForm.username.trim(), loginForm.password)
    } catch (err) {
      setLoginErrors({ api: err.message || 'Incorrect username/email or password.' })
    } finally {
      setLoginLoading(false)
    }
  }

  // ==========================================
  // REGISTER SUBMISSION HANDLER
  // ==========================================
  const handleRegisterSubmit = async (e) => {
    e.preventDefault()
    const errors = {}
    
    if (!registerForm.username.trim()) {
      errors.username = 'Username is required.'
    } else if (registerForm.username.trim().length < 3) {
      errors.username = 'Username must be at least 3 characters.'
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!registerForm.email.trim()) {
      errors.email = 'Email address is required.'
    } else if (!emailRegex.test(registerForm.email.trim())) {
      errors.email = 'Please provide a valid email address.'
    }

    if (!registerForm.password) {
      errors.password = 'Password is required.'
    } else if (registerForm.password.length < 6) {
      errors.password = 'Password must be at least 6 characters.'
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.'
    }

    if (Object.keys(errors).length > 0) {
      setRegisterErrors(errors)
      return
    }

    setRegisterErrors({})
    setRegisterLoading(true)
    try {
      await onRegister(
        registerForm.username.trim(),
        registerForm.email.trim(),
        registerForm.password
      )
      // Automatically toggle to login view on registration success
      addToast('Account created successfully! Please log in.', 'success')
      setView('login')
    } catch (err) {
      setRegisterErrors({ api: err.message || 'Registration failed.' })
    } finally {
      setRegisterLoading(false)
    }
  }

  return (
    <div className="auth-outer-container">
      {/* Background visual graphics */}
      <div className="auth-orb-1"></div>
      <div className="auth-orb-2"></div>
      
      <div className="auth-card">
        {/* Brand header */}
        <div className="auth-header">
          <div className="brand-logo" style={{ width: '48px', height: '48px', fontSize: '1.5rem', margin: '0 auto 1rem auto' }}>
            AP
          </div>
          <h1 className="auth-title">Apex Inventory</h1>
          <p className="auth-subtitle">
            {view === 'login' 
              ? 'Sign in to access your dashboard' 
              : 'Create your centralized admin account'}
          </p>
        </div>

        {/* View Toggle tabs */}
        <div className="auth-tabs">
          <button 
            className={`auth-tab ${view === 'login' ? 'active' : ''}`}
            onClick={() => handleToggleView('login')}
          >
            <LogIn size={16} /> Sign In
          </button>
          <button 
            className={`auth-tab ${view === 'register' ? 'active' : ''}`}
            onClick={() => handleToggleView('register')}
          >
            <UserPlus size={16} /> Register
          </button>
        </div>

        {/* ==========================================
           VIEW A: LOGIN VIEW PORT
           ========================================== */}
        {view === 'login' && (
          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {loginErrors.api && (
              <div className="warning-box" style={{ padding: '0.75rem 1.25rem', fontSize: '0.85rem', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <ShieldAlert size={16} className="warning-icon" />
                <span>{loginErrors.api}</span>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Username or Email</label>
              <div className="auth-input-wrapper">
                <User size={18} className="auth-input-icon" />
                <input
                  type="text"
                  className="form-control auth-input"
                  placeholder="admin or admin@apex.com"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  disabled={loginLoading}
                />
              </div>
              {loginErrors.username && (
                <span className="auth-field-error">{loginErrors.username}</span>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Password</label>
              <div className="auth-input-wrapper">
                <Key size={18} className="auth-input-icon" />
                <input
                  type="password"
                  className="form-control auth-input"
                  placeholder="••••••••"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  disabled={loginLoading}
                />
              </div>
              {loginErrors.password && (
                <span className="auth-field-error">{loginErrors.password}</span>
              )}
            </div>

            <button 
              type="submit" 
              className="btn btn-primary auth-submit-btn"
              disabled={loginLoading}
            >
              {loginLoading ? 'Signing In...' : (
                <>
                  Enter Dashboard <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        )}

        {/* ==========================================
           VIEW B: REGISTER VIEW PORT
           ========================================== */}
        {view === 'register' && (
          <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            {registerErrors.api && (
              <div className="warning-box" style={{ padding: '0.75rem 1.25rem', fontSize: '0.85rem', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <ShieldAlert size={16} className="warning-icon" />
                <span>{registerErrors.api}</span>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Username</label>
              <div className="auth-input-wrapper">
                <User size={18} className="auth-input-icon" />
                <input
                  type="text"
                  className="form-control auth-input"
                  placeholder="e.g. apexadmin"
                  value={registerForm.username}
                  onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                  disabled={registerLoading}
                />
              </div>
              {registerErrors.username && (
                <span className="auth-field-error">{registerErrors.username}</span>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Email Address</label>
              <div className="auth-input-wrapper">
                <Mail size={18} className="auth-input-icon" />
                <input
                  type="email"
                  className="form-control auth-input"
                  placeholder="e.g. admin@apex.com"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                  disabled={registerLoading}
                />
              </div>
              {registerErrors.email && (
                <span className="auth-field-error">{registerErrors.email}</span>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Password</label>
              <div className="auth-input-wrapper">
                <Key size={18} className="auth-input-icon" />
                <input
                  type="password"
                  className="form-control auth-input"
                  placeholder="At least 6 characters"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                  disabled={registerLoading}
                />
              </div>
              {registerErrors.password && (
                <span className="auth-field-error">{registerErrors.password}</span>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Confirm Password</label>
              <div className="auth-input-wrapper">
                <Key size={18} className="auth-input-icon" />
                <input
                  type="password"
                  className="form-control auth-input"
                  placeholder="Repeat your password"
                  value={registerForm.confirmPassword}
                  onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                  disabled={registerLoading}
                />
              </div>
              {registerErrors.confirmPassword && (
                <span className="auth-field-error">{registerErrors.confirmPassword}</span>
              )}
            </div>

            <button 
              type="submit" 
              className="btn btn-primary auth-submit-btn"
              disabled={registerLoading}
            >
              {registerLoading ? 'Creating Account...' : (
                <>
                  Register Admin <UserPlus size={16} />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
