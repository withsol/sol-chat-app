import { NextResponse } from 'next/server'

export async function POST(request) {
  console.log('=== ANALYZING MESSAGE FOR PERSONALGORITHM™ ===')
  
  try {
    const { email, userMessage, solResponse, conversationContext = [] } = await request.json()
    
    if (!email || !userMessage || !solResponse) {
      return NextResponse.json({ 
        error: 'Email, user message, and Sol response required' 
      }, { status: 400 })
    }

    // Only analyze meaningful conversations
    if (!shouldAnalyzeForPersonalgorithm(userMessage, solResponse)) {
      return NextResponse.json({
        success: true,
        analyzed: false,
        reason: 'Conversation too brief for meaningful Personalgorithm™ analysis',
        entriesCreated: 0
      })
    }

    console.log('Analyzing conversation for Personalgorithm™ insights...')

    // Get user's name for personalized analysis
    const userName = await getUserName(email)
    
    // Generate DEEP Personalgorithm™ insights with user's name
    const insights = await generateDeepPersonalgorithmInsights(
      userMessage, 
      solResponse, 
      conversationContext,
      userName  // Pass the name!
    )
    
    if (insights && insights.length > 0) {
      const createdEntries = []
      for (const insight of insights) {
        const entry = await createPersonalgorithmEntry(email, insight.note, insight.tags)
        if (entry) {
          console.log(`✅ Created Personalgorithm™ entry for ${email}`)
          createdEntries.push({
            insight: insight.note.substring(0, 100) + '...',
            entryId: entry.id,
            category: insight.category
          })
        }
      }
      
      return NextResponse.json({
        success: true,
        analyzed: true,
        entriesCreated: createdEntries.length,
        createdEntries: createdEntries,
        message: `Added ${createdEntries.length} new Personalgorithm™ insights from this conversation`
      })
    }

    return NextResponse.json({
      success: true,
      analyzed: true,
      entriesCreated: 0,
      message: 'Conversation analyzed - no new significant patterns detected'
    })

  } catch (error) {
    console.error('❌ Message Personalgorithm™ analysis error:', error)
    return NextResponse.json({
      error: 'Failed to analyze message for Personalgorithm™',
      details: error.message
    }, { status: 500 })
  }
}

// NEW FUNCTION: Get user's name from profile
async function getUserName(email) {
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
      // Fallback to email name
      return email.split('@')[0].split('.')[0] || 'User'
    }
    
    const data = await response.json()
    
    if (data.records.length === 0) {
      // Fallback to email name
      return email.split('@')[0].split('.')[0] || 'User'
    }
    
    const user = data.records[0].fields
    
    // Try to get name from various possible fields
    const name = user['Name'] || user['First Name'] || user['Full Name'] || email.split('@')[0].split('.')[0]
    
    // Capitalize first letter
    return name.charAt(0).toUpperCase() + name.slice(1)
    
  } catch (error) {
    console.error('Error getting user name:', error)
    // Fallback to email name
    return email.split('@')[0].split('.')[0] || 'User'
  }
}

function shouldAnalyzeForPersonalgorithm(userMessage, solResponse) {
  if (userMessage.length < 30 || solResponse.length < 50) {
    return false
  }
  
  const genericPatterns = [
    /^(hi|hello|hey|thanks|thank you|okay|ok|got it)/i,
    /^(bye|goodbye|see you|talk soon)/i
  ]
  
  return !genericPatterns.some(pattern => pattern.test(userMessage.trim()))
}

// UPDATED FUNCTION: Use user's actual name instead of "USER"
async function generateDeepPersonalgorithmInsights(userMessage, solResponse, conversationContext, userName) {
  try {
    const analysisPrompt = `You are analyzing a coaching conversation to identify SPECIFIC Personalgorithm™ patterns about ${userName} (the person being coached), NOT about Sol (the AI coach).

**CRITICAL:** Analyze ${userName}'s patterns - how ${userName} communicates, processes, and operates. Do NOT analyze Sol's coaching style.

${userName.toUpperCase()}'S MESSAGE: "${userMessage}"
SOL'S RESPONSE: "${solResponse}"

PREVIOUS CONTEXT: ${conversationContext.map(msg => `${msg.role}: "${msg.content}"`).join('\n')}

Analyze ${userName}'s patterns in these categories:

1. COMMUNICATION SIGNATURE (How ${userName} expresses themselves)
   - Punctuation patterns (ellipses = uncertainty, exclamation points = excitement, etc.)
   - Word emphasis techniques ${userName} uses (capitals, quotes, italics)
   - Unique phrases or vocabulary ${userName} uses repeatedly
   - How ${userName} structures their thinking (linear, circular, exploratory)

2. EMOTIONAL PROCESSING STYLE (How ${userName} processes emotions)
   - Does ${userName} process feelings before logic or logic before feelings?
   - Does ${userName} need to "talk through" to figure things out?
   - What emotions trigger action vs paralysis for ${userName}?
   - How does ${userName} describe their emotional state?

3. TRANSFORMATION TRIGGERS (What creates breakthroughs for ${userName})
   - What creates breakthroughs for ${userName}? (validation, challenge, questions, data, stories)
   - When does ${userName} say "yes" to action? (after analysis, after feeling ready, impulsively)
   - What patterns show ${userName}'s growth or stuck-ness?

4. DECISION-MAKING PATTERNS (How ${userName} makes decisions)
   - Does ${userName} seek permission, validation, or just inform?
   - How much certainty does ${userName} need before moving forward?
   - Does ${userName} decide quickly or need time to process?

5. MICRO-PATTERNS & NUANCES (${userName}'s unique worldview)
   - Specific words/phrases that reveal ${userName}'s worldview
   - Beliefs ${userName} has about themselves that they're revealing
   - Gaps between what ${userName} says and what they might actually need
   - Resistance patterns (what ${userName} is avoiding saying or doing)

For each significant pattern you identify about ${userName}, return in this format:

CATEGORY: [category name]
NOTE: [2-3 sentence specific observation about ${userName}'s behavior, communication, or processing style - use ${userName}'s name naturally]
TAGS: [relevant tags for this insight]

If you identify multiple patterns, separate them with "---"

If no significant patterns emerge about ${userName}, respond with "NONE".

REMEMBER: You are analyzing ${userName} (the person asking questions and being coached), NOT Sol (the AI coach). Focus on what ${userName}'s messages reveal about how ${userName} operates, thinks, feels, and communicates.

Be SPECIFIC to ${userName} as an individual. Avoid generic observations. Focus on the nuances that make ${userName}'s way of operating unique.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        max_tokens: 600,
        temperature: 0.3,
        messages: [{ role: 'user', content: analysisPrompt }]
      })
    })

    if (!response.ok) {
      console.error('Personalgorithm™ analysis failed:', response.status)
      return null
    }

    const result = await response.json()
    const analysisText = result.choices[0].message.content.trim()
    
    if (analysisText === 'NONE' || analysisText.includes('no significant')) {
      return null
    }
    
    const insights = parsePersonalgorithmInsights(analysisText)
    
    console.log(`Generated ${insights.length} Personalgorithm™ insights`)
    return insights

  } catch (error) {
    console.error('Error generating Personalgorithm™ insights:', error)
    return null
  }
}

function parsePersonalgorithmInsights(analysisText) {
  const insights = []
  const sections = analysisText.split('---').map(s => s.trim())
  
  for (const section of sections) {
    const categoryMatch = section.match(/CATEGORY:\s*(.+)/i)
    const noteMatch = section.match(/NOTE:\s*(.+?)(?=TAGS:|$)/is)
    const tagsMatch = section.match(/TAGS:\s*(.+)/i)
    
    if (categoryMatch && noteMatch) {
      insights.push({
        category: categoryMatch[1].trim(),
        note: noteMatch[1].trim(),
        tags: tagsMatch ? tagsMatch[1].trim() : 'auto-generated, conversation-derived'
      })
    }
  }
  
  return insights
}

async function createPersonalgorithmEntry(email, notes, tags = 'auto-generated') {
  try {
    const userRecordId = await getUserRecordId(email)
    if (!userRecordId) {
      console.error('❌ Cannot create Personalgorithm™ entry - user record not found for:', email)
      return null
    }

    const personalgorithmId = `p_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const tableName = 'Personalgorithm™'
    const encodedTableName = encodeURIComponent(tableName)
    
    console.log('Creating Personalgorithm™ entry for:', email)
    
    const response = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${encodedTableName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          'Personalgorithm™ ID': personalgorithmId,
          'User ID': [userRecordId],
          'Personalgorithm™ Notes': notes,
          'Tags': typeof tags === 'string' ? tags : tags.join(', ')
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Failed to create Personalgorithm™ entry (${response.status}):`, errorText)
      return null
    }

    const result = await response.json()
    console.log('✅ Personalgorithm™ entry created:', result.id)
    return result
    
  } catch (error) {
    console.error('Error creating Personalgorithm™ entry:', error)
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

    if (!response.ok) {
      console.error('Failed to fetch user record:', response.status)
      return null
    }
    
    const data = await response.json()
    
    if (data.records.length === 0) {
      console.error('No user found with email:', email)
      return null
    }
    
    return data.records[0].id

  } catch (error) {
    console.error('Error getting user record ID:', error)
    return null
  }
}
