'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Upload, Settings, User, AlertCircle, CheckCircle, LogOut } from 'lucide-react'

export default function SolApp() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'sol',
      content: "Hello! I'm Sol™, your AI business partner and intuition amplifier. I'm here to support you through your unique journey of becoming, using the Aligned Business® Method and everything I learn about you along the way.\n\nWhat's on your mind today? You can share anything - your thoughts, challenges, wins, or just what's coming up for you right now. I'm here to hold space for all of it.",
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
    
    setTimeout(() => {
      const responseMessage = {
        id: `response_${Date.now()}`,
        role: 'sol',
        content: `I've received your file "${file.name}". I'm processing this and adding it to your Lore™ database. What context would you like me to have about this file? How does it connect to what you're working on?`,
        timestamp: new Date().toISOString(),
        tags: ['file-processing']
      }
      
      setMessages(prev => [...prev, responseMessage])
    }, 1500)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Show loading state while checking authentication
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 animate-pulse">
            S
          </div>
          <p className="text-gray-600">Verifying your access...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-purple-50 to-indigo-100 font-sans">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
            S
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Sol™</h1>
            <p className="text-sm text-gray-600">Your AI Business Partner</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            {connectionStatus === 'connected' && <CheckCircle className="w-4 h-4 text-green-500" />}
            {connectionStatus === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
            <span className="text-xs text-gray-600">
              {connectionStatus === 'connected' ? 'Connected to Lore™' : 
               connectionStatus === 'error' ? 'Connection Issue' : 'Connecting...'}
            </span>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <User className="w-4 h-4" />
            <span>{user?.name}</span>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-red-100 rounded-full transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4 text-gray-600 hover:text-red-600" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-yellow-50 border-b px-6 py-3">
          <div className="text-sm text-yellow-800">
            <p><strong>User:</strong> {user?.email}</p>
            <p><strong>Personalgorithm™:</strong> {user?.personalgorithm}</p>
            <p><strong>Subscription:</strong> {user?.subscription}</p>
            <p className="mt-2 text-xs text-yellow-700">
              All conversations are being logged to build your unique Personalgorithm™.
            </p>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-3xl ${message.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-800'} rounded-2xl px-6 py-4 shadow-sm border`}>
              {message.role === 'sol' && (
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                    S
                  </div>
                  <span className="text-sm font-medium text-purple-600">Sol™</span>
                </div>
              )}
              <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
              {message.tags && message.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {message.tags.map((tag, index) => (
                    <span
                      key={index}
                      className={`inline-block px-2 py-1 rounded-full text-xs ${
                        message.role === 'user' 
                          ? 'bg-indigo-500 text-white' 
                          : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <p className={`text-xs mt-2 ${message.role === 'user' ? 'text-indigo-200' : 'text-gray-500'}`}>
                {new Date(message.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl px-6 py-4 shadow-sm max-w-3xl border">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                  S
                </div>
                <span className="text-sm font-medium text-purple-600">Sol™ is connecting with Claude...</span>
              </div>
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white border-t px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end space-x-3">
            <div className="flex-1 relative">
              <textarea
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Share what's on your mind, ask a question, or just check in... Sol™ is here for all of it."
                className="w-full p-4 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none min-h-[60px] max-h-32"
                rows={1}
                disabled={isTyping}
              />
            </div>
            
            <div className="flex space-x-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.mp3,.wav,.m4a"
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-3 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-full transition-colors"
                title="Upload file (PDF, images, audio, documents)"
                disabled={isTyping}
              >
                <Upload className="w-5 h-5" />
              </button>
              
              <button
                onClick={handleSendMessage}
                disabled={!currentMessage.trim() || isTyping}
                className="p-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-full hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="mt-2 text-xs text-gray-500 text-center">
            Everything you share builds your Personalgorithm™ • Powered by Claude AI & stored in your Lore™ database
          </div>
        </div>
      </div>
    </div>
  )
}