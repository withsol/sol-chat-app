// app/api/process-existing-visioning/route.js
import { NextResponse } from 'next/server'

export async function POST(request) {
  console.log('=== PROCESSING EXISTING VISIONING FROM AIRTABLE ===')
  
  try {
    const { email, visioningId, forceReprocess = false } = await request.json()
    
    if (!email && !visioningId) {
      return NextResponse.json({ 
        error: 'Email or specific visioning ID required' 
      }, { status: 400 })
    }

    console.log('Processing existing visioning for:', email || `ID: ${visioningId}`)

    // Get the visioning record(s) from Airtable
    let visioningRecords = []
    
    if (visioningId) {
      // Get specific visioning record
      const response = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Visioning/${visioningId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const record = await response.json()
        visioningRecords = [record]
      } else {
        console.error('Failed to fetch visioning record:', response.status)
      }
    } else {
      // FIXED: Search by email directly since User ID is stored as text
      const filterFormula = encodeURIComponent(`{User ID} = "${email}"`)
      const response = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Visioning?filterByFormula=${filterFormula}`, {
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        visioningRecords = data.records
        console.log(`Found ${data.records.length} visioning records for ${email}`)
      } else {
        console.error('Failed to fetch visioning records:', response.status)
      }
    }

    if (visioningRecords.length === 0) {
      return NextResponse.json({ 
        error: 'No visioning homework found',
        debug: {
          searchedFor: email || visioningId,
          searchType: email ? 'email' : 'visioningId'
        }
      }, { status: 404 })
    }

    let processedCount = 0
    let personalgorithmCount = 0
    let errors = []

    // Process each visioning record
    for (const record of visioningRecords) {
      try {
        const fields = record.fields
        const visioningText = fields['Visioning Homework - Text Format'] || ''
        
        // Get user email - it's stored directly in the User ID field as text
        const userEmail = email || fields['User ID']
        
        if (!visioningText) {
          console.log('No text content found in visioning record:', record.id)
          errors.push(`Record ${record.id}: No text content found`)
          continue
        }

        // Check if already processed (unless forced reprocess)
        if (!forceReprocess && fields['Summary of Visioning'] && fields['Summary of Visioning'].length > 100) {
          console.log('Record already processed, skipping:', record.id)
          continue
        }

        console.log(`Processing visioning record ${record.id} with ${visioningText.length} characters`)

        // Use enhanced analysis function
        const analysis = await analyzeVisioningDocumentEnhanced(visioningText)
        
        // Update the user's profile with comprehensive vision data
        const profileUpdates = {
          'Current Vision': analysis.vision || '',
          'Current Goals': analysis.goals || '',
          'Current State': analysis.currentState || ''
        }

        // Add/update tags intelligently
        if (analysis.tags) {
          const existingProfile = await getUserProfile(userEmail)
          const existingTags = existingProfile?.['Tags'] || ''
          const newTagsList = analysis.tags.split(',').map(tag => tag.trim())
          const existingTagsList = existingTags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
          
          // Merge and deduplicate tags
          const allTags = [...new Set([...existingTagsList, ...newTagsList])].filter(tag => tag.length > 0)
          profileUpdates['Tags'] = allTags.join(', ')
        }

        // Update user profile
        const profileUpdateResult = await updateUserProfile(userEmail, profileUpdates)
        console.log('Profile update result:', profileUpdateResult ? 'Success' : 'Failed')
        
        // Create Personalgorithm entries from analysis
        if (analysis.personalgorithmInsights?.length > 0) {
          console.log(`Creating ${analysis.personalgorithmInsights.length} Personalgorithm insights for ${userEmail}`)
          for (const insight of analysis.personalgorithmInsights) {
            console.log('Creating insight:', insight.substring(0, 50) + '...')
            const personalgorithmResult = await createPersonalgorithmEntryNew(userEmail, insight, ['visioning-analysis', 'existing-data'])
            if (personalgorithmResult) {
              personalgorithmCount++
              console.log('✅ Personalgorithm insight created successfully')
            } else {
              console.log('❌ Failed to create Personalgorithm insight')
            }
          }
        } else {
          console.log('⚠️ No personalgorithm insights found in analysis for record:', record.id)
          console.log('Analysis object keys:', Object.keys(analysis))
          console.log('Insights array:', analysis.personalgorithmInsights)
        }

        // Update the visioning record with enhanced analysis
        await updateVisioningRecord(record.id, analysis)
        
        processedCount++
        console.log(`✅ Processed visioning record ${record.id}`)
        
      } catch (recordError) {
        console.error(`Error processing visioning record ${record.id}:`, recordError)
        errors.push(`Record ${record.id}: ${recordError.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      processedCount,
      personalgorithmEntriesCreated: personalgorithmCount,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('❌ Existing visioning processing error:', error)
    return NextResponse.json({
      error: 'Failed to process existing visioning homework',
      details: error.message
    }, { status: 500 })
  }
}

// ==================== ENHANCED ANALYSIS FUNCTION ====================

async function analyzeVisioningDocumentEnhanced(visioningText) {
  try {
    console.log('Starting enhanced visioning analysis...')
    
    const analysisPrompt = `You are Sol™, analyzing comprehensive visioning homework with Kelsey's Aligned Business® Method. Extract detailed insights for building this person's Personalgorithm™.

VISIONING DOCUMENT:
"${visioningText}"

Analyze this document thoroughly and provide insights in this EXACT JSON format:

{
  "businessName": "extracted business name or 'Not specified'",
  "industry": "their industry/niche",
  "businessStage": "startup/growing/established based on context",
  "vision": "comprehensive vision statement combining their 1-year, 3-year, and 7-year goals",
  "goals": "specific 1-year goals and priorities",
  "currentState": "current business situation, challenges, and context",
  "values": "core business values mentioned",
  "missionStatement": "their mission or purpose statement",
  "differentiation": "what sets them apart from competitors",
  "challenges": "main obstacles or challenges they face",
  "strengths": "what they love most about their business or do well",
  "mindsetBlocks": "limiting beliefs, fears, or blocks mentioned",
  "idealClient": "detailed description of their ideal client or audience",
  "clientProblems": "problems their business solves for clients",
  "currentOfferings": "current products or services they offer",
  "marketingEfforts": "current marketing activities and channels",
  "communicationStyle": "how they express themselves (analytical/emotional/direct/visual/etc)",
  "learningStyle": "how they seem to process information and create change",
  "transformationTriggers": "what motivates them to take action based on past successes",
  "coachingNeeds": "what kind of support and coaching approach they most need",
  "personalgorithmInsights": [
    "Specific insight about their decision-making patterns and preferences",
    "Insight about their communication style and how they process information",
    "Insight about what drives their transformation and motivation",
    "Insight about their emotional patterns, energy, or mindset tendencies",
    "Insight about their business approach, strengths, or unique style",
    "Insight about their relationship with money, success, or growth"
  ],
  "tags": "industry, business-stage, personality-traits, coaching-needs, communication-style"
}

Extract as much detailed, specific information as possible. If something isn't clearly mentioned, use "Not specified" rather than making assumptions. Focus on insights that will help Sol provide deeply personalized coaching.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        max_tokens: 1800,
        temperature: 0.3,
        messages: [{ role: 'user', content: analysisPrompt }]
      })
    })

    if (!response.ok) {
      throw new Error(`Visioning analysis failed: ${response.status}`)
    }

    const result = await response.json()
    const analysisText = result.choices[0].message.content

    // Parse the JSON response
    try {
      // Clean up the response to extract just the JSON
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0])
        console.log('✅ Enhanced analysis completed successfully')
        return analysis
      } else {
        throw new Error('No JSON found in response')
      }
    } catch (parseError) {
      console.error('Failed to parse analysis as JSON, using fallback:', parseError)
      console.log('Raw analysis response:', analysisText)
      
      // Create enhanced fallback analysis by extracting what we can
      return createFallbackAnalysis(visioningText)
    }

  } catch (error) {
    console.error('Error analyzing visioning document:', error)
    return createFallbackAnalysis(visioningText)
  }
}

function createFallbackAnalysis(visioningText) {
  // Simple keyword-based extraction as fallback
  const text = visioningText.toLowerCase()
  
  let businessName = 'Not specified'
  let industry = 'Not specified'
  
  // Try to extract business name
  const namePatterns = [
    /my business is called ([^.!?\n]+)/i,
    /business name[:\s]+([^.!?\n]+)/i,
    /company[:\s]+([^.!?\n]+)/i
  ]
  
  for (const pattern of namePatterns) {
    const match = visioningText.match(pattern)
    if (match) {
      businessName = match[1].trim()
      break
    }
  }
  
  // Try to extract industry
  const industryKeywords = ['coaching', 'consulting', 'design', 'marketing', 'wellness', 'therapy', 'photography', 'writing', 'tech', 'fitness']
  for (const keyword of industryKeywords) {
    if (text.includes(keyword)) {
      industry = keyword
      break
    }
  }
  
  return {
    businessName,
    industry,
    businessStage: 'Not specified',
    vision: 'Detailed visioning homework completed - analysis shows commitment to business growth and planning',
    goals: 'Business goals documented in comprehensive visioning homework',
    currentState: 'Current business state and challenges documented through visioning process',
    personalgorithmInsights: [
      'Completed comprehensive visioning homework - demonstrates commitment to structured business planning',
      'Provided extensive business context showing self-awareness and strategic thinking',
      'Took time for deep reflection on business vision, values, and goals'
    ],
    tags: 'visioning-complete, business-planning, strategic-thinking'
  }
}

// ==================== UPDATE FUNCTIONS ====================

async function updateVisioningRecord(recordId, analysis) {
  try {
    const actionSteps = generateEnhancedActionSteps(analysis)
    const solNotes = generateSolNotes(analysis)
    
    const response = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Visioning/${recordId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          'Summary of Visioning': `Business: ${analysis.businessName || 'Not specified'} | Industry: ${analysis.industry || 'Not specified'} | Stage: ${analysis.businessStage || 'Not specified'} | Vision: ${(analysis.vision || '').substring(0, 100)}${analysis.vision?.length > 100 ? '...' : ''}`,
          'Tags': analysis.tags || 'visioning-analyzed',
          'Action Steps': actionSteps,
          'Notes for Sol': solNotes,
          'Reviewed (?)': true
        }
      })
    })

    if (response.ok) {
      console.log('✅ Visioning record updated with enhanced analysis')
    } else {
      const errorText = await response.text()
      console.error('Failed to update visioning record:', response.status, errorText)
    }
  } catch (error) {
    console.error('Error updating visioning record:', error)
  }
}

function generateEnhancedActionSteps(analysis) {
  const steps = []
  
  if (analysis.goals && analysis.goals !== 'Not specified') {
    steps.push(`1) Primary focus: ${analysis.goals}`)
  }
  
  if (analysis.challenges && analysis.challenges !== 'Not specified') {
    steps.push(`2) Address challenges: ${analysis.challenges}`)
  }
  
  if (analysis.strengths && analysis.strengths !== 'Not specified') {
    steps.push(`3) Leverage strengths: ${analysis.strengths}`)
  }
  
  if (analysis.idealClient && analysis.idealClient !== 'Not specified') {
    steps.push(`4) Ideal client focus: ${analysis.idealClient}`)
  }
  
  if (analysis.mindsetBlocks && analysis.mindsetBlocks !== 'Not specified') {
    steps.push(`5) Work through: ${analysis.mindsetBlocks}`)
  }

  return steps.length > 0 ? steps.join(' ') : 'Action steps based on comprehensive visioning: Focus on vision implementation, address identified challenges, and leverage documented strengths.'
}

function generateSolNotes(analysis) {
  const notes = []
  
  if (analysis.communicationStyle && analysis.communicationStyle !== 'Not specified') {
    notes.push(`Communication Style: ${analysis.communicationStyle}`)
  }
  
  if (analysis.learningStyle && analysis.learningStyle !== 'Not specified') {
    notes.push(`Learning Style: ${analysis.learningStyle}`)
  }
  
  if (analysis.transformationTriggers && analysis.transformationTriggers !== 'Not specified') {
    notes.push(`Transformation Triggers: ${analysis.transformationTriggers}`)
  }
  
  if (analysis.coachingNeeds && analysis.coachingNeeds !== 'Not specified') {
    notes.push(`Coaching Needs: ${analysis.coachingNeeds}`)
  }
  
  return notes.length > 0 ? notes.join('. ') + '.' : 'Comprehensive visioning completed - ready for personalized coaching based on documented insights.'
}

// ==================== HELPER FUNCTIONS ====================

async function getUserEmailFromLinkedRecord(userRecordId) {
  try {
    const response = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Users/${userRecordId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      const record = await response.json()
      return record.fields['User ID'] // This should be the email in Users table
    }
    return null
  } catch (error) {
    console.error('Error getting user email from linked record:', error)
    return null
  }
}

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
          'User ID': email, // FIXED: Use "User ID" instead of "User" to match your schema
          'Personalgorithm™ Notes': notes,
          // Date created is auto-computed by Airtable
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