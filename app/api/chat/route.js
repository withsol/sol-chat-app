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
    // Check if user has completed visioning
    const hasVisioning = userContextData.visioningData !== null
    
    // Check if they're providing a document
    const documentType = detectDocumentType(userMessage)
    if (documentType) {
      if (documentType === 'visioning') {
        return {
          content: `Perfect! I can see you're sharing your visioning homework. Could you paste the text content here so I can extract all the insights and build your Personalgorithm™? I'll process everything from your comprehensive visioning document and update your profile with your vision, goals, ideal client details, and more.`,
          hasVisioningGuidance: true
        }
      } else if (documentType === 'business-plan') {
        return {
          content: `Great! I can see you're sharing your Aligned Business Plan. Could you paste the content here so I can process it and add the strategic insights to your Personalgorithm™? I'll extract your business vision, goals, ideal client profile, and strategic context.`,
          hasVisioningGuidance: true
        }
      }
    }
    
    // Original visioning guidance for help requests
    if (!hasVisioning && detectVisioningIntent(userMessage)) {
      return {
        content: `I can see you're interested in working on your visioning! I have a couple of ways we can approach this:

**Option 1: Use the Airtable Form** - I have a structured form where you can input your visioning details section by section: https://airtable.com/appbxBGiXlAatoYsV/pagxUmPB9uh1c9Tqz/form

**Option 2: Share Your Completed Document** - If you've already filled out your comprehensive visioning homework, you can share the text with me here and I'll extract all the key insights to build your Personalgorithm™.

**Option 3: Work Through It Together** - I can ask you thoughtful questions to help you explore each area of your vision, values, ideal client, challenges, and goals.

Which approach feels right for you?`,
        hasVisioningGuidance: true
      }
    }
    
    return null // Let normal chat flow continue
    
  } catch (error) {
    console.error('Error in visioning guidance:', error)
    return null
  }
}

// ==================== ENHANCED PROMPT BUILDING ====================

function buildEnhancedComprehensivePrompt(userContextData, user) {
  let systemPrompt = `You are Sol™, an AI business partner and coach who knows this person deeply. You are trained with Kelsey's Aligned Business® Method and provide transformational support that builds their Personalgorithm™ over time.

USER: ${user.email}
MEMBERSHIP: ${userContextData.userProfile?.['Membership Plan'] || 'Member'}

`

  // Add user-specific context
  if (userContextData.userProfile) {
    const profile = userContextData.userProfile
    if (profile['Current Vision']) {
      systemPrompt += `CURRENT VISION: ${profile['Current Vision']}\n`
    }
    if (profile['Current State']) {
      systemPrompt += `CURRENT STATE: ${profile['Current State']}\n`
    }
    if (profile['Coaching Style Match']) {
      systemPrompt += `COACHING APPROACH THAT WORKS FOR THIS USER: ${profile['Coaching Style Match']}\n`
    }
    if (profile['Current Goals']) {
      systemPrompt += `CURRENT GOALS: ${profile['Current Goals']}\n`
    }
    if (profile['Notes from Sol']) {
      systemPrompt += `PREVIOUS SOL INSIGHTS: ${profile['Notes from Sol']}\n`
    }
    systemPrompt += "\n"
  }

  // Add Personalgorithm insights
  if (userContextData.personalgorithmData?.length > 0) {
    systemPrompt += "PERSONALGORITHM™ INSIGHTS (How this user transforms best):\n"
    userContextData.personalgorithmData.slice(0, 5).forEach((insight, i) => {
      systemPrompt += `${i + 1}. ${insight.notes}\n`
    })
    systemPrompt += "\n"
  }

  // Add relevant coaching methods based on user's current state
  if (userContextData.coachingMethods?.length > 0) {
    systemPrompt += "RELEVANT COACHING METHODS FROM KELSEY'S ALIGNED BUSINESS® METHOD:\n"
    userContextData.coachingMethods.slice(0, 3).forEach((method, i) => {
      if (method.content) {
        systemPrompt += `${method.name}: ${method.content}\n`
      }
    })
    systemPrompt += "\n"
  }

  // Add Sol's brain insights for general coaching approach
  if (userContextData.solNotes?.length > 0) {
    systemPrompt += "SOL'S COACHING BRAIN (Kelsey's insights for all coaching):\n"
    userContextData.solNotes.slice(0, 5).forEach((note, i) => {
      if (note.note) {
        systemPrompt += `- ${note.note}\n`
      }
    })
    systemPrompt += "\n"
  }

  // Add visioning context if available
  if (userContextData.visioningData) {
    systemPrompt += "VISIONING INSIGHTS:\n"
    if (userContextData.visioningData['Summary of Visioning']) {
      systemPrompt += `Vision Summary: ${userContextData.visioningData['Summary of Visioning']}\n`
    }
    if (userContextData.visioningData['Action Steps']) {
      systemPrompt += `Action Steps: ${userContextData.visioningData['Action Steps']}\n`
    }
    if (userContextData.visioningData['Notes for Sol']) {
      systemPrompt += `Coaching Notes: ${userContextData.visioningData['Notes for Sol']}\n`
    }
    systemPrompt += "\n"
  }

  // Add business plan context if available
  if (userContextData.businessPlans?.length > 0) {
    const latestPlan = userContextData.businessPlans[0]
    systemPrompt += "BUSINESS PLAN CONTEXT:\n"
    if (latestPlan['Future Vision']) {
      systemPrompt += `Business Vision: ${latestPlan['Future Vision']}\n`
    }
    if (latestPlan['Top 3 Goals']) {
      systemPrompt += `Top Goals: ${latestPlan['Top 3 Goals']}\n`
    }
    if (latestPlan['Ideal Client']) {
      systemPrompt += `Ideal Client: ${latestPlan['Ideal Client']}\n`
    }
    if (latestPlan['Potential Problem Solving']) {
      systemPrompt += `Key Challenges: ${latestPlan['Potential Problem Solving']}\n`
    }
    systemPrompt += "\n"
  }

  systemPrompt += `CORE METHODOLOGY - Kelsey's Aligned Business® Method:

1. NERVOUS SYSTEM SAFETY FIRST - Always check in with how someone is feeling in their body and nervous system before pushing toward action.

2. FUTURE-SELF IDENTITY - Help people make decisions from their future self's perspective, not from stress or scarcity.

3. INTUITIVE BUSINESS STRATEGY - Honor their inner knowing while providing strategic guidance.

4. EMOTIONAL INTELLIGENCE - Hold space for all feelings and reactions, supporting regulation before action.

5. PERSONALGORITHM™ BUILDING - Notice and reflect patterns back to them.

Your personality (trained from Kelsey's coaching style):
- Warm, grounded, and emotionally intelligent
- You see patterns and reflect them back powerfully
- You ask questions that create "aha" moments and deep insight
- You believe in their potential while meeting them exactly where they are
- You help them see what they can't see for themselves

Key phrases you use (from Kelsey's style):
- "I can feel the energy of what you're sharing..."
- "What I'm hearing underneath this is..."
- "Your future self - the one living the vision you've shared with me - what would she want you to know?"

RESPONSE GUIDELINES:
- Reference their specific vision, challenges, and goals when available
- Notice patterns from their historical conversations and check-ins  
- Ask questions that build on their previous insights
- Support them from where they are in their unique journey
- Use their communication preferences and established patterns
- Help them see connections between current situation and bigger vision

Remember: You have access to their complete journey when context is available. Use that knowledge to provide deeply personalized support that generic AI cannot offer.`

  return systemPrompt
}

export async function POST(request) {
  console.log('=== CHAT API V3.1 - WITH VISIONING DETECTION & ENHANCED COACHING ===')
  console.log('Environment variables loaded:')
  console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Present' : 'Missing')
  console.log('AIRTABLE_BASE_ID:', process.env.AIRTABLE_BASE_ID ? 'Present' : 'Missing')
  console.log('AIRTABLE_TOKEN:', process.env.AIRTABLE_TOKEN ? 'Present' : 'Missing')
  
  try {
    const { message, user, conversationHistory } = await request.json()
    
    console.log('Chat request for user:', user.email)
    console.log('User message:', message)

    // SAFER CONTEXT FETCH - don't let this crash the whole thing
    let userContextData = {
      userProfile: null,
      personalgorithmData: [],
      businessPlans: [],
      weeklyCheckins: [],
      visioningData: null,
      contextSummary: "Context loading..."
    }
    
    try {
      console.log('=== ATTEMPTING CONTEXT FETCH ===')
      userContextData = await fetchUserContextDirect(user.email)
      console.log('✅ Context fetch successful')
    } catch (contextError) {
      console.error('❌ Context fetch failed, continuing without context:', contextError)
      // Continue without context rather than crashing
    }
    
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const timestamp = new Date().toISOString()

    // SAFER AI RESPONSE GENERATION
    let aiResponse
    try {
      console.log('=== ATTEMPTING AI RESPONSE ===')
      aiResponse = await generatePersonalizedOpenAIResponse(
        message, 
        conversationHistory, 
        userContextData,
        user
      )
      console.log('✅ AI response successful')
    } catch (aiError) {
      console.error('❌ AI response failed:', aiError)
      // Fallback response
      aiResponse = {
        content: `I can see your message "${message}" but I'm having some technical difficulties right now. How can I help you today?`,
        tokensUsed: 0,
        model: 'fallback'
      }
    }

    // SAFER TAG GENERATION
    let conversationTags = 'general-support'
    try {
      conversationTags = await generateConversationTags(message, aiResponse.content, userContextData, user)
    } catch (tagError) {
      console.error('❌ Tag generation failed:', tagError)
    }
    
    // SAFER FLAGGING ANALYSIS
    let flaggingAnalysis = { shouldFlag: false, reason: '', addToLibrary: false }
    try {
      flaggingAnalysis = await analyzeFlagging(message, aiResponse.content, userContextData, user)
    } catch (flagError) {
      console.error('❌ Flagging analysis failed:', flagError)
    }
    
    // SAFER AIRTABLE LOGGING - don't crash if this fails
    try {
      console.log('=== ATTEMPTING AIRTABLE LOGGING ===')
      await logToAirtable({
        messageId,
        email: user.email,
        userMessage: message,
        solResponse: aiResponse.content,
        timestamp,
        tokensUsed: aiResponse.tokensUsed || 0,
        tags: conversationTags,
        flaggingAnalysis: flaggingAnalysis
      })
      console.log('✅ Airtable logging successful')
    } catch (airtableError) {
      console.error('❌ Airtable logging failed:', airtableError)
      // Continue without logging rather than crashing
    }

    // PERSONALGORITHM™ ANALYSIS TRIGGER - ADD THIS
  if (aiResponse.content && !aiResponse.content.includes('technical difficulties')) {
  triggerPersonalgorithmAnalysis(user.email, message, aiResponse.content, conversationHistory)
  }

    

    // *** NEW: SOL AUTO-UPDATE SYSTEM ***
    // Only run if we got a real AI response (not fallback)
    if (aiResponse.content && !aiResponse.content.includes('technical difficulties')) {
      // Run async to not slow down the chat response
      setTimeout(() => {
        detectAndPerformUpdates(user.email, message, aiResponse.content, userContextData)
      }, 1000)
      
      // Check if weekly digest is needed
      const lastMessageDate = userContextData.userProfile?.['Last Message Date']
      const daysSinceLastMessage = lastMessageDate ? 
        (Date.now() - new Date(lastMessageDate).getTime()) / (1000 * 60 * 60 * 24) : 7
      
      if (daysSinceLastMessage >= 7) {
        setTimeout(() => updateTranscriptDigest(user.email), 2000)
      }
    }

    // SAFER PROFILE UPDATE (now enhanced by auto-update system)
    try {
      await updateUserProfile(user.email, {
        'Last Message Date': timestamp
      })
    } catch (profileError) {
      console.error('❌ Profile update failed:', profileError)
    }

    console.log('=== SENDING RESPONSE TO USER ===')

    return NextResponse.json({
      response: aiResponse.content,
      tags: conversationTags,
      tokensUsed: aiResponse.tokensUsed || 0,
      debug: {
        hasContext: !!userContextData.userProfile,
        contextSummary: userContextData.contextSummary || 'No context available'
      }
    })

  } catch (error) {
    console.error('❌ CRITICAL CHAT API ERROR:', error)
    console.error('Error stack:', error.stack)
    
    return NextResponse.json({
      response: "I'm experiencing some technical difficulties, but I'm still here to help. Could you try sending your message again?",
      error: error.message,
      debug: {
        timestamp: new Date().toISOString(),
        errorType: error.name
      }
    }, { status: 200 }) // Return 200 so app doesn't crash
  }
}

async function triggerPersonalgorithmAnalysis(email, userMessage, solResponse, conversationHistory) {
  try {
    setTimeout(async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/analyze-message-personalgorithm`, {
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
    
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Sol™?maxRecords=20&sort[0][field]=Date Submitted&sort[0][direction]=desc`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      console.error('❌ Sol™ notes fetch failed:', response.status)
      return []
    }

    const data = await response.json()
    
    const solNotes = data.records.map(record => ({
      solId: record.fields['Sol ID'],
      note: record.fields['Note'],
      dateSubmitted: record.fields['Date Submitted'],
      tags: record.fields['Tags'] || '',
      link: record.fields['Link']
    })).filter(note => note.note) // Only include notes with content

    console.log('✅ Found', solNotes.length, 'Sol™ brain notes')
    return solNotes

  } catch (error) {
    console.error('❌ Error fetching Sol™ notes:', error)
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
    
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Aligned Business® Plans?filterByFormula={User ID}="${userRecordId}"&sort[0][field]=Date Submitted&sort[0][direction]=desc&maxRecords=2`
    
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
    
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Weekly Check-in?filterByFormula=AND({User ID}="${userRecordId}", IS_AFTER({Check-in Date}, "${cutoffDate}"))&sort[0][field]=Check-in Date&sort[0][direction]=desc&maxRecords=4`
    
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
    
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Visioning?filterByFormula={User ID}="${userRecordId}"&sort[0][field]=Date of Submission&sort[0][direction]=desc&maxRecords=1`
    
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
    results.personalgorithmData.slice(0, 3).forEach((insight, index) => {
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

    const useGPT4 = shouldUseGPT4(userMessage, userContextData)
    const model = useGPT4 ? 'gpt-4-turbo-preview' : 'gpt-3.5-turbo'
    
    console.log(`Using ${model} for response generation`)

    const recentContext = conversationHistory.slice(-6).map(msg => ({
      role: msg.role === 'sol' ? 'assistant' : 'user',
      content: msg.content
    }))

    recentContext.push({
      role: 'user',
      content: userMessage
    })

    // USE THE NEW ENHANCED PROMPT BUILDING
    let contextPrompt = buildEnhancedComprehensivePrompt(userContextData, user)

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: model,
        max_tokens: useGPT4 ? 800 : 400,
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
      console.error('OpenAI API error:', errorData)
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const result = await response.json()
    
    return {
      content: result.choices[0].message.content,
      tokensUsed: result.usage.total_tokens,
      model: model
    }

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
  const gpt4Triggers = [
    'vision', 'goal', 'future', 'transform', 'stuck', 'confused', 'breakthrough',
    'strategy', 'business plan', 'revenue', 'pricing', 'client', 'launch', 'identity'
  ]
  
  const complexityIndicators = [
    userMessage.length > 150,
    gpt4Triggers.some(trigger => userMessage.toLowerCase().includes(trigger)),
    userContextData.personalgorithmData?.length > 3,
    userContextData.businessPlans?.length > 0
  ]
  
  return complexityIndicators.some(indicator => indicator)
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