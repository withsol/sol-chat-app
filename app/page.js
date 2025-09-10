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
      
      // Verify subscription is still active
      const response = await fetch('/api/auth/thrivecart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userData.email })
      })

      const result = await response.json()
      
      if (result.hasActiveSubscription) {
        setUser({
          email: userData.email,
          name: userData.email.split('@')[0], // Use email prefix as display name
          personalgorithm: 'building', // Will be updated as patterns emerge
          subscription: 'active'
        })
        setIsAuthenticated(true)
        testConnections()
      } else {
        // Subscription no longer active
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
    
    // Show processing message
    const processingMessage = {
      id: `processing_${Date.now()}`,
      role: 'sol',
      content: `I'm reading and processing "${file.name}"... This may take a moment.`,
      timestamp: new Date().toISOString(),
      tags: ['file-processing']
    }
    
    setMessages(prev => [...prev, processingMessage])

    try {
      // Read and process the file
      const result = await processUploadedFile(file, user.email)
      
      // Remove processing message and add success message
      setMessages(prev => prev.filter(msg => msg.id !== processingMessage.id))
      
      const successMessage = {
        id: `success_${Date.now()}`,
        role: 'sol',
        content: result.message,
        timestamp: new Date().toISOString(),
        tags: ['file-processed']
      }
      
      setMessages(prev => [...prev, successMessage])
      
    } catch (error) {
      console.error('File processing error:', error)
      
      // Remove processing message and add error message
      setMessages(prev => prev.filter(msg => msg.id !== processingMessage.id))
      
      const errorMessage = {
        id: `error_${Date.now()}`,
        role: 'sol',
        content: `I had trouble processing "${file.name}". Could you try copying and pasting the text content directly instead?`,
        timestamp: new Date().toISOString(),
        tags: ['file-error']
      }
      
      setMessages(prev => [...prev, errorMessage])
    }
  }

  // Add this new function right after the handleFileUpload function:
  async function processUploadedFile(file, userEmail) {
    try {
      // Create FormData to send file
      const formData = new FormData()
      formData.append('file', file)
      formData.append('email', userEmail)
      
      const response = await fetch('/api/process-file', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        throw new Error(`Processing failed: ${response.status}`)
      }
      
      const result = await response.json()
      return result
      
    } catch (error) {
      console.error('Error processing file:', error)
      throw error
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Simple markdown parser for key formatting
  const formatMessage = (content) => {
    const lines = content.split('\n')
    
    return lines.map((line, index) => {
      // Handle bullet points
      if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
        return (
          <div key={index} className="flex items-start space-x-3 mb-2">
            <span className="text-slate-600 mt-1 text-sm">•</span>
            <span className="text-slate-700">{line.replace(/^[•-]\s*/, '')}</span>
          </div>
        )
      }
      
      // Handle bold text
      if (line.includes('**')) {
        const parts = line.split('**')
        return (
          <p key={index} className="mb-3 text-slate-700">
            {parts.map((part, i) => 
              i % 2 === 1 ? <strong key={i} className="font-medium text-slate-800">{part}</strong> : part
            )}
          </p>
        )
      }
      
      // Regular paragraphs
      if (line.trim()) {
        return <p key={index} className="mb-3 text-slate-700 leading-relaxed">{line}</p>
      }
      
      // Empty lines
      return <div key={index} className="mb-2"></div>
    })
  }

  // Show loading state while checking authentication
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{
        background: 'linear-gradient(135deg, #f4f2f0 0%, #f1f0f6 35%, #eef4f2 70%, #f3f1f0 100%)'
      }}>
        <div className="text-center">
          <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 animate-pulse">
            ✷
          </div>
          <p className="text-slate-600">Verifying your access...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen" style={{
      background: 'linear-gradient(135deg, #f4f2f0 0%, #f1f0f6 35%, #eef4f2 70%, #f3f1f0 100%)'
    }}>
      {/* Header */}
      <div className="backdrop-blur-sm border-b border-white/20 px-8 py-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center shadow-md">
            <span className="text-white text-lg">✷</span>
          </div>
          <div>
            <h1 className="text-xl font-light text-slate-800 tracking-wide">Sol</h1>
            <p className="text-sm text-slate-600 font-light">AI Business Partner</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            {connectionStatus === 'connected' && <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>}
            {connectionStatus === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
            <span className="text-xs text-slate-600 tracking-wide font-light">
              {connectionStatus === 'connected' ? 'Connected to Lore' : 
               connectionStatus === 'error' ? 'Connection Issue' : 'Connecting...'}
            </span>
          </div>
          
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-3 hover:bg-white/30 rounded-xl transition-colors"
          >
            <Settings className="w-4 h-4 text-slate-600" />
          </button>
          
          <div className="flex items-center space-x-3 text-sm text-slate-700 bg-white/30 px-4 py-2 rounded-xl backdrop-blur-sm">
            <User className="w-4 h-4" />
            <span className="font-light">{user?.name}</span>
          </div>
          
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-white/30 rounded-full transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="backdrop-blur-sm border-b border-white/20 px-8 py-5">
          <div className="text-sm text-slate-700 font-light space-y-2">
            <p><span className="font-medium text-slate-800">User:</span> {user?.email}</p>
            <p><span className="font-medium text-slate-800">Personalgorithm™:</span> {user?.personalgorithm}</p>
            <p><span className="font-medium text-slate-800">Subscription:</span> {user?.subscription}</p>
            <p className="text-xs text-slate-600 mt-4 leading-relaxed">
              All conversations contribute to your personalized business intelligence and growth patterns.
            </p>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-8 py-8 space-y-6">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-2xl ${
              message.role === 'user' 
                ? 'bg-slate-700 text-white shadow-lg' 
                : ''
            } rounded-3xl px-7 py-6`}>
              
              {message.role === 'sol' && (
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✷</span>
                  </div>
                  <span className="text-sm font-medium text-slate-800 tracking-wide">Sol</span>
                </div>
              )}
              
              <div className={`${message.role === 'user' ? 'text-white' : 'text-slate-700'} leading-relaxed font-light`}>
                {message.role === 'sol' ? formatMessage(message.content) : message.content}
              </div>
              
              {message.tags && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {(Array.isArray(message.tags) 
                     ? message.tags 
                      : message.tags.split(', ')
                     ).map((tag, index) => (
                 <span
                   key={index}
                   className={`inline-block px-2 py-1 rounded-full text-xs ${
              message.role === 'user' 
                ? 'bg-slate-600 text-white' 
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {tag.trim()}
          </span>
        ))}
      </div>
    )}
              
              <div className={`text-xs mt-4 ${
                message.role === 'user' ? 'text-white/70' : 'text-slate-500'
              } font-light`}>
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="rounded-3xl px-7 py-6 max-w-2xl">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✷</span>
                </div>
                <span className="text-sm font-medium text-slate-800 tracking-wide">Sol is thinking...</span>
              </div>
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="px-8 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end space-x-4">
            <div className="flex-1 relative">
              <textarea
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Share what's on your mind, ask a question, or just check in..."
                className="w-full p-5 border border-white/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent resize-none min-h-[60px] max-h-32 font-light text-slate-700 placeholder-slate-500 bg-white/40 backdrop-blur-sm"
                rows={1}
                disabled={isTyping}
              />
            </div>
            
            <div className="flex space-x-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.mp3,.wav,.m4a"
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-4 text-slate-600 hover:text-slate-700 hover:bg-white/30 rounded-xl transition-colors"
                title="Upload file"
                disabled={isTyping}
              >
                <Upload className="w-5 h-5" />
              </button>
              
              <button
                onClick={handleSendMessage}
                disabled={!currentMessage.trim() || isTyping}
                className="p-4 bg-slate-700 text-white rounded-xl hover:bg-slate-800 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="mt-4 text-xs text-slate-600 text-center font-light tracking-wide">
            Everything you share builds your Personalgorithm™ • Powered by your Lore™ memory database
          </div>
        </div>
      </div>
    </div>
  )
}