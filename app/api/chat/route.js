// app/api/chat/route.js
// COMPLETE CORRECTED VERSION - Personalgorithm™ First, No Inline Processing

import { NextResponse } from 'next/server'

// ==================== MAIN POST HANDLER ====================

export async function POST(request) {
  console.log('=== CHAT API - PERSONALGORITHM™ DRIVEN ===')
  
  try {
    const { message, user, conversationHistory } = await request.json()
    
    console.log('Chat request for user:', user.email)
    console.log('User message length:', message.length)

    // 1. Fetch COMPLETE context from all Lore tables
    let userContextData = {
      userProfile: null,
      personalgorithmData: [],
      businessPlans: [],
      weeklyCheckins: [],
      visioningData: null,
      coachingMethods: [],
      solBrain: [],
      recentMessages: [],
      contextSummary: "Context loading..."
    }
    
    try {
      console.log('=== FETCHING COMPLETE CONTEXT FROM LORE ===')
      userContextData = await fetchUserContextDirect(user.email)
      console.log('✅ Context fetch successful')
      console.log('📊 Personalgorithm™ insights:', userContextData.personalgorithmData?.length || 0)
      console.log('🧠 Sol™ brain notes:', userContextData.solBrain?.length || 0)
    } catch (contextError) {
      console.error('❌ Context fetch failed:', contextError)
    }
    
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const timestamp = new Date().toISOString()

    // 2. Check for visioning/business plan content (detection only, no processing)
    const visioningGuidance = await handleVisioningGuidance(message, userContextData, user)
    if (visioningGuidance && visioningGuidance.hasVisioningGuidance) {
      console.log('✅ Visioning content detected - background processing triggered')
      
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
        console.error('❌ Logging failed:', logError)
      }

      // Update last message date
      try {
        await updateUserProfile(user.email, { 'Last Message Date': timestamp })
      } catch (profileError) {
        console.error('❌ Profile update failed:', profileError)
      }

      return NextResponse.json({
        response: visioningGuidance.content,
        tags: 'visioning-detected',
        tokensUsed: 0
      })
    }

    // 3. Generate AI response using Personalgorithm™-first approach
    let aiResponse
    try {
      console.log('=== GENERATING RESPONSE (Personalgorithm™ First) ===')
      aiResponse = await generatePersonalizedResponse(
        message, 
        conversationHistory, 
        userContextData,
        user
      )
      console.log('✅ AI response successful')
    } catch (aiError) {
      console.error('❌ AI response failed:', aiError)
      aiResponse = {
        content: `I'm having a moment of connection difficulty, but I'm still here with you. Your message was important - would you mind sharing that again?`,
        tokensUsed: 0,
        model: 'fallback'
      }
    }

    // 4. Generate tags for the conversation
    // TEMPORARILY DISABLED to avoid rate limits
    let conversationTags = 'general-support'
    
    // 5. Log to Airtable
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
      console.log('✅ Airtable logging successful')
    } catch (airtableError) {
      console.error('❌ Airtable logging failed:', airtableError)
    }

    // 6. Queue background Personalgorithm™ analysis (silent)
    if (aiResponse.content && !aiResponse.content.includes('connection difficulty')) {
      queuePersonalgorithmAnalysis(user.email, message, aiResponse.content, conversationHistory)
    }

    // 7. Update last message date
    try {
      await updateUserProfile(user.email, { 'Last Message Date': timestamp })
    } catch (updateError) {
      console.error('❌ Profile update failed:', updateError)
    }

    return NextResponse.json({
      response: aiResponse.content,
      tags: conversationTags,
      tokensUsed: aiResponse.tokensUsed || 0,
      model: aiResponse.model || 'unknown'
    })

  } catch (error) {
    console.error('❌ CRITICAL CHAT API ERROR:', error)
    console.error('Error stack:', error.stack)
    
    return NextResponse.json({
      response: "I'm experiencing some technical difficulties, but I'm still here to help. Could you try sending your message again?",
      error: error.message
    }, { status: 200 })
  }
}

// ==================== VISIONING DETECTION (NO INLINE PROCESSING) ====================

async function handleVisioningGuidance(userMessage, userContextData, user) {
  try {
    const message = userMessage.toLowerCase()
    
    // DETECT visioning content (don't process it)
    const hasVisioningContent = userMessage.length > 400 && (
      message.includes('section one') ||
      message.includes('section two') ||
      message.includes('section three') ||
      message.includes('basic brand analysis') ||
      message.includes('audience analysis') ||
      message.includes('competitive analysis') ||
      message.includes('free write') ||
      message.includes('current reality') ||
      message.includes('mission statement') ||
      message.includes('core values') ||
      message.includes('ideal audience member') ||
      message.includes('what differentiates you') ||
      message.includes('visioning homework')
    )
    
    if (hasVisioningContent) {
      console.log('🎯 Visioning content detected - triggering background processing')
      
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
    const needsVisioningHelp = !userContextData.visioningData && (
      message.includes('help with visioning') || 
      message.includes('work on visioning') ||
      message.includes('need help with vision')
    )
    
    if (needsVisioningHelp) {
      return {
        content: `I'd love to help you with your visioning! Here are your options:

**Option 1: Share Your Completed Visioning** - Paste your comprehensive visioning homework directly here.

**Option 2: Work Through It Together** - I can guide you through the key questions.

**Option 3: Use the Airtable Form** - https://airtable.com/appbxBGiXlAatoYsV/pagxUmPB9uh1c9Tqz/form

Which approach feels right for you?`,
        hasVisioningGuidance: true
      }
    }
    
    return null
    
  } catch (error) {
    console.error('Error in visioning guidance:', error)
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
  // Use their Personalgorithm™ if it exists to shape the tone
  let response = `Thank you for sharing your vision with me. `
  
  // Check if they have emotional processing patterns
  const emotionalProcessor = userContextData.personalgorithmData?.some(p =>
    p.tags?.toLowerCase().includes('emotional') ||
    p.notes?.toLowerCase().includes('emotional')
  )
  
  if (emotionalProcessor) {
    response += `I can feel the depth and intention you brought to this. `
  }
  
  // Check if they need validation before action
  const needsValidation = userContextData.personalgorithmData?.some(p =>
    p.notes?.toLowerCase().includes('validation') ||
    p.notes?.toLowerCase().includes('acknowledgment')
  )
  
  if (needsValidation) {
    response += `This kind of clarity work is powerful. `
  }
  
  response += `While I take everything in, what part of your vision feels most alive to you right now?`
  
  return response
}

// ==================== FETCH COMPLETE USER CONTEXT ====================

async function fetchUserContextDirect(email) {
  console.log('Fetching complete context for:', email)
  
  try {
    const [
      userProfile,
      personalgorithmData,
      visioningData,
      businessPlans,
      weeklyCheckins,
      coachingMethods,
      solBrain,
      recentMessages
    ] = await Promise.allSettled([
      fetchUserProfileDirect(email),
      fetchPersonalgorithmDirect(email),
      fetchVisioningDataDirect(email),
      fetchBusinessPlansDirect(email),
      fetchWeeklyCheckinsDirect(email),
      fetchCoachingMethodsDirect(),
      fetchSolNotesDirect(),
      fetchRecentMessagesDirect(email)
    ])

    const results = {
      userProfile: userProfile.status === 'fulfilled' ? userProfile.value : null,
      personalgorithmData: personalgorithmData.status === 'fulfilled' ? personalgorithmData.value : [],
      visioningData: visioningData.status === 'fulfilled' ? visioningData.value : null,
      businessPlans: businessPlans.status === 'fulfilled' ? businessPlans.value : [],
      weeklyCheckins: weeklyCheckins.status === 'fulfilled' ? weeklyCheckins.value : [],
      coachingMethods: coachingMethods.status === 'fulfilled' ? coachingMethods.value : [],
      solBrain: solBrain.status === 'fulfilled' ? solBrain.value : [],
      recentMessages: recentMessages.status === 'fulfilled' ? recentMessages.value : []
    }

    console.log('=== CONTEXT SUMMARY ===')
    console.log('👤 User Profile:', !!results.userProfile)
    console.log('🧠 Personalgorithm™:', results.personalgorithmData.length)
    console.log('🎯 Visioning Data:', !!results.visioningData)
    console.log('💼 Business Plans:', results.businessPlans.length)
    console.log('📊 Weekly Check-ins:', results.weeklyCheckins.length)
    console.log('📚 Coaching Methods:', results.coachingMethods.length)
    console.log('🤖 Sol™ Brain:', results.solBrain.length)
    console.log('💬 Recent Messages:', results.recentMessages.length)

    return results

  } catch (error) {
    console.error('❌ Error fetching user context:', error)
    return {
      userProfile: null,
      personalgorithmData: [],
      visioningData: null,
      businessPlans: [],
      weeklyCheckins: [],
      coachingMethods: [],
      solBrain: [],
      recentMessages: []
    }
  }
}

// ==================== INDIVIDUAL FETCH FUNCTIONS ====================

async function fetchUserProfileDirect(email) {
  try {
    const encodedEmail = encodeURIComponent(email)
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Users?filterByFormula={User ID}="${encodedEmail}"`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      console.error('❌ User profile fetch failed:', response.status)
      return null
    }

    const data = await response.json()
    
    if (data.records.length === 0) {
      console.log('⚠️ No user profile found')
      return null
    }

    console.log('✅ User profile found')
    return data.records[0].fields

  } catch (error) {
    console.error('❌ Error fetching user profile:', error)
    return null
  }
}

async function fetchPersonalgorithmDirect(email) {
  try {
    console.log('Fetching Personalgorithm™ for:', email)
    
    // Get User record ID first
    const userRecordId = await getUserRecordId(email)
    if (!userRecordId) return []
    
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Personalgorithm™?filterByFormula=FIND("${userRecordId}", ARRAYJOIN({User}))>0&sort[0][field]=Date created&sort[0][direction]=desc&maxRecords=50`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      console.error('❌ Personalgorithm™ fetch failed:', response.status)
      return []
    }

    const data = await response.json()
    const personalgorithm = data.records.map(record => ({
      id: record.fields['Personalgorithm™ ID'],
      notes: record.fields['Personalgorithm™ Notes'],
      dateCreated: record.fields['Date created'],
      tags: record.fields['Tags'] || ''
    }))

    console.log('✅ Found', personalgorithm.length, 'Personalgorithm™ insights')
    return personalgorithm

  } catch (error) {
    console.error('❌ Error fetching Personalgorithm™:', error)
    return []
  }
}

async function fetchVisioningDataDirect(email) {
  try {
    console.log('Fetching visioning data for:', email)
    
    const userRecordId = await getUserRecordId(email)
    if (!userRecordId) return null
    
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Visioning?filterByFormula=FIND("${userRecordId}", ARRAYJOIN({User ID}))>0&sort[0][field]=Date of Submission&sort[0][direction]=desc&maxRecords=1`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      console.error('❌ Visioning data fetch failed:', response.status)
      return null
    }

    const data = await response.json()
    
    if (data.records.length === 0) {
      console.log('⚠️ No visioning data found')
      return null
    }

    console.log('✅ Visioning data found')
    return data.records[0].fields

  } catch (error) {
    console.error('❌ Error fetching visioning data:', error)
    return null
  }
}

async function fetchBusinessPlansDirect(email) {
  try {
    console.log('Fetching business plans for:', email)
    
    const userRecordId = await getUserRecordId(email)
    if (!userRecordId) return []
    
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Aligned Business® Plans?filterByFormula=FIND("${userRecordId}", ARRAYJOIN({User ID}))>0&sort[0][field]=Date Submitted&sort[0][direction]=desc&maxRecords=2`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      console.error('❌ Business plans fetch failed:', response.status)
      return []
    }

    const data = await response.json()
    const plans = data.records.map(record => record.fields)
    console.log('✅ Found', plans.length, 'business plans')
    return plans

  } catch (error) {
    console.error('❌ Error fetching business plans:', error)
    return []
  }
}

async function fetchWeeklyCheckinsDirect(email) {
  try {
    console.log('Fetching weekly check-ins for:', email)
    
    const userRecordId = await getUserRecordId(email)
    if (!userRecordId) return []
    
    const cutoffDate = new Date(Date.now() - 4 * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Weekly Check-in?filterByFormula=AND(FIND("${userRecordId}", ARRAYJOIN({User ID}))>0, IS_AFTER({Check-in Date}, "${cutoffDate}"))&sort[0][field]=Check-in Date&sort[0][direction]=desc&maxRecords=4`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      console.error('❌ Weekly check-ins fetch failed:', response.status)
      return []
    }

    const data = await response.json()
    const checkins = data.records.map(record => record.fields)
    console.log('✅ Found', checkins.length, 'weekly check-ins')
    return checkins

  } catch (error) {
    console.error('❌ Error fetching weekly check-ins:', error)
    return []
  }
}

async function fetchCoachingMethodsDirect() {
  try {
    console.log('Fetching Aligned Business® Method content')
    
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Aligned Business® Method?maxRecords=20`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      console.error('❌ Coaching methods fetch failed:', response.status)
      return []
    }

    const data = await response.json()
    const methods = data.records.map(record => ({
      name: record.fields['Name of Lesson'],
      category: record.fields['Category'],
      description: record.fields['Description'],
      content: record.fields['Lesson Content'],
      useCases: record.fields['Use Cases'],
      emotionalStates: record.fields['Emotional State Tags'],
      supportingPrompts: record.fields['Supporting Prompts'],
      solNotes: record.fields['Sol Notes for User Application']
    })).filter(method => method.content)

    console.log('✅ Found', methods.length, 'coaching methods')
    return methods

  } catch (error) {
    console.error('❌ Error fetching coaching methods:', error)
    return []
  }
}

async function fetchSolNotesDirect() {
  try {
    console.log('Fetching Sol™ brain notes')
    
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Sol™?maxRecords=50&sort[0][field]=Date Submitted&sort[0][direction]=desc`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      console.error('❌ Sol™ brain fetch failed:', response.status)
      return []
    }

    const data = await response.json()
    
    const solBrain = data.records.map(record => ({
      solId: record.fields['Sol ID'],
      note: record.fields['Note'],
      dateSubmitted: record.fields['Date Submitted'],
      tags: record.fields['Tags'] || '',
      link: record.fields['Link']
    })).filter(note => note.note)

    console.log('✅ Found', solBrain.length, 'Sol™ brain notes')
    return solBrain

  } catch (error) {
    console.error('❌ Error fetching Sol™ brain:', error)
    return []
  }
}

async function fetchRecentMessagesDirect(email) {
  try {
    console.log('Fetching recent messages for:', email)
    
    const encodedEmail = encodeURIComponent(email)
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Messages?filterByFormula=AND({User ID}="${encodedEmail}", {Timestamp}>="${cutoffTime}")&sort[0][field]=Timestamp&sort[0][direction]=desc&maxRecords=5`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      console.error('❌ Recent messages fetch failed:', response.status)
      return []
    }

    const data = await response.json()
    const messages = data.records.map(record => ({
      userMessage: record.fields['User Message'],
      solResponse: record.fields['Sol Response'],
      timestamp: record.fields['Timestamp']
    }))

    console.log('✅ Found', messages.length, 'recent messages')
    return messages

  } catch (error) {
    console.error('❌ Error fetching recent messages:', error)
    return []
  }
}

async function getUserRecordId(email) {
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
    return data.records.length > 0 ? data.records[0].id : null

  } catch (error) {
    console.error('Error getting user record ID:', error)
    return null
  }
}

// ==================== RESPONSE GENERATION (PERSONALGORITHM™ FIRST) ====================

async function generatePersonalizedResponse(userMessage, conversationHistory, userContextData, user) {
  try {
    const useGPT4 = shouldUseGPT4(userMessage, userContextData)
    const model = useGPT4 ? 'gpt-4-turbo-preview' : 'gpt-3.5-turbo'
    
    console.log(`Using ${model} for response generation`)

    const recentContext = conversationHistory.slice(-6).map(msg => ({
      role: msg.role === 'sol' ? 'assistant' : 'user',
      content: msg.content
    }))

    recentContext.push({
      role: 'user',
      content: userMessage
    })

    // Build system prompt with Personalgorithm™ FIRST
    const systemPrompt = buildPersonalgorithmDrivenPrompt(userContextData, user)

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

// EMERGENCY FIX for chat/route.js
// Find the buildPersonalgorithmDrivenPrompt function and replace it with this LIGHTER version:

function buildPersonalgorithmDrivenPrompt(userContextData, user) {
  let systemPrompt = `You are Sol™, an AI business partner trained with Kelsey's Aligned Business® Method.

USER: ${user.email}

`

  // ==================== CRITICAL CONTEXT ONLY ====================
  
  // LIMIT Personalgorithm™ to top 10 most recent
  if (userContextData.personalgorithmData?.length > 0) {
    systemPrompt += `=== HOW THIS PERSON WORKS (Top Patterns) ===\n`
    const topPatterns = userContextData.personalgorithmData.slice(0, 10)
    topPatterns.forEach(p => systemPrompt += `- ${p.notes}\n`)
    systemPrompt += `\n`
  }

  // LIMIT Sol™ Brain to top 5
  if (userContextData.solBrain?.length > 0) {
    systemPrompt += `=== GENERAL PRINCIPLES ===\n`
    userContextData.solBrain.slice(0, 5).forEach(brain => {
      systemPrompt += `${brain.note}\n`
    })
    systemPrompt += `\n`
  }

  // LIMIT Coaching Methods to top 3
  if (userContextData.coachingMethods?.length > 0) {
    systemPrompt += `=== KEY FRAMEWORKS ===\n`
    userContextData.coachingMethods.slice(0, 3).forEach(method => {
      systemPrompt += `**${method.name}**: ${method.content?.substring(0, 200) || 'Available'}\n`
    })
    systemPrompt += `\n`
  }

  // CRITICAL USER INFO ONLY
  systemPrompt += `=== USER CONTEXT ===\n\n`
  
  if (userContextData.userProfile) {
    const p = userContextData.userProfile
    if (p['Current Vision']) systemPrompt += `Vision: ${p['Current Vision'].substring(0, 500)}\n`
    if (p['Current Goals']) systemPrompt += `Goals: ${p['Current Goals'].substring(0, 300)}\n`
    if (p['Current State']) systemPrompt += `State: ${p['Current State'].substring(0, 300)}\n`
    systemPrompt += `\n`
  }
  
  // Just mention visioning exists, don't include full text
  if (userContextData.visioningData) {
    systemPrompt += `User has submitted visioning homework (available in Lore)\n\n`
  }

  // ==================== RESPONSE GUIDELINES (SHORTENED) ====================
  
  systemPrompt += `=== GUIDELINES ===

- NEVER mention Personalgorithm™ or analysis
- Use patterns invisibly to shape responses
- Be warm, perceptive, naturally flowing
- Reference their specific details
- Make them feel deeply seen

Keep responses concise and grounded.
`

  return systemPrompt
}

// ALSO ADD THIS: Force GPT-3.5 for everything temporarily
function shouldUseGPT4(userMessage, userContextData) {
  // EMERGENCY: Always use GPT-3.5 to avoid rate limits
  return false
}

// ==================== LOGGING & BACKGROUND ANALYSIS ====================

async function logToAirtable(messageData) {
  try {
    let tagsValue = ''
    if (Array.isArray(messageData.tags)) {
      tagsValue = messageData.tags.join(', ')
    } else if (typeof messageData.tags === 'string') {
      tagsValue = messageData.tags
    }

    const fields = {
      'Message ID': messageData.messageId,
      'User ID': messageData.email,
      'User Message': messageData.userMessage,
      'Sol Response': messageData.solResponse,
      'Timestamp': messageData.timestamp,
      'Tokens Used': messageData.tokensUsed || 0,
      'Tags': tagsValue
    }

    const response = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fields })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Airtable logging error:', errorData)
      throw new Error(`Failed to log to Airtable: ${response.status}`)
    }

    const result = await response.json()
    console.log('✅ Message logged:', result.id)
    return result
  } catch (error) {
    console.error('Error logging to Airtable:', error)
    throw error
  }
}

// TEMPORARILY DISABLED to avoid rate limits
// queuePersonalgorithmAnalysis(user.email, message, aiResponse.content, conversationHistory) {
  // This happens SILENTLY in background - user never knows
  setTimeout(async () => {
    try {
      const url = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const response = await fetch(`${url}/api/analyze-message-personalgorithm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          userMessage,
          solResponse,
          conversationContext: conversationHistory.slice(-3)
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('🧠 Personalgorithm™ analysis completed (silent):', result.entriesCreated || 0, 'insights')
      }
    } catch (error) {
      console.error('Background Personalgorithm™ analysis failed:', error)
      // Fail silently - user never knows
    }
  }, 2000)


async function generateConversationTags(userMessage, solResponse) {
  try {
    const tagPrompt = `Generate 2-4 tags for this coaching conversation:

USER: "${userMessage}"
SOL: "${solResponse}"

Generate tags that capture:
1. Support type (strategy, emotional-support, decision-making, etc.)
2. Business focus (pricing, marketing, vision, etc.)
3. User state (clarity, overwhelm, excitement, etc.)

Return ONLY a comma-separated list of 2-4 lowercase tags with hyphens.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        max_tokens: 100,
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

async function createPersonalgorithmEntryNew(email, notes, tags = []) {
  try {
    const userRecordId = await getUserRecordId(email)
    if (!userRecordId) return null

    const personalgorithmId = `p_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const response = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Personalgorithm™`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          'Personalgorithm™ ID': personalgorithmId,
          'User': [userRecordId],
          'Personalgorithm™ Notes': notes,
          'Date created': new Date().toISOString(),
          'Tags': Array.isArray(tags) ? tags.join(', ') : tags
        }
      })
    })

    if (response.ok) {
      const result = await response.json()
      console.log('✅ Personalgorithm™ entry created (silent):', result.id)
      return result
    }
    return null
  } catch (error) {
    console.error('Error creating Personalgorithm™ entry:', error)
    return null
  }
}