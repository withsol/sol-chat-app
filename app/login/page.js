'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      // Verify subscription with Thrivecart
      const response = await fetch('/api/auth/thrivecart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const result = await response.json()

      if (result.hasActiveSubscription) {
        // Store user session
        localStorage.setItem('sol_user', JSON.stringify({
          email,
          authenticated: true,
          loginTime: new Date().toISOString()
        }))
        
        // Redirect to Sol chat
        router.push('/')
      } else {
        setError('No active subscription found. Please ensure you have an active subscription to The Art of Becoming program.')
      }
    } catch (error) {
      console.error('Login error:', error)
      setError('Unable to verify your subscription. Please try again.')
    }

    setIsLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f4f2f0 0%, #f1f0f6 35%, #eef4f2 70%, #f3f1f0 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(8px)',
        borderRadius: '24px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        padding: '48px',
        width: '100%',
        maxWidth: '480px',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            backgroundColor: '#475569',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '32px',
            margin: '0 auto 24px auto',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
          }}>
            ✷
          </div>
          <h1 style={{ 
            fontSize: '32px', 
            fontWeight: '400', 
            color: '#1e293b', 
            letterSpacing: '0.025em',
            margin: '0 0 8px 0'
          }}>Welcome to Sol™</h1>
          <p style={{ 
            fontSize: '16px', 
            color: '#64748b', 
            fontWeight: '300',
            margin: 0
          }}>Your AI Business Partner</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <label htmlFor="email" style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#1e293b',
              marginBottom: '8px',
              letterSpacing: '0.025em'
            }}>
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter the email used for your Sol course enrollment"
              style={{
                width: '100%',
                padding: '16px 20px',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '12px',
                outline: 'none',
                fontSize: '16px',
                fontWeight: '400',
                color: '#2d3748',
                background: '#fefefe',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                opacity: isLoading ? 0.6 : 1,
                boxSizing: 'border-box'
              }}
              required
              disabled={isLoading}
            />
            <p style={{
              marginTop: '8px',
              fontSize: '14px',
              color: '#64748b',
              fontWeight: '300',
              lineHeight: '1.5'
            }}>
              Use the same email address you used to enroll in the Sol course.
            </p>
          </div>

          {error && (
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <AlertCircle style={{ 
                width: '20px', 
                height: '20px', 
                color: '#ef4444', 
                flexShrink: 0, 
                marginTop: '2px' 
              }} />
              <div style={{ 
                color: '#dc2626', 
                fontSize: '14px',
                fontWeight: '400',
                lineHeight: '1.5'
              }}>{error}</div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !email}
            style={{
              width: '100%',
              backgroundColor: '#475569',
              color: 'white',
              padding: '16px 24px',
              borderRadius: '12px',
              border: 'none',
              fontSize: '16px',
              fontWeight: '500',
              letterSpacing: '0.025em',
              cursor: (!email || isLoading) ? 'not-allowed' : 'pointer',
              boxShadow: '0 10px 15px -3px rgba(71, 85, 105, 0.3)',
              transition: 'all 0.2s ease',
              opacity: (!email || isLoading) ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
            }}
          >
            {isLoading ? (
              <>
                <Loader2 style={{ 
                  width: '20px', 
                  height: '20px',
                  animation: 'spin 1s linear infinite'
                }} />
                <span>Verifying course access...</span>
              </>
            ) : (
              <span>Access Sol™</span>
            )}
          </button>
        </form>
      </div>
      
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}