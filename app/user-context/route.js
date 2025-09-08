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