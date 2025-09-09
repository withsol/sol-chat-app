import { NextResponse } from 'next/server'

export async function POST(request) {
  console.log('=== USER CONTEXT API V2.1 - MATCHING EXACT AIRTABLE SCHEMA ===')
  
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    console.log('Fetching comprehensive user context for:', email)
    console.log('Airtable Base ID:', process.env.AIRTABLE_BASE_ID ? 'Present' : 'MISSING')
    console.log('Airtable Token:', process.env.AIRTABLE_TOKEN ? 'Present' : 'MISSING')

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
      fetchUserProfile(email),
      fetchRecentMessages(email),
      fetchVisioningData(email),
      fetchPersonalgorithmData(email),
      fetchBusinessPlans(email),
      fetchCoachingMethods(),
      fetchRecentTranscripts(email),
      fetchWeeklyCheckins(email),
      fetchSolNotes()
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

    console.log('=== CONTEXT FETCH SUMMARY ===')
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

    return NextResponse.json({
      ...results,
      contextSummary,
      fetchTimestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ User context fetch error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch user context',
      details: error.message 
    }, { status: 500 })
  }
}

// ==================== AIRTABLE FETCH FUNCTIONS (EXACT SCHEMA MATCH) ====================

async function fetchUserProfile(email) {
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
    
    // Log specific important fields for debugging
    const importantFields = ['Current Vision', 'Current State', 'Coaching Style Match', 'Current Goals', 'Notes from Sol', 'Transcript Digest', 'Tags']
    importantFields.forEach(field => {
      if (profile[field]) console.log(`✓ ${field}: Present`)
    })
    
    return profile

  } catch (error) {
    console.error('❌ Error fetching user profile:', error)
    throw error
  }
}

async function fetchRecentMessages(email, hours = 48) {
  try {
    console.log('Fetching recent messages for:', email, `(last ${hours} hours)`)
    
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
    const encodedEmail = encodeURIComponent(email)
    
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Messages?filterByFormula=AND({User ID}="${encodedEmail}", {Timestamp}>="${cutoffTime}")&sort[0][field]=Timestamp&sort[0][direction]=desc&maxRecords=20`
    
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
      messageId: record.fields['Message ID'],
      userMessage: record.fields['User Message'],
      solResponse: record.fields['Sol Response'],
      timestamp: record.fields['Timestamp'],
      tokensUsed: record.fields['Tokens Used'],
      tags: record.fields['Tags'] || ''
    }))

    console.log('✅ Found', messages.length, 'recent messages')
    return messages

  } catch (error) {
    console.error('❌ Error fetching recent messages:', error)
    return []
  }
}

async function fetchVisioningData(email) {
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

async function fetchPersonalgorithmData(email) {
  try {
    console.log('Fetching Personalgorithm™ data for:', email)
    
    const encodedEmail = encodeURIComponent(email)
    // Note: Using exact table name from schema including trademark symbol
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
      tags: record.fields['Tags'] || '',
      attachmentSummary: record.fields['Attachment Summary'] || ''
    })).filter(item => item.notes) // Only include entries with actual notes

    console.log('✅ Found', personalgorithm.length, 'Personalgorithm™ entries')
    return personalgorithm

  } catch (error) {
    console.error('❌ Error fetching Personalgorithm™ data:', error)
    return []
  }
}

async function fetchBusinessPlans(email) {
  try {
    console.log('Fetching Aligned Business® Plans for:', email)
    
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

async function fetchCoachingMethods() {
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
      description: record.fields['Description'],
      content: record.fields['Lesson Content'],
      useCases: record.fields['Use Cases'],
      emotionalStates: record.fields['Emotional State Tags'],
      supportingPrompts: record.fields['Supporting Prompts'],
      solNotes: record.fields['Sol Notes for User Application']
    })).filter(method => method.content) // Only include methods with content

    console.log('✅ Found', methods.length, 'coaching methods')
    return methods

  } catch (error) {
    console.error('❌ Error fetching coaching methods:', error)
    return []
  }
}

async function fetchRecentTranscripts(email, days = 14) {
  try {
    console.log('Fetching recent transcripts for:', email, `(last ${days} days)`)
    
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const encodedEmail = encodeURIComponent(email)
    
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Transcripts?filterByFormula=AND({User ID}="${encodedEmail}", IS_AFTER({Dates of Transcript}, "${cutoffDate}"))&sort[0][field]=Dates of Transcript&sort[0][direction]=desc&maxRecords=5`
    
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
      transcriptId: record.fields['Transcript ID'],
      datesOfTranscript: record.fields['Dates of Transcript'],
      transcriptLevel: record.fields['Transcript Level'],
      summary: record.fields['Summary'],
      insights: record.fields['Insights'],
      personalgorithmNotes: record.fields['Personalgorithm™ Notes'],
      transformationMoment: record.fields['Transformation Moment'],
      transformationDetails: record.fields['Transformation Details'],
      tags: record.fields['Tags'] || ''
    }))

    console.log('✅ Found', transcripts.length, 'recent transcripts')
    return transcripts

  } catch (error) {
    console.error('❌ Error fetching recent transcripts:', error)
    return []
  }
}

async function fetchWeeklyCheckins(email, weeks = 6) {
  try {
    console.log('Fetching weekly check-ins for:', email, `(last ${weeks} weeks)`)
    
    const cutoffDate = new Date(Date.now() - weeks * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const encodedEmail = encodeURIComponent(email)
    
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

async function fetchSolNotes() {
  try {
    console.log('Fetching Sol™ notes/brain content')
    
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Sol™?maxRecords=50&sort[0][field]=Date Submitted&sort[0][direction]=desc`
    
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
      solId: record.fields['Sol ID'],
      note: record.fields['Note'],
      dateSubmitted: record.fields['Date Submitted'],
      tags: record.fields['Tags'] || '',
      link: record.fields['Link']
    })).filter(note => note.note) // Only include notes with content

    console.log('✅ Found', solNotes.length, 'Sol™ brain notes')
    return solNotes

  } catch (error) {
    console.error('❌ Error fetching Sol™ notes:', error)
    return []
  }
}

// ==================== CONTEXT SUMMARY BUILDER ====================

function buildEnhancedContextSummary(results) {
  let summary = "=== COMPREHENSIVE USER CONTEXT SUMMARY ===\n\n"
  
  // USER PROFILE SUMMARY
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
    
    if (profile['Tags']) {
      summary += `🏷️ USER TAGS: ${profile['Tags']}\n\n`
    }
  }
  
  // VISIONING DATA SUMMARY
  if (results.visioningData) {
    const vision = results.visioningData
    summary += `🔮 VISIONING DATA:\n`
    if (vision['Summary of Visioning']) {
      summary += `${vision['Summary of Visioning']}\n\n`
    }
    if (vision['Action Steps']) {
      summary += `Next Steps: ${vision['Action Steps']}\n\n`
    }
  }
  
  // PERSONALGORITHM INSIGHTS
  if (results.personalgorithmData && results.personalgorithmData.length > 0) {
    summary += `🧠 KEY PERSONALGORITHM™ INSIGHTS:\n`
    results.personalgorithmData.slice(0, 5).forEach((insight, index) => {
      summary += `${index + 1}. ${insight.notes}\n`
    })
    summary += "\n"
  }
  
  // RECENT BUSINESS CONTEXT
  if (results.businessPlans && results.businessPlans.length > 0) {
    const latestPlan = results.businessPlans[0]
    summary += `💼 CURRENT BUSINESS CONTEXT:\n`
    if (latestPlan['Future Vision']) {
      summary += `Vision: ${latestPlan['Future Vision']}\n`
    }
    if (latestPlan['Top 3 Goals']) {
      summary += `Goals: ${latestPlan['Top 3 Goals']}\n`
    }
    if (latestPlan['Ideal Client']) {
      summary += `Ideal Client: ${latestPlan['Ideal Client']}\n`
    }
    if (latestPlan['Current Offers & Pricing']) {
      summary += `Offers: ${latestPlan['Current Offers & Pricing']}\n`
    }
    summary += "\n"
  }
  
  // RECENT WEEKLY CHECK-IN DATA
  if (results.weeklyCheckins && results.weeklyCheckins.length > 0) {
    const latestCheckin = results.weeklyCheckins[0]
    summary += `📊 LATEST WEEKLY CHECK-IN:\n`
    if (latestCheckin['This is who I am now...']) {
      summary += `Identity: ${latestCheckin['This is who I am now...']}\n`
    }
    if (latestCheckin['What worked this week?']) {
      summary += `Wins: ${latestCheckin['What worked this week?']}\n`
    }
    if (latestCheckin['What would you love help with right now?']) {
      summary += `Challenges: ${latestCheckin['What would you love help with right now?']}\n`
    }
    
    // Include numerical ratings
    const ratings = []
    if (latestCheckin['Clarity (1-100)']) ratings.push(`Clarity: ${latestCheckin['Clarity (1-100)']}`)
    if (latestCheckin['Confidence (1-100)']) ratings.push(`Confidence: ${latestCheckin['Confidence (1-100)']}`)
    if (latestCheckin['Capacity (1-100)']) ratings.push(`Capacity: ${latestCheckin['Capacity (1-100)']}`)
    if (latestCheckin['Alignment (1-100)']) ratings.push(`Alignment: ${latestCheckin['Alignment (1-100)']}`)
    if (latestCheckin['Nervous System (1-100)']) ratings.push(`Nervous System: ${latestCheckin['Nervous System (1-100)']}`)
    
    if (ratings.length > 0) {
      summary += `Ratings: ${ratings.join(', ')}\n`
    }
    summary += "\n"
  }
  
  // RECENT CONVERSATION SUMMARY
  if (results.recentMessages && results.recentMessages.length > 0) {
    summary += `💬 RECENT MESSAGE ACTIVITY:\n`
    summary += `Last ${results.recentMessages.length} messages over past 48 hours\n`
    summary += `Most recent: ${results.recentMessages[0]?.timestamp || 'Unknown'}\n\n`
  }
  
  // TRANSFORMATION MOMENTS
  if (results.recentTranscripts && results.recentTranscripts.length > 0) {
    const transformationMoments = results.recentTranscripts.filter(t => t.transformationMoment)
    if (transformationMoments.length > 0) {
      summary += `✨ RECENT TRANSFORMATION MOMENTS:\n`
      transformationMoments.forEach(moment => {
        if (moment.transformationDetails) {
          summary += `- ${moment.transformationDetails}\n`
        }
      })
      summary += "\n"
    }
  }
  
  summary += "=== END CONTEXT SUMMARY ===\n"
  
  return summary
}