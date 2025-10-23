// app/api/process-visioning/route.js
// WORKING VERSION - Removed computed field issue

import { NextResponse } from 'next/server'

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

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

    // Get user record ID
    const userRecordId = await getUserRecordId(email)
    if (!userRecordId) {
      console.error('❌ User record not found for:', email)
      return NextResponse.json({ 
        success: false, 
        error: 'User record not found' 
      }, { status: 404 })
    }
    console.log('✅ User record ID found:', userRecordId)

    // Parse and analyze sections
    const sections = parseVisioningSections(visioningText)
    console.log('Sections found:', sections.map(s => s.title).join(', '))
    console.log(`Parsed into ${sections.length} sections`)

    const sectionAnalyses = []
    for (const section of sections) {
      if (section.content.length > 100) {
        console.log(`Analyzing section: ${section.title}`)
        const analysis = await analyzeVisioningSection(section.title, section.content)
        sectionAnalyses.push(analysis)
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    // Synthesize
    const comprehensiveAnalysis = await synthesizeVisioningAnalysis(sectionAnalyses, email)
    console.log('Synthesis complete')

    // Create entries
    await createVisioningEntry(userRecordId, visioningText, comprehensiveAnalysis)
    console.log('✅ Visioning entry created')

    await updateUserProfileFromVisioning(email, comprehensiveAnalysis)
    console.log('✅ Profile updated with vision')
    console.log('✅ User profile updated')

    // Create Personalgorithm entries
    if (comprehensiveAnalysis.personalgorithmInsights?.length > 0) {
      for (const insight of comprehensiveAnalysis.personalgorithmInsights.slice(0, 8)) {
        await createPersonalgorithmEntry(userRecordId, insight, 'visioning-derived, intake')
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

function parseVisioningSections(visioningText) {
  const sections = []
  
  const sectionMarkers = [
    'section one', 'section two', 'section three',
    'section 1', 'section 2', 'section 3',
    'basic brand analysis', 'audience analysis', 'competitive analysis',
    'free write', 'current reality', 'mission statement', 'core values',
    '1 year', '3 year', '7 year'
  ]

  let currentSection = { title: 'Introduction', content: '' }
  const lines = visioningText.split('\n')
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const lineLower = line.toLowerCase()
    
    const isSectionHeader = sectionMarkers.some(marker => 
      lineLower.includes(marker) && line.length < 150
    )
    
    if (isSectionHeader && currentSection.content.length > 50) {
      sections.push({ ...currentSection })
      currentSection = { title: line, content: '' }
    } else {
      currentSection.content += line + '\n'
    }
  }
  
  if (currentSection.content.length > 50) {
    sections.push(currentSection)
  }
  
  if (sections.length === 0) {
    sections.push({
      title: 'Complete Visioning',
      content: visioningText
    })
  }
  
  console.log('Sections found:', sections.map(s => s.title).join(', '))
  return sections
}

async function analyzeVisioningSection(sectionTitle, sectionContent) {
  try {
    const prompt = `Analyze this visioning section and extract key insights:

SECTION: ${sectionTitle}
CONTENT: ${sectionContent.substring(0, 3000)} ${sectionContent.length > 3000 ? '...(truncated)' : ''}

Extract:
1. Key goals mentioned (1-3)
2. Core values/beliefs (1-3)
3. Challenges or fears (1-2)
4. Business/life context (1-2 sentences)
5. Communication patterns (if evident)

Be concise. Focus on what will help personalize coaching.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{
          role: 'system',
          content: 'You are analyzing visioning homework to extract coaching insights. Be brief and focused.'
        }, {
          role: 'user',
          content: prompt
        }],
        temperature: 0.3,
        max_tokens: 400
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    return {
      section: sectionTitle,
      insights: data.choices[0].message.content
    }
  } catch (error) {
    console.error('Error analyzing section:', error)
    return {
      section: sectionTitle,
      insights: 'Analysis pending'
    }
  }
}

async function synthesizeVisioningAnalysis(sectionAnalyses, email) {
  try {
    const analysisText = sectionAnalyses.map(a => 
      `${a.section}:\n${a.insights}`
    ).join('\n\n')

    const prompt = `Synthesize this comprehensive visioning analysis into:

1. Current Vision (2-3 paragraphs): Their ultimate future vision
2. Summary (1 paragraph): Overview of their business/life direction
3. Key themes (comma-separated tags): Main patterns you see
4. Personalgorithm insights (3-5): HOW they communicate, process info, and transform

${analysisText}

Respond in JSON format:
{
  "currentVision": "...",
  "summary": "...",
  "keyThemes": "tag1, tag2, tag3",
  "personalgorithmInsights": ["insight 1", "insight 2", ...]
}`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [{
          role: 'system',
          content: 'You are Sol, synthesizing comprehensive visioning into actionable coaching insights.'
        }, {
          role: 'user',
          content: prompt
        }],
        temperature: 0.4,
        max_tokens: 1500,
        response_format: { type: "json_object" }
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI synthesis error: ${response.status}`)
    }

    const data = await response.json()
    const synthesis = JSON.parse(data.choices[0].message.content)
    
    if (!synthesis.personalgorithmInsights || synthesis.personalgorithmInsights.length === 0) {
      synthesis.personalgorithmInsights = [
        'Completed comprehensive visioning homework, demonstrating commitment to structured planning',
        'Provided detailed business context showing strategic thinking and self-awareness'
      ]
    }
    
    return synthesis
  } catch (error) {
    console.error('Error synthesizing vision:', error)
    return {
      currentVision: 'Comprehensive visioning completed - analysis in progress',
      summary: 'User has shared detailed vision for business and life',
      keyThemes: 'visioning, business-growth, strategic-planning',
      personalgorithmInsights: [
        'Completed comprehensive visioning homework, showing commitment to clarity and planning'
      ]
    }
  }
}

async function getUserRecordId(email) {
  try {
    const encodedEmail = encodeURIComponent(email)
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Users?filterByFormula={User ID}="${encodedEmail}"`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      console.error('Failed to fetch user:', await response.text())
      return null
    }

    const data = await response.json()
    
    if (data.records.length === 0) {
      console.error('No user record found for email:', email)
      return null
    }

    return data.records[0].id
  } catch (error) {
    console.error('Error getting user record ID:', error)
    return null
  }
}

async function getUserProfile(email) {
  try {
    const encodedEmail = encodeURIComponent(email)
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Users?filterByFormula={User ID}="${encodedEmail}"`
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` }
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
    const findUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Users?filterByFormula={User ID}="${encodedEmail}"`
    
    const findResponse = await fetch(findUrl, {
      headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` }
    })
    
    if (!findResponse.ok) return null
    const findData = await findResponse.json()
    if (findData.records.length === 0) return null

    const recordId = findData.records[0].id
    const updateResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Users/${recordId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
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

// ✅ FIXED: Removed 'Date created' - it's a computed field in Airtable
async function createPersonalgorithmEntry(userRecordId, notes, tags) {
  try {
    const personalgorithmId = `p_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Personalgorithm™`
    
    const payload = {
      records: [{
        fields: {
          'Personalgorithm™ ID': personalgorithmId,
          'User ID': [userRecordId],
          'Personalgorithm™ Notes': notes,
          // ✅ REMOVED: 'Date created' - Airtable sets this automatically
          'Tags': tags,
          'Attachments': [],
          'Attachment Summary': ''
        }
      }]
    }

    console.log('Creating Personalgorithm™ entry...')

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Airtable error:', errorText)
      throw new Error(`Failed to create Personalgorithm™: ${errorText}`)
    }

    const result = await response.json()
    console.log('Personalgorithm™ entry created successfully:', result.records[0].id)
    return result.records[0]

  } catch (error) {
    console.error('Error creating Personalgorithm™ entry:', error)
    throw error
  }
}

async function createVisioningEntry(userRecordId, visioningText, synthesis) {
  try {
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Visioning`
    
    const visioningId = `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const payload = {
      records: [{
        fields: {
          'Visioning ID': visioningId,
          'User ID': [userRecordId],
          'Date of Submission': new Date().toISOString(),
          'Summary of Visioning': synthesis.summary || 'Comprehensive visioning completed',
          'Visioning Homework - Text Format': visioningText.substring(0, 100000),
          'Tags': synthesis.keyThemes || 'visioning-comprehensive',
          'Notes': 'Processed via automated visioning analysis'
        }
      }]
    }

    console.log('Creating Visioning entry...')

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Visioning entry creation failed:', errorText)
      throw new Error('Failed to create visioning entry')
    }

    const result = await response.json()
    console.log('Visioning entry created successfully:', result.records[0].id)
    return result.records[0]

  } catch (error) {
    console.error('Error creating visioning entry:', error)
    throw error
  }
}

async function updateUserProfileFromVisioning(email, synthesis) {
  try {
    const updates = {
      'Current Vision': synthesis.currentVision || '',
      'Current Goals': synthesis.summary || '',
      'Tags': synthesis.keyThemes || ''
    }
    
    const existingProfile = await getUserProfile(email)
    if (existingProfile && existingProfile['Tags']) {
      const existingTags = existingProfile['Tags'].split(',').map(t => t.trim())
      const newTags = updates['Tags'].split(',').map(t => t.trim())
      const allTags = [...new Set([...existingTags, ...newTags])]
      updates['Tags'] = allTags.join(', ')
    }

    return await updateUserProfile(email, updates)
  } catch (error) {
    console.error('Error updating user profile from visioning:', error)
  }
}