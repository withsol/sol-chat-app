import { NextResponse } from 'next/server'

export async function POST(request) {
  console.log('=== CHAT API V2.5 - DIRECT CONTEXT FETCH ===')
  console.log('Environment variables loaded:')
  console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Present' : 'Missing')
  console.log('AIRTABLE_BASE_ID:', process.env.AIRTABLE_BASE_ID ? 'Present' : 'Missing')
  console.log('AIRTABLE_TOKEN:', process.env.AIRTABLE_TOKEN ? 'Present' : 'Missing')
  
  try {
    const { message, user, conversationHistory } = await request.json()
    
    console.log('Chat request for user:', user.email)

    // FETCH USER'S COMPLETE CONTEXT DIRECTLY (no internal API call)
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

  // Fetch all context data in parallel for better performance
  const [
    userProfile,
    recentMessages,
    visioningData,
    personalgorithmData,
    businessPlans,
    coachingMethods,
    recentTranscripts,
    weeklyCheckins,
    solNotes
  ] = await Promise.allSettled([
    fetchUserProfileDirect(email),
    fetchRecentMessagesDirect(email),
    fetchVisioningDataDirect(email),
    fetchPersonalgorithmDataDirect(email),
    fetchBusinessPlansDirect(email),
    fetchCoachingMethodsDirect(),
    fetchRecentTranscriptsDirect(email),
    fetchWeeklyCheckinsDirect(email),
    fetchSolNotesDirect()
  ])

  // Extract successful results and log any failures
  const results = {
    userProfile: userProfile.status === 'fulfilled' ? userProfile.value : null,
    recentMessages: recentMessages.status === 'fulfilled' ? recentMessages.value : [],
    visioningData: visioningData.status === 'fulfilled' ? visioningData.value : null,
    personalgorithmData: personalgorithmData.status === 'fulfilled' ? personalgorithmData.value : [],
    businessPlans: businessPlans.status === 'fulfilled' ? businessPlans.value : [],
    coachingMethods: coachingMethods.status === 'fulfilled' ? coachingMethods.value : [],
    recentTranscripts: recentTranscripts.status === 'fulfilled' ? recentTranscripts.value : [],
    weeklyCheckins: weeklyCheckins.status === 'fulfilled' ? weeklyCheckins.value : [],
    solNotes: solNotes.status === 'fulfilled' ? solNotes.value : []
  }

  // Log what failed for debugging
  const failed = [userProfile, recentMessages, visioningData, personalgorithmData, businessPlans, coachingMethods, recentTranscripts, weeklyCheckins, solNotes]
    .map((result, index) => ({ result, name: ['userProfile', 'recentMessages', 'visioningData', 'personalgorithmData', 'businessPlans', 'coachingMethods', 'recentTranscripts', 'weeklyCheckins', 'solNotes'][index] }))
    .filter(({ result }) => result.status === 'rejected')

  if (failed.length > 0) {
    console.log('❌ Failed to fetch:', failed.map(f => f.name).join(', '))
    failed.forEach(({ name, result }) => {
      console.error(`${name} error:`, result.reason?.message || result.reason)
    })
  }

  // Build enhanced context summary
  const contextSummary = buildEnhancedContextSummary(results)

  console.log('=== DIRECT CONTEXT FETCH SUMMARY ===')
  console.log('✅ User Profile:', !!results.userProfile)
  console.log('📧 Recent Messages:', results.recentMessages.length)
  console.log('🎯 Visioning Data:', !!results.visioningData)
  console.log('🧠 Personalgorithm Entries:', results.personalgorithmData.length)
  console.log('📋 Business Plans:', results.businessPlans.length)
  console.log('📚 Coaching Methods:', results.coachingMethods.length)
  console.log('📝 Recent Transcripts:', results.recentTranscripts.length)
  console.log('📊 Weekly Check-ins:', results.weeklyCheckins.length)
  console.log('🤖 Sol Notes:', results.solNotes.length)
  console.log('=== END SUMMARY ===')

  return {
    ...results,
    contextSummary
  }
}

async function fetchUserProfileDirect(email) {
  try {
    console.log('Fetching user profile for:', email)
    
    const encodedEmail = encodeURIComponent(email)
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Users?filterByFormula={User ID}="${encodedEmail}"`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      console.error('❌ User profile fetch failed:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('Error details:', errorText)
      return null
    }

    const data = await response.json()
    
    if (data.records.length === 0) {
      console.log('⚠️ No user profile found for:', email)
      return null
    }

    const profile = data.records[0].fields
    console.log('✅ User profile fields found:', Object.keys(profile))
    
    return profile

  } catch (error) {
    console.error('❌ Error fetching user profile:', error)
    throw error
  }
}

async function fetchPersonalgorithmDataDirect(email) {
  try {
    console.log('Fetching Personalgorithm™ data for:', email)
    
    const encodedEmail = encodeURIComponent(email)
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Personalgorithm™?filterByFormula={User ID}="${encodedEmail}"&sort[0][field]=Date created&sort[0][direction]=desc&maxRecords=15`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      console.error('❌ Personalgorithm™ data fetch failed:', response.status)
      return []
    }

    const data = await response.json()
    
    const personalgorithm = data.records.map(record => ({
      id: record.id,
      notes: record.fields['Personalgorithm™ Notes'],
      dateCreated: record.fields['Date created'],
      tags: record.fields['Tags'] || ''
    })).filter(item => item.notes)

    console.log('✅ Found', personalgorithm.length, 'Personalgorithm™ entries')
    return personalgorithm

  } catch (error) {
    console.error('❌ Error fetching Personalgorithm™ data:', error)
    return []
  }
}

async function fetchBusinessPlansDirect(email) {
  try {
    console.log('Fetching business plans for:', email)
    
    const encodedEmail = encodeURIComponent(email)
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Aligned Business® Plans?filterByFormula={User ID}="${encodedEmail}"&sort[0][field]=Date Submitted&sort[0][direction]=desc&maxRecords=3`
    
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
    
    const encodedEmail = encodeURIComponent(email)
    const cutoffDate = new Date(Date.now() - 6 * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Weekly Check-in?filterByFormula=AND({User ID}="${encodedEmail}", IS_AFTER({Check-in Date}, "${cutoffDate}"))&sort[0][field]=Check-in Date&sort[0][direction]=desc&maxRecords=6`
    
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
    console.log('Fetching visioning data for:', email)
    
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
      console.log('⚠️ No visioning data found for:', email)
      return null
    }

    const visioningData = data.records[0].fields
    console.log('✅ Visioning data found')
    return visioningData

  } catch (error) {
    console.error('❌ Error fetching visioning data:', error)
    return null
  }
}

async function fetchCoachingMethodsDirect() {
  try {
    console.log('Fetching Aligned Business® Method content')
    
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Aligned Business® Method?maxRecords=20&sort[0][field]=Name of Lesson&sort[0][direction]=asc`
    
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
    console.log('Fetching recent messages for:', email)
    
    const encodedEmail = encodeURIComponent(email)
    const cutoffTime = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
    
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Messages?filterByFormula=AND({User ID}="${encodedEmail}", {Timestamp}>="${cutoffTime}")&sort[0][field]=Timestamp&sort[0][direction]=desc&maxRecords=10`
    
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

async function fetchRecentTranscriptsDirect(email) {
  try {
    console.log('Fetching recent transcripts for:', email)
    
    const encodedEmail = encodeURIComponent(email)
    const cutoffDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Transcripts?filterByFormula=AND({User ID}="${encodedEmail}", IS_AFTER({Dates of Transcript}, "${cutoffDate}"))&sort[0][field]=Dates of Transcript&sort[0][direction]=desc&maxRecords=3`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      console.error('❌ Recent transcripts fetch failed:', response.status)
      return []
    }

    const data = await response.json()
    
    const transcripts = data.records.map(record => ({
      summary: record.fields['Summary'],
      insights: record.fields['Insights']
    }))

    console.log('✅ Found', transcripts.length, 'recent transcripts')
    return transcripts

  } catch (error) {
    console.error('❌ Error fetching recent transcripts:', error)
    return []
  }
}

async function fetchSolNotesDirect() {
  try {
    console.log('Fetching Sol™ notes')
    
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Sol™?maxRecords=20&sort[0][field]=Date Submitted&sort[0][direction]=desc`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      console.error('❌ Sol™ notes fetch failed:', response.status)
      return []
    }

    const data = await response.json()
    
    const solNotes = data.records.map(record => ({
      note: record.fields['Note'],
      tags: record.fields['Tags'] || ''
    })).filter(note => note.note)

    console.log('✅ Found', solNotes.length, 'Sol™ notes')
    return solNotes

  } catch (error) {
    console.error('❌ Error fetching Sol™ notes:', error)
    return []
  }
}

// ==================== KEEP ALL YOUR EXISTING HELPER FUNCTIONS ====================

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
  
  return summary
}

// KEEP ALL YOUR EXISTING FUNCTIONS: logToAirtable, generatePersonalizedOpenAIResponse, etc.
// (I'm not including them here to save space, but don't remove them!)

async function logToAirtable(messageData) {
  try {
    const fields = {
      'Message ID': messageData.messageId,
      'User ID': messageData.email,
      'User Message': messageData.userMessage,
      'Sol Response': messageData.solResponse,
      'Timestamp': messageData.timestamp,
      'Tokens Used': messageData.tokensUsed,
      'Tags': Array.isArray(messageData.tags) ? messageData.tags.join(', ') : (messageData.tags || ''),
      'Sol Flagged': messageData.flaggingAnalysis?.shouldFlag || false,
      'Reason for Flagging': messageData.flaggingAnalysis?.reason || '',
      'Add to Prompt Response Library': messageData.flaggingAnalysis?.addToLibrary || false
    }

    console.log('Attempting to log to Airtable with fields:', JSON.stringify(fields, null, 2))

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
    console.log('Successfully logged to Airtable:', result.id)
    return result
  } catch (error) {
    console.error('Error logging to Airtable:', error)
    return null
  }
}

// ADD ALL YOUR OTHER EXISTING FUNCTIONS HERE...
// (generatePersonalizedOpenAIResponse, shouldUseGPT4, etc.)