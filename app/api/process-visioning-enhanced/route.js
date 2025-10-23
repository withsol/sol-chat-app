import { NextResponse } from 'next/server'

export async function POST(request) {
  console.log('=== PROCESSING VISIONING WITH ENHANCED PERSONALGORITHM™ ===')
  
  try {
    const { email, visioningText, documentUrl = null } = await request.json()
    
    if (!email || !visioningText) {
      return NextResponse.json({ 
        error: 'Email and visioning text required' 
      }, { status: 400 })
    }

    console.log('Processing enhanced visioning for user:', email)

    // Step 1: Extract basic visioning insights
    const visioningAnalysis = await analyzeVisioningDocument(visioningText)
    
    // Step 2: Create visioning entry
    const visioningEntry = await createVisioningEntry(email, visioningText, visioningAnalysis, documentUrl)
    
    // Step 3: Run sophisticated Personalgorithm™ analysis
    const personalgorithmResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/analyze-personalgorithm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        sourceText: visioningText,
        sourceType: 'visioning',
        analysisType: 'comprehensive'
      })
    })
    
    let personalgorithmResult = { entriesCreated: 0, createdEntries: [] }
    if (personalgorithmResponse.ok) {
      personalgorithmResult = await personalgorithmResponse.json()
    }
    
    // Step 4: Update user profile
    const profileUpdates = {
      'Current Vision': visioningAnalysis.vision || '',
      'Current Goals': visioningAnalysis.goals || '',
      'Current State': `Visioning completed: ${new Date().toLocaleDateString()}. ${visioningAnalysis.currentState || ''}`
    }

    if (visioningAnalysis.tags) {
      const existingProfile = await getUserProfile(email)
      const existingTags = existingProfile?.['Tags'] || ''
      profileUpdates['Tags'] = existingTags ? `${existingTags}, ${visioningAnalysis.tags}` : visioningAnalysis.tags
    }

    await updateUserProfile(email, profileUpdates)

    console.log('✅ Enhanced visioning processing completed')

    return NextResponse.json({
  success: true,
  visioningProcessed: true,
  personalgorithmEntriesCreated: personalgorithmResult.entriesCreated,
  extractedData: {
    businessName: visioningAnalysis.businessName,
    industry: visioningAnalysis.industry,
    vision: visioningAnalysis.vision
  }
})

  } catch (error) {
    console.error('❌ Enhanced visioning processing error:', error)
    return NextResponse.json({
      error: 'Failed to process visioning with enhanced analysis',
      details: error.message
    }, { status: 500 })
  }
}

// Helper funtions //

async function fetchUserContextForPersonalgorithm(email) {
  try {
    const [userProfile, recentMessages, existingPersonalgorithm] = await Promise.allSettled([
      getUserProfile(email),
      getRecentMessages(email, 5),
      getPersonalgorithmData(email, 5)
    ])

    const context = {
      userProfile: userProfile.status === 'fulfilled' ? userProfile.value : null,
      recentMessages: recentMessages.status === 'fulfilled' ? recentMessages.value : [],
      existingPersonalgorithm: existingPersonalgorithm.status === 'fulfilled' ? existingPersonalgorithm.value : []
    }

    let summary = "USER CONTEXT FOR PERSONALGORITHM™ ANALYSIS:\n\n"
    
    if (context.userProfile) {
      summary += `Current Vision: ${context.userProfile['Current Vision'] || 'Not set'}\n`
      summary += `Current State: ${context.userProfile['Current State'] || 'Not set'}\n`
      summary += `Tags: ${context.userProfile['Tags'] || 'None'}\n\n`
    }
    
    if (context.existingPersonalgorithm.length > 0) {
      summary += "EXISTING PERSONALGORITHM™ PATTERNS:\n"
      context.existingPersonalgorithm.slice(0, 3).forEach((entry, i) => {
        summary += `${i + 1}. ${entry.notes}\n`
      })
    }
    
    context.contextSummary = summary
    return context

  } catch (error) {
    console.error('Error fetching user context for Personalgorithm™:', error)
    return { contextSummary: 'Limited context available' }
  }
}

function parsePersonalgorithmAnalysis(analysis) {
  const categories = [
    'COMMUNICATION_PATTERNS',
    'DECISION_MAKING_STYLE', 
    'TRANSFORMATION_TRIGGERS',
    'EMOTIONAL_PATTERNS',
    'BUSINESS_MINDSET',
    'PROCESSING_STYLE',
    'STRENGTHS_LEVERAGE',
    'GROWTH_EDGES',
    'UNIQUE_FACTORS'
  ]

  const insights = {}

  for (const category of categories) {
    const match = analysis.match(new RegExp(`${category}: \\[([\\s\\S]*?)\\]`))
    if (match) {
      insights[category] = match[1]
        .split('\n')
        .map(line => line.replace(/^["\s,-]+|["\s,-]+$/g, '').trim())
        .filter(line => line.length > 20)
    } else {
      insights[category] = []
    }
  }

  return insights
}

async function createPersonalgorithmEntry(email, notes, tags = ['auto-generated']) {
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
          'User': email,
          'Personalgorithm™ Notes': notes,
          'Date created': new Date().toISOString(),
          'Tags': Array.isArray(tags) ? tags.join(', ') : tags
        }
      })
    })

    if (response.ok) {
      const result = await response.json()
      console.log('✅ Personalgorithm™ entry created:', result.id)
      return result
    }
    return null
  } catch (error) {
    console.error('Error creating Personalgorithm™ entry:', error)
    return null
  }
}