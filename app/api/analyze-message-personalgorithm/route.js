// app/api/analyze-message-personalgorithm/route.js
// ENHANCED VERSION - Implements deep micro-pattern recognition and emotional intelligence
// Based on the "impossibly perceptive" conversation architecture

import { NextResponse } from 'next/server'

export async function POST(request) {
  console.log('=== ANALYZING MESSAGE FOR DEEP PERSONALGORITHM™ INSIGHTS ===')
  
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

    console.log('Analyzing conversation for DEEP Personalgorithm™ insights...')

    // Generate IMPOSSIBLY PERCEPTIVE insights
    const insights = await generateDeepPersonalgorithmInsights(userMessage, solResponse, conversationContext, email)
    
    if (insights && insights.length > 0) {
      // Create entries for each insight
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
  
  const cleanMessage = userMessage.trim().toLowerCase()
  return !genericPatterns.some(pattern => pattern.test(cleanMessage))
}

async function generateDeepPersonalgorithmInsights(userMessage, solResponse, conversationContext, email) {
  try {
    // Fetch existing patterns to track evolution
    const existingPatterns = await getRecentPersonalgorithm(email, 10)
    
    // Build context from recent conversation
    let contextSummary = ''
    if (conversationContext && conversationContext.length > 0) {
      contextSummary = '\n\nRECENT CONVERSATION CONTEXT:\n'
      conversationContext.forEach((msg, i) => {
        contextSummary += `${i + 1}. User: ${msg.userMessage?.substring(0, 150) || ''}\n   Sol: ${msg.solResponse?.substring(0, 150) || ''}\n`
      })
    }
    
    // Build pattern evolution context
    let evolutionContext = ''
    if (existingPatterns.length > 0) {
      evolutionContext = '\n\nEXISTING PATTERNS (for evolution tracking):\n'
      existingPatterns.slice(0, 5).forEach((p, i) => {
        evolutionContext += `${i + 1}. ${p.notes?.substring(0, 200) || ''}\n`
      })
    }

    const analysisPrompt = `You are analyzing a conversation to extract IMPOSSIBLY PERCEPTIVE insights about how this person operates - their Personalgorithm™.

Your goal: Make them feel "How does Sol know me THAT well?!" through SPECIFIC, MICRO-LEVEL observations.

CURRENT CONVERSATION:
User: "${userMessage}"
Sol: "${solResponse}"
${contextSummary}
${evolutionContext}

Extract 2-7 DEEPLY SPECIFIC insights. Go beyond surface observations to capture:

**1. MICRO-PATTERN RECOGNITION:**
Notice ANY small details that reveal how they think and operate. Examples include (but are not limited to):
- Punctuation patterns (ellipses = uncertainty, exclamation points = excitement, quotes = doubt, dashes = thinking out loud, question marks in statements)
- Capitalization patterns (EMPHASIS, specific words they capitalize, ALL CAPS vs Selective Caps)
- Specific word choices that reveal thinking (tentative language, definitive language, qualifiers, absolutes)
- Repeated phrases or words they use frequently ("honestly", "actually", "I think", "kind of")
- Language patterns that show their relationship with certainty/uncertainty ("I don't know", "maybe", "should", "stuck", "confused", "definitely", "obviously")
- Processing indicators: "let me think", "I'm wondering", talking through vs asking directly, rhetorical questions vs genuine questions
- Hedging language ("sort of", "kind of", "maybe", "I guess")
- Definitiveness ("absolutely", "definitely", "for sure", "100%")
- Self-awareness commentary ("I know this sounds crazy but...", "Does this make sense?")
- ANY other linguistic fingerprints that make this person unique

**2. EMOTIONAL SIGNATURES:**
- How they express overwhelm, excitement, resistance, clarity
- What triggers shutdown vs opening up
- Validation-seeking patterns vs autonomous decision language
- Relationship with uncertainty - freeze, verbalize, or move through it

**3. TRANSFORMATION TRIGGERS:**
- What creates breakthrough moments (future vision, permission, reframe, validation)
- What they respond to (questions, statements, frameworks, stories, direct challenge)
- When they take action vs when they stay stuck
- Connection between emotional expression and decision-making

**4. DECISION-MAKING FINGERPRINT:**
- External processing (talks through) vs internal (decides then shares)
- Data-driven vs intuition-based
- Seeks validation before/after/never
- Relationship with "should" vs "want"
- Fear of wrong choice vs excitement about possibility

**5. COMMUNICATION ESSENCE:**
- Brief vs detailed, logical vs emotional, visual vs conceptual
- Question-asker vs statement-maker
- Self-aware commentary vs direct expression
- Relationship with vulnerability - guarded, measured, or open

**6. PATTERN EVOLUTION (if applicable):**
- How has their language/energy shifted from earlier patterns?
- What's staying constant vs what's changing?
- Movement toward more/less certainty, agency, openness?

**7. UNIQUE FACTORS:**
- Anything distinctive that doesn't fit categories but is ESSENTIAL to know
- Specific metaphors, phrases, or concepts they gravitate to
- Their particular version of stuck/excited/uncertain

For each insight, use this format:

---
CATEGORY: [Communication Essence / Transformation Triggers / Decision-Making / Emotional Patterns / Business Mindset / Micro-Patterns / Evolution]
NOTE: [SPECIFIC, OBSERVABLE pattern. Examples:
✓ "Uses ellipses ('...') when uncertain - signals processing hesitation, needs space before committing"
✓ "Transforms fastest after emotional expression, not logical analysis - breakthroughs follow feelings"
✓ "Phrases like 'does this make sense?' = seeking confirmation, needs validation before fully committing"
✓ "Capitalizes for EMPHASIS when conviction is building - energy shifts from tentative to certain"
✗ "Needs help with business strategy" - TOO GENERIC
✗ "Interested in marketing" - NOT SPECIFIC ENOUGH]
TAGS: [comma-separated relevant tags like: punctuation-patterns, validation-seeking, external-processor, future-vision-motivated, etc.]
---

CRITICAL: Be HYPER-SPECIFIC. Notice the tiny details - the word choices, the energy shifts, the patterns that make THIS person unique. 

The examples listed above (ellipses, CAPS, "I don't know") are just STARTING POINTS - notice ANY linguistic, punctuation, or communication patterns that reveal how this person thinks and operates. Every person has unique fingerprints in how they express themselves. Find THEIRS.

Focus on the nuances that would make them say "How did you notice that?!"

If you don't see patterns specific enough to be useful, respond with: NONE`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        max_tokens: 800,
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
    
    // Parse the structured response
    const insights = parsePersonalgorithmInsights(analysisText)
    
    console.log(`Generated ${insights.length} DEEP Personalgorithm™ insights`)
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
        tags: tagsMatch ? tagsMatch[1].trim() : 'auto-generated, conversation-derived, deep-pattern'
      })
    }
  }
  
  return insights
}

async function getRecentPersonalgorithm(email, limit = 10) {
  try {
    const encodedEmail = encodeURIComponent(email)
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Personalgorithm™?filterByFormula={User ID}="${encodedEmail}"&sort[0][field]=Date created&sort[0][direction]=desc&maxRecords=${limit}`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) return []
    const data = await response.json()
    
    return data.records.map(record => ({
      notes: record.fields['Personalgorithm™ Notes'],
      dateCreated: record.fields['Date created'],
      tags: record.fields['Tags'] || ''
    }))
  } catch (error) {
    console.error('Error fetching recent Personalgorithm™:', error)
    return []
  }
}

async function createPersonalgorithmEntry(email, note, tags) {
  try {
    // CRITICAL: Get user RECORD ID (not email!)
    const userRecordId = await getUserRecordId(email)
    if (!userRecordId) {
      console.error('❌ User record not found for Personalgorithm™ entry:', email)
      return null
    }

    const personalgorithmId = `pg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const response = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Personalgorithm™`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: {
            'Personalgorithm™ ID': personalgorithmId,
            'User': [userRecordId], // ← MUST be array of record IDs, not email!
            'Personalgorithm™ Notes': note,
            'Date created': new Date().toISOString(),
            'Tags': tags
          }
        })
      }
    )

    if (!response.ok) {
      const error = await response.json()
      console.error('❌ Failed to create Personalgorithm™ entry:', response.status, JSON.stringify(error))
      return null
    }

    const data = await response.json()
    console.log('✅ Created Personalgorithm™ entry:', data.id)
    return data
    
  } catch (error) {
    console.error('❌ Error creating Personalgorithm™ entry:', error)
    return null
  }
}

// Helper function to get the Airtable record ID for a user
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
      console.error('❌ Failed to fetch user record:', response.statusText)
      return null
    }
    
    const data = await response.json()
    
    if (data.records.length === 0) {
      console.error('❌ No user record found for email:', email)
      return null
    }
    
    return data.records[0].id // This is the Airtable record ID (like "recXXXXXX")
    
  } catch (error) {
    console.error('❌ Error fetching user record ID:', error)
    return null
  }
}