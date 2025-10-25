// app/api/analyze-message-personalgorithm/route.js
// CORRECTED VERSION - Proper User Linking + Deep Pattern Analysis

import { NextResponse } from 'next/server'

export async function POST(request) {
  console.log('=== ANALYZING MESSAGE FOR PERSONALGORITHMâ„¢ ===')
  
  try {
    const { email, userMessage, solResponse, conversationContext = [] } = await request.json()
    
    if (!email || !userMessage || !solResponse) {
      return NextResponse.json({ 
        error: 'Email, user message, and Sol response required' 
      }, { status: 400 })
    }

    // Only analyze meaningful conversations (avoid simple greetings, etc.)
    if (!shouldAnalyzeForPersonalgorithm(userMessage, solResponse)) {
      return NextResponse.json({
        success: true,
        analyzed: false,
        reason: 'Conversation too brief for meaningful Personalgorithmâ„¢ analysis',
        entriesCreated: 0
      })
    }

    console.log('Analyzing conversation for Personalgorithmâ„¢ insights...')

    // Generate DEEP Personalgorithmâ„¢ insights
    const insights = await generateDeepPersonalgorithmInsights(userMessage, solResponse, conversationContext)
    
    if (insights && insights.length > 0) {
      // Create entries for each insight
      const createdEntries = []
      for (const insight of insights) {
        const entry = await createPersonalgorithmEntry(email, insight.note, insight.tags)
        if (entry) {
          console.log(`âœ… Created Personalgorithmâ„¢ entry for ${email}`)
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
        message: `Added ${createdEntries.length} new Personalgorithmâ„¢ insights from this conversation`
      })
    }

    return NextResponse.json({
      success: true,
      analyzed: true,
      entriesCreated: 0,
      message: 'Conversation analyzed - no new significant patterns detected'
    })

  } catch (error) {
    console.error('âŒ Message Personalgorithmâ„¢ analysis error:', error)
    return NextResponse.json({
      error: 'Failed to analyze message for Personalgorithmâ„¢',
      details: error.message
    }, { status: 500 })
  }
}

function shouldAnalyzeForPersonalgorithm(userMessage, solResponse) {
  // Skip analysis for very short exchanges
  if (userMessage.length < 30 || solResponse.length < 50) {
    return false
  }
  
  // Skip generic greetings and simple responses
  const genericPatterns = [
    /^(hi|hello|hey|thanks|thank you|ok|okay|yes|no)\.?\s*$/i,
    /^(good morning|good afternoon|good evening)\.?\s*$/i,
    /^(how are you|what\'s up)\.?\s*$/i
  ]
  
  for (const pattern of genericPatterns) {
    if (pattern.test(userMessage.trim())) {
      return false
    }
  }
  
  return true
}

async function generateDeepPersonalgorithmInsights(userMessage, solResponse, conversationContext) {
  try {
    const analysisPrompt = `You are analyzing a coaching conversation to identify SPECIFIC Personalgorithmâ„¢ patterns - the unique ways this individual operates, communicates, and transforms.

USER MESSAGE: "${userMessage}"
SOL RESPONSE: "${solResponse}"

PREVIOUS CONTEXT: ${conversationContext.map(msg => `${msg.role}: "${msg.content}"`).join('\n')}

Analyze for these SPECIFIC pattern categories:

1. COMMUNICATION SIGNATURE
   - Punctuation patterns (ellipses = uncertainty, exclamation points = excitement, etc.)
   - Word emphasis techniques (capitals, quotes, italics)
   - Unique phrases or vocabulary they use repeatedly
   - How they structure their thinking (linear, circular, exploratory)

2. EMOTIONAL PROCESSING STYLE
   - Do they process feelings before logic or logic before feelings?
   - Do they need to "talk through" to figure things out?
   - What emotions trigger action vs paralysis?
   - How do they describe their emotional state?

3. TRANSFORMATION TRIGGERS
   - What creates breakthroughs for them? (validation, challenge, questions, data, stories)
   - When do they say "yes" to action? (after analysis, after feeling ready, impulsively)
   - What patterns show growth or stuck-ness?

4. DECISION-MAKING PATTERNS
   - Do they seek permission, validation, or just inform?
   - How much certainty do they need before moving forward?
   - Do they decide quickly or need time to process?

5. MICRO-PATTERNS & NUANCES
   - Specific words/phrases that reveal their worldview
   - Beliefs about themselves they're revealing
   - Gaps between what they say and what they might actually need
   - Resistance patterns (what they're avoiding saying or doing)

For each significant pattern you identify, return in this format:

CATEGORY: [category name]
NOTE: [2-3 sentence specific observation about THIS person, not generic coaching advice]
TAGS: [relevant tags for this insight]

If you identify multiple patterns, separate them with "---"

If no significant patterns emerge, respond with "NONE".

Be SPECIFIC to this individual. Avoid generic observations. Focus on the nuances that make their way of operating unique.`

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
      console.error('Personalgorithmâ„¢ analysis failed:', response.status)
      return null
    }

    const result = await response.json()
    const analysisText = result.choices[0].message.content.trim()
    
    if (analysisText === 'NONE' || analysisText.includes('no significant')) {
      return null
    }
    
    // Parse the structured response
    const insights = parsePersonalgorithmInsights(analysisText)
    
    console.log(`Generated ${insights.length} Personalgorithmâ„¢ insights`)
    return insights

  } catch (error) {
    console.error('Error generating Personalgorithmâ„¢ insights:', error)
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
    // CRITICAL: Get the User record ID for proper linking
    const userRecordId = await getUserRecordId(email)
    if (!userRecordId) {
      console.error('❌ Cannot create Personalgorithm™ entry - user record not found for:', email)
      return null
    }

    const personalgorithmId = `p_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // URL-encode the table name (it has a ™ symbol)
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
          'User': [userRecordId],
          'Personalgorithm™ Notes': notes,
          'Date created': new Date().toISOString(),
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