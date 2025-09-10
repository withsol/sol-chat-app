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
      }
    } else {
      // Get all visioning records for user
      const userRecordId = await getUserRecordId(email)
      if (!userRecordId) {
        return NextResponse.json({ 
          error: 'User not found' 
        }, { status: 404 })
      }
      
      const filterFormula = encodeURIComponent(`{User ID} = "${userRecordId}"`)
      const response = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Visioning?filterByFormula=${filterFormula}`, {
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        visioningRecords = data.records
      }
    }

    if (visioningRecords.length === 0) {
      return NextResponse.json({ 
        error: 'No visioning homework found' 
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
        
        // Get user email from the linked user record
        const userEmail = email || await getUserEmailFromRecordId(fields['User ID'][0])
        
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

        // Use your existing analysis function
        const analysis = await analyzeVisioningDocument(visioningText)
        
        // Update the user's profile with comprehensive vision data
        const profileUpdates = {
          'Current Vision': analysis.vision || '',
          'Current Goals': analysis.goals || '',
          'Current State': analysis.currentState || ''
        }

        // Add/update tags
        if (analysis.tags) {
          const existingProfile = await getUserProfile(userEmail)
          const existingTags = existingProfile?.['Tags'] || ''
          const newTags = existingTags ? `${existingTags}, ${analysis.tags}` : analysis.tags
          profileUpdates['Tags'] = newTags
        }

        await updateUserProfile(userEmail, profileUpdates)
        
        // Create Personalgorithm entries from analysis
        if (analysis.personalgorithmInsights?.length > 0) {
          for (const insight of analysis.personalgorithmInsights) {
            await createPersonalgorithmEntryNew(userEmail, insight, ['visioning-analysis', 'existing-data'])
            personalgorithmCount++
          }
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
      message: `Successfully processed ${processedCount} visioning record(s) and created ${personalgorithmCount} Personalgorithm insights.`,
      processedCount,
      personalgorithmCount,
      errors: errors.length > 0 ? errors : undefined,
      records: visioningRecords.map(r => ({
        id: r.id,
        summary: r.fields['Summary of Visioning'] || 'No summary'
      }))
    })

  } catch (error) {
    console.error('❌ Existing visioning processing error:', error)
    return NextResponse.json({
      error: 'Failed to process existing visioning homework',
      details: error.message
    }, { status: 500 })
  }
}

// ==================== ANALYSIS AND UPDATE FUNCTIONS ====================

async function analyzeVisioningDocument(visioningText) {
  try {
    console.log('Starting enhanced visioning analysis...')
    
    const analysisPrompt = `You are Sol™, analyzing comprehensive visioning homework. Extract detailed insights for personalized business coaching.

VISIONING DOCUMENT:
"${visioningText}"

Analyze this document and extract information in this EXACT JSON format:

{
  "businessName": "extracted business name or 'Not specified'",
  "industry": "their industry/niche",
  "businessStage": "startup/growing/established based on context",
  "vision": "1-year, 3-year, and 7-year goals combined into one vision statement",
  "goals": "primary 1-year goals",
  "currentState": "current business situation and challenges",
  "values": "core business values mentioned",
  "missionStatement": "their mission or purpose",
  "differentiation": "what sets them apart from competitors",
  "challenges": "main obstacles or challenges they face",
  "strengths": "what they love most about their business or do well",
  "mindsetBlocks": "any limiting beliefs or fears mentioned",
  "idealClient": "description of their ideal client or audience",
  "clientProblems": "problems their business solves",
  "currentOfferings": "current products or services",
  "marketingEfforts": "current marketing activities",
  "communicationStyle": "how they express themselves (analytical/emotional/direct/etc)",
  "learningStyle": "how they seem to process and create change",
  "transformationTriggers": "what motivates them based on past successes",
  "coachingNeeds": "what kind of support they seem to need most",
  "personalgorithmInsights": [
    "Specific insight about their decision-making patterns",
    "Insight about their communication style and processing",
    "Insight about what drives their transformation",
    "Insight about their emotional patterns or mindset",
    "Insight about their business approach or strategy style"
  ],
  "tags": "industry, business-stage, personality-traits, coaching-needs"
}

Extract as much detailed, specific information as possible. If something isn't mentioned, use "Not specified" rather than making assumptions.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        max_tokens: 1500,
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
      const analysis = JSON.parse(analysisText)
      console.log('✅ Analysis completed successfully')
      return analysis
    } catch (parseError) {
      console.error('Failed to parse analysis as JSON, using fallback:', parseError)
      // Create basic fallback analysis
      return {
        businessName: 'Not specified',
        industry: 'Not specified',
        vision: 'Visioning homework analyzed',
        goals: 'Business goals documented',
        currentState: 'Current business state documented',
        personalgorithmInsights: [
          'Completed comprehensive visioning homework - shows commitment to business planning',
          'Provided detailed business context for personalized coaching'
        ],
        tags: 'visioning-complete, business-planning'
      }
    }

  } catch (error) {
    console.error('Error analyzing visioning document:', error)
    throw error
  }
}

async function updateVisioningRecord(recordId, analysis) {
  try {
    const response = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Visioning/${recordId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          'Summary of Visioning': `Business: ${analysis.businessName || 'Not specified'} | Industry: ${analysis.industry || 'Not specified'} | Vision: ${analysis.vision || 'Not specified'} | Goals: ${analysis.goals || 'Not specified'}`,
          'Tags': analysis.tags || 'visioning-analyzed',
          'Action Steps': generateActionSteps(analysis),
          'Notes for Sol': `Communication Style: ${analysis.communicationStyle || 'Not specified'}. Learning Style: ${analysis.learningStyle || 'Not specified'}. Transformation Triggers: ${analysis.transformationTriggers || 'Not specified'}. Coaching Needs: ${analysis.coachingNeeds || 'Not specified'}.`,
          'Reviewed (?)': true
        }
      })
    })

    if (response.ok) {
      console.log('✅ Visioning record updated')
    } else {
      console.error('Failed to update visioning record:', response.status)
    }
  } catch (error) {
    console.error('Error updating visioning record:', error)
  }
}

function generateActionSteps(analysis) {
  const steps = []
  
  if (analysis.goals) {
    steps.push(`1) Focus on primary goals: ${analysis.goals}`)
  }
  
  if (analysis.challenges) {
    steps.push(`2) Address key challenges: ${analysis.challenges}`)
  }
  
  if (analysis.strengths) {
    steps.push(`3) Leverage strengths: ${analysis.strengths}`)
  }
  
  if (analysis.idealClient) {
    steps.push(`4) Develop ideal client strategy: ${analysis.idealClient}`)
  }

  return steps.length > 0 ? steps.join(' ') : 'Action steps to be determined based on coaching sessions'
}

// ==================== HELPER FUNCTIONS ====================

async function getUserEmailFromRecordId(recordId) {
  try {
    const response = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Users/${recordId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      const record = await response.json()
      return record.fields['User ID'] // This should be the email
    }
    return null
  } catch (error) {
    console.error('Error getting user email from record ID:', error)
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