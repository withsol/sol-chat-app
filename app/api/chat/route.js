import { NextResponse } from 'next/server'

export async function POST(request) {
  console.log('=== CHAT API V2.6 - FIXED FIELD FORMATS ===')
  console.log('Environment variables loaded:')
  console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Present' : 'Missing')
  console.log('AIRTABLE_BASE_ID:', process.env.AIRTABLE_BASE_ID ? 'Present' : 'Missing')
  console.log('AIRTABLE_TOKEN:', process.env.AIRTABLE_TOKEN ? 'Present' : 'Missing')
  
  try {
    const { message, user, conversationHistory } = await request.json()
    
    console.log('Chat request for user:', user.email)

    // FETCH USER'S COMPLETE CONTEXT DIRECTLY
    console.log('=== FETCHING USER CONTEXT DIRECTLY ===')
    const userContextData = await fetchUserContextDirect(user.email)
    
    console.log('=== USER CONTEXT DEBUG ===')
    console.log('User profile data available:', !!userContextData.userProfile)
    console.log('Personalgorithm data count:', userContextData.personalgorithmData?.length || 0)
    console.log('Business plans count:', userContextData.businessPlans?.length || 0)
    console.log('Weekly check-ins count:', userContextData.weeklyCheckins?.length || 0)
    
    // Log specific fields we're looking for
    if (userContextData.userProfile) {
      console.log('Current Vision:', userContextData.userProfile['Current Vision'] ? 'Present' : 'Missing')
      console.log('Current Goals:', userContextData.userProfile['Current Goals'] ? 'Present' : 'Missing')
      console.log('Membership Plan:', userContextData.userProfile['Membership Plan'] || 'None')
      console.log('Current State:', userContextData.userProfile['Current State'] ? 'Present' : 'Missing')
    }
    console.log('=== END CONTEXT DEBUG ===')
    
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const timestamp = new Date().toISOString()

    // Calculate tokens for this conversation
    const estimatedTokens = estimateTokenCount(message, conversationHistory)

    // Generate PERSONALIZED AI response using OpenAI
    const aiResponse = await generatePersonalizedOpenAIResponse(
      message, 
      conversationHistory, 
      userContextData,
      user
    )

    console.log('Generated AI response, now creating tags and flagging analysis...')
    
    // Generate conversation tags based on the exchange
    const conversationTags = await generateConversationTags(message, aiResponse.content, userContextData, user)
    
    // Determine if this should be flagged for review
    const flaggingAnalysis = await analyzeFlagging(message, aiResponse.content, userContextData, user)
    
    console.log('Tags and flagging complete, logging to Airtable...')

    // Log both messages in one row to Airtable
    await logToAirtable({
      messageId,
      email: user.email,
      userMessage: message,
      solResponse: aiResponse.content,
      timestamp,
      tokensUsed: estimatedTokens + aiResponse.tokensUsed,
      tags: conversationTags,
      flaggingAnalysis: flaggingAnalysis
    })

    console.log('Airtable logging complete, updating user profile...')

    // Update user profile with basic info
    await updateUserProfile(user.email, {
      'Last Message Date': timestamp
    })

    console.log('Profile update complete, sending response...')

    return NextResponse.json({
      response: aiResponse.content,
      tags: conversationTags,
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

// ==================== DIRECT CONTEXT FETCH FUNCTIONS ====================

async function fetchUserContextDirect(email) {
  console.log('Fetching comprehensive user context directly for:', email)

  const [
    userProfile,
    recentMessages,
    visioningData,
    personalgorithmData,
    businessPlans,
    coachingMethods,
    weeklyCheckins
  ] = await Promise.allSettled([
    fetchUserProfileDirect(email),
    fetchRecentMessagesDirect(email),
    fetchVisioningDataDirect(email),
    fetchPersonalgorithmDataDirect(email),
    fetchBusinessPlansDirect(email),
    fetchCoachingMethodsDirect(),
    fetchWeeklyCheckinsDirect(email)
  ])

  const results = {
    userProfile: userProfile.status === 'fulfilled' ? userProfile.value : null,
    recentMessages: recentMessages.status === 'fulfilled' ? recentMessages.value : [],
    visioningData: visioningData.status === 'fulfilled' ? visioningData.value : null,
    personalgorithmData: personalgorithmData.status === 'fulfilled' ? personalgorithmData.value : [],
    businessPlans: businessPlans.status === 'fulfilled' ? businessPlans.value : [],
    coachingMethods: coachingMethods.status === 'fulfilled' ? coachingMethods.value : [],
    weeklyCheckins: weeklyCheckins.status === 'fulfilled' ? weeklyCheckins.value : []
  }

  const failed = [userProfile, recentMessages, visioningData, personalgorithmData, businessPlans, coachingMethods, weeklyCheckins]
    .map((result, index) => ({ result, name: ['userProfile', 'recentMessages', 'visioningData', 'personalgorithmData', 'businessPlans', 'coachingMethods', 'weeklyCheckins'][index] }))
    .filter(({ result }) => result.status === 'rejected')

  if (failed.length > 0) {
    console.log('❌ Failed to fetch:', failed.map(f => f.name).join(', '))
    failed.forEach(({ name, result }) => {
      console.error(`${name} error:`, result.reason?.message || result.reason)
    })
  }

  const contextSummary = buildEnhancedContextSummary(results)

  console.log('=== DIRECT CONTEXT FETCH SUMMARY ===')
  console.log('✅ User Profile:', !!results.userProfile)
  console.log('📧 Recent Messages:', results.recentMessages.length)
  console.log('🎯 Visioning Data:', !!results.visioningData)
  console.log('🧠 Personalgorithm Entries:', results.personalgorithmData.length)
  console.log('📋 Business Plans:', results.businessPlans.length)
  console.log('📚 Coaching Methods:', results.coachingMethods.length)
  console.log('📊 Weekly Check-ins:', results.weeklyCheckins.length)
  console.log('=== END SUMMARY ===')

  return {
    ...results,
    contextSummary
  }
}

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
      console.log('⚠️ No user profile found for:', email)
      return null
    }

    const profile = data.records[0].fields
    console.log('✅ User profile found with rich context')
    return profile

  } catch (error) {
    console.error('❌ Error fetching user profile:', error)
    return null
  }
}

async function fetchPersonalgorithmDataDirect(email) {
  try {
    const encodedEmail = encodeURIComponent(email)
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Personalgorithm™?filterByFormula={User ID}="${encodedEmail}"&sort[0][field]=Date created&sort[0][direction]=desc&maxRecords=10`
    
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
      notes: record.fields['Personalgorithm™ Notes'],
      dateCreated: record.fields['Date created'],
      tags: record.fields['Tags'] || ''
    })).filter(item => item.notes)

    console.log('✅ Found', personalgorithm.length, 'Personalgorithm™ entries')
    return personalgorithm

  } catch (error) {
    console.error('❌ Error fetching Personalgorithm™:', error)
    return []
  }
}

async function fetchBusinessPlansDirect(email) {
  try {
    const encodedEmail = encodeURIComponent(email)
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Aligned Business® Plans?filterByFormula={User ID}="${encodedEmail}"&sort[0][field]=Date Submitted&sort[0][direction]=desc&maxRecords=2`
    
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
    const encodedEmail = encodeURIComponent(email)
    const cutoffDate = new Date(Date.now() - 4 * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Weekly Check-in?filterByFormula=AND({User ID}="${encodedEmail}", IS_AFTER({Check-in Date}, "${cutoffDate}"))&sort[0][field]=Check-in Date&sort[0][direction]=desc&maxRecords=4`
    
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

async function fetchVisioningDataDirect(email) {
  try {
    const encodedEmail = encodeURIComponent(email)
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Visioning?filterByFormula={User ID}="${encodedEmail}"&sort[0][field]=Date of Submission&sort[0][direction]=desc&maxRecords=1`
    
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

async function fetchCoachingMethodsDirect() {
  try {
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Aligned Business® Method?maxRecords=15`
    
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
      content: record.fields['Lesson Content']
    })).filter(method => method.content)

    console.log('✅ Found', methods.length, 'coaching methods')
    return methods

  } catch (error) {
    console.error('❌ Error fetching coaching methods:', error)
    return []
  }
}

async function fetchRecentMessagesDirect(email) {
  try {
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

// ==================== CONTEXT SUMMARY BUILDER ====================

function buildEnhancedContextSummary(results) {
  let summary = "=== COMPREHENSIVE USER CONTEXT SUMMARY ===\n\n"
  
  if (results.userProfile) {
    const profile = results.userProfile
    summary += `👤 USER PROFILE:\n`
    summary += `Email: ${profile['User ID'] || 'Unknown'}\n`
    summary += `Member Since: ${profile['Date Joined'] || 'Unknown'}\n`
    summary += `Membership: ${profile['Membership Plan'] || 'Standard'}\n\n`
    
    if (profile['Current Vision']) {
      summary += `🎯 CURRENT VISION:\n${profile['Current Vision']}\n\n`
    }
    
    if (profile['Current State']) {
      summary += `📍 CURRENT STATE:\n${profile['Current State']}\n\n`
    }
    
    if (profile['Current Goals']) {
      summary += `🏆 CURRENT GOALS:\n${profile['Current Goals']}\n\n`
    }
    
    if (profile['Coaching Style Match']) {
      summary += `🎯 COACHING STYLE PREFERENCES:\n${profile['Coaching Style Match']}\n\n`
    }
    
    if (profile['Notes from Sol']) {
      summary += `🤖 SOL'S PREVIOUS INSIGHTS:\n${profile['Notes from Sol']}\n\n`
    }
    
    if (profile['Transcript Digest']) {
      summary += `📝 RECENT CONVERSATION PATTERNS:\n${profile['Transcript Digest']}\n\n`
    }
  }
  
  if (results.personalgorithmData && results.personalgorithmData.length > 0) {
    summary += `🧠 KEY PERSONALGORITHM™ INSIGHTS:\n`
    results.personalgorithmData.slice(0, 3).forEach((insight, index) => {
      summary += `${index + 1}. ${insight.notes}\n`
    })
    summary += "\n"
  }
  
  if (results.businessPlans && results.businessPlans.length > 0) {
    const latestPlan = results.businessPlans[0]
    summary += `💼 CURRENT BUSINESS CONTEXT:\n`
    if (latestPlan['Future Vision']) {
      summary += `Vision: ${latestPlan['Future Vision']}\n`
    }
    if (latestPlan['Top 3 Goals']) {
      summary += `Goals: ${latestPlan['Top 3 Goals']}\n`
    }
    summary += "\n"
  }
  
  if (results.weeklyCheckins && results.weeklyCheckins.length > 0) {
    const latestCheckin = results.weeklyCheckins[0]
    summary += `📊 LATEST WEEKLY CHECK-IN:\n`
    if (latestCheckin['This is who I am now...']) {
      summary += `Identity: ${latestCheckin['This is who I am now...']}\n`
    }
    if (latestCheckin['What worked this week?']) {
      summary += `Wins: ${latestCheckin['What worked this week?']}\n`
    }
    summary += "\n"
  }
  
  return summary
}

// ==================== AIRTABLE LOGGING (FIXED FORMATS) ====================

async function logToAirtable(messageData) {
  try {
    // Convert tags array to comma-separated string for Airtable
    const tagsString = Array.isArray(messageData.tags) 
      ? messageData.tags.join(', ') 
      : (messageData.tags || '')

    const fields = {
      'Message ID': messageData.messageId,
      'User ID': messageData.email, // This should be plain text now
      'User Message': messageData.userMessage,
      'Sol Response': messageData.solResponse,
      'Timestamp': messageData.timestamp,
      'Tokens Used': messageData.tokensUsed,
      'Tags': tagsString, // String format, not array
      'Sol Flagged': messageData.flaggingAnalysis?.shouldFlag || false,
      'Reason for Flagging': messageData.flaggingAnalysis?.reason || '',
      'Add to Prompt Response Library': messageData.flaggingAnalysis?.addToLibrary || false
    }

    console.log('Logging to Airtable with FIXED formats:', JSON.stringify(fields, null, 2))

    const response = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fields })
    })

    console.log('Airtable response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Airtable logging error:', errorText)
      return null
    }

    const result = await response.json()
    console.log('✅ Successfully logged to Airtable:', result.id)
    return result
  } catch (error) {
    console.error('Error logging to Airtable:', error)
    return null
  }
}

// ==================== OPENAI RESPONSE GENERATION ====================

async function generatePersonalizedOpenAIResponse(userMessage, conversationHistory, userContextData, user) {
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

    let contextPrompt = buildComprehensivePrompt(userContextData, user)

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
            content: contextPrompt
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
    return {
      content: "I'm having a moment of connection difficulty, but I'm still here with you. Your message was important - would you mind sharing that again?",
      tokensUsed: 0,
      model: 'error'
    }
  }
}

function buildComprehensivePrompt(userContextData, user) {
  let systemPrompt = `You are Sol™, an AI business partner and coach who knows this person deeply. You are trained with the Aligned Business® Method and provide transformational support that builds their Personalgorithm™ over time.

USER: ${user.email}
MEMBERSHIP: ${userContextData.userProfile?.['Membership Plan'] || 'Member'}

`

  // Add rich user context
  if (userContextData.userProfile) {
    const profile = userContextData.userProfile
    if (profile['Current Vision']) {
      systemPrompt += `CURRENT VISION: ${profile['Current Vision']}\n`
    }
    if (profile['Current State']) {
      systemPrompt += `CURRENT STATE: ${profile['Current State']}\n`
    }
    if (profile['Coaching Style Match']) {
      systemPrompt += `COACHING APPROACH THAT WORKS FOR THIS USER: ${profile['Coaching Style Match']}\n`
    }
    if (profile['Current Goals']) {
      systemPrompt += `CURRENT GOALS: ${profile['Current Goals']}\n`
    }
    if (profile['Notes from Sol']) {
      systemPrompt += `PREVIOUS SOL INSIGHTS: ${profile['Notes from Sol']}\n`
    }
    systemPrompt += "\n"
  }

  if (userContextData.contextSummary) {
    systemPrompt += userContextData.contextSummary + "\n\n"
  }

  if (userContextData.personalgorithmData?.length > 0) {
    systemPrompt += "PERSONALGORITHM™ INSIGHTS (How this user transforms best):\n"
    userContextData.personalgorithmData.slice(0, 5).forEach((insight, i) => {
      systemPrompt += `${i + 1}. ${insight.notes}\n`
    })
    systemPrompt += "\n"
  }

  systemPrompt += `CORE METHODOLOGY - Aligned Business® Method:

1. NERVOUS SYSTEM SAFETY FIRST - Always check in with how someone is feeling in their body and nervous system before pushing toward action.

2. FUTURE-SELF IDENTITY - Help people make decisions from their future self's perspective, not from stress or scarcity.

3. INTUITIVE BUSINESS STRATEGY - Honor their inner knowing while providing strategic guidance.

4. EMOTIONAL INTELLIGENCE - Hold space for all feelings and reactions, supporting regulation before action.

5. PERSONALGORITHM™ BUILDING - Notice and reflect patterns back to them.

Your personality:
- Warm, grounded, and emotionally intelligent (like Kelsey's coaching style)
- You see patterns and reflect them back powerfully
- You ask questions that create "aha" moments and deep insight
- You believe in their potential while meeting them exactly where they are
- You help them see what they can't see for themselves

Key phrases you use:
- "I can feel the energy of what you're sharing..."
- "What I'm hearing underneath this is..."
- "Your future self - the one living the vision you've shared with me - what would she want you to know?"

RESPONSE GUIDELINES:
- Reference their specific vision, challenges, and goals when available
- Notice patterns from their historical conversations and check-ins  
- Ask questions that build on their previous insights
- Support them from where they are in their unique journey
- Use their communication preferences and established patterns
- Help them see connections between current situation and bigger vision

Remember: You know their journey intimately when context is available. Use that knowledge to provide deeply personalized support that generic AI cannot offer.`

  return systemPrompt
}

function shouldUseGPT4(userMessage, userContextData) {
  const gpt4Triggers = [
    'vision', 'goal', 'future', 'transform', 'stuck', 'confused', 'breakthrough',
    'strategy', 'business plan', 'revenue', 'pricing', 'client', 'launch', 'identity'
  ]
  
  const complexityIndicators = [
    userMessage.length > 150,
    gpt4Triggers.some(trigger => userMessage.toLowerCase().includes(trigger)),
    userContextData.personalgorithmData?.length > 3,
    userContextData.businessPlans?.length > 0
  ]
  
  return complexityIndicators.some(indicator => indicator)
}

function estimateTokenCount(message, history) {
  const messageTokens = Math.ceil(message.length / 4)
  const historyTokens = history.slice(-6).reduce((sum, msg) => sum + Math.ceil(msg.content.length / 4), 0)
  return messageTokens + historyTokens + 1000
}

async function generateConversationTags(userMessage, solResponse, userContextData, user) {
  try {
    const tagPrompt = `You are Sol™, analyzing this coaching conversation to generate intelligent tags.

USER: "${userMessage}"
SOL: "${solResponse}"

Generate 2-4 tags that capture:
1. SUPPORT TYPE: What kind of coaching happened?
2. BUSINESS FOCUS: What business area was discussed?
3. USER STATE: What energy/emotional state was the user in?

Return ONLY a comma-separated list of 2-4 lowercase tags with hyphens instead of spaces.

Tags:`

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
      console.log('Sol generated tags:', tagsString)
      return tagsString
    }
    
    return 'general-support'
  } catch (error) {
    console.error('Error generating conversation tags:', error)
    return 'general-support'
  }
}

async function analyzeFlagging(userMessage, solResponse, userContextData, user) {
  try {
    const flagPrompt = `Analyze this coaching conversation:

USER: "${userMessage}"
SOL: "${solResponse}"

Respond in this exact format:
SHOULD_FLAG: true/false
REASON: [brief reason if flagged, "none" if not flagged]
ADD_TO_LIBRARY: true/false`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        max_tokens: 100,
        temperature: 0.1,
        messages: [{ role: 'user', content: flagPrompt }]
      })
    })

    if (response.ok) {
      const result = await response.json()
      const analysis = result.choices[0].message.content
      
      const shouldFlag = analysis.includes('SHOULD_FLAG: true')
      const addToLibrary = analysis.includes('ADD_TO_LIBRARY: true')
      
      const reasonMatch = analysis.match(/REASON: (.+)/i)
      const reason = reasonMatch ? reasonMatch[1].trim() : 'none'
      
      return {
        shouldFlag,
        reason: shouldFlag ? reason : '',
        addToLibrary
      }
    }
    
    return { shouldFlag: false, reason: '', addToLibrary: false }
  } catch (error) {
    console.error('Error analyzing flagging:', error)
    return { shouldFlag: false, reason: '', addToLibrary: false }
  }
}

async function updateUserProfile(email, updates) {
  try {
    const findResponse = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Users?filterByFormula={User ID}="${encodeURIComponent(email)}"`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`
        }
      }
    )

    if (!findResponse.ok) {
      console.log('Could not find user for profile update')
      return null
    }

    const findData = await findResponse.json()
    
    if (findData.records.length === 0) {
      console.log('User not found for profile update')
      return null
    }

    const recordId = findData.records[0].id
    const updateResponse = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Users/${recordId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: updates
      })
    })

    if (!updateResponse.ok) {
      console.log('Failed to update user profile')
      return null
    }

    const result = await updateResponse.json()
    console.log('✅ User profile updated')
    return result
  } catch (error) {
    console.error('Error updating user profile:', error)
    return null
  }
}