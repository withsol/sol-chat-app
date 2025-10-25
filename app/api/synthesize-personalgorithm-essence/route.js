// app/api/synthesize-personalgorithm-essence/route.js
// THE MAGIC FILE - Creates impossibly perceptive user profiles

import { NextResponse } from 'next/server'

export async function POST(request) {
  console.log('=== SYNTHESIZING PERSONALGORITHMâ„¢ ESSENCE ===')
  
  try {
    const { email, forceRegenerate = false } = await request.json()
    
    if (!email) {
      return NextResponse.json({ 
        error: 'Email required' 
      }, { status: 400 })
    }

    console.log('Synthesizing essence for:', email)

    // Get user profile
    const userProfile = await getUserProfile(email)
    if (!userProfile) {
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404 })
    }

    // Check if we need to regenerate
    const lastSynthesis = userProfile['Last Synthesis Date']
    const personalgorithmCount = await getPersonalgorithmCount(email)
    
    if (!forceRegenerate && lastSynthesis) {
      const daysSinceSynthesis = (Date.now() - new Date(lastSynthesis).getTime()) / (1000 * 60 * 60 * 24)
      
      // Only regenerate if:
      // - More than 7 days since last synthesis
      // - OR more than 10 new Personalgorithm entries since last synthesis
      if (daysSinceSynthesis < 7 && personalgorithmCount < 10) {
        return NextResponse.json({
          success: true,
          message: 'Essence is current - no regeneration needed',
          lastSynthesis: lastSynthesis,
          skipReason: 'recent_synthesis'
        })
      }
    }

    // Fetch ALL Personalgorithmâ„¢ entries
    const allPersonalgorithm = await fetchAllPersonalgorithm(email)
    
    if (allPersonalgorithm.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No Personalgorithmâ„¢ data to synthesize',
        count: 0
      })
    }

    console.log(`Synthesizing from ${allPersonalgorithm.length} Personalgorithmâ„¢ entries...`)

    // Generate the ESSENCE PROFILE
    const essenceProfile = await generateEssenceProfile(allPersonalgorithm, userProfile)
    
    if (!essenceProfile) {
      return NextResponse.json({
        success: false,
        message: 'Failed to generate essence profile'
      }, { status: 500 })
    }

    // Update user profile with the essence
    await updateUserProfile(email, {
      'Coaching Style Match': essenceProfile,
      'Last Synthesis Date': new Date().toISOString()
    })

    console.log('âœ… Personalgorithmâ„¢ Essence synthesized and saved')

    return NextResponse.json({
      success: true,
      message: 'Personalgorithmâ„¢ Essence profile generated successfully',
      entriesAnalyzed: allPersonalgorithm.length,
      essenceLength: essenceProfile.length,
      preview: essenceProfile.substring(0, 200) + '...'
    })

  } catch (error) {
    console.error('âŒ Essence synthesis error:', error)
    return NextResponse.json({
      error: 'Failed to synthesize Personalgorithmâ„¢ essence',
      details: error.message
    }, { status: 500 })
  }
}

async function generateEssenceProfile(personalgorithmEntries, userProfile) {
  try {
    // Organize entries by category/theme
    const entriesByCategory = {
      communication: [],
      emotional: [],
      transformation: [],
      decisionMaking: [],
      patterns: [],
      growth: [],
      resistance: [],
      values: []
    }

    // Categorize entries
    personalgorithmEntries.forEach(entry => {
      const note = entry.notes.toLowerCase()
      const tags = (entry.tags || '').toLowerCase()
      
      if (note.includes('communicat') || note.includes('speak') || note.includes('punctuation') || note.includes('express')) {
        entriesByCategory.communication.push(entry.notes)
      }
      if (note.includes('emotion') || note.includes('feeling') || note.includes('process') || tags.includes('emotional')) {
        entriesByCategory.emotional.push(entry.notes)
      }
      if (note.includes('transform') || note.includes('breakthrough') || note.includes('shift') || note.includes('change')) {
        entriesByCategory.transformation.push(entry.notes)
      }
      if (note.includes('decision') || note.includes('choose') || note.includes('commit') || note.includes('certainty')) {
        entriesByCategory.decisionMaking.push(entry.notes)
      }
      if (note.includes('pattern') || note.includes('tends to') || note.includes('usually') || note.includes('often')) {
        entriesByCategory.patterns.push(entry.notes)
      }
      if (note.includes('growth') || note.includes('strength') || note.includes('excel') || note.includes('good at')) {
        entriesByCategory.growth.push(entry.notes)
      }
      if (note.includes('resist') || note.includes('avoid') || note.includes('stuck') || note.includes('block')) {
        entriesByCategory.resistance.push(entry.notes)
      }
      if (note.includes('value') || note.includes('believe') || note.includes('important') || note.includes('matter')) {
        entriesByCategory.values.push(entry.notes)
      }
    })

    const synthesisPrompt = `You are creating an "Essence Profile" - a compact, deeply perceptive summary that makes Sol impossibly good at understanding this person.

USER: ${userProfile['User ID']}
CURRENT VISION: ${userProfile['Current Vision'] || 'Not yet defined'}
CURRENT STATE: ${userProfile['Current State'] || 'Not yet defined'}

PERSONALGORITHMâ„¢ DATA (${personalgorithmEntries.length} observations):

COMMUNICATION PATTERNS (${entriesByCategory.communication.length} observations):
${entriesByCategory.communication.slice(0, 5).join('\n') || 'None yet'}

EMOTIONAL PROCESSING (${entriesByCategory.emotional.length} observations):
${entriesByCategory.emotional.slice(0, 5).join('\n') || 'None yet'}

TRANSFORMATION TRIGGERS (${entriesByCategory.transformation.length} observations):
${entriesByCategory.transformation.slice(0, 5).join('\n') || 'None yet'}

DECISION-MAKING STYLE (${entriesByCategory.decisionMaking.length} observations):
${entriesByCategory.decisionMaking.slice(0, 5).join('\n') || 'None yet'}

BEHAVIORAL PATTERNS (${entriesByCategory.patterns.length} observations):
${entriesByCategory.patterns.slice(0, 5).join('\n') || 'None yet'}

GROWTH EDGES (${entriesByCategory.growth.length} observations):
${entriesByCategory.growth.slice(0, 5).join('\n') || 'None yet'}

RESISTANCE PATTERNS (${entriesByCategory.resistance.length} observations):
${entriesByCategory.resistance.slice(0, 5).join('\n') || 'None yet'}

CORE VALUES & BELIEFS (${entriesByCategory.values.length} observations):
${entriesByCategory.values.slice(0, 5).join('\n') || 'None yet'}

Create a comprehensive "Essence Profile" (max 1000 words) that synthesizes ALL of this into a deeply perceptive guide for Sol. Structure it like this:

=== COMMUNICATION SIGNATURE ===
How they express themselves uniquely. Their punctuation patterns, word choices, emphasis techniques, thinking structure. What makes their voice THEIRS.

=== EMOTIONAL INTELLIGENCE MAP ===
How they process feelings. What emotions trigger action vs paralysis. Their relationship with uncertainty, excitement, fear, joy. How they make meaning from emotions.

=== TRANSFORMATION ARCHITECTURE ===
What creates breakthroughs for them specifically. What approaches land vs fall flat. What they need to hear/experience to shift. Their unique path to growth.

=== DECISION-MAKING DNA ===
How they evaluate options. What certainty they need. Whether they seek permission, validation, or just inform. How quickly they commit. What makes them say "yes."

=== BEHAVIORAL PATTERNS & RHYTHMS ===
Recurring behaviors, thought loops, response patterns. What they do when stuck. What they do when aligned. Micro-patterns that reveal macro-truths.

=== GROWTH TRAJECTORY ===
Their strengths, gifts, natural abilities. Where they're evolving. What's becoming easier. Where they're building confidence. What's emerging.

=== RESISTANCE & SHADOWS ===
What holds them back. Limiting beliefs. Fear patterns. What they avoid. What they need to release. Gaps between who they are and who they're becoming.

=== RESONANCE MAP ===
Language that lands with them. Metaphors that work. Coaching approaches that create shifts. What to reference. What to avoid. How to make them feel impossibly SEEN.

Be SPECIFIC. Use exact details from their patterns. Make connections across categories. This should feel like "How does Sol know me so well?!" 

Write as a synthesis, not a list. Connect the dots. Show the deeper patterns.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        max_tokens: 2000,
        temperature: 0.4,
        messages: [{ role: 'user', content: synthesisPrompt }]
      })
    })

    if (!response.ok) {
      throw new Error(`Essence synthesis failed: ${response.status}`)
    }

    const result = await response.json()
    const essenceProfile = result.choices[0].message.content.trim()
    
    console.log('âœ… Essence profile generated:', essenceProfile.length, 'characters')
    return essenceProfile

  } catch (error) {
    console.error('Error generating essence profile:', error)
    throw error
  }
}

// ==================== HELPER FUNCTIONS ====================

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
    console.error('Error fetching user profile:', error)
    return null
  }
}

async function fetchAllPersonalgorithm(email) {
  try {
    const encodedEmail = encodeURIComponent(email)
    
    // URL-encode the table name (it has a ™ symbol)
    const tableName = 'Personalgorithm™'
    const encodedTableName = encodeURIComponent(tableName)
    
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${encodedTableName}?filterByFormula={User ID}="${encodedEmail}"&sort[0][field]=Date created&sort[0][direction]=desc&maxRecords=100`
    
    console.log('Fetching all Personalgorithm™ entries for:', email)
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Failed to fetch Personalgorithm™ entries (${response.status}):`, errorText)
      return []
    }
    
    const data = await response.json()
    console.log(`✅ Fetched ${data.records.length} Personalgorithm™ entries`)
    
    return data.records.map(record => ({
      notes: record.fields['Personalgorithm™ Notes'],
      dateCreated: record.fields['Date created'],
      tags: record.fields['Tags'] || ''
    })).filter(item => item.notes)
  } catch (error) {
    console.error('Error fetching Personalgorithm:', error)
    return []
  }
}


async function getPersonalgorithmCount(email) {
  try {
    const data = await fetchAllPersonalgorithm(email)
    return data.length
  } catch (error) {
    return 0
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