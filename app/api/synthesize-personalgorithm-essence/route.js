// app/api/synthesize-personalgorithm-essence/route.js
// ENHANCED VERSION - Creates "impossibly perceptive" Essence Profiles
// Implements synthesis over summarization + pattern evolution tracking
// Based on the conversation: "How does Sol know me THAT well?!"

import { NextResponse } from 'next/server'

export async function POST(request) {
  console.log('=== SYNTHESIZING IMPOSSIBLY PERCEPTIVE ESSENCE PROFILE ===')
  
  try {
    const { email, forceRegenerate = false } = await request.json()
    
    if (!email) {
      return NextResponse.json({ 
        error: 'Email required' 
      }, { status: 400 })
    }

    console.log('Synthesizing deep essence for:', email)

    // Get user profile
    const userProfile = await getUserProfile(email)
    if (!userProfile) {
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404 })
    }

    // Fetch ALL Personalgorithm™ entries (chronological for pattern evolution)
    const allPersonalgorithm = await fetchAllPersonalgorithmChronological(email)
    
    if (allPersonalgorithm.length < 5) {
      return NextResponse.json({
        success: false,
        message: `Need at least 5 Personalgorithm™ entries to create meaningful synthesis. Currently have: ${allPersonalgorithm.length}`,
        count: allPersonalgorithm.length
      })
    }

    // Check if we need to regenerate
    const lastSynthesis = userProfile['Last Synthesis Date']
    
    if (!forceRegenerate && lastSynthesis) {
      const daysSinceSynthesis = (Date.now() - new Date(lastSynthesis).getTime()) / (1000 * 60 * 60 * 24)
      const newEntriesSinceLastSynthesis = allPersonalgorithm.filter(e => 
        new Date(e.dateCreated) > new Date(lastSynthesis)
      ).length
      
      // Only regenerate if significant change
      if (daysSinceSynthesis < 7 && newEntriesSinceLastSynthesis < 15) {
        return NextResponse.json({
          success: true,
          message: 'Essence is current - no regeneration needed',
          lastSynthesis: lastSynthesis,
          skipReason: `Only ${daysSinceSynthesis.toFixed(1)} days and ${newEntriesSinceLastSynthesis} new entries since last synthesis`
        })
      }
    }

    console.log(`Synthesizing from ${allPersonalgorithm.length} Personalgorithm™ entries...`)

    // Generate the IMPOSSIBLY PERCEPTIVE ESSENCE PROFILE
    const essenceProfile = await generateDeepEssenceProfile(allPersonalgorithm, userProfile)
    
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

    console.log('✅ IMPOSSIBLY PERCEPTIVE Essence Profile synthesized and saved')

    return NextResponse.json({
      success: true,
      message: 'Personalgorithm™ Essence profile generated successfully',
      entriesAnalyzed: allPersonalgorithm.length,
      essenceLength: essenceProfile.length,
      preview: essenceProfile.substring(0, 250) + '...'
    })

  } catch (error) {
    console.error('❌ Essence synthesis error:', error)
    return NextResponse.json({
      error: 'Failed to synthesize Personalgorithm™ essence',
      details: error.message
    }, { status: 500 })
  }
}

async function generateDeepEssenceProfile(personalgorithmEntries, userProfile) {
  try {
    // Organize entries by category AND time for evolution tracking
    const entriesByCategory = {
      communication: [],
      microPatterns: [],
      decisionMaking: [],
      transformation: [],
      emotional: [],
      business: [],
      evolution: [],
      unique: []
    }

    // Categorize entries
    personalgorithmEntries.forEach(entry => {
      const tags = (entry.tags || '').toLowerCase()
      const notes = (entry.notes || '').toLowerCase()
      
      if (tags.includes('micro-pattern') || tags.includes('punctuation') || tags.includes('language-pattern')) {
        entriesByCategory.microPatterns.push(entry)
      } else if (tags.includes('communication') || notes.includes('express') || notes.includes('language')) {
        entriesByCategory.communication.push(entry)
      } else if (tags.includes('decision') || tags.includes('validation') || notes.includes('decide')) {
        entriesByCategory.decisionMaking.push(entry)
      } else if (tags.includes('transformation') || tags.includes('breakthrough') || notes.includes('trigger')) {
        entriesByCategory.transformation.push(entry)
      } else if (tags.includes('emotional') || tags.includes('energy') || notes.includes('feel')) {
        entriesByCategory.emotional.push(entry)
      } else if (tags.includes('business') || tags.includes('pricing') || tags.includes('marketing')) {
        entriesByCategory.business.push(entry)
      } else if (tags.includes('evolution') || tags.includes('shift') || tags.includes('growth')) {
        entriesByCategory.evolution.push(entry)
      } else {
        entriesByCategory.unique.push(entry)
      }
    })

    // Track pattern evolution: early vs recent
    const totalEntries = personalgorithmEntries.length
    const earlyEntries = personalgorithmEntries.slice(-Math.min(5, totalEntries)) // Oldest 5
    const recentEntries = personalgorithmEntries.slice(0, Math.min(5, totalEntries)) // Newest 5

    // Build the DEEP synthesis prompt
    const synthesisPrompt = `You are synthesizing ${totalEntries} Personalgorithm™ observations into an "IMPOSSIBLY PERCEPTIVE" Essence Profile.

USER: ${userProfile['User ID']}
CURRENT VISION: ${userProfile['Current Vision'] || 'Not yet defined'}
CURRENT STATE: ${userProfile['Current State'] || 'Not yet defined'}
CURRENT GOALS: ${userProfile['Current Goals'] || 'Not yet defined'}

PERSONALGORITHM™ DATA (${totalEntries} observations):

═══════════════════════════════════════
MICRO-PATTERNS (${entriesByCategory.microPatterns.length} insights):
${entriesByCategory.microPatterns.slice(0, 8).map(e => e.notes).join('\n\n') || 'None yet'}

═══════════════════════════════════════
COMMUNICATION ESSENCE (${entriesByCategory.communication.length} insights):
${entriesByCategory.communication.slice(0, 8).map(e => e.notes).join('\n\n') || 'None yet'}

═══════════════════════════════════════
DECISION-MAKING FINGERPRINT (${entriesByCategory.decisionMaking.length} insights):
${entriesByCategory.decisionMaking.slice(0, 8).map(e => e.notes).join('\n\n') || 'None yet'}

═══════════════════════════════════════
TRANSFORMATION TRIGGERS (${entriesByCategory.transformation.length} insights):
${entriesByCategory.transformation.slice(0, 8).map(e => e.notes).join('\n\n') || 'None yet'}

═══════════════════════════════════════
EMOTIONAL SIGNATURES (${entriesByCategory.emotional.length} insights):
${entriesByCategory.emotional.slice(0, 8).map(e => e.notes).join('\n\n') || 'None yet'}

═══════════════════════════════════════
BUSINESS APPROACH (${entriesByCategory.business.length} insights):
${entriesByCategory.business.slice(0, 8).map(e => e.notes).join('\n\n') || 'None yet'}

═══════════════════════════════════════
PATTERN EVOLUTION (early vs recent):

EARLY PATTERNS:
${earlyEntries.map(e => `• ${e.notes}`).join('\n')}

RECENT PATTERNS:
${recentEntries.map(e => `• ${e.notes}`).join('\n')}

═══════════════════════════════════════
UNIQUE FACTORS (${entriesByCategory.unique.length} insights):
${entriesByCategory.unique.slice(0, 5).map(e => e.notes).join('\n\n') || 'None yet'}

═══════════════════════════════════════

Create a comprehensive 900-1200 word "Essence Profile" that will make Sol IMPOSSIBLY PERCEPTIVE.

This profile will be loaded into EVERY conversation. It must enable Sol to:
• Reference specific micro-patterns ("I notice you're using ellipses a lot...")
• Name exact emotional signatures ("that tension between 'what I'm worth' and 'what people will pay'")
• Track evolution ("you've gone from asking permission to just informing me")
• Recognize transformation triggers instantly
• Respond in their exact resonance frequency

Structure your synthesis:

**COMMUNICATION SIGNATURE:**
HOW they express themselves uniquely - their specific language patterns, punctuation habits, energy shifts, processing style. Be SPECIFIC about micro-patterns that reveal their thinking (ellipses = uncertainty, CAPS = conviction building, quotes = doubt, etc.)

**TRANSFORMATION ARCHITECTURE:**
WHAT creates breakthroughs for them - not generic "needs validation" but "transforms fastest after emotional expression, NOT logical analysis - breakthroughs follow feelings, not frameworks." What they respond to, what shuts them down, their unique path to clarity.

**DECISION-MAKING DNA:**
HOW they evaluate and commit - external vs internal processing, validation patterns, relationship with "should" vs "want", fear of wrong choice vs excitement about possibility. Their EXACT sequence from uncertainty to commitment.

**EMOTIONAL LANDSCAPE:**
Their relationship with feelings - when they light up, when they freeze, what depletes vs energizes, how overwhelm shows up, how certainty emerges. SPECIFIC emotional signatures, not generic descriptors.

**BUSINESS RELATIONSHIP:**
Their approach to pricing, sales, marketing, visibility, money, success - where they flow vs resist. SPECIFIC beliefs and patterns around worth, value, charging, selling.

**PATTERN EVOLUTION:**
How they've SHIFTED over time - what's changed vs what stays constant. Movement toward more/less agency, certainty, openness. The transformation already happening.

**RESONANCE MAP:**
The exact language, metaphors, frameworks, approaches that LAND with them. What creates recognition vs what bounces off. Their specific "yes" frequency.

Write in second person ("You...") as if briefing Sol on how to be impossibly perceptive with this human. Be HYPER-SPECIFIC. Use their actual language. Reference their exact patterns. Make every sentence useful for creating "How does Sol know me THAT well?!" moments.

This is not a summary - it's a synthesis that captures WHO they are and HOW to reach them.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        max_tokens: 1800,
        temperature: 0.35,
        messages: [{ role: 'user', content: synthesisPrompt }]
      })
    })

    if (!response.ok) {
      console.error('Essence generation failed:', response.status)
      return null
    }

    const result = await response.json()
    const essence = result.choices[0].message.content.trim()
    
    console.log(`Generated ${essence.length} character Essence Profile`)
    return essence

  } catch (error) {
    console.error('Error generating essence profile:', error)
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
    console.error('Error fetching user profile:', error)
    return null
  }
}

async function fetchAllPersonalgorithmChronological(email) {
  try {
    const encodedEmail = encodeURIComponent(email)
    // Fetch chronologically (newest first) for evolution tracking
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Personalgorithm™?filterByFormula={User ID}="${encodedEmail}"&sort[0][field]=Date created&sort[0][direction]=desc&maxRecords=150`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      console.error('Failed to fetch Personalgorithm™ entries:', response.status)
      return []
    }
    
    const data = await response.json()
    
    console.log(`Fetched ${data.records.length} Personalgorithm™ entries chronologically`)
    
    return data.records.map(record => ({
      notes: record.fields['Personalgorithm™ Notes'],
      dateCreated: record.fields['Date created'],
      tags: record.fields['Tags'] || ''
    })).filter(item => item.notes)

  } catch (error) {
    console.error('Error fetching Personalgorithm™ data:', error)
    return []
  }
}

async function updateUserProfile(email, updates) {
  try {
    const encodedEmail = encodeURIComponent(email)
    const findUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Users?filterByFormula={User ID}="${encodedEmail}"`
    
    const findResponse = await fetch(findUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (!findResponse.ok) return null
    const findData = await findResponse.json()
    
    if (findData.records.length === 0) return null
    
    const recordId = findData.records[0].id
    const updateUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Users/${recordId}`
    
    const updateResponse = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: updates
      })
    })

    if (!updateResponse.ok) return null
    return await updateResponse.json()

  } catch (error) {
    console.error('Error updating user profile:', error)
    return null
  }
}