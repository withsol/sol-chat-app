// app/api/process-visioning/route.js
// OPTIMIZED VERSION - Handles large visioning content without token limit errors

import { NextResponse } from 'next/server'

export async function POST(request) {
  console.log('=== PROCESSING VISIONING DOCUMENT (OPTIMIZED) ===')
  
  try {
    const { email, visioningText } = await request.json()
    
    if (!email || !visioningText) {
      return NextResponse.json({ 
        error: 'Email and visioning text required' 
      }, { status: 400 })
    }

    console.log('Processing visioning for user:', email)
    console.log('Visioning text length:', visioningText.length, 'characters')

    // SPLIT INTO SECTIONS (process separately to avoid token limits)
    const sections = parseVisioningSections(visioningText)
    console.log('Parsed into', sections.length, 'sections')

    // ANALYZE EACH SECTION SEPARATELY (smaller chunks = no token limit errors)
    const sectionAnalyses = []
    for (const section of sections) {
      if (section.content.length > 100) { // Only process substantial sections
        console.log('Analyzing section:', section.title)
        const analysis = await analyzeVisioningSection(section.title, section.content)
        sectionAnalyses.push(analysis)
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    // COMBINE ANALYSES INTO COMPREHENSIVE SUMMARY
    const comprehensiveAnalysis = await synthesizeVisioningAnalysis(sectionAnalyses, email)
    console.log('Synthesis complete')

    // CREATE VISIONING ENTRY IN AIRTABLE
    const visioningEntry = await createVisioningEntry(email, visioningText, comprehensiveAnalysis)
    console.log('✅ Visioning entry created')

    // UPDATE USER PROFILE
    await updateUserProfileFromVisioning(email, comprehensiveAnalysis)
    console.log('✅ User profile updated')

    // CREATE PERSONALGORITHM™ ENTRIES
    if (comprehensiveAnalysis.personalgorithmInsights?.length > 0) {
      for (const insight of comprehensiveAnalysis.personalgorithmInsights.slice(0, 8)) {
        await createPersonalgorithmEntry(email, insight, 'visioning-derived, intake')
        console.log('✅ Personalgorithm™ entry created')
      }
    }

    console.log('✅ VISIONING PROCESSING COMPLETE')

    return NextResponse.json({
      success: true,
      message: 'Visioning processed successfully',
      personalgorithmCount: comprehensiveAnalysis.personalgorithmInsights?.length || 0,
      sectionsProcessed: sections.length
    })

  } catch (error) {
    console.error('❌ Visioning processing error:', error)
    return NextResponse.json({
      error: 'Failed to process visioning',
      details: error.message
    }, { status: 500 })
  }
}

// ==================== PARSE VISIONING INTO SECTIONS ====================

function parseVisioningSections(visioningText) {
  const sections = []
  
  // Common section markers
  const sectionMarkers = [
    'section one',
    'section two', 
    'section three',
    'section 1',
    'section 2',
    'section 3',
    'basic brand analysis',
    'audience analysis',
    'competitive analysis',
    'free write',
    'current reality',
    'mission statement',
    'core values',
    '1 year',
    '3 year',
    '7 year'
  ]

  // Split by common section patterns
  let currentSection = { title: 'Introduction', content: '' }
  const lines = visioningText.split('\n')
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const lineLower = line.toLowerCase()
    
    // Check if this line is a section header
    const isSectionHeader = sectionMarkers.some(marker => 
      lineLower.includes(marker) && line.length < 150
    )
    
    if (isSectionHeader && currentSection.content.length > 50) {
      // Save previous section
      sections.push({ ...currentSection })
      // Start new section
      currentSection = { title: line, content: '' }
    } else {
      currentSection.content += line + '\n'
    }
  }
  
  // Add final section
  if (currentSection.content.length > 50) {
    sections.push(currentSection)
  }
  
  // If no sections found, treat entire text as one section
  if (sections.length === 0) {
    sections.push({
      title: 'Complete Visioning',
      content: visioningText
    })
  }
  
  console.log('Sections found:', sections.map(s => s.title).join(', '))
  return sections
}

// ==================== ANALYZE INDIVIDUAL SECTION ====================

async function analyzeVisioningSection(sectionTitle, sectionContent) {
  try {
    // Keep prompt focused and short
    const prompt = `Analyze this visioning section and extract key insights:

SECTION: ${sectionTitle}
CONTENT: ${sectionContent.substring(0, 3000)} ${sectionContent.length > 3000 ? '...(truncated)' : ''}

Extract:
1. Key goals mentioned (1-3)
2. Core values/beliefs (1-3)
3. Challenges or fears (1-2)
4. Business/life context (1-2 sentences)
5. Communication style notes (how they write, tone, patterns)

Keep response under 300 words.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        max_tokens: 500,
        temperature: 0.5,
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    })

    if (!response.ok) {
      console.error('Section analysis failed:', response.status)
      return { sectionTitle, analysis: 'Analysis failed', rawContent: sectionContent.substring(0, 500) }
    }

    const result = await response.json()
    return {
      sectionTitle,
      analysis: result.choices[0].message.content,
      rawContent: sectionContent.substring(0, 500)
    }

  } catch (error) {
    console.error('Error analyzing section:', error)
    return { sectionTitle, analysis: 'Error', rawContent: sectionContent.substring(0, 500) }
  }
}

// ==================== SYNTHESIZE ALL SECTIONS ====================

async function synthesizeVisioningAnalysis(sectionAnalyses, email) {
  try {
    // Combine all section analyses into one coherent understanding
    const combinedAnalysis = sectionAnalyses
      .map(s => `${s.sectionTitle}:\n${s.analysis}`)
      .join('\n\n')

    const synthesisPrompt = `Based on these visioning sections, create a comprehensive profile:

${combinedAnalysis.substring(0, 4000)}

Provide:
1. VISION: 1-year, 3-year, 7-year goals (2-3 sentences each)
2. CURRENT_STATE: Where they are now logistically and emotionally (3-4 sentences)
3. GOALS: Top 3-5 current goals
4. CHALLENGES: Main challenges they're facing
5. STRENGTHS: Key strengths and assets
6. VALUES: Core values and beliefs
7. PERSONALGORITHM_INSIGHTS: 5-8 specific patterns about how they communicate, make decisions, transform (one per line)
8. TAGS: 5-10 relevant tags (comma-separated)

Format as JSON.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        max_tokens: 1500,
        temperature: 0.6,
        response_format: { type: "json_object" },
        messages: [
          { 
            role: 'system', 
            content: 'You are analyzing visioning homework to understand a business owner. Respond in JSON format.' 
          },
          { role: 'user', content: synthesisPrompt }
        ]
      })
    })

    if (!response.ok) {
      throw new Error(`Synthesis failed: ${response.status}`)
    }

    const result = await response.json()
    const synthesis = JSON.parse(result.choices[0].message.content)

    return {
      vision: synthesis.VISION || '',
      currentState: synthesis.CURRENT_STATE || '',
      goals: synthesis.GOALS || '',
      challenges: synthesis.CHALLENGES || '',
      strengths: synthesis.STRENGTHS || '',
      values: synthesis.VALUES || '',
      personalgorithmInsights: synthesis.PERSONALGORITHM_INSIGHTS || [],
      tags: synthesis.TAGS || ''
    }

  } catch (error) {
    console.error('Synthesis error:', error)
    // Return basic fallback
    return {
      vision: 'Vision processing in progress',
      currentState: 'Analyzing current state',
      goals: 'Goals being extracted',
      challenges: '',
      strengths: '',
      values: '',
      personalgorithmInsights: [],
      tags: 'visioning-submitted'
    }
  }
}

// ==================== CREATE VISIONING ENTRY ====================

async function createVisioningEntry(email, visioningText, analysis) {
  try {
    const userRecordId = await getUserRecordId(email)
    if (!userRecordId) throw new Error('User not found')

    const visioningId = `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

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
          'Summary of Visioning': `${analysis.vision}\n\nGoals: ${analysis.goals}\n\nChallenges: ${analysis.challenges}`,
          'Visioning Homework - Text Format': visioningText.substring(0, 90000), // Airtable limit
          'Tags': analysis.tags,
          'Action Steps': `Based on your vision, focus on: ${analysis.goals}`,
          'Notes for Sol': `Communication patterns: ${analysis.personalgorithmInsights?.slice(0, 3).join('; ')}`
        }
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Airtable error: ${JSON.stringify(error)}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error creating visioning entry:', error)
    throw error
  }
}

// ==================== UPDATE USER PROFILE ====================

async function updateUserProfileFromVisioning(email, analysis) {
  try {
    const updates = {
      'Current Vision': analysis.vision || '',
      'Current Goals': analysis.goals || '',
      'Current State': analysis.currentState || ''
    }

    // Get existing profile to merge tags
    const userProfile = await getUserProfile(email)
    if (userProfile?.['Tags']) {
      const existingTags = userProfile['Tags']
      const newTags = analysis.tags
      updates['Tags'] = `${existingTags}, ${newTags}`
    } else {
      updates['Tags'] = analysis.tags
    }

    await updateUserProfile(email, updates)
    console.log('✅ Profile updated with vision')
  } catch (error) {
    console.error('Error updating profile:', error)
  }
}

// ==================== HELPER FUNCTIONS ====================

async function getUserRecordId(email) {
  try {
    const encodedEmail = encodeURIComponent(email)
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Users?filterByFormula={User ID}="${encodedEmail}"`
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}` }
    })

    if (!response.ok) return null
    const data = await response.json()
    return data.records.length > 0 ? data.records[0].id : null
  } catch (error) {
    console.error('Error getting user record ID:', error)
    return null
  }
}

async function getUserProfile(email) {
  try {
    const encodedEmail = encodeURIComponent(email)
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Users?filterByFormula={User ID}="${encodedEmail}"`
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}` }
    })

    if (!response.ok) return null
    const data = await response.json()
    return data.records.length > 0 ? data.records[0].fields : null
  } catch (error) {
    console.error('Error getting user profile:', error)
    return null
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

async function createPersonalgorithmEntry(email, notes, tags) {
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
          'Tags': tags
        }
      })
    })

    if (response.ok) {
      return await response.json()
    }
    return null
  } catch (error) {
    console.error('Error creating Personalgorithm™ entry:', error)
    return null
  }
}