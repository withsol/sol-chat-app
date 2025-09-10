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

    // Only analyze meaningful conversations (avoid simple greetings, etc.)
    if (!shouldAnalyzeForPersonalgorithm(userMessage, solResponse)) {
      return NextResponse.json({
        success: true,
        analyzed: false,
        reason: 'Conversation too brief for meaningful Personalgorithm™ analysis',
        entriesCreated: 0
      })
    }

    console.log('Analyzing conversation for Personalgorithm™ insights...')

    // Get user context for informed analysis
    const userContext = await fetchUserContextForPersonalgorithm(email)
    
    // Combine message with conversation context for richer analysis
    const fullConversationText = buildConversationAnalysisText(userMessage, solResponse, conversationContext)
    
    // Generate targeted Personalgorithm™ analysis focused on this conversation
    const personalgorithmAnalysis = await generateConversationPersonalgorithmAnalysis(
      fullConversationText,
      userContext,
      'conversation'
    )
    
    // Create only the most significant insights (avoid spam)
    const createdEntries = []
    const maxEntriesPerConversation = 2
    
    // Priority categories for conversation analysis
    const priorityCategories = [
      'COMMUNICATION_PATTERNS',
      'DECISION_MAKING_STYLE',
      'EMOTIONAL_PATTERNS',
      'TRANSFORMATION_TRIGGERS'
    ]
    
    let entriesCreated = 0
    
    for (const category of priorityCategories) {
      if (entriesCreated >= maxEntriesPerConversation) break
      
      const insights = personalgorithmAnalysis.insights[category] || []
      
      for (const insight of insights.slice(0, 1)) { // Max 1 per category
        if (insight.trim().length > 40 && entriesCreated < maxEntriesPerConversation) {
          const entry = await createPersonalgorithmEntry(
            email,
            `[${category.replace(/_/g, ' ')}] ${insight}`,
            [category.toLowerCase(), 'conversation-derived', 'real-time']
          )
          
          if (entry) {
            createdEntries.push({
              category,
              insight: insight.substring(0, 100) + '...',
              entryId: entry.id
            })
            entriesCreated++
          }
        }
      }
    }

    console.log(`✅ Created ${createdEntries.length} Personalgorithm™ entries from conversation`)

    return NextResponse.json({
      success: true,
      analyzed: true,
      entriesCreated: createdEntries.length,
      createdEntries: createdEntries,
      analysisMetadata: personalgorithmAnalysis.metadata,
      message: createdEntries.length > 0 
        ? `Added ${createdEntries.length} new Personalgorithm™ insights from this conversation`
        : 'Conversation analyzed - no new significant patterns detected'
    })

  } catch (error) {
    console.error('❌ Message Personalgorithm™ analysis error:', error)
    return NextResponse.json({
      error: 'Failed to analyze message for Personalgorithm™',
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

function buildConversationAnalysisText(userMessage, solResponse, conversationContext) {
  let analysisText = `CURRENT EXCHANGE:
USER: ${userMessage}
SOL: ${solResponse}\n\n`

  if (conversationContext.length > 0) {
    analysisText += `RECENT CONVERSATION CONTEXT:\n`
    conversationContext.slice(-3).forEach((msg, i) => {
      analysisText += `${msg.role.toUpperCase()}: ${msg.content}\n`
    })
  }

  return analysisText
}

async function generateConversationPersonalgorithmAnalysis(conversationText, userContext, sourceType) {
  try {
    const analysisPrompt = `You are Sol™ analyzing a real-time conversation to extract Personalgorithm™ insights. Focus on NEW patterns that emerge from THIS specific conversation.

EXISTING USER CONTEXT:
${userContext.contextSummary || 'Limited context available'}

CONVERSATION TO ANALYZE:
${conversationText}

Extract ONLY significant, NEW insights that aren't already captured in existing context. Focus on patterns that emerge from how they engaged in THIS conversation.

COMMUNICATION_PATTERNS: [
"How they expressed themselves in this specific exchange",
"New communication preferences or patterns that emerged"
]

DECISION_MAKING_STYLE: [
"How they approached decisions or problem-solving in this conversation",
"What factors influenced their thinking process here"
]

EMOTIONAL_PATTERNS: [
"Emotional state or patterns revealed in this exchange",
"How emotions influenced their communication or decisions"
]

TRANSFORMATION_TRIGGERS: [
"What seemed to create 'aha' moments or shifts for them",
"What type of support or guidance they responded to best"
]

PROCESSING_STYLE: [
"How they processed information or feedback in this conversation",
"What helped them gain clarity or understanding"
]

Only include insights that are:
- Specific to this conversation
- Reveal NEW patterns not already known
- Based on their actual words and responses
- Useful for future coaching interactions

Return insights in the exact format above. If no significant new patterns emerge, return empty arrays.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        max_tokens: 800,
        temperature: 0.2,
        messages: [{ role: 'user', content: analysisPrompt }]
      })
    })

    if (!response.ok) {
      throw new Error(`Conversation analysis failed: ${response.status}`)
    }

    const result = await response.json()
    const analysis = result.choices[0].message.content

    // Parse the analysis
    const insights = parsePersonalgorithmAnalysis(analysis)
    
    return {
      insights,
      metadata: {
        sourceType,
        analysisDate: new Date().toISOString(),
        conversationLength: conversationText.length,
        totalInsights: Object.values(insights).flat().length
      }
    }

  } catch (error) {
    console.error('Error generating conversation Personalgorithm™ analysis:', error)
    throw error
  }
}

// Helper funtions //

async function fetchPersonalgorithmDataDirect(email) {
  try {
    console.log('Fetching Personalgorithm™ data for:', email)
    
    // FIXED: Filter by email directly since User ID field contains email
    const encodedEmail = encodeURIComponent(email)
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Personalgorithm™?filterByFormula={User ID}="${encodedEmail}"&sort[0][field]=Date created&sort[0][direction]=desc&maxRecords=10`
    
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
      notes: record.fields['Personalgorithm™ Notes'],
      dateCreated: record.fields['Date created'],
      tags: record.fields['Tags'] || ''
    })).filter(item => item.notes)

    console.log('✅ Found', personalgorithm.length, 'Personalgorithm™ entries')
    return personalgorithm

  } catch (error) {
    console.error('❌ Error fetching Personalgorithm™:', error)
    return []
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
          'User': [userRecordId],
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