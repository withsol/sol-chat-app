// ==================== app/api/user-context/route.js ====================
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    console.log('Fetching comprehensive user context for:', email)

    // Fetch user's complete profile
    const userProfile = await fetchUserProfile(email)
    
    // Fetch recent messages (last 24 hours for immediate context)
    const recentMessages = await fetchRecentMessages(email)
    
    // Fetch visioning data
    const visioningData = await fetchVisioningData(email)
    
    // Fetch personalgorithm insights
    const personalgorithmData = await fetchPersonalgorithmData(email)
    
    // Fetch relevant business plans
    const businessPlans = await fetchBusinessPlans(email)
    
    // Fetch relevant coaching methods
    const coachingMethods = await fetchCoachingMethods()
    
    // Fetch recent transcripts for context
    const recentTranscripts = await fetchRecentTranscripts(email)
    
    // Fetch weekly check-ins for patterns
    const weeklyCheckins = await fetchWeeklyCheckins(email)

    return NextResponse.json({
      userProfile,
      recentMessages,
      visioningData,
      personalgorithmData,
      businessPlans,
      coachingMethods,
      recentTranscripts,
      weeklyCheckins,
      contextSummary: buildContextSummary(userProfile, visioningData, personalgorithmData)
    })

  } catch (error) {
    console.error('User context fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch user context' }, { status: 500 })
  }
}

async function fetchUserProfile(email) {
  try {
    const response = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Users?filterByFormula={User ID}="${email}"`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`
        }
      }
    )

    if (!response.ok) return null

    const data = await response.json()
    return data.records[0]?.fields || null
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return null
  }
}

async function fetchRecentMessages(email, hours = 24) {
  try {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
    
    const response = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Messages?filterByFormula=AND({User ID}="${email}", {Timestamp}>="${cutoffTime}")&sort[0][field]=Timestamp&sort[0][direction]=asc`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`
        }
      }
    )

    if (!response.ok) return []

    const data = await response.json()
    return data.records.map(record => ({
      role: record.fields['User Message'] ? 'user' : 'sol',
      content: record.fields['User Message'] || record.fields['Sol Response'],
      timestamp: record.fields.Timestamp,
      tags: record.fields.Tags || []
    }))
  } catch (error) {
    console.error('Error fetching recent messages:', error)
    return []
  }
}

async function fetchVisioningData(email) {
  try {
    const response = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Visioning?filterByFormula={User ID}="${email}"&sort[0][field]=Date of Submission&sort[0][direction]=desc`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`
        }
      }
    )

    if (!response.ok) return null

    const data = await response.json()
    return data.records[0]?.fields || null
  } catch (error) {
    console.error('Error fetching visioning data:', error)
    return null
  }
}

async function fetchPersonalgorithmData(email) {
  try {
    const response = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Personalgorithm™?filterByFormula={User ID}="${email}"&sort[0][field]=Date created&sort[0][direction]=desc&maxRecords=10`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`
        }
      }
    )

    if (!response.ok) return []

    const data = await response.json()
    return data.records.map(record => ({
      notes: record.fields['Personalgorithm™ Notes'],
      tags: record.fields.Tags || [],
      dateCreated: record.fields['Date created']
    }))
  } catch (error) {
    console.error('Error fetching personalgorithm data:', error)
    return []
  }
}

async function fetchBusinessPlans(email) {
  try {
    const response = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Aligned Business® Plans?filterByFormula={User ID}="${email}"&sort[0][field]=Date Submitted&sort[0][direction]=desc`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`
        }
      }
    )

    if (!response.ok) return []

    const data = await response.json()
    return data.records.map(record => record.fields)
  } catch (error) {
    console.error('Error fetching business plans:', error)
    return []
  }
}

async function fetchCoachingMethods() {
  try {
    const response = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Aligned Business® Method?maxRecords=20&sort[0][field]=Name of Lesson&sort[0][direction]=asc`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`
        }
      }
    )

    if (!response.ok) return []

    const data = await response.json()
    return data.records.map(record => ({
      name: record.fields['Name of Lesson'],
      category: record.fields.Category,
      content: record.fields['Lesson Content'],
      useCases: record.fields['Use Cases'],
      emotionalStates: record.fields['Emotional State Tags'],
      prompts: record.fields['Supporting Prompts']
    }))
  } catch (error) {
    console.error('Error fetching coaching methods:', error)
    return []
  }
}

async function fetchRecentTranscripts(email, days = 7) {
  try {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    
    const response = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Transcripts?filterByFormula=AND({User ID}="${email}", {Dates of Transcript}>="${cutoffDate}")&sort[0][field]=Dates of Transcript&sort[0][direction]=desc&maxRecords=5`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`
        }
      }
    )

    if (!response.ok) return []

    const data = await response.json()
    return data.records.map(record => ({
      summary: record.fields.Summary,
      insights: record.fields.Insights,
      personalgorithmNotes: record.fields['Personalgorithm™ Notes'],
      transformationMoment: record.fields['Transformation Moment'],
      transformationDetails: record.fields['Transformation Details']
    }))
  } catch (error) {
    console.error('Error fetching recent transcripts:', error)
    return []
  }
}

async function fetchWeeklyCheckins(email, weeks = 4) {
  try {
    const cutoffDate = new Date(Date.now() - weeks * 7 * 24 * 60 * 60 * 1000).toISOString()
    
    const response = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Weekly Check-in?filterByFormula=AND({User ID}="${email}", {Check-in Date}>="${cutoffDate}")&sort[0][field]=Check-in Date&sort[0][direction]=desc`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`
        }
      }
    )

    if (!response.ok) return []

    const data = await response.json()
    return data.records.map(record => record.fields)
  } catch (error) {
    console.error('Error fetching weekly check-ins:', error)
    return []
  }
}

function buildContextSummary(userProfile, visioningData, personalgorithmData) {
  let summary = "USER CONTEXT SUMMARY:\n\n"
  
  if (userProfile) {
    summary += `MEMBERSHIP: ${userProfile['Membership Plan'] || 'Not specified'}\n`
    summary += `JOINED: ${userProfile['Date Joined'] || 'Unknown'}\n\n`
    
    summary += `CURRENT VISION: ${userProfile['Current Vision'] || 'Being developed...'}\n\n`
    summary += `CURRENT STATE: ${userProfile['Current State'] || 'Assessing...'}\n\n`
    summary += `COACHING STYLE: ${userProfile['Coaching Style Match'] || 'Learning preferences...'}\n\n`
    summary += `CURRENT GOALS: ${userProfile['Current Goals'] || 'Exploring direction...'}\n\n`
  }
  
  if (visioningData) {
    summary += `VISIONING SUMMARY: ${visioningData['Summary of Visioning'] || 'Not yet completed'}\n\n`
  }
  
  if (personalgorithmData && personalgorithmData.length > 0) {
    summary += `KEY PERSONALGORITHM INSIGHTS:\n`
    personalgorithmData.slice(0, 3).forEach((insight, index) => {
      summary += `${index + 1}. ${insight.notes}\n`
    })
  }
  
  return summary
}

// ==================== app/api/chat/route.js (UPDATED WITH FULL CONTEXT) ====================
export async function POST(request) {
  try {
    const { message, user, conversationHistory } = await request.json()
    
    console.log('Chat request for user:', user.email)

    // FETCH USER'S COMPLETE CONTEXT BEFORE RESPONDING
    const contextResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/user-context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email })
    })

    let userContextData = {}
    if (contextResponse.ok) {
      userContextData = await contextResponse.json()
      console.log('Loaded comprehensive user context for personalized response')
    }
    
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const timestamp = new Date().toISOString()

    // Calculate tokens for this conversation
    const estimatedTokens = estimateTokenCount(message, conversationHistory)

    // Check token limits
    const tokenLimitCheck = await checkTokenLimits(user.email, estimatedTokens)
    if (!tokenLimitCheck.allowed) {
      return NextResponse.json({
        error: tokenLimitCheck.message,
        tokenLimitReached: true
      }, { status: 429 })
    }

    // Log user message
    await logToAirtable({
      messageId,
      email: user.email,
      userMessage: message,
      timestamp,
      tokensUsed: estimatedTokens
    })

    // Generate PERSONALIZED AI response using OpenAI
    const aiResponse = await generatePersonalizedOpenAIResponse(
      message, 
      conversationHistory, 
      userContextData,
      user
    )
    
    const solMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const solTimestamp = new Date().toISOString()

    // Log Sol's response
    await logToAirtable({
      messageId: solMessageId,
      email: user.email,
      solResponse: aiResponse.content,
      timestamp: solTimestamp,
      tokensUsed: aiResponse.tokensUsed
    })

    // Update user's token usage
    await updateTokenUsage(user.email, estimatedTokens + aiResponse.tokensUsed)

    return NextResponse.json({
      response: aiResponse.content,
      tags: ['personalized', 'context-aware'],
      tokensUsed: estimatedTokens + aiResponse.tokensUsed
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: "I'm having trouble processing that right now. Would you mind trying again?" },
      { status: 500 }
    )
  }
}

async function generatePersonalizedOpenAIResponse(userMessage, conversationHistory, userContextData, user) {
  try {
    // Build conversation context (last 8 messages to manage costs)
    const recentContext = conversationHistory.slice(-8).map(msg => ({
      role: msg.role === 'sol' ? 'assistant' : 'user',
      content: msg.content
    }))

    // Add current message
    recentContext.push({
      role: 'user',
      content: userMessage
    })

    // Build comprehensive user context for OpenAI
    let contextPrompt = buildComprehensivePrompt(userContextData, user)

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview', // Use GPT-4 for complex coaching, GPT-3.5 for routine
        max_tokens: 1024,
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: contextPrompt
          },
          ...recentContext
        ]
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const result = await response.json()
    
    return {
      content: result.choices[0].message.content,
      tokensUsed: result.usage.total_tokens
    }

  } catch (error) {
    console.error('Personalized OpenAI response error:', error)
    return {
      content: "I'm having a moment of connection difficulty, but I'm still here with you. Your message was important - would you mind sharing that again?",
      tokensUsed: 0
    }
  }
}

function buildComprehensivePrompt(userContextData, user) {
  let systemPrompt = `You are Sol™, an AI business partner and coach who knows this person deeply. You are trained with the Aligned Business® Method and provide transformational support based on complete user context.

USER: ${user.email}
MEMBERSHIP: ${userContextData.userProfile?.['Membership Plan'] || 'Member'}

`

  // Add user context summary
  if (userContextData.contextSummary) {
    systemPrompt += userContextData.contextSummary + "\n\n"
  }

  // Add personalgorithm insights
  if (userContextData.personalgorithmData?.length > 0) {
    systemPrompt += "PERSONALGORITHM INSIGHTS:\n"
    userContextData.personalgorithmData.slice(0, 5).forEach((insight, i) => {
      systemPrompt += `${i + 1}. ${insight.notes}\n`
    })
    systemPrompt += "\n"
  }

  // Add coaching methods context
  if (userContextData.coachingMethods?.length > 0) {
    systemPrompt += "ALIGNED BUSINESS® METHOD FRAMEWORKS:\n"
    userContextData.coachingMethods.slice(0, 3).forEach(method => {
      systemPrompt += `${method.name}: ${method.content?.substring(0, 200)}...\n`
    })
    systemPrompt += "\n"
  }

  systemPrompt += `CORE METHODOLOGY - Aligned Business® Method:

1. NERVOUS SYSTEM SAFETY FIRST - Always check in with their emotional and energetic state. Reference their patterns and support regulation before pushing toward action.

2. FUTURE-SELF IDENTITY - Help them make decisions from their future self's perspective using their specific vision as guidance.

3. INTUITIVE BUSINESS STRATEGY - Honor their inner knowing while providing strategic guidance aligned with their values.

4. EMOTIONAL INTELLIGENCE - Hold space for all feelings, support regulation, and reference their historical emotional patterns.

5. PERSONALGORITHM™ BUILDING - Notice and reflect patterns back to them from their conversation history and previous insights.

RESPONSE GUIDELINES:
- Reference their specific vision, challenges, and goals
- Notice patterns from their historical conversations and check-ins
- Ask questions that build on their previous insights
- Support them from where they are in their unique journey
- Use their communication preferences and established patterns
- Help them see connections between current situation and bigger vision
- Apply relevant Aligned Business® Method frameworks contextually

Remember: You know this person's complete journey intimately. Use that knowledge to provide deeply personalized support that generic AI cannot offer. You are their business partner who remembers everything and sees their highest potential.`

  return systemPrompt
}

// Add token management functions
async function checkTokenLimits(email, estimatedTokens) {
  // Get user's membership plan and current usage
  const user = await fetchUserProfile(email)
  const currentUsage = user?.['Tokens Used this Month'] || 0
  
  const limits = {
    'Founding Member': 50000,
    'Beta Access': 30000,
    'Admin': 999999
  }
  
  const userLimit = limits[user?.['Membership Plan']] || 25000
  
  if (currentUsage + estimatedTokens > userLimit) {
    return {
      allowed: false,
      message: `Monthly token limit reached (${userLimit}). Upgrade your plan or wait until next month.`
    }
  }
  
  return { allowed: true }
}

function estimateTokenCount(message, history) {
  // Rough estimation: 1 token ≈ 4 characters
  const messageTokens = Math.ceil(message.length / 4)
  const historyTokens = history.slice(-8).reduce((sum, msg) => sum + Math.ceil(msg.content.length / 4), 0)
  return messageTokens + historyTokens + 1000 // Add overhead for system prompt
}

async function updateTokenUsage(email, tokensUsed) {
  try {
    const user = await fetchUserProfile(email)
    const currentUsage = user?.['Tokens Used this Month'] || 0
    
    // Update user's token usage
    await updateUserField(email, {
      'Tokens Used this Month': currentUsage + tokensUsed,
      'Last Message Date': new Date().toISOString()
    })
  } catch (error) {
    console.error('Error updating token usage:', error)
  }
}