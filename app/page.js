'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Upload, Settings, User, AlertCircle, CheckCircle, LogOut } from 'lucide-react'

export default function SolApp() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'sol',
      content: "Hello. I'm Sol. What would you like to explore today?",
      timestamp: new Date().toISOString(),
      tags: ['welcome', 'introduction']
    }
  ])
  
  const [currentMessage, setCurrentMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [user, setUser] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('connecting')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const router = useRouter()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    checkAuthentication()
  }, [])

  const checkAuthentication = async () => {
    try {
      const storedUser = localStorage.getItem('sol_user')
      if (!storedUser) {
        router.push('/login')
        return
      }

      const userData = JSON.parse(storedUser)
      
      const response = await fetch('/api/auth/thrivecart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userData.email })
      })

      const result = await response.json()
      
      if (result.hasActiveSubscription) {
        setUser({
          email: userData.email,
          name: userData.email.split('@')[0],
          personalgorithm: 'building',
          subscription: 'active'
        })
        setIsAuthenticated(true)
        testConnections()
      } else {
        localStorage.removeItem('sol_user')
        router.push('/login')
      }
    } catch (error) {
      console.error('Authentication check failed:', error)
      router.push('/login')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('sol_user')
    router.push('/login')
  }

  const testConnections = async () => {
    try {
      const response = await fetch('/api/test-connection')
      if (response.ok) {
        setConnectionStatus('connected')
      } else {
        setConnectionStatus('error')
      }
    } catch (error) {
      console.error('Connection test failed:', error)
      setConnectionStatus('error')
    }
  }

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || !user) return

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const timestamp = new Date().toISOString()

    const userMessage = {
      id: messageId,
      role: 'user',
      content: currentMessage,
      timestamp,
      tags: []
    }

    setMessages(prev => [...prev, userMessage])
    const messageToSend = currentMessage
    setCurrentMessage('')
    setIsTyping(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageToSend,
          user: user,
          conversationHistory: messages
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      
      const solMessage = {
        id: `sol_${Date.now()}`,
        role: 'sol',
        content: data.response,
        timestamp: new Date().toISOString(),
        tags: data.tags || ['support', 'reflection']
      }

      setMessages(prev => [...prev, solMessage])
      setIsTyping(false)

    } catch (error) {
      console.error('Error processing message:', error)
      setIsTyping(false)
      setMessages(prev => [...prev, {
        id: `error_${Date.now()}`,
        role: 'sol',
        content: "I'm having trouble connecting right now, but I'm still here with you. Your message was important - would you mind sharing that again?",
        timestamp: new Date().toISOString(),
        tags: ['error']
      }])
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    const fileMessage = {
      id: `file_${Date.now()}`,
      role: 'user',
      content: `📎 Uploaded: ${file.name}`,
      timestamp: new Date().toISOString(),
      fileAttachment: file,
      tags: ['file-upload']
    }
    
    setMessages(prev => [...prev, fileMessage])
  }

  // Simple formatting function
  const formatMessage = (content) => {
    const lines = content.split('\n')
    
    return lines.map((line, index) => {
      // Handle bullet points
      if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
        return (
          <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
            <span style={{ color: '#64748b', marginTop: '4px', fontSize: '14px' }}>•</span>
            <span style={{ color: '#334155' }}>{line.replace(/^[•-]\s*/, '')}</span>
          </div>
        )
      }
      
      // Handle bold text
      if (line.includes('**')) {
        const parts = line.split('**')
        return (
          <p key={index} style={{ marginBottom: '12px', color: '#334155' }}>
            {parts.map((part, i) => 
              i % 2 === 1 ? <strong key={i} style={{ fontWeight: '500', color: '#1e293b' }}>{part}</strong> : part
            )}
          </p>
        )
      }
      
      // Regular paragraphs
      if (line.trim()) {
        return <p key={index} style={{ marginBottom: '12px', color: '#334155', lineHeight: '1.6' }}>{line}</p>
      }
      
      return <div key={index} style={{ marginBottom: '8px' }}></div>
    })
  }

  if (!isAuthenticated) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center', 
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f4f2f0 0%, #f1f0f6 35%, #eef4f2 70%, #f3f1f0 100%)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            backgroundColor: '#475569',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '24px',
            margin: '0 auto 16px auto'
          }}>
            ✷
          </div>
          <p style={{ color: '#64748b' }}>Verifying your access...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: 'linear-gradient(135deg, #f4f2f0 0%, #f1f0f6 35%, #eef4f2 70%, #f3f1f0 100%)'
    }}>
      
      {/* Header */}
      <div style={{
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        padding: '24px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            backgroundColor: '#475569',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '18px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            ✷
          </div>
          <div>
            <h1 style={{ 
              fontSize: '20px', 
              fontWeight: '300', 
              color: '#1e293b', 
              letterSpacing: '0.025em',
              margin: 0
            }}>Sol</h1>
            <p style={{ 
              fontSize: '14px', 
              color: '#64748b', 
              fontWeight: '300',
              margin: 0
            }}>AI Business Partner</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {connectionStatus === 'connected' && (
              <div style={{
                width: '8px',
                height: '8px',
                backgroundColor: '#10b981',
                borderRadius: '50%'
              }}></div>
            )}
            {connectionStatus === 'error' && <AlertCircle style={{ width: '16px', height: '16px', color: '#ef4444' }} />}
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '300', letterSpacing: '0.025em' }}>
              {connectionStatus === 'connected' ? 'Connected to Lore' : 
               connectionStatus === 'error' ? 'Connection Issue' : 'Connecting...'}
            </span>
          </div>
          
          <button
            onClick={() => setShowSettings(!showSettings)}
            style={{
              padding: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            <Settings style={{ width: '16px', height: '16px', color: '#64748b' }} />
          </button>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '14px',
            color: '#334155',
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            padding: '8px 16px',
            borderRadius: '12px',
            backdropFilter: 'blur(8px)'
          }}>
            <User style={{ width: '16px', height: '16px' }} />
            <span style={{ fontWeight: '300' }}>{user?.name}</span>
          </div>
          
          <button
            onClick={handleLogout}
            style={{
              padding: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
              border: 'none',
              borderRadius: '50%',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            title="Logout"
          >
            <LogOut style={{ width: '16px', height: '16px', color: '#64748b' }} />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div style={{
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
          padding: '20px 32px'
        }}>
          <div style={{ fontSize: '14px', color: '#334155', fontWeight: '300', lineHeight: '1.5' }}>
            <p style={{ margin: '0 0 8px 0' }}><span style={{ fontWeight: '500', color: '#1e293b' }}>User:</span> {user?.email}</p>
            <p style={{ margin: '0 0 8px 0' }}><span style={{ fontWeight: '500', color: '#1e293b' }}>Personalgorithm™:</span> {user?.personalgorithm}</p>
            <p style={{ margin: '0 0 16px 0' }}><span style={{ fontWeight: '500', color: '#1e293b' }}>Subscription:</span> {user?.subscription}</p>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: '1.5' }}>
              All conversations contribute to your personalized business intelligence and growth patterns.
            </p>
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              display: 'flex',
              justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start'
            }}
          >
            <div style={{
              maxWidth: '512px',
              backgroundColor: message.role === 'user' ? '#475569' : 'transparent',
              color: message.role === 'user' ? 'white' : '#334155',
              borderRadius: '24px',
              padding: '28px',
              boxShadow: message.role === 'user' ? '0 10px 15px -3px rgba(0, 0, 0, 0.1)' : 'none'
            }}>
              
              {message.role === 'sol' && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '16px'
                }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    backgroundColor: '#475569',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '12px'
                  }}>
                    ✷
                  </div>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#1e293b',
                    letterSpacing: '0.025em'
                  }}>Sol</span>
                </div>
              )}
              
              <div style={{
                lineHeight: '1.6',
                fontWeight: '300'
              }}>
                {message.role === 'sol' ? formatMessage(message.content) : message.content}
              </div>
              
              <div style={{
                fontSize: '12px',
                marginTop: '16px',
                color: message.role === 'user' ? 'rgba(255, 255, 255, 0.7)' : '#94a3b8',
                fontWeight: '300'
              }}>
                {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </div>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              borderRadius: '24px',
              padding: '28px',
              maxWidth: '512px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px'
              }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  backgroundColor: '#475569',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '12px'
                }}>
                  ✷
                </div>
                <span style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#1e293b',
                  letterSpacing: '0.025em'
                }}>Sol is thinking</span>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#94a3b8',
                  borderRadius: '50%',
                  animation: 'bounce 1s infinite'
                }}></div>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#94a3b8',
                  borderRadius: '50%',
                  animation: 'bounce 1s infinite 0.1s'
                }}></div>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#94a3b8',
                  borderRadius: '50%',
                  animation: 'bounce 1s infinite 0.2s'
                }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div style={{ padding: '32px' }}>
        <div style={{ maxWidth: '1024px', margin: '0 auto' }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '16px'
          }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <textarea
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Share what's on your mind, ask a question, or just check in..."
                style={{
                  width: '100%',
                  padding: '20px',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '16px',
                  outline: 'none',
                  resize: 'none',
                  minHeight: '60px',
                  maxHeight: '128px',
                  fontWeight: '300',
                  color: '#334155',
                  backgroundColor: 'rgba(255, 255, 255, 0.4)',
                  backdropFilter: 'blur(8px)',
                  fontSize: '16px',
                  lineHeight: '1.5'
                }}
                rows={1}
                disabled={isTyping}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.mp3,.wav,.m4a"
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '16px',
                  color: '#64748b',
                  backgroundColor: 'rgba(255, 255, 255, 0.3)',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                title="Upload file"
                disabled={isTyping}
              >
                <Upload style={{ width: '20px', height: '20px' }} />
              </button>
              
              <button
                onClick={handleSendMessage}
                disabled={!currentMessage.trim() || isTyping}
                style={{
                  padding: '16px',
                  backgroundColor: '#475569',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: !currentMessage.trim() || isTyping ? 'not-allowed' : 'pointer',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.2s',
                  opacity: !currentMessage.trim() || isTyping ? 0.5 : 1
                }}
              >
                <Send style={{ width: '20px', height: '20px' }} />
              </button>
            </div>
          </div>
          
          <div style={{
            marginTop: '16px',
            fontSize: '12px',
            color: '#64748b',
            textAlign: 'center',
            fontWeight: '300',
            letterSpacing: '0.025em'
          }}>
            Everything you share builds your Personalgorithm™ • Powered by your Lore™ memory database
          </div>
        </div>
      </div>
    </div>
  )
}