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

    // Generate simple Personalgorithm™ insight
    const insight = await generateSimplePersonalgorithmInsight(userMessage, solResponse)
    
    if (insight) {
      // Create the entry
      const entry = await createPersonalgorithmEntry(email, insight, ['auto-generated', 'conversation-derived'])
      
      if (entry) {
        console.log(`✅ Created Personalgorithm™ entry for ${email}`)
        return NextResponse.json({
          success: true,
          analyzed: true,
          entriesCreated: 1,
          createdEntries: [{
            insight: insight.substring(0, 100) + '...',
            entryId: entry.id
          }],
          message: 'Added 1 new Personalgorithm™ insight from this conversation'
        })
      }
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

async function generateSimplePersonalgorithmInsight(userMessage, solResponse) {
  try {
    const analysisPrompt = `Analyze this coaching conversation for specific Personalgorithm™ patterns:

USER: "${userMessage}"
SOL: "${solResponse}"

Create a detailed insight (4-6 sentences) that captures:
1. HOW this person communicates (word choice, emphasis, punctuation patterns)
2. HOW they process information or emotions (analytical, feeling-first, visual, need time, etc.)
3. WHAT triggers transformation or action for them specifically
4. HOW they respond to different types of support or feedback
5. Any unique patterns in their decision-making or problem-solving approach

Be SPECIFIC to this individual. Avoid generic observations. Focus on the nuances that make their way of operating unique.

If no significant pattern emerges, respond with "NONE".

Insight:`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        max_tokens: 200,
        temperature: 0.3,
        messages: [{ role: 'user', content: analysisPrompt }]
      })
    })

    if (!response.ok) {
      console.error('Personalgorithm™ analysis failed:', response.status)
      return null
    }

    const result = await response.json()
    const insight = result.choices[0].message.content.trim()
    
    if (insight === 'NONE' || insight.includes('no significant') || insight.length < 20) {
      return null
    }
    
    console.log('Generated insight:', insight.substring(0, 100) + '...')
    return insight

  } catch (error) {
    console.error('Error generating Personalgorithm™ insight:', error)
    return null
  }
}

async function createPersonalgorithmEntry(email, notes, tags = ['auto-generated']) {
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
          'User ID': email, // FIXED: Use email directly since User ID is single line text
          'Personalgorithm™ Notes': notes,
          'Date created': new Date().toISOString(),
          'Tags': Array.isArray(tags) ? tags.join(', ') : tags
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Failed to create Personalgorithm™ entry:', response.status, errorText)
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