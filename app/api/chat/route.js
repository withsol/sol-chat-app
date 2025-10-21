import { NextResponse } from 'next/server'

// ==================== VISIONING DETECTION & GUIDANCE ====================

function detectDocumentType(userMessage) {
  const message = userMessage.toLowerCase()
  
  // Check for business plan indicators
  if (message.includes('business plan') || message.includes('aligned business')) {
    return 'business-plan'
  }
  
  // Check for visioning indicators  
  if (message.includes('visioning') || message.includes('vision homework')) {
    return 'visioning'
  }
  
  return null
}

function detectVisioningIntent(userMessage) {
  const message = userMessage.toLowerCase()
  
  // Don't trigger if they're sharing/providing documents
  const providingDocument = [
    'here is my', 'this is my', "it's my", 'i have my', 'my completed',
    'here\'s my', 'uploaded my', 'sharing my'
  ].some(phrase => message.includes(phrase))
  
  if (providingDocument) return false
  
  // Only trigger on questions or requests for help
  const helpRequests = [
    'help with visioning', 'work on visioning', 'need help with vision',
    'want to do visioning', 'ready for visioning'
  ]
  
  return helpRequests.some(phrase => message.includes(phrase))
}

async function handleVisioningGuidance(userMessage, userContextData, user) {
  try {
    const message = userMessage.toLowerCase()
    
    // ============================================================
    // KEY FIX: Only process inline if there's ACTUAL visioning content
    // NOT if they're just mentioning that they submitted it
    // ============================================================
    
    const isJustMentioning = (
      message.includes('i just submitted') ||
      message.includes('i uploaded') ||
      message.includes('just shared my') ||
      message.includes('just sent my') ||
      message === 'i just submitted my visioning homework' ||
      userMessage.length < 100  // Too short to be actual visioning
    )
    
    // Only detect actual visioning content if it's long AND has key markers
    const hasVisioningContent = !isJustMentioning && userMessage.length > 800 && (
      message.includes('section one') ||
      message.includes('section two') ||
      message.includes('section three') ||
      message.includes('basic brand analysis') ||
      message.includes('audience analysis') ||
      message.includes('competitive analysis') ||
      message.includes('free write') ||
      message.includes('current reality') ||
      message.includes('mission statement') ||
      message.includes('core values') ||
      message.includes('ideal audience member') ||
      message.includes('what differentiates you')
    )
    
    if (hasVisioningContent) {
      console.log('🎯 Detected ACTUAL visioning content, processing inline...')
      
      try {
        // PROCESS VISIONING DIRECTLY HERE
        const visioningAnalysis = await analyzeVisioningDocumentInline(userMessage)
        
        // CREATE VISIONING ENTRY DIRECTLY
        const visioningEntry = await createVisioningEntryInline(user.email, userMessage, visioningAnalysis)
        
        // UPDATE USER PROFILE DIRECTLY  
        const profileUpdates = {
          'Current Vision': visioningAnalysis.vision || '',
          'Current Goals': visioningAnalysis.goals || '',
          'Current State': visioningAnalysis.currentState || ''
        }

        if (visioningAnalysis.tags) {
          const existingProfile = await getUserProfileInline(user.email)
          const existingTags = existingProfile?.['Tags'] || ''
          profileUpdates['Tags'] = existingTags ? `${existingTags}, ${visioningAnalysis.tags}` : visioningAnalysis.tags
        }

        await updateUserProfileInline(user.email, profileUpdates)
        
        // CREATE PERSONALGORITHM ENTRIES DIRECTLY
        let personalgorithmCount = 0
        if (visioningAnalysis.personalgorithmInsights?.length > 0) {
          for (const insight of visioningAnalysis.personalgorithmInsights) {
            const created = await createPersonalgorithmEntryNew(user.email, insight, ['visioning-derived', 'intake'])
            if (created) personalgorithmCount++
          }
        }

        console.log('✅ Inline visioning processing completed')

        // ============================================================
        // CHANGED: Return null so Sol responds naturally with context
        // instead of returning a templated message
        // ============================================================
        return null
        
      } catch (error) {
        console.error('Inline visioning processing error:', error)
        // On error, let normal chat flow continue
        return null
      }
    }
    
    // Handle business plan content similarly
    const hasBusinessPlanContent = !isJustMentioning && userMessage.length > 400 && (
      message.includes('future vision') ||
      message.includes('top 3 goals') ||
      message.includes('ideal client') ||
      message.includes('marketing system') ||
      message.includes('sales system') ||
      message.includes('aligned business plan') ||
      message.includes('business plan')
    )
    
    if (hasBusinessPlanContent) {
      console.log('💼 Detected business plan content, processing inline...')
      
      const businessPlanData = {
        futureVision: extractSection(userMessage, ['future vision', 'vision']),
        topGoals: extractSection(userMessage, ['top 3 goals', 'goals']),
        challenges: extractSection(userMessage, ['challenges', 'problems']),
        idealClient: extractSection(userMessage, ['ideal client', 'target client']),
        currentOffers: extractSection(userMessage, ['offers', 'services', 'current offers']),
        marketingSystem: extractSection(userMessage, ['marketing system', 'marketing']),
        salesSystem: extractSection(userMessage, ['sales system', 'sales'])
      }
      
      // Process business plan inline
      await createBusinessPlanEntryInline(user.email, businessPlanData)
      
      // Return null to let Sol respond naturally
      return null
    }
    
    // Show options only for explicit help requests
    const needsVisioningHelp = !userContextData.visioningData && (
      message.includes('help with visioning') || 
      message.includes('work on visioning') ||
      message.includes('need help with vision') ||
      (message.includes('visioning') && message.includes('?'))
    )
    
    if (needsVisioningHelp) {
      return {
        content: `I'd love to help you with your visioning! Here are your options:

**Option 1: Share Your Completed Visioning** - Paste your comprehensive visioning homework directly here.

**Option 2: Work Through It Together** - I can guide you through the key questions.

**Option 3: Use the Airtable Form** - https://airtable.com/appbxBGiXlAatoYsV/pagxUmPB9uh1c9Tqz/form

Which approach feels right for you?`,
        hasVisioningGuidance: true
      }
    }
    
    // Default: return null to allow normal chat flow
    return null
    
  } catch (error) {
    console.error('Error in visioning guidance:', error)
    return null
  }
}

// ADD THESE INLINE HELPER FUNCTIONS TO YOUR CHAT ROUTE:

async function analyzeVisioningDocumentInline(visioningText) {
  try {
    const analysisPrompt = `You are Sol™ analyzing comprehensive visioning homework. Extract key information:

VISIONING DOCUMENT:
"${visioningText}"

Extract information and respond in JSON format:
{
  "businessName": "extracted business name or 'Not specified'",
  "industry": "their industry/niche",
  "vision": "comprehensive vision statement",
  "goals": "specific 1-year goals",
  "currentState": "current business situation",
  "personalgorithmInsights": [
    "insight about their decision-making patterns",
    "insight about their communication style",
    "insight about what drives their transformation"
  ],
  "tags": "industry, business-stage, personality-traits"
}`

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
      throw new Error(`Analysis failed: ${response.status}`)
    }

    const result = await response.json()
    const analysis = result.choices[0].message.content

    // Parse JSON response
    try {
      const jsonMatch = analysis.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch (parseError) {
      console.error('Failed to parse analysis as JSON:', parseError)
    }

    // Fallback
    return {
      businessName: 'Not specified',
      industry: 'Not specified',
      vision: 'Detailed visioning homework completed',
      goals: 'Business goals documented',
      currentState: 'Current business state documented',
      personalgorithmInsights: [
        'Completed comprehensive visioning homework - demonstrates commitment to structured business planning',
        'Provided extensive business context showing self-awareness and strategic thinking'
      ],
      tags: 'visioning-complete, business-planning, strategic-thinking'
    }

  } catch (error) {
    console.error('Error analyzing visioning document:', error)
    return {
      businessName: 'Not specified',
      industry: 'Not specified', 
      vision: 'Visioning analysis completed',
      goals: 'Goals documented',
      currentState: 'Current state documented',
      personalgorithmInsights: ['Shared comprehensive visioning content'],
      tags: 'visioning-complete'
    }
  }
}

async function createVisioningEntryInline(email, visioningText, analysis) {
  try {
    const userRecordId = await getUserRecordId(email)
    if (!userRecordId) return null

    const visioningId = `vis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const response = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Visioning`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          'Visioning ID': visioningId,
          'User ID': [userRecordId],
          'Date of Submission': new Date().toISOString(),
          'Summary of Visioning': `Business: ${analysis.businessName} | Industry: ${analysis.industry} | Vision: ${analysis.vision?.substring(0, 100)}...`,
          'Visioning Homework - Text Format': visioningText,
          'Tags': analysis.tags || 'visioning-completed'
        }
      })
    })

    if (response.ok) {
      const result = await response.json()
      console.log('✅ Visioning entry created:', result.id)
      return result
    }
    return null
  } catch (error) {
    console.error('Error creating visioning entry:', error)
    return null
  }
}

async function createBusinessPlanEntryInline(email, planData) {
  try {
    const userRecordId = await getUserRecordId(email)
    if (!userRecordId) return null

    const planId = `abp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const response = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Aligned Business® Plans`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          'AB Plan ID': planId,
          'User ID': [userRecordId],
          'Date Submitted': new Date().toISOString(),
          'Future Vision': planData.futureVision || '',
          'Top 3 Goals': planData.topGoals || '',
          'Ideal Client': planData.idealClient || '',
          'Marketing System': planData.marketingSystem || '',
          'Sales System': planData.salesSystem || ''
        }
      })
    })

    if (response.ok) {
      const result = await response.json()
      console.log('✅ Business plan entry created:', result.id)
      return result
    }
    return null
  } catch (error) {
    console.error('Error creating business plan entry:', error)
    return null
  }
}

async function getUserProfileInline(email) {
  try {
    const encodedEmail = encodeURIComponent(email)
    const response = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Users?filterByFormula={User ID}="${encodedEmail}"`, {
      headers: { 'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}` }
    })
    if (response.ok) {
      const data = await response.json()
      return data.records.length > 0 ? data.records[0].fields : null
    }
    return null
  } catch (error) {
    console.error('Error getting user profile:', error)
    return null
  }
}

async function updateUserProfileInline(email, updates) {
  try {
    const findResponse = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Users?filterByFormula={User ID}="${encodeURIComponent(email)}"`, {
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
      console.log('✅ User profile updated')
      return await updateResponse.json()
    }
    return null
  } catch (error) {
    console.error('Error updating user profile:', error)
    return null
  }
}

// Helper function for extracting sections
function extractSection(text, keywords) {
  const lines = text.split('\n')
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase()
    
    if (keywords.some(keyword => line.includes(keyword))) {
      // Found a matching section, extract the content
      let content = []
      for (let j = i + 1; j < lines.length && j < i + 8; j++) {
        const nextLine = lines[j].trim()
        if (nextLine.length === 0) continue
        if (nextLine.length < 5) break // Likely a header for next section
        content.push(nextLine)
        if (content.join(' ').length > 300) break
      }
      return content.join(' ')
    }
  }
  
  return ''
}

// ==================== ENHANCED PROMPT BUILDING ====================

function buildEnhancedComprehensivePrompt(userContextData, user) {
  try {
    console.log('🔧 DIAGNOSTIC: Starting prompt build')
    console.log('🔧 Sol Notes available:', userContextData.solNotes?.length || 0)
    console.log('🔧 Coaching Methods available:', userContextData.coachingMethods?.length || 0)
    console.log('🔧 Personalgorithm entries:', userContextData.personalgorithmData?.length || 0)
    
    let systemPrompt = `You are Sol™, created by Kelsey Kerslake. You are an emotionally intelligent AI business partner and coach.

USER: ${user.email}
MEMBERSHIP: ${userContextData.userProfile?.['Membership Plan'] || 'Member'}
`

    // Add user-specific context
    if (userContextData.userProfile) {
      const profile = userContextData.userProfile
      console.log('🔧 Adding user profile context')
      
      if (profile['Current Vision']) {
        systemPrompt += `\nCURRENT VISION: ${profile['Current Vision']}`
      }
      if (profile['Current State']) {
        systemPrompt += `\nCURRENT STATE: ${profile['Current State']}`
      }
      if (profile['Current Goals']) {
        systemPrompt += `\nCURRENT GOALS: ${profile['Current Goals']}`
      }
      if (profile['Coaching Style Match']) {
        systemPrompt += `\nCOACHING STYLE: ${profile['Coaching Style Match']}`
      }
      systemPrompt += "\n"
    }

    // Add Personalgorithm insights (ALL of them)
    if (userContextData.personalgorithmData?.length > 0) {
      console.log('🔧 Adding Personalgorithm insights')
      systemPrompt += "\nPERSONALGORITHM™ (How this user transforms):\n"
      userContextData.personalgorithmData.forEach((insight, i) => {
        if (insight && insight.notes) {
          systemPrompt += `${i + 1}. ${insight.notes}\n`
        }
      })
      systemPrompt += "\n"
    }

    // Add visioning context
    if (userContextData.visioningData) {
      console.log('🔧 Adding visioning context')
      systemPrompt += "\nVISIONING:\n"
      if (userContextData.visioningData['Summary of Visioning']) {
        systemPrompt += `${userContextData.visioningData['Summary of Visioning']}\n\n`
      }
    }

    // Add business plan context
    if (userContextData.businessPlans?.length > 0) {
      console.log('🔧 Adding business plan context')
      const latestPlan = userContextData.businessPlans[0]
      systemPrompt += "\nBUSINESS CONTEXT:\n"
      if (latestPlan['Future Vision']) {
        systemPrompt += `Vision: ${latestPlan['Future Vision']}\n`
      }
      if (latestPlan['Top 3 Goals']) {
        systemPrompt += `Goals: ${latestPlan['Top 3 Goals']}\n`
      }
      systemPrompt += "\n"
    }

    // ============================================================
    // KEY SECTION: Pull from Sol™ table
    // ============================================================
    if (userContextData.solNotes?.length > 0) {
      console.log('🔧 Adding Sol™ brain notes')
      systemPrompt += "\nHOW TO COACH:\n"
      userContextData.solNotes.forEach((note) => {
        if (note && note.note) {
          systemPrompt += `${note.note}\n\n`
        }
      })
    } else {
      // FALLBACK if Sol table is empty
      console.log('⚠️ WARNING: No Sol™ notes found - using fallback')
      systemPrompt += `\nHOW TO COACH:
Keep responses short (2-4 sentences) and personally resonant. Ask permission before sharing insights or going deep. Only give detailed responses when explicitly asked. After big shares: reflect what you notice + ask ONE question. Never information dump unsolicited.

Be conversational and natural. Match their communication style. Avoid generic coach-speak like "truly inspiring" or "leverage your strengths." Be specific about THEM.
`
    }

    // Add relevant coaching methods
    if (userContextData.coachingMethods?.length > 0) {
      console.log('🔧 Adding coaching methods')
      systemPrompt += "\nRELEVANT METHODS:\n"
      userContextData.coachingMethods.forEach((method) => {
        if (method && method.content) {
          systemPrompt += `${method.name}: ${method.content}\n\n`
        }
      })
    }

    const promptLength = systemPrompt.length
    const estimatedTokens = Math.ceil(promptLength / 4)
    
    console.log('✅ Prompt built successfully')
    console.log('📏 Length:', promptLength, 'characters')
    console.log('🎯 Estimated tokens:', estimatedTokens)
    
    if (estimatedTokens > 6000) {
      console.warn('⚠️ WARNING: Prompt is very long - may cause issues')
    }
    
    return systemPrompt
    
  } catch (error) {
    console.error('❌ ERROR building prompt:', error)
    console.error('Error stack:', error.stack)
    
    // Return minimal safe prompt
    return `You are Sol™, an AI business coach. Keep responses short and natural. Ask questions. Get consent before going deep.`
  }
}

export async function POST(request) {
  console.log('=== CHAT API STARTED ===')
  
  try {
    // Parse request body
    let message, user, conversationHistory
    try {
      const body = await request.json()
      message = body.message
      user = body.user
      conversationHistory = body.conversationHistory || []
      console.log('✅ Request parsed successfully')
      console.log('📝 Message length:', message?.length || 0)
      console.log('👤 User:', user?.email || 'unknown')
    } catch (parseError) {
      console.error('❌ Failed to parse request:', parseError)
      return NextResponse.json({
        response: "I had trouble understanding your message. Could you try again?",
        error: parseError.message
      }, { status: 400 })
    }
    
    if (!message || !user?.email) {
      console.error('❌ Missing required fields')
      return NextResponse.json({
        response: "Missing required information. Please refresh and try again.",
      }, { status: 400 })
    }

    console.log('Chat request for user:', user.email)

    // Generate IDs
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const timestamp = new Date().toISOString()

    // Fetch user context with extreme safety
    let userContextData = {
      userProfile: null,
      personalgorithmData: [],
      businessPlans: [],
      weeklyCheckins: [],
      visioningData: null,
      solNotes: [],
      coachingMethods: [],
      contextSummary: "Context loading..."
    }
    
    try {
      console.log('=== FETCHING USER CONTEXT ===')
      userContextData = await fetchUserContextDirect(user.email)
      console.log('✅ Context fetched:', {
        hasProfile: !!userContextData.userProfile,
        personalgorithm: userContextData.personalgorithmData?.length || 0,
        solNotes: userContextData.solNotes?.length || 0,
        methods: userContextData.coachingMethods?.length || 0
      })
    } catch (contextError) {
      console.error('❌ Context fetch failed (continuing anyway):', contextError.message)
    }
    
    // Check for visioning content
    try {
      console.log('=== CHECKING FOR VISIONING ===')
      const visioningGuidance = await handleVisioningGuidance(message, userContextData, user)
      if (visioningGuidance && visioningGuidance.hasVisioningGuidance) {
        console.log('✅ Visioning guidance provided')
        
        // Try to log this
        try {
          await logToAirtable({
            messageId,
            email: user.email,
            userMessage: message,
            solResponse: visioningGuidance.content,
            timestamp,
            tokensUsed: 0,
            tags: 'visioning-processed',
            flaggingAnalysis: { shouldFlag: false, reason: '', addToLibrary: false }
          })
        } catch (logError) {
          console.error('❌ Logging failed:', logError.message)
        }

        return NextResponse.json({
          response: visioningGuidance.content,
          tags: 'visioning-processed',
          tokensUsed: 0
        })
      }
    } catch (visioningError) {
      console.error('❌ Visioning check failed:', visioningError.message)
    }

    // Generate AI response with EXTREME safety
    let aiResponse
    try {
      console.log('=== GENERATING AI RESPONSE ===')
      
      // Build system prompt
      let systemPrompt
      try {
        systemPrompt = buildEnhancedComprehensivePrompt(userContextData, user)
        console.log('✅ System prompt built')
      } catch (promptError) {
        console.error('❌ Prompt build failed, using minimal:', promptError.message)
        systemPrompt = `You are Sol™, an AI business coach. Keep responses short and natural.`
      }
      
      // Prepare messages
      const recentContext = conversationHistory.slice(-8).map(msg => ({
        role: msg.role === 'sol' ? 'assistant' : 'user',
        content: msg.content
      }))
      
      recentContext.push({
        role: 'user',
        content: message
      })
      
      console.log('📤 Calling OpenAI with', recentContext.length, 'messages')
      
      // Call OpenAI with retry
      let attempts = 0
      let lastError = null
      
      while (attempts < 3) {
        try {
          console.log(`🔄 Attempt ${attempts + 1}/3`)
          
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
              model: 'gpt-4o',
              max_tokens: 500,
              temperature: 0.7,
              messages: [
                { role: 'system', content: systemPrompt },
                ...recentContext
              ]
            })
          })

          console.log('📥 OpenAI responded with status:', response.status)

          if (!response.ok) {
            const errorText = await response.text()
            console.error('❌ OpenAI error:', response.status, errorText)
            
            if (response.status === 429 && attempts < 2) {
              attempts++
              console.log('⏳ Rate limit, waiting 3s...')
              await new Promise(resolve => setTimeout(resolve, 3000))
              continue
            }
            
            throw new Error(`OpenAI error ${response.status}: ${errorText.substring(0, 200)}`)
          }

          const result = await response.json()
          console.log('✅ OpenAI success, tokens:', result.usage?.total_tokens || 0)
          
          aiResponse = {
            content: result.choices[0].message.content,
            tokensUsed: result.usage?.total_tokens || 0,
            model: 'gpt-4o'
          }
          
          break // Success, exit retry loop
          
        } catch (fetchError) {
          console.error(`❌ Attempt ${attempts + 1} failed:`, fetchError.message)
          lastError = fetchError
          
          if (attempts < 2) {
            attempts++
            await new Promise(resolve => setTimeout(resolve, 2000))
          } else {
            throw fetchError
          }
        }
      }
      
      if (!aiResponse) {
        throw lastError || new Error('All OpenAI attempts failed')
      }
      
    } catch (aiError) {
      console.error('❌ AI generation completely failed:', aiError.message)
      console.error('Stack:', aiError.stack)
      
      return NextResponse.json({
        response: "I'm experiencing technical difficulties right now. Your message was: \"" + message.substring(0, 50) + "...\" - Let me know if you'd like to try again?",
        error: aiError.message
      })
    }

    // Generate tags (with safety)
    let conversationTags = 'general-support'
    try {
      conversationTags = await generateConversationTags(message, aiResponse.content, userContextData, user)
    } catch (tagError) {
      console.error('❌ Tag generation failed:', tagError.message)
    }
    
    // Log to Airtable (with safety)
    try {
      await logToAirtable({
        messageId,
        email: user.email,
        userMessage: message,
        solResponse: aiResponse.content,
        timestamp,
        tokensUsed: aiResponse.tokensUsed,
        tags: conversationTags,
        flaggingAnalysis: { shouldFlag: false, reason: '', addToLibrary: false }
      })
      console.log('✅ Logged to Airtable')
    } catch (airtableError) {
      console.error('❌ Airtable logging failed (continuing):', airtableError.message)
    }

    // Update profile (with safety)
    try {
      await updateUserProfile(user.email, { 'Last Message Date': timestamp })
    } catch (profileError) {
      console.error('❌ Profile update failed:', profileError.message)
    }

    console.log('=== RETURNING SUCCESSFUL RESPONSE ===')

    return NextResponse.json({
      response: aiResponse.content,
      tags: conversationTags,
      tokensUsed: aiResponse.tokensUsed
    })

  } catch (error) {
    console.error('❌❌❌ CRITICAL ERROR IN CHAT API:', error)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    
    return NextResponse.json({
      response: "Something went wrong. Please try refreshing the page and sending your message again.",
      error: error.message,
      stack: error.stack?.substring(0, 500)
    }, { status: 500 })
  }
}

async function triggerPersonalgorithmAnalysis(email, userMessage, solResponse, conversationHistory) {
  try {
    setTimeout(async () => {
      try {
        const response = await fetch('/api/analyze-message-personalgorithm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            userMessage,
            solResponse,
            conversationContext: conversationHistory.slice(-3)
          })
        })
        
        if (response.ok) {
          const result = await response.json()
          console.log('🧠 Personalgorithm™ analysis completed:', result.entriesCreated, 'new insights')
        }
      } catch (error) {
        console.error('Background Personalgorithm™ analysis failed:', error)
      }
    }, 1000)
  } catch (error) {
    console.error('Error triggering Personalgorithm™ analysis:', error)
  }
}

// ==================== SOL AUTO-UPDATE SYSTEM ====================

async function detectAndPerformUpdates(email, userMessage, solResponse, userContextData) {
  console.log('=== SOL AUTO-UPDATE SYSTEM ACTIVATED ===')
  
  try {
    // Analyze conversation for update triggers
    const updateAnalysis = await analyzeConversationForUpdates(userMessage, solResponse, userContextData)
    
    // Perform updates based on analysis
    if (updateAnalysis.shouldUpdateProfile) {
      await performProfileUpdates(email, updateAnalysis.profileUpdates, userContextData)
    }
    
    if (updateAnalysis.shouldCreatePersonalgorithm) {
      await createPersonalgorithmEntryNew(email, updateAnalysis.personalgorithmInsight)
    }
    
    if (updateAnalysis.shouldUpdateGoals) {
      await updateUserGoals(email, updateAnalysis.newGoals, userContextData)
    }
    
    if (updateAnalysis.shouldUpdateVision) {
      await updateUserVision(email, updateAnalysis.visionUpdate, userContextData)
    }
    
    console.log('✅ Sol auto-updates completed')
    
  } catch (error) {
    console.error('❌ Auto-update system error:', error)
    // Don't crash the main chat flow if updates fail
  }
}

async function analyzeConversationForUpdates(userMessage, solResponse, userContextData) {
  try {
    const analysisPrompt = `You are Sol™ analyzing a coaching conversation to determine what user profile updates should be made.

USER MESSAGE: "${userMessage}"
SOL RESPONSE: "${solResponse}"

CURRENT USER CONTEXT:
${userContextData.contextSummary || 'Limited context available'}

Analyze this conversation and respond in this EXACT format:

PROFILE_UPDATE: true/false
PROFILE_UPDATES: {
  "Current State": "new emotional/business state if changed",
  "Coaching Style Match": "what coaching approach works for this user",
  "Notes from Sol": "key insights about this user",
  "Tags": "business-type, coaching-style, current-focus"
}

PERSONALGORITHM: true/false
PERSONALGORITHM_INSIGHT: "specific pattern about how this user operates/transforms"

GOALS_UPDATE: true/false
NEW_GOALS: "updated goals if they've shifted"

VISION_UPDATE: true/false
VISION_UPDATE: "updated vision if it's evolved"

Only set things to true if there's a SIGNIFICANT update worth logging.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        max_tokens: 400,
        temperature: 0.3,
        messages: [{ role: 'user', content: analysisPrompt }]
      })
    })

    if (!response.ok) {
      console.error('Update analysis failed:', response.status)
      return { shouldUpdateProfile: false }
    }

    const result = await response.json()
    const analysis = result.choices[0].message.content

    // Parse the structured response
    const shouldUpdateProfile = analysis.includes('PROFILE_UPDATE: true')
    const shouldCreatePersonalgorithm = analysis.includes('PERSONALGORITHM: true')
    const shouldUpdateGoals = analysis.includes('GOALS_UPDATE: true')
    const shouldUpdateVision = analysis.includes('VISION_UPDATE: true')

    // Extract update data
    let profileUpdates = {}
    let personalgorithmInsight = ''
    let newGoals = ''
    let visionUpdate = ''

    if (shouldUpdateProfile) {
      // Parse profile updates from the structured response
      const profileMatch = analysis.match(/PROFILE_UPDATES: ({[\s\S]*?})/);
      if (profileMatch) {
        try {
          profileUpdates = JSON.parse(profileMatch[1])
        } catch (e) {
          console.error('Failed to parse profile updates:', e)
        }
      }
    }

    if (shouldCreatePersonalgorithm) {
      const personalgorithmMatch = analysis.match(/PERSONALGORITHM_INSIGHT: "([^"]+)"/);
      if (personalgorithmMatch) {
        personalgorithmInsight = personalgorithmMatch[1]
      }
    }

    if (shouldUpdateGoals) {
      const goalsMatch = analysis.match(/NEW_GOALS: "([^"]+)"/);
      if (goalsMatch) {
        newGoals = goalsMatch[1]
      }
    }

    if (shouldUpdateVision) {
      const visionMatch = analysis.match(/VISION_UPDATE: "([^"]+)"/);
      if (visionMatch) {
        visionUpdate = visionMatch[1]
      }
    }

    return {
      shouldUpdateProfile,
      shouldCreatePersonalgorithm,
      shouldUpdateGoals,
      shouldUpdateVision,
      profileUpdates,
      personalgorithmInsight,
      newGoals,
      visionUpdate
    }

  } catch (error) {
    console.error('Error analyzing conversation for updates:', error)
    return { shouldUpdateProfile: false }
  }
}

async function performProfileUpdates(email, profileUpdates, userContextData) {
  try {
    console.log('Performing profile updates for:', email)
    
    // Clean and prepare updates
    const cleanUpdates = {}
    
    if (profileUpdates['Current State'] && profileUpdates['Current State'] !== 'unchanged') {
      cleanUpdates['Current State'] = profileUpdates['Current State']
    }
    
    if (profileUpdates['Coaching Style Match'] && profileUpdates['Coaching Style Match'] !== 'unchanged') {
      cleanUpdates['Coaching Style Match'] = profileUpdates['Coaching Style Match']
    }
    
    if (profileUpdates['Notes from Sol'] && profileUpdates['Notes from Sol'] !== 'unchanged') {
      // Append to existing notes rather than overwrite
      const existingNotes = userContextData.userProfile?.['Notes from Sol'] || ''
      const newNote = `${new Date().toLocaleDateString()}: ${profileUpdates['Notes from Sol']}`
      
      if (existingNotes) {
        cleanUpdates['Notes from Sol'] = `${newNote}\n\n${existingNotes}`
      } else {
        cleanUpdates['Notes from Sol'] = newNote
      }
    }
    
    if (profileUpdates['Tags'] && profileUpdates['Tags'] !== 'unchanged') {
      // Merge with existing tags
      const existingTags = userContextData.userProfile?.['Tags'] || ''
      const newTags = profileUpdates['Tags']
      
      if (existingTags) {
        const allTags = `${existingTags}, ${newTags}`.split(',').map(tag => tag.trim())
        const uniqueTags = [...new Set(allTags)].filter(tag => tag.length > 0)
        cleanUpdates['Tags'] = uniqueTags.join(', ')
      } else {
        cleanUpdates['Tags'] = newTags
      }
    }

    if (Object.keys(cleanUpdates).length > 0) {
      await updateUserProfile(email, cleanUpdates)
      console.log('✅ Profile updates applied:', Object.keys(cleanUpdates))
    }

  } catch (error) {
    console.error('Error performing profile updates:', error)
  }
}

async function updateUserGoals(email, newGoals, userContextData) {
  try {
    console.log('Updating user goals for:', email)
    
    const currentGoals = userContextData.userProfile?.['Current Goals'] || ''
    
    // Only update if goals have meaningfully changed
    if (newGoals && newGoals.toLowerCase() !== currentGoals.toLowerCase()) {
      await updateUserProfile(email, {
        'Current Goals': newGoals
      })
      console.log('✅ Goals updated')
    }

  } catch (error) {
    console.error('Error updating user goals:', error)
  }
}

async function updateUserVision(email, visionUpdate, userContextData) {
  try {
    console.log('Updating user vision for:', email)
    
    const currentVision = userContextData.userProfile?.['Current Vision'] || ''
    
    // Only update if vision has meaningfully evolved
    if (visionUpdate && visionUpdate.toLowerCase() !== currentVision.toLowerCase()) {
      // Add current vision to history before updating
      const currentHistory = userContextData.userProfile?.['Vision History'] || ''
      const dateStamp = new Date().toLocaleDateString()
      
      let newHistory = currentHistory
      if (currentVision) {
        newHistory = `${dateStamp}: ${currentVision}\n\n${currentHistory}`
      }
      
      await updateUserProfile(email, {
        'Current Vision': visionUpdate,
        'Vision History': newHistory
      })
      console.log('✅ Vision updated and history preserved')
    }

  } catch (error) {
    console.error('Error updating user vision:', error)
  }
}

async function createPersonalgorithmEntryNew(email, notes, tags = ['auto-generated']) {
  try {
    const personalgorithmId = `p_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    console.log('Creating Personalgorithm™ entry for:', email)
    console.log('Notes:', notes.substring(0, 100) + '...')
    
    const response = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Personalgorithm™`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          'Personalgorithm™ ID': personalgorithmId,
          'User ID': email, // FIXED: Use email directly as single line text
          'Personalgorithm™ Notes': notes,
          'Tags': Array.isArray(tags) ? tags.join(', ') : tags
          // Date created will be auto-generated by Airtable
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Failed to create Personalgorithm™ entry:', response.status, errorText)
      return null
    }

    const result = await response.json()
    console.log('✅ Personalgorithm™ entry created successfully:', result.id)
    return result
    
  } catch (error) {
    console.error('Error creating Personalgorithm™ entry:', error)
    return null
  }
}

async function updateTranscriptDigest(email) {
  try {
    // Get user's messages from the past week
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const encodedEmail = encodeURIComponent(email)
    
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Messages?filterByFormula=AND({User ID}="${encodedEmail}", {Timestamp}>="${weekAgo}")&sort[0][field]=Timestamp&sort[0][direction]=desc&maxRecords=50`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) return

    const data = await response.json()
    
    if (data.records.length === 0) return

    // Create weekly digest
    const conversations = data.records.map(record => ({
      user: record.fields['User Message'],
      sol: record.fields['Sol Response'],
      timestamp: record.fields['Timestamp']
    }))

    const digestPrompt = `Create a 2-3 sentence summary of this week's coaching conversations:

${conversations.map(conv => `USER: ${conv.user}\nSOL: ${conv.sol}`).join('\n\n')}

Focus on: key themes discussed, breakthroughs or shifts, and main areas of focus.`

    const digestResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        max_tokens: 200,
        temperature: 0.3,
        messages: [{ role: 'user', content: digestPrompt }]
      })
    })

    if (digestResponse.ok) {
      const digestResult = await digestResponse.json()
      const weeklyDigest = digestResult.choices[0].message.content

      // Update user profile with weekly digest
      const currentDigest = userContextData.userProfile?.['Transcript Digest'] || ''
      const dateStamp = new Date().toLocaleDateString()
      const newDigest = `${dateStamp}: ${weeklyDigest}\n\n${currentDigest}`

      await updateUserProfile(email, {
        'Transcript Digest': newDigest
      })

      console.log('✅ Weekly transcript digest updated')
    }

  } catch (error) {
    console.error('Error updating transcript digest:', error)
  }
}

// ==================== CONTEXT FETCH FUNCTIONS ====================

async function fetchUserContextDirect(email) {
  console.log('Fetching comprehensive user context directly for:', email)

  const [
    userProfile,
    recentMessages,
    visioningData,
    personalgorithmData,
    businessPlans,
    coachingMethods,
    weeklyCheckins,
    solNotes
  ] = await Promise.allSettled([
    fetchUserProfileDirect(email),
    fetchRecentMessagesDirect(email),
    fetchVisioningDataDirect(email),
    fetchPersonalgorithmDataDirect(email),
    fetchBusinessPlansDirect(email),
    fetchCoachingMethodsDirect(),
    fetchWeeklyCheckinsDirect(email),
    fetchSolNotesDirect()
  ])

  const results = {
    userProfile: userProfile.status === 'fulfilled' ? userProfile.value : null,
    recentMessages: recentMessages.status === 'fulfilled' ? recentMessages.value : [],
    visioningData: visioningData.status === 'fulfilled' ? visioningData.value : null,
    personalgorithmData: personalgorithmData.status === 'fulfilled' ? personalgorithmData.value : [],
    businessPlans: businessPlans.status === 'fulfilled' ? businessPlans.value : [],
    coachingMethods: coachingMethods.status === 'fulfilled' ? coachingMethods.value : [],
    weeklyCheckins: weeklyCheckins.status === 'fulfilled' ? weeklyCheckins.value : [],
    solNotes: solNotes.status === 'fulfilled' ? solNotes.value : []
  }

  const failed = [userProfile, recentMessages, visioningData, personalgorithmData, businessPlans, coachingMethods, weeklyCheckins, solNotes]
    .map((result, index) => ({ result, name: ['userProfile', 'recentMessages', 'visioningData', 'personalgorithmData', 'businessPlans', 'coachingMethods', 'weeklyCheckins', 'solNotes'][index] }))
    .filter(({ result }) => result.status === 'rejected')

  if (failed.length > 0) {
    console.log('❌ Failed to fetch:', failed.map(f => f.name).join(', '))
    failed.forEach(({ name, result }) => {
      console.error(`${name} error:`, result.reason?.message || result.reason)
    })
  }

  const contextSummary = buildEnhancedContextSummary(results)

  console.log('=== DIRECT CONTEXT FETCH SUMMARY ===')
  console.log('✅ User Profile:', !!results.userProfile)
  console.log('📧 Recent Messages:', results.recentMessages.length)
  console.log('🎯 Visioning Data:', !!results.visioningData)
  console.log('🧠 Personalgorithm Entries:', results.personalgorithmData.length)
  console.log('📋 Business Plans:', results.businessPlans.length)
  console.log('📚 Coaching Methods:', results.coachingMethods.length)
  console.log('📊 Weekly Check-ins:', results.weeklyCheckins.length)
  console.log('🤖 Sol Notes:', results.solNotes.length)
  console.log('=== END SUMMARY ===')

  return {
    ...results,
    contextSummary
  }
}

async function fetchSolNotesDirect() {
  try {
    console.log('Fetching Sol™ notes/brain content')
    
    // Simpler query without sort that might be causing 422
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Sol™?maxRecords=50`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Sol™ notes fetch failed:', response.status)
      console.error('❌ Error details:', errorText)
      
      // Return empty array instead of crashing
      return []
    }

    const data = await response.json()
    
    if (!data.records || data.records.length === 0) {
      console.log('⚠️ No Sol™ notes found in Airtable')
      return []
    }
    
    const solNotes = data.records
      .map(record => {
        try {
          return {
            solId: record.fields['Sol ID'] || `sol_${Date.now()}`,
            note: record.fields['Note'] || '',
            dateSubmitted: record.fields['Date Submitted'],
            tags: record.fields['Tags'] || '',
            link: record.fields['Link']
          }
        } catch (recordError) {
          console.error('Error processing Sol note record:', recordError)
          return null
        }
      })
      .filter(note => note && note.note && note.note.trim().length > 0)

    console.log('✅ Found', solNotes.length, 'Sol™ brain notes')
    return solNotes

  } catch (error) {
    console.error('❌ Error fetching Sol™ notes:', error)
    // Return empty array so app doesn't crash
    return []
  }
}

// ==================== HELPER FUNCTION ====================

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
      console.error('❌ Could not find user record')
      return null
    }

    const data = await response.json()
    
    if (data.records.length === 0) {
      console.log('⚠️ No user record found for:', email)
      return null
    }

    return data.records[0].id

  } catch (error) {
    console.error('❌ Error getting user record ID:', error)
    return null
  }
}

// ==================== FETCH FUNCTIONS ====================

async function fetchUserProfileDirect(email) {
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
      console.error('❌ User profile fetch failed:', response.status)
      return null
    }

    const data = await response.json()
    
    if (data.records.length === 0) {
      console.log('⚠️ No user profile found for:', email)
      return null
    }

    const profile = data.records[0].fields
    console.log('✅ User profile found with rich context')
    return profile

  } catch (error) {
    console.error('❌ Error fetching user profile:', error)
    return null
  }
}

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

async function fetchBusinessPlansDirect(email) {
  try {
    console.log('Fetching business plans for:', email)
    
    // Get User record ID first
    const userRecordId = await getUserRecordId(email)
    if (!userRecordId) return []
    
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Aligned Business® Plans?filterByFormula=FIND("${userRecordId}", ARRAYJOIN({User ID}))>0&sort[0][field]=Date Submitted&sort[0][direction]=desc&maxRecords=2`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      console.error('❌ Business plans fetch failed:', response.status)
      return []
    }

    const data = await response.json()
    const plans = data.records.map(record => record.fields)
    console.log('✅ Found', plans.length, 'business plans')
    return plans

  } catch (error) {
    console.error('❌ Error fetching business plans:', error)
    return []
  }
}

async function fetchWeeklyCheckinsDirect(email) {
  try {
    console.log('Fetching weekly check-ins for:', email)
    
    // Get User record ID first
    const userRecordId = await getUserRecordId(email)
    if (!userRecordId) return []
    
    const cutoffDate = new Date(Date.now() - 4 * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Weekly Check-in?filterByFormula=AND(FIND("${userRecordId}", ARRAYJOIN({User ID}))>0, IS_AFTER({Check-in Date}, "${cutoffDate}"))&sort[0][field]=Check-in Date&sort[0][direction]=desc&maxRecords=4`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      console.error('❌ Weekly check-ins fetch failed:', response.status)
      return []
    }

    const data = await response.json()
    const checkins = data.records.map(record => record.fields)
    console.log('✅ Found', checkins.length, 'weekly check-ins')
    return checkins

  } catch (error) {
    console.error('❌ Error fetching weekly check-ins:', error)
    return []
  }
}

async function fetchVisioningDataDirect(email) {
  try {
    console.log('Fetching visioning data for:', email)
    
    // Get User record ID first
    const userRecordId = await getUserRecordId(email)
    if (!userRecordId) return null
    
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Visioning?filterByFormula=FIND("${userRecordId}", ARRAYJOIN({User ID}))>0&sort[0][field]=Date of Submission&sort[0][direction]=desc&maxRecords=1`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      console.error('❌ Visioning data fetch failed:', response.status)
      return null
    }

    const data = await response.json()
    
    if (data.records.length === 0) {
      console.log('⚠️ No visioning data found')
      return null
    }

    console.log('✅ Visioning data found')
    return data.records[0].fields

  } catch (error) {
    console.error('❌ Error fetching visioning data:', error)
    return null
  }
}

async function fetchCoachingMethodsDirect() {
  try {
    console.log('Fetching Aligned Business® Method content')
    
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Aligned Business® Method?maxRecords=15`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      console.error('❌ Coaching methods fetch failed:', response.status)
      return []
    }

    const data = await response.json()
    const methods = data.records.map(record => ({
      name: record.fields['Name of Lesson'],
      content: record.fields['Lesson Content']
    })).filter(method => method.content)

    console.log('✅ Found', methods.length, 'coaching methods')
    return methods

  } catch (error) {
    console.error('❌ Error fetching coaching methods:', error)
    return []
  }
}

async function fetchRecentMessagesDirect(email) {
  try {
    console.log('Fetching recent messages for:', email)
    
    const encodedEmail = encodeURIComponent(email)
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Messages?filterByFormula=AND({User ID}="${encodedEmail}", {Timestamp}>="${cutoffTime}")&sort[0][field]=Timestamp&sort[0][direction]=desc&maxRecords=5`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      console.error('❌ Recent messages fetch failed:', response.status)
      return []
    }

    const data = await response.json()
    const messages = data.records.map(record => ({
      userMessage: record.fields['User Message'],
      solResponse: record.fields['Sol Response'],
      timestamp: record.fields['Timestamp']
    }))

    console.log('✅ Found', messages.length, 'recent messages')
    return messages

  } catch (error) {
    console.error('❌ Error fetching recent messages:', error)
    return []
  }
}

// ==================== CONTEXT SUMMARY BUILDER ====================

function buildEnhancedContextSummary(results) {
  let summary = "=== COMPREHENSIVE USER CONTEXT SUMMARY ===\n\n"
  
  if (results.userProfile) {
    const profile = results.userProfile
    summary += `👤 USER PROFILE:\n`
    summary += `Email: ${profile['User ID'] || 'Unknown'}\n`
    summary += `Member Since: ${profile['Date Joined'] || 'Unknown'}\n`
    summary += `Membership: ${profile['Membership Plan'] || 'Standard'}\n\n`
    
    if (profile['Current Vision']) {
      summary += `🎯 CURRENT VISION:\n${profile['Current Vision']}\n\n`
    }
    
    if (profile['Current State']) {
      summary += `📍 CURRENT STATE:\n${profile['Current State']}\n\n`
    }
    
    if (profile['Current Goals']) {
      summary += `🏆 CURRENT GOALS:\n${profile['Current Goals']}\n\n`
    }
    
    if (profile['Coaching Style Match']) {
      summary += `🎯 COACHING STYLE PREFERENCES:\n${profile['Coaching Style Match']}\n\n`
    }
    
    if (profile['Notes from Sol']) {
      summary += `🤖 SOL'S PREVIOUS INSIGHTS:\n${profile['Notes from Sol']}\n\n`
    }
    
    if (profile['Transcript Digest']) {
      summary += `📝 RECENT CONVERSATION PATTERNS:\n${profile['Transcript Digest']}\n\n`
    }
  }
  
  if (results.personalgorithmData && results.personalgorithmData.length > 0) {
    summary += `🧠 KEY PERSONALGORITHM™ INSIGHTS:\n`
    results.personalgorithmData.forEach((insight, index) => {
      summary += `${index + 1}. ${insight.notes}\n`
    })
    summary += "\n"
  }
  
  if (results.businessPlans && results.businessPlans.length > 0) {
    const latestPlan = results.businessPlans[0]
    summary += `💼 CURRENT BUSINESS CONTEXT:\n`
    if (latestPlan['Future Vision']) {
      summary += `Vision: ${latestPlan['Future Vision']}\n`
    }
    if (latestPlan['Top 3 Goals']) {
      summary += `Goals: ${latestPlan['Top 3 Goals']}\n`
    }
    summary += "\n"
  }
  
  if (results.weeklyCheckins && results.weeklyCheckins.length > 0) {
    const latestCheckin = results.weeklyCheckins[0]
    summary += `📊 LATEST WEEKLY CHECK-IN:\n`
    if (latestCheckin['This is who I am now...']) {
      summary += `Identity: ${latestCheckin['This is who I am now...']}\n`
    }
    if (latestCheckin['What worked this week?']) {
      summary += `Wins: ${latestCheckin['What worked this week?']}\n`
    }
    summary += "\n"
  }
  
  return summary
}

// ==================== ENHANCED AI RESPONSE GENERATION ====================

async function generatePersonalizedOpenAIResponse(userMessage, conversationHistory, userContextData, user) {
  try {
    // Check for visioning guidance first
    const visioningGuidance = await handleVisioningGuidance(userMessage, userContextData, user)
    if (visioningGuidance) {
      return {
        content: visioningGuidance.content,
        tokensUsed: 0,
        model: 'visioning-guidance'
      }
    }

    // CHANGED: Always use GPT-4o (the best model for emotional intelligence)
    const model = 'gpt-4o'
    
    console.log(`Using ${model} for response generation`)

    const recentContext = conversationHistory.slice(-10).map(msg => ({
      role: msg.role === 'sol' ? 'assistant' : 'user',
      content: msg.content
    }))

    recentContext.push({
      role: 'user',
      content: userMessage
    })

    let contextPrompt = buildEnhancedComprehensivePrompt(userContextData, user)

    // Rate limit retry logic
    let attempts = 0
    let lastError = null
    
    while (attempts < 3) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: model,
            max_tokens: 600, // Slightly reduced for cost efficiency
            temperature: 0.7,
            messages: [
              {
                role: 'system',
                content: contextPrompt
              },
              ...recentContext
            ]
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          
          // If rate limit (429), wait and retry
          if (response.status === 429) {
            attempts++
            console.log(`⏳ Rate limit hit, attempt ${attempts}/3, waiting...`)
            
            if (attempts < 3) {
              // Wait 3 seconds before retry
              await new Promise(resolve => setTimeout(resolve, 3000))
              continue
            }
          }
          
          lastError = new Error(`OpenAI API error: ${response.status}`)
          console.error('OpenAI API error:', errorData)
          throw lastError
        }

        const result = await response.json()
        
        console.log('✅ Response generated successfully')
        console.log('📊 Tokens used:', result.usage.total_tokens)
        
        return {
          content: result.choices[0].message.content,
          tokensUsed: result.usage.total_tokens,
          model: model
        }
        
      } catch (fetchError) {
        lastError = fetchError
        
        if (fetchError.message.includes('429') && attempts < 2) {
          attempts++
          console.log(`⏳ Retrying after error, attempt ${attempts}/3`)
          await new Promise(resolve => setTimeout(resolve, 3000))
          continue
        }
        
        break
      }
    }
    
    throw lastError || new Error('Failed after 3 attempts')

  } catch (error) {
    console.error('OpenAI response error:', error)
    return {
      content: "I'm having a moment of connection difficulty, but I'm still here with you. Your message was important - would you mind sharing that again?",
      tokensUsed: 0,
      model: 'error'
    }
  }
}


function shouldUseGPT4(userMessage, userContextData) {
  // Always use GPT-4o for Sol - it's the best for emotional intelligence
  // and it's actually cheaper than the old turbo model
  return true
}

// ==================== OTHER FUNCTIONS ====================

async function logToAirtable(messageData) {
  try {
    // Ensure tags is always a string, never an array
    let tagsValue = ''
    if (Array.isArray(messageData.tags)) {
      tagsValue = messageData.tags.join(', ')
    } else if (typeof messageData.tags === 'string') {
      tagsValue = messageData.tags
    }

    const fields = {
      'Message ID': messageData.messageId,
      'User ID': messageData.email, // Plain text email for Messages table
      'User Message': messageData.userMessage,
      'Sol Response': messageData.solResponse,
      'Timestamp': messageData.timestamp,
      'Tokens Used': messageData.tokensUsed,
      'Tags': tagsValue, // Always a string
      'Sol Flagged': messageData.flaggingAnalysis?.shouldFlag || false,
      'Reason for Flagging': messageData.flaggingAnalysis?.reason || '',
      'Add to Prompt Response Library': messageData.flaggingAnalysis?.addToLibrary || false
    }

    console.log('Logging to Airtable - Tags value type:', typeof tagsValue)
    console.log('Logging to Airtable - Tags value:', tagsValue)

    const response = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fields })
    })

    console.log('Airtable response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Airtable logging error:', errorText)
      
      // If still failing, try without the problematic fields
      if (response.status === 422) {
        console.log('Trying simpler format...')
        const simpleFields = {
          'Message ID': messageData.messageId,
          'User ID': messageData.email,
          'User Message': messageData.userMessage,
          'Sol Response': messageData.solResponse,
          'Timestamp': messageData.timestamp
        }
        
        const retryResponse = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ fields: simpleFields })
        })
        
        if (retryResponse.ok) {
          const result = await retryResponse.json()
          console.log('✅ Successfully logged to Airtable (simple format):', result.id)
          return result
        }
      }
      
      return null
    }

    const result = await response.json()
    console.log('✅ Successfully logged to Airtable:', result.id)
    return result
  } catch (error) {
    console.error('Error logging to Airtable:', error)
    return null
  }
}

async function generateConversationTags(userMessage, solResponse, userContextData, user) {
  try {
    const tagPrompt = `You are Sol™, analyzing this coaching conversation to generate intelligent tags.

USER: "${userMessage}"
SOL: "${solResponse}"

Generate 2-4 tags that capture:
1. SUPPORT TYPE: What kind of coaching happened?
2. BUSINESS FOCUS: What business area was discussed?
3. USER STATE: What energy/emotional state was the user in?

Return ONLY a comma-separated list of 2-4 lowercase tags with hyphens instead of spaces.

Tags:`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        max_tokens: 100,
        temperature: 0.3,
        messages: [{ role: 'user', content: tagPrompt }]
      })
    })

    if (response.ok) {
      const result = await response.json()
      const tagsString = result.choices[0].message.content.trim()
      console.log('Sol generated tags:', tagsString)
      return tagsString
    }
    
    return 'general-support'
  } catch (error) {
    console.error('Error generating conversation tags:', error)
    return 'general-support'
  }
}

async function analyzeFlagging(userMessage, solResponse, userContextData, user) {
  try {
    const flagPrompt = `Analyze this coaching conversation:

USER: "${userMessage}"
SOL: "${solResponse}"

Respond in this exact format:
SHOULD_FLAG: true/false
REASON: [brief reason if flagged, "none" if not flagged]
ADD_TO_LIBRARY: true/false`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        max_tokens: 100,
        temperature: 0.1,
        messages: [{ role: 'user', content: flagPrompt }]
      })
    })

    if (response.ok) {
      const result = await response.json()
      const analysis = result.choices[0].message.content
      
      const shouldFlag = analysis.includes('SHOULD_FLAG: true')
      const addToLibrary = analysis.includes('ADD_TO_LIBRARY: true')
      
      const reasonMatch = analysis.match(/REASON: (.+)/i)
      const reason = reasonMatch ? reasonMatch[1].trim() : 'none'
      
      return {
        shouldFlag,
        reason: shouldFlag ? reason : '',
        addToLibrary
      }
    }
    
    return { shouldFlag: false, reason: '', addToLibrary: false }
  } catch (error) {
    console.error('Error analyzing flagging:', error)
    return { shouldFlag: false, reason: '', addToLibrary: false }
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