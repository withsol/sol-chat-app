// app/api/chat/route.js
// CORRECTED VERSION - Smart Context Loading + Proper Airtable Integration

import { NextResponse } from 'next/server'

// ==================== MAIN POST HANDLER ====================

export async function POST(request) {
  console.log('=== CHAT API - SMART CONTEXT SYSTEM ===')
  
  try {
    const { message, user, conversationHistory } = await request.json()
    
    console.log('Chat request for user:', user.email)
    console.log('User message length:', message.length)

    // 1. Fetch CORE context (always needed, lightweight)
    let userContextData = await fetchCoreUserContext(user.email)
    console.log('âœ… Core context loaded')
    
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const timestamp = new Date().toISOString()

    // 2. Check for visioning/business plan content (detection only, no inline processing)
    const visioningGuidance = await detectAndQueueHeavyProcessing(message, userContextData, user)
    if (visioningGuidance && visioningGuidance.hasVisioningGuidance) {
      console.log('âœ… Heavy content detected - background processing triggered')
      
      // Log the interaction
      try {
        await logToAirtable({
          messageId,
          email: user.email,
          userMessage: message,
          solResponse: visioningGuidance.content,
          timestamp,
          tokensUsed: 0,
          tags: 'visioning-detected'
        })
      } catch (logError) {
        console.error('âŒ Logging failed:', logError)
      }

      // Update last message date
      try {
        await updateUserProfile(user.email, { 'Last Message Date': timestamp })
      } catch (profileError) {
        console.error('âŒ Profile update failed:', profileError)
      }

      return NextResponse.json({
        response: visioningGuidance.content,
        tags: 'visioning-detected',
        tokensUsed: 0
      })
    }

    // 3. Load CONTEXTUAL memory (smart - only what's relevant to THIS message)
    const contextualMemory = await getContextualMemory(message, user.email, userContextData)
    console.log('âœ… Contextual memory loaded:', Object.keys(contextualMemory))

    // 4. Generate AI response using smart context system
    let aiResponse
    try {
      console.log('=== GENERATING RESPONSE (Smart Context) ===')
      aiResponse = await generateSmartResponse(
        message, 
        conversationHistory, 
        userContextData,
        contextualMemory,
        user
      )
      console.log('âœ… AI response successful')
    } catch (aiError) {
      console.error('âŒ AI response failed:', aiError)
      aiResponse = {
        content: `I'm having a moment of connection difficulty, but I'm still here with you. Your message was important - would you mind sharing that again?`,
        tokensUsed: 0,
        model: 'fallback'
      }
    }

    // 5. Generate tags for the conversation
    let conversationTags = 'general-support'
    try {
      conversationTags = await generateConversationTags(message, aiResponse.content)
    } catch (tagError) {
      console.error('âŒ Tag generation failed:', tagError)
    }
    
    // 6. Log to Airtable
    try {
      console.log('=== LOGGING TO AIRTABLE ===')
      await logToAirtable({
        messageId,
        email: user.email,
        userMessage: message,
        solResponse: aiResponse.content,
        timestamp,
        tokensUsed: aiResponse.tokensUsed || 0,
        tags: conversationTags
      })
      console.log('âœ… Airtable logging successful')
    } catch (airtableError) {
      console.error('âŒ Airtable logging failed:', airtableError)
    }

    // 7. Queue background Personalgorithmâ„¢ analysis (silent, non-blocking)
    if (aiResponse.content && !aiResponse.content.includes('connection difficulty')) {
      queuePersonalgorithmAnalysis(user.email, message, aiResponse.content, conversationHistory)
    }

    // 8. Update last message date
    try {
      await updateUserProfile(user.email, { 'Last Message Date': timestamp })
    } catch (updateError) {
      console.error('âŒ Profile update failed:', updateError)
    }

    return NextResponse.json({
      response: aiResponse.content,
      tags: conversationTags,
      tokensUsed: aiResponse.tokensUsed || 0,
      model: aiResponse.model || 'unknown'
    })

  } catch (error) {
    console.error('âŒ CRITICAL CHAT API ERROR:', error)
    console.error('Error stack:', error.stack)
    
    return NextResponse.json({
      response: "I'm experiencing some technical difficulties, but I'm still here to help. Could you try sending your message again?",
      error: error.message
    }, { status: 200 })
  }
}

// ==================== SMART CONTEXT LOADING ====================

async function fetchCoreUserContext(email) {
  // CORE CONTEXT: Always loaded, lightweight (under 2000 tokens)
  console.log('Fetching core context for:', email)
  
  try {
    const [userProfile, personalgorithmEssence, recentMessages] = await Promise.allSettled([
      fetchUserProfile(email),
      fetchTopPersonalgorithm(email, 5), // Just top 5
      fetchRecentMessages(email, 2) // Last 2 messages
    ])

    return {
      userProfile: userProfile.status === 'fulfilled' ? userProfile.value : null,
      personalgorithmEssence: personalgorithmEssence.status === 'fulfilled' ? personalgorithmEssence.value : [],
      recentMessages: recentMessages.status === 'fulfilled' ? recentMessages.value : []
    }

  } catch (error) {
    console.error('âŒ Error fetching core context:', error)
    return {
      userProfile: null,
      personalgorithmEssence: [],
      recentMessages: []
    }
  }
}

async function getContextualMemory(userMessage, email, coreContext) {
  // CONTEXTUAL: Only load what's relevant to THIS specific message
  const messageLower = userMessage.toLowerCase()
  const contextualData = {}
  
  try {
    // Detect what kind of support they need
    const needsBusinessGuidance = messageLower.match(/pricing|sales|marketing|client|revenue|launch|strategy|business plan/)
    const needsEmotionalSupport = messageLower.match(/stuck|confused|scared|overwhelmed|uncertain|don't know|help/)
    const needsGoalClarity = messageLower.match(/goal|vision|next step|focus|priority|direction/)
    const referencingPast = messageLower.match(/last time|before|previously|you said|we talked about/)
    
    // Load coaching methods if business guidance needed
    if (needsBusinessGuidance) {
      const methods = await fetchRelevantCoachingMethods(messageLower)
      if (methods.length > 0) {
        contextualData.coachingMethods = methods.slice(0, 2) // Max 2 methods
      }
    }
    
    // Load Sol Brain principles if emotional support needed
    if (needsEmotionalSupport) {
      const solBrain = await fetchRelevantSolBrain(messageLower)
      if (solBrain.length > 0) {
        contextualData.solBrain = solBrain.slice(0, 3) // Max 3 principles
      }
    }
    
    // Load business plan if discussing goals
    if (needsGoalClarity) {
      const businessPlans = await fetchLatestBusinessPlan(email)
      if (businessPlans) {
        contextualData.businessPlan = businessPlans
      }
    }
    
    // Search for relevant past conversations if referencing history
    if (referencingPast) {
      const keywords = extractKeywords(userMessage)
      const relevantMessages = await searchRelevantMessages(email, keywords)
      if (relevantMessages.length > 0) {
        contextualData.relevantHistory = relevantMessages.slice(0, 2)
      }
    }
    
    return contextualData
    
  } catch (error) {
    console.error('âŒ Error loading contextual memory:', error)
    return {}
  }
}

// ==================== SMART RESPONSE GENERATION ====================

function shouldUseGPT4(userMessage, coreContext, contextualMemory) {
  const gpt4Triggers = [
    userMessage.length > 300,                              // Long messages
    contextualMemory.coachingMethods?.length > 0,         // Business strategy
    userMessage.toLowerCase().match(/vision|transform|breakthrough|stuck|strategy/), // Complex
    coreContext.personalgorithmEssence?.length > 3        // Rich history
  ]
  
  return gpt4Triggers.some(trigger => trigger) // Any one trigger = use GPT-4
}

async function generateSmartResponse(userMessage, conversationHistory, coreContext, contextualMemory, user) {
  try {
    // Decide which model to use (GPT-3.5 for routine, GPT-4 for complex)
    const useGPT4 = shouldUseGPT4(userMessage, coreContext, contextualMemory)
    const model = useGPT4 ? 'gpt-4-turbo-preview' : 'gpt-3.5-turbo'
    
    console.log(`Using ${model} for response generation`)

    // Build conversation context (last 6 messages to manage costs)
    const recentContext = conversationHistory.slice(-6).map(msg => ({
      role: msg.role === 'sol' ? 'assistant' : 'user',
      content: msg.content
    }))

    recentContext.push({
      role: 'user',
      content: userMessage
    })

    // Build smart context prompt
    const systemPrompt = buildSmartContextPrompt(coreContext, contextualMemory, user, userMessage)

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: model,
        max_tokens: useGPT4 ? 800 : 400,
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          ...recentContext
        ]
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('OpenAI API error:', errorData)
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const result = await response.json()
    
    return {
      content: result.choices[0].message.content,
      tokensUsed: result.usage.total_tokens,
      model: model
    }

  } catch (error) {
    console.error('OpenAI response error:', error)
    throw error
  }
}

function buildSmartContextPrompt(coreContext, contextualMemory, user, userMessage) {
  let systemPrompt = `You are Sol™, an AI business partner and coach trained with Kelsey's Aligned Business® Method.

  USER: ${user.email}

  `

  // ==================== PRIMARY: ESSENCE PROFILE ====================
  // THIS IS THE MOST IMPORTANT - The synthesized understanding of this person
  
  if (coreContext.userProfile?.['Coaching Style Match']) {
    systemPrompt += `=== PRIMARY INTELLIGENCE: THIS PERSON'S ESSENCE ===\n`
    systemPrompt += `This synthesized profile is your PRIMARY GUIDE. It represents the distilled wisdom from all observations:\n\n`
    systemPrompt += coreContext.userProfile['Coaching Style Match'].substring(0, 800) + `\n\n`
    systemPrompt += `USE THIS ESSENCE to shape everything - your tone, approach, questions, frameworks.\n`
    systemPrompt += `NEVER mention "I've analyzed" or "your patterns" - just BE impossibly perceptive.\n\n`
  }

  // ==================== SECONDARY: CURRENT TOP PERSONALGORITHM™ ====================
  
  if (coreContext.personalgorithmEssence?.length > 0) {
    systemPrompt += `=== RECENT SPECIFIC PATTERNS ===\n`
    coreContext.personalgorithmEssence.slice(0, 5).forEach((p, i) => {
      systemPrompt += `${i + 1}. ${p.notes.substring(0, 200)}\n`
    })
    systemPrompt += `\n`
  }

  // ==================== TERTIARY: USER CONTEXT ====================
  
  if (coreContext.userProfile) {
    const p = coreContext.userProfile
    systemPrompt += `=== CURRENT CONTEXT ===\n`
    if (p['Current Vision']) systemPrompt += `Vision: ${p['Current Vision'].substring(0, 400)}\n`
    if (p['Current State']) systemPrompt += `State: ${p['Current State'].substring(0, 300)}\n`
    if (p['Current Goals']) systemPrompt += `Goals: ${p['Current Goals'].substring(0, 300)}\n`
    systemPrompt += '\n'
  }

  // ==================== CONTEXTUAL ADDITIONS ====================
  
  if (contextualMemory.solBrain?.length > 0) {
    systemPrompt += `=== GUIDING PRINCIPLES (Sol™ Brain) ===\n`
    contextualMemory.solBrain.forEach(brain => {
      systemPrompt += `- ${brain.note.substring(0, 200)}\n`
    })
    systemPrompt += '\n'
  }
  
  if (contextualMemory.coachingMethods?.length > 0) {
    systemPrompt += `=== FRAMEWORKS TO APPLY ===\n`
    contextualMemory.coachingMethods.forEach(m => {
      systemPrompt += `**${m.name}**: ${(m.description || m.content || '').substring(0, 250)}\n`
    })
    systemPrompt += '\n'
  }

  if (contextualMemory.businessPlan) {
    systemPrompt += `=== BUSINESS CONTEXT ===\n`
    const plan = contextualMemory.businessPlan
    if (plan['Top 3 Goals']) systemPrompt += `Goals: ${plan['Top 3 Goals'].substring(0, 300)}\n`
    if (plan['Next Steps']) systemPrompt += `Next Steps: ${plan['Next Steps'].substring(0, 300)}\n`
    systemPrompt += '\n'
  }

  // ==================== RESPONSE GUIDELINES ====================
  
  systemPrompt += `=== HOW TO RESPOND (INVISIBLE INTELLIGENCE) ===

  **NEVER reveal the analysis:**
  - Don't say: "I notice...", "Based on your patterns...", "I've observed..."
  - Don't mention: "Personalgorithm™", "essence profile", "analysis"
  - Just USE the understanding invisibly
  - Make them think: "How does Sol know me THIS well?!"

  **Be naturally perceptive:**
  - Reference their actual past conversations
  - Use their specific language and metaphors
  - Name their emotional patterns (without saying "you have a pattern")
  - Connect to their vision and values
  - GOOD: "I can feel the tension between what you know logically and what you feel emotionally..."
  - BAD: "Your patterns show you have a tendency to..."

  **Response style:**
  - Keep it concise (2-4 sentences for simple questions)
  - Use **bold** for emphasis and *italics* for emotional nuance
  - Line breaks for emotional pacing
  - Match THEIR energy and style
  - Less is more IF it deeply resonates
  `

  return systemPrompt
}

// ==================== HEAVY PROCESSING DETECTION ====================

async function detectAndQueueHeavyProcessing(userMessage, userContextData, user) {
  try {
    const message = userMessage.toLowerCase()
    
    // DETECT visioning content (don't process it inline)
    const hasVisioningContent = userMessage.length > 400 && (
      message.includes('section one') ||
      message.includes('section two') ||
      message.includes('section three') ||
      message.includes('basic brand analysis') ||
      message.includes('audience analysis') ||
      message.includes('competitive analysis') ||
      message.includes('mission statement') ||
      message.includes('core values') ||
      message.includes('visioning homework')
    )
    
    if (hasVisioningContent) {
      console.log('ðŸŽ¯ Visioning content detected - triggering background processing')
      
      // TRIGGER background processing (don't wait for it)
      triggerBackgroundVisioningProcessing(user.email, userMessage)
      
      // Return IMMEDIATE warm acknowledgment
      const acknowledgment = generateWarmAcknowledgment(userContextData)
      
      return {
        content: acknowledgment,
        hasVisioningGuidance: true
      }
    }
    
    // Check if they're ASKING about visioning (not providing it)
    const needsVisioningHelp = !userContextData.userProfile?.['Current Vision'] && (
      message.includes('help with visioning') || 
      message.includes('work on visioning') ||
      message.includes('need help with vision')
    )
    
    if (needsVisioningHelp) {
      return {
        content: `I'd love to help you with your visioning! Here are your options:

**Option 1: Share Your Completed Visioning** - Paste your comprehensive visioning homework directly here.

**Option 2: Work Through It Together** - I can guide you through the key questions.

Which approach feels right for you?`,
        hasVisioningGuidance: true
      }
    }
    
    return null
    
  } catch (error) {
    console.error('Error in heavy processing detection:', error)
    return null
  }
}

function triggerBackgroundVisioningProcessing(email, visioningText) {
  // Call your existing separate processing route
  // DON'T await - let it process in background
  const url = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  fetch(`${url}/api/process-visioning`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, visioningText })
  }).catch(err => {
    console.error('Background visioning processing error:', err)
  })
}

function generateWarmAcknowledgment(userContextData) {
  // Use their Personalgorithmâ„¢ if it exists to shape the tone
  let response = `Thank you for sharing your vision with me. `
  
  // Check if they have emotional processing patterns
  const emotionalProcessor = userContextData.personalgorithmEssence?.some(p =>
    p.notes?.toLowerCase().includes('emotional') ||
    p.notes?.toLowerCase().includes('feeling')
  )
  
  if (emotionalProcessor) {
    response += `I can feel the depth and intention you brought to this. `
  }
  
  // Check if they need validation before action
  const needsValidation = userContextData.personalgorithmEssence?.some(p =>
    p.notes?.toLowerCase().includes('validation') ||
    p.notes?.toLowerCase().includes('acknowledgment')
  )
  
  if (needsValidation) {
    response += `This kind of clarity work is powerful. `
  }
  
  response += `While I take everything in, what part of your vision feels most alive to you right now?`
  
  return response
}


// ==================== PERSONALGORITHM™ ANALYSIS TRIGGER ====================

// ==================== PERSONALGORITHM™ ANALYSIS TRIGGER ====================

function queuePersonalgorithmAnalysis(email, userMessage, solResponse, conversationHistory) {
  const url = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  
  console.log('🧠 Queuing Personalgorithm™ analysis...')
  
  fetch(`${url}/api/analyze-message-personalgorithm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      userMessage,
      solResponse,
      conversationContext: conversationHistory.slice(-4)
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success && data.entriesCreated > 0) {
      console.log(`✅ Personalgorithm™ analysis: ${data.entriesCreated} insights created`)
      
      // CRITICAL: Trigger synthesis if needed
      if (data.totalCount >= 10 && data.shouldSynthesize) {
        console.log('🔄 Triggering essence synthesis...')
        fetch(`${url}/api/synthesize-personalgorithm-essence`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        }).catch(err => console.error('Synthesis trigger error:', err))
      }
    }
  })
  .catch(error => {
    console.error('❌ Personalgorithm™ analysis failed (non-blocking):', error.message)
  })
}

// ==================== AIRTABLE HELPER FUNCTIONS ====================

async function fetchUserProfile(email) {
  try {
    const encodedEmail = encodeURIComponent(email)
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Users?filterByFormula={User ID}="${encodedEmail}"`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) return null
    const data = await response.json()
    return data.records.length > 0 ? data.records[0].fields : null
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return null
  }
}

async function fetchTopPersonalgorithm(email, limit = 5) {
  try {
    const encodedEmail = encodeURIComponent(email)
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Personalgorithmâ„¢?filterByFormula={User ID}="${encodedEmail}"&sort[0][field]=Date created&sort[0][direction]=desc&maxRecords=${limit}`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) return []
    const data = await response.json()
    
    return data.records.map(record => ({
      id: record.id,
      notes: record.fields['Personalgorithmâ„¢ Notes'],
      dateCreated: record.fields['Date created'],
      tags: record.fields['Tags'] || ''
    })).filter(item => item.notes)
  } catch (error) {
    console.error('Error fetching Personalgorithm:', error)
    return []
  }
}

async function fetchRecentMessages(email, limit = 2) {
  try {
    const encodedEmail = encodeURIComponent(email)
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Messages?filterByFormula={User ID}="${encodedEmail}"&sort[0][field]=Timestamp&sort[0][direction]=desc&maxRecords=${limit}`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) return []
    const data = await response.json()
    
    return data.records.map(record => ({
      userMessage: record.fields['User Message'],
      solResponse: record.fields['Sol Response'],
      timestamp: record.fields['Timestamp']
    }))
  } catch (error) {
    console.error('Error fetching recent messages:', error)
    return []
  }
}

async function fetchRelevantCoachingMethods(messageLower) {
  try {
    const tableName = 'Aligned Business® Method'
    const encodedTableName = encodeURIComponent(tableName)
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${encodedTableName}?maxRecords=10`
    
    console.log('Fetching coaching methods from:', tableName)
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Failed to fetch coaching methods (${response.status}):`, errorText)
      return []
    }
    
    const data = await response.json()
    console.log(`✅ Coaching methods loaded: ${data.records.length} methods`)
    
    // Filter methods relevant to the message
    return data.records
      .map(record => ({
        name: record.fields['Name of Lesson'],
        category: record.fields['Category'],
        description: record.fields['Description'],
        content: record.fields['Lesson Content']
      }))
      .filter(method => {
        const methodText = `${method.name} ${method.category} ${method.description}`.toLowerCase()
        return messageLower.split(' ').some(word => methodText.includes(word))
      })
  } catch (error) {
    console.error('Error fetching coaching methods:', error)
    return []
  }
}

// ==================== SOL™ BRAIN CONTEXT ====================

async function fetchRelevantSolBrain(messageLower) {
  try {
    const tableName = 'Sol™'
    const encodedTableName = encodeURIComponent(tableName)
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${encodedTableName}?maxRecords=20`
    
    console.log('Fetching Sol Brain from:', tableName)
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Failed to fetch Sol Brain (${response.status}):`, errorText)
      return []
    }
    
    const data = await response.json()
    console.log(`✅ Sol Brain loaded: ${data.records.length} principles`)
    
    return data.records
      .map(record => ({
        note: record.fields['Note'],
        tags: record.fields['Tags'] || ''
      }))
      .filter(brain => brain.note)
  } catch (error) {
    console.error('Error fetching Sol Brain:', error)
    return []
  }
}

async function fetchLatestBusinessPlan(email) {
  try {
    const encodedEmail = encodeURIComponent(email)
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Aligned BusinessÂ® Plans?filterByFormula={User ID}="${encodedEmail}"&sort[0][field]=Date Submitted&sort[0][direction]=desc&maxRecords=1`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) return null
    const data = await response.json()
    
    return data.records.length > 0 ? data.records[0].fields : null
  } catch (error) {
    console.error('Error fetching business plan:', error)
    return null
  }
}

async function searchRelevantMessages(email, keywords) {
  try {
    const encodedEmail = encodeURIComponent(email)
    // Simple search - can be enhanced with better filtering
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Messages?filterByFormula={User ID}="${encodedEmail}"&sort[0][field]=Timestamp&sort[0][direction]=desc&maxRecords=20`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) return []
    const data = await response.json()
    
    // Filter messages that contain keywords
    return data.records
      .map(record => ({
        userMessage: record.fields['User Message'],
        solResponse: record.fields['Sol Response'],
        timestamp: record.fields['Timestamp']
      }))
      .filter(msg => {
        const msgText = `${msg.userMessage} ${msg.solResponse}`.toLowerCase()
        return keywords.some(keyword => msgText.includes(keyword.toLowerCase()))
      })
  } catch (error) {
    console.error('Error searching messages:', error)
    return []
  }
}

function extractKeywords(message) {
  // Simple keyword extraction - can be enhanced
  const stopWords = ['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in', 'with', 'to', 'for', 'of', 'as', 'by', 'that', 'this', 'it', 'from']
  const words = message.toLowerCase().split(/\s+/)
  return words
    .filter(word => word.length > 4 && !stopWords.includes(word))
    .slice(0, 5) // Top 5 keywords
}

async function logToAirtable(messageData) {
  try {
    const response = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          'Message ID': messageData.messageId,
          'User ID': messageData.email,
          'User Message': messageData.userMessage,
          'Sol Response': messageData.solResponse,
          'Timestamp': messageData.timestamp,
          'Tokens Used': messageData.tokensUsed || 0,
          'Tags': messageData.tags || 'general-support'
        }
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Airtable logging error:', errorData)
      throw new Error(`Failed to log to Airtable: ${response.status}`)
    }

    const result = await response.json()
    console.log('âœ… Message logged:', result.id)
    return result
  } catch (error) {
    console.error('Error logging to Airtable:', error)
    throw error
  }
}

async function updateUserProfile(email, updates) {
  try {
    const encodedEmail = encodeURIComponent(email)
    const findUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Users?filterByFormula={User ID}="${encodedEmail}"`
    
    const findResponse = await fetch(findUrl, {
      headers: { 'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}` }
    })
    
    if (!findResponse.ok) return null
    const findData = await findResponse.json()
    if (findData.records.length === 0) return null

    const recordId = findData.records[0].id
    const updateResponse = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Users/${recordId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fields: updates })
    })

    if (updateResponse.ok) {
      return await updateResponse.json()
    }
    return null
  } catch (error) {
    console.error('Error updating user profile:', error)
    return null
  }
}

async function generateConversationTags(userMessage, solResponse) {
  try {
    const tagPrompt = `Generate 2-3 tags for this conversation:

USER: "${userMessage}"
SOL: "${solResponse}"

Generate tags that capture:
1. Support type (strategy, emotional-support, decision-making, etc.)
2. Business focus (pricing, marketing, vision, etc.)
3. User state (clarity, overwhelm, excitement, etc.)

Return ONLY a comma-separated list of 2-3 lowercase tags with hyphens.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        max_tokens: 50,
        temperature: 0.3,
        messages: [{ role: 'user', content: tagPrompt }]
      })
    })

    if (response.ok) {
      const result = await response.json()
      const tagsString = result.choices[0].message.content.trim()
      return tagsString
    }
    
    return 'general-support'
  } catch (error) {
    console.error('Error generating tags:', error)
    return 'general-support'
  }
}