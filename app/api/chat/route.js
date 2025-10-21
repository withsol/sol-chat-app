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
    
    const hasVisioningContent = userMessage.length > 400 && (
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
      message.includes('what differentiates you') ||
      message.includes('here is my visioning') ||
      message.includes('here\'s my visioning') ||
      message.includes('my visioning homework') ||
      message.includes('completed visioning') ||
      message.includes('visioning document') ||
      (userMessage.length > 800 && 
        (message.includes('business') && message.includes('goals') && message.includes('client'))
      )
    )
    
    if (hasVisioningContent) {
      console.log('🎯 Detected visioning content, processing inline...')
      
      try {
        // PROCESS VISIONING DIRECTLY HERE (no API call)
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

        return {
          content: `🎯 Incredible! I've processed your visioning homework and extracted ${personalgorithmCount} Personalgorithm™ insights about how you work best. 

I can see your business is focused on ${visioningAnalysis.industry || 'your industry'} and your vision is coming together beautifully. Your ideal client clarity and business goals are now part of my understanding of you.

What feels most important to focus on first from everything you've shared?`,
          hasVisioningGuidance: true
        }
        
      } catch (error) {
        console.error('Inline visioning processing error:', error)
        return {
          content: `Thank you for sharing your comprehensive visioning work! I can see the depth of thought you've put into this. What's the main area you'd like my support with based on everything you've shared?`,
          hasVisioningGuidance: true
        }
      }
    }
    
    // Handle business plan content similarly
    const hasBusinessPlanContent = userMessage.length > 400 && (
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
      
      return {
        content: `💼 Excellent! I've processed your Aligned Business Plan and added the strategic insights to your Personalgorithm™. I can see your business vision and goals clearly now.

Based on your plan, what's the most important focus area for the next 30 days?`,
        hasVisioningGuidance: true
      }
    }
    
    // Show options only for explicit requests
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
    userContextData.personalgorithmData.forEach((insight, i) => {
      systemPrompt += `${i + 1}. ${insight.notes}\n`
    })
    systemPrompt += "\n"
  }

  // Add relevant coaching methods based on user's current state
  if (userContextData.coachingMethods?.length > 0) {
    systemPrompt += "RELEVANT COACHING METHODS FROM KELSEY'S ALIGNED BUSINESS® METHOD:\n"
    userContextData.coachingMethods.forEach((method, i) => {
      if (method.content) {
        systemPrompt += `${method.name}: ${method.content}\n`
      }
    })
    systemPrompt += "\n"
  }

  // Add Sol's brain insights for general coaching approach
  if (userContextData.solNotes?.length > 0) {
    systemPrompt += "SOL'S COACHING BRAIN (Kelsey's insights for all coaching):\n"
    userContextData.solNotes.forEach((note, i) => {
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

systemPrompt += `

RESPONSE FORMATTING:
- Use **bold** for emphasis and important points
- Use *italics* for emotional nuance and gentle emphasis  
- Use bullet points (- or *) for lists and action steps
- Use ## for section headers when appropriate
- Use > for important quotes or insights
- Use [text](url) for clickable links
- Use line breaks for better readability

Make your responses visually scannable and easy to read. Format your responses to feel warm and personal while being easy to scan.

`
  return systemPrompt
}

export async function POST(request) {
  console.log('=== CHAT API V3.2 - WITH VISIONING & BUSINESS PLAN DETECTION ===')
  
  try {
    const { message, user, conversationHistory } = await request.json()
    
    console.log('Chat request for user:', user.email)
    console.log('User message length:', message.length)

    // SAFER CONTEXT FETCH
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
    }
    
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const timestamp = new Date().toISOString()

    // 🎯 CHECK FOR VISIONING/BUSINESS PLAN CONTENT FIRST
    const visioningGuidance = await handleVisioningGuidance(message, userContextData, user)
    if (visioningGuidance && visioningGuidance.hasVisioningGuidance) {
      console.log('✅ Visioning/Business Plan content detected and processed')
      
      // Still log this important interaction
      try {
        await logToAirtable({
          messageId,
          email: user.email,
          userMessage: message,
          solResponse: visioningGuidance.content,
          timestamp,
          tokensUsed: 0,
          tags: 'visioning-processed, document-intake',
          flaggingAnalysis: { shouldFlag: false, reason: '', addToLibrary: true }
        })
      } catch (logError) {
        console.error('❌ Failed to log visioning interaction:', logError)
      }

      // Update profile
      try {
        await updateUserProfile(user.email, {
          'Last Message Date': timestamp
        })
      } catch (profileError) {
        console.error('❌ Profile update failed:', profileError)
      }

      return NextResponse.json({
        response: visioningGuidance.content,
        tags: 'visioning-processed, document-intake',
        tokensUsed: 0,
        debug: {
          hasContext: !!userContextData.userProfile,
          visioningProcessed: true,
          contextSummary: userContextData.contextSummary || 'No context available'
        }
      })
    }

    // REGULAR AI RESPONSE GENERATION
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
    
    // SAFER AIRTABLE LOGGING
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
    }

    // PERSONALGORITHM™ ANALYSIS TRIGGER
    if (aiResponse.content && !aiResponse.content.includes('technical difficulties')) {
      triggerPersonalgorithmAnalysis(user.email, message, aiResponse.content, conversationHistory)
    }

    // SOL AUTO-UPDATE SYSTEM
    if (aiResponse.content && !aiResponse.content.includes('technical difficulties')) {
      setTimeout(() => {
        detectAndPerformUpdates(user.email, message, aiResponse.content, userContextData)
      }, 1000)
      
      const lastMessageDate = userContextData.userProfile?.['Last Message Date']
      const daysSinceLastMessage = lastMessageDate ? 
        (Date.now() - new Date(lastMessageDate).getTime()) / (1000 * 60 * 60 * 24) : 7
      
      if (daysSinceLastMessage >= 7) {
        setTimeout(() => updateTranscriptDigest(user.email), 2000)
      }
    }

    // SAFER PROFILE UPDATE
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
    }, { status: 200 })
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

    const useGPT4 = shouldUseGPT4(userMessage, userContextData)
    const model = useGPT4 ? 'gpt-4-turbo-preview' : 'gpt-3.5-turbo'
    
    console.log(`Using ${model} for response generation`)

    const recentContext = conversationHistory.slice(-10).map(msg => ({
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