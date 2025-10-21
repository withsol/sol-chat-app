// ==================== app/api/process-visioning/route.js ====================

import { NextResponse } from 'next/server'

export async function POST(request) {
  console.log('=== PROCESSING VISIONING DOCUMENT ===')
  
  try {
    const { email, visioningText } = await request.json()
    
    if (!email || !visioningText) {
      return NextResponse.json({ 
        error: 'Email and visioning text required' 
      }, { status: 400 })
    }

    console.log('Processing visioning for user:', email)
    console.log('Visioning text length:', visioningText.length)

    // Analyze the visioning document
    const analysis = await analyzeVisioningDocument(visioningText)
    console.log('Analysis completed:', Object.keys(analysis))

    // Create visioning entry
    const visioningEntry = await createVisioningEntry(email, visioningText, analysis)
    
    // Update user profile with extracted insights
    const profileUpdates = {
      'Current Vision': analysis.vision || '',
      'Current Goals': analysis.goals || '',
      'Current State': analysis.currentState || ''
    }

    // Add tags if they exist
    if (analysis.tags) {
      const existingProfile = await getUserProfile(email)
      const existingTags = existingProfile?.['Tags'] || ''
      const newTags = existingTags ? `${existingTags}, ${analysis.tags}` : analysis.tags
      profileUpdates['Tags'] = newTags
    }

    await updateUserProfile(email, profileUpdates)
    console.log('Profile updated with vision insights')

    // Create Personalgorithm entries from visioning insights
    if (analysis.personalgorithmInsights?.length > 0) {
      for (const insight of analysis.personalgorithmInsights) {
        await createPersonalgorithmEntryNew(email, insight, ['visioning-derived', 'intake'])
        console.log('Personalgorithm entry created:', insight.substring(0, 50) + '...')
      }
    }

    console.log('✅ Visioning document processed successfully')

    return NextResponse.json({
  success: true,
  visioningProcessed: true,
  extractedData: {
    businessName: analysis.businessName,
    industry: analysis.industry,
    businessStage: analysis.businessStage
  }
})

  } catch (error) {
    console.error('❌ Visioning processing error:', error)
    return NextResponse.json({
      error: 'Failed to process visioning document',
      details: error.message
    }, { status: 500 })
  }
}

// ==================== VISIONING ANALYSIS FUNCTION ====================

async function analyzeVisioningDocument(visioningText) {
  try {
    console.log('Starting visioning analysis...')
    
    const analysisPrompt = `You are Sol™ analyzing Kelsey's comprehensive 6-section visioning homework. This document covers: Basic Brand Analysis, 30-minute Free Write, Audience Analysis, Competitive Analysis, Sales & Marketing, and Current Reality & Mindset.

VISIONING DOCUMENT:
"${visioningText}"

Extract key information in this EXACT format:

BUSINESS_BASICS: {
  "businessName": "extracted business name",
  "industry": "their industry", 
  "businessStage": "new/established based on history",
  "goals1Year": "1 year goals",
  "goals3Years": "3 year goals",
  "goals7Years": "7 year goals"
}

VISION_AND_VALUES: {
  "missionStatement": "their mission or overarching message",
  "coreValues": "3-5 core business values they listed", 
  "differentiation": "what sets them apart",
  "inspiration": "what inspires them"
}

CURRENT_STATE: {
  "businessHistory": "brief history summary",
  "currentChallenges": "what's holding them back",
  "strengths": "what they love most about their business",
  "mindsetBlocks": "limiting beliefs or fears mentioned"
}

IDEAL_CLIENT: {
  "clientProfile": "summary of their ideal audience member",
  "clientProblems": "problems their business solves", 
  "clientNeeds": "what clients need to hear to purchase"
}

MARKETING_SALES: {
  "currentOfferings": "current products/services",
  "futureOfferings": "planned future offerings",
  "marketingEfforts": "current marketing activities",
  "salesChannels": "how they sell"
}

COACHING_INSIGHTS: {
  "learningStyle": "how they best create change",
  "communicationStyle": "how they express themselves in the free write",
  "transformationTriggers": "what motivates them based on past successes",
  "coachingNeeds": "what kind of support they seem to need"
}

PERSONALGORITHM_INSIGHTS: [
"insight about their decision-making patterns from the document",
"insight about their communication style and how they process", 
"insight about what drives their transformation based on past successes",
"insight about their emotional patterns or mindset tendencies"
]

TAGS: "industry, business-stage, personality-type, coaching-style-needed"

Extract as much detailed information as possible from each section of their visioning homework.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        max_tokens: 1000,
        temperature: 0.3,
        messages: [{ role: 'user', content: analysisPrompt }]
      })
    })

    if (!response.ok) {
      throw new Error(`Visioning analysis failed: ${response.status}`)
    }

    const result = await response.json()
    const analysis = result.choices[0].message.content

    console.log('Raw analysis result:', analysis)

    // Parse the structured JSON response
    const extractJSON = (fieldName) => {
      const match = analysis.match(new RegExp(`${fieldName}: (\\{[\\s\\S]*?\\})`))
      if (match) {
        try {
          return JSON.parse(match[1])
        } catch (e) {
          console.error(`Failed to parse ${fieldName}:`, e)
          return {}
        }
      }
      return {}
    }

    const extractArray = (fieldName) => {
      const match = analysis.match(new RegExp(`${fieldName}: \\[([\\s\\S]*?)\\]`))
      if (match) {
        return match[1]
          .split('\n')
          .map(line => line.replace(/^["\s-]+|["\s,]+$/g, '').trim())
          .filter(line => line.length > 10)
      }
      return []
    }

    const extractField = (fieldName) => {
      const match = analysis.match(new RegExp(`${fieldName}: "([^"]+)"`))
      return match ? match[1] : ''
    }

    const businessBasics = extractJSON('BUSINESS_BASICS')
    const visionValues = extractJSON('VISION_AND_VALUES') 
    const currentState = extractJSON('CURRENT_STATE')
    const idealClient = extractJSON('IDEAL_CLIENT')
    const marketingSales = extractJSON('MARKETING_SALES')
    const coachingInsights = extractJSON('COACHING_INSIGHTS')

    console.log('Parsed sections:', {
      businessBasics: Object.keys(businessBasics),
      visionValues: Object.keys(visionValues),
      currentState: Object.keys(currentState),
      idealClient: Object.keys(idealClient),
      marketingSales: Object.keys(marketingSales),
      coachingInsights: Object.keys(coachingInsights)
    })

    return {
      // Core business information
      businessName: businessBasics.businessName || '',
      industry: businessBasics.industry || '',
      businessStage: businessBasics.businessStage || '',
      
      // Vision and goals (for User profile updates)
      vision: `${businessBasics.goals1Year || ''} (1yr), ${businessBasics.goals3Years || ''} (3yr), ${businessBasics.goals7Years || ''} (7yr)`,
      goals: businessBasics.goals1Year || '',
      currentState: currentState.businessHistory || '',
      
      // Values and differentiation
      values: visionValues.coreValues || '',
      missionStatement: visionValues.missionStatement || '',
      differentiation: visionValues.differentiation || '',
      inspiration: visionValues.inspiration || '',
      
      // Challenges and strengths
      challenges: currentState.currentChallenges || '',
      strengths: currentState.strengths || '',
      mindsetBlocks: currentState.mindsetBlocks || '',
      
      // Client and market insights
      idealClient: idealClient.clientProfile || '',
      clientProblems: idealClient.clientProblems || '',
      currentOfferings: marketingSales.currentOfferings || '',
      marketingEfforts: marketingSales.marketingEfforts || '',
      
      // Coaching and communication insights
      communicationStyle: coachingInsights.communicationStyle || '',
      learningStyle: coachingInsights.learningStyle || '',
      transformationTriggers: coachingInsights.transformationTriggers || '',
      coachingNeeds: coachingInsights.coachingNeeds || '',
      
      // For Personalgorithm creation
      personalgorithmInsights: extractArray('PERSONALGORITHM_INSIGHTS'),
      tags: extractField('TAGS'),
      
      // Complete sections for reference
      businessBasics,
      visionValues, 
      currentState,
      idealClient,
      marketingSales,
      coachingInsights
    }

  } catch (error) {
    console.error('Error analyzing visioning document:', error)
    throw error
  }
}

async function createVisioningEntry(email, visioningText, analysis) {
  try {
    // Get user record ID for linking
    const userRecordId = await getUserRecordId(email)
    if (!userRecordId) {
      throw new Error('User record not found for visioning entry')
    }

    const visioningId = `vis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const response = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Visioning`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          'Visioning ID': visioningId,
          'User ID': [userRecordId],
          'Date of Submission': new Date().toISOString(),
          'Summary of Visioning': `Business: ${analysis.businessName || 'Not specified'} | Industry: ${analysis.industry || 'Not specified'} | Vision: ${analysis.vision || 'Not specified'}`,
          'Visioning Homework - Text Format': visioningText,
          'Tags': analysis.tags || 'visioning-completed',
          'Action Steps': `Based on comprehensive visioning: 1) Focus on ${analysis.goals || 'identified goals'} 2) Address challenges: ${analysis.challenges || 'noted obstacles'} 3) Leverage strengths: ${analysis.strengths || 'identified assets'} 4) Develop ideal client: ${analysis.idealClient || 'target audience'}`,
          'Notes for Sol': `Learning Style: ${analysis.learningStyle || 'Not specified'}. Communication: ${analysis.communicationStyle || 'Not specified'}. Transformation Triggers: ${analysis.transformationTriggers || 'Not specified'}. Coaching Needs: ${analysis.coachingNeeds || 'Not specified'}.`
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to create visioning entry: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log('✅ Visioning entry created:', result.id)
    return result
    
  } catch (error) {
    console.error('Error creating visioning entry:', error)
    throw error
  }
}

// ==================== HELPER FUNCTIONS ====================

async function getUserProfile(email) {
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
    console.error('Error getting user profile:', error)
    return null
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

async function createPersonalgorithmEntryNew(email, notes, tags = ['auto-generated']) {
  try {
    // First get user record ID for linking
    const userRecordId = await getUserRecordId(email)
    if (!userRecordId) {
      console.error('Cannot create Personalgorithm entry - user record not found')
      return null
    }

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
          'User': [userRecordId], // Link to user record
          'Personalgorithm™ Notes': notes,
          'Date created': new Date().toISOString(),
          'Tags': Array.isArray(tags) ? tags.join(', ') : tags
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Failed to create Personalgorithm entry:', response.status, errorText)
      return null
    }

    const result = await response.json()
    console.log('✅ Personalgorithm entry created:', result.id)
    return result
    
  } catch (error) {
    console.error('Error creating Personalgorithm entry:', error)
    return null
  }
}
