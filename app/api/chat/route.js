import { NextResponse } from 'next/server'

export async function POST(request) {
  console.log('Environment variables loaded:')
  console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Present' : 'Missing')
  console.log('AIRTABLE_BASE_ID:', process.env.AIRTABLE_BASE_ID ? 'Present' : 'Missing')
  console.log('AIRTABLE_TOKEN:', process.env.AIRTABLE_TOKEN ? 'Present' : 'Missing')
  
  try {
    const { message, user, conversationHistory } = await request.json()
    
    console.log('Chat request for user:', user.email)

    // FETCH USER'S COMPLETE CONTEXT BEFORE RESPONDING
    const contextResponse = await fetch(`${process.env.NEXTAUTH_URL || 'https://sol-chat-app.vercel.app'}/api/user-context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email })
    })

    let userContextData = {}
    if (contextResponse.ok) {
      userContextData = await contextResponse.json()
      console.log('Loaded comprehensive user context for personalized response')
    } else {
      console.log('Could not load user context, proceeding with basic response')
    }
    
    // Calculate tokens for this conversation
    const estimatedTokens = estimateTokenCount(message, conversationHistory)

    // Generate PERSONALIZED AI response using OpenAI
    const aiResponse = await generatePersonalizedOpenAIResponse(
      message, 
      conversationHistory, 
      userContextData,
      user
    )
    
    // Generate conversation tags based on the exchange
    const conversationTags = await generateConversationTags(message, aiResponse.content, userContextData, user)
    
    // Determine if this should be flagged for review
    const flaggingAnalysis = await analyzeFlagging(message, aiResponse.content, userContextData, user)
    
    // Create single message record with both user message and Sol response
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const timestamp = new Date().toISOString()
    
    await logConversationToAirtable({
      messageId,
      email: user.email,
      userMessage: message,
      solResponse: aiResponse.content,
      timestamp,
      tokensUsed: estimatedTokens + aiResponse.tokensUsed,
      tags: conversationTags,
      flaggingAnalysis: flaggingAnalysis,
      model: aiResponse.model
    })

    // Update user's last message date and other profile info
    await updateUserProfile(user.email, {
      'Last Message Date': timestamp,
      'Tokens Used this Month': await getCurrentTokenUsage(user.email) + (estimatedTokens + aiResponse.tokensUsed)
    })

    // DISABLED: Update user's token usage (commenting out for now)
    console.log('Token update disabled. Would update:', estimatedTokens + aiResponse.tokensUsed, 'tokens for', user.email)

    return NextResponse.json({
      response: aiResponse.content,
      tags: conversationTags,
      tokensUsed: estimatedTokens + aiResponse.tokensUsed
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: "I'm having trouble processing that right now. Would you mind sharing that again?" },
      { status: 500 }
    )
  }
}

// ==================== HELPER FUNCTIONS ====================

async function logConversationToAirtable(conversationData) {
  try {
    const fields = {
      'Message ID': conversationData.messageId,
      'User ID': conversationData.email,
      'User Message': conversationData.userMessage,
      'Sol Response': conversationData.solResponse,
      'Timestamp': conversationData.timestamp,
      'Tokens Used': conversationData.tokensUsed,
      'Tags': conversationData.tags, // Sol-generated tags
      'Sol Flagged': conversationData.flaggingAnalysis.shouldFlag,
      'Reason for Flagging': conversationData.flaggingAnalysis.reason,
      'Add to Prompt Response Library': conversationData.flaggingAnalysis.addToLibrary
    }

    console.log('Attempting to log conversation to Airtable with fields:', fields)

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
      const errorData = await response.json()
      console.error('Airtable logging error details:', errorData)
      throw new Error(`Failed to log to Airtable: ${response.status}`)
    }

    const result = await response.json()
    console.log('Successfully logged conversation to Airtable:', result.id)
    return result
  } catch (error) {
    console.error('Error logging conversation to Airtable:', error)
    return null
  }
}

async function generateConversationTags(userMessage, solResponse, userContextData, user) {
  try {
    const tagPrompt = `Analyze this coaching conversation and generate 2-4 relevant tags that would help categorize this exchange for future context and training.

USER MESSAGE: "${userMessage}"
SOL RESPONSE: "${solResponse}"

USER CONTEXT: ${userContextData.contextSummary || 'Limited context available'}

Generate tags that capture:
1. The type of support provided (strategy, emotional-support, breakthrough, planning, etc.)
2. Business/life area discussed (marketing, sales, identity, vision, nervous-system, etc.)  
3. The user's current state/energy (stuck, expanding, overwhelmed, confident, etc.)
4. Any transformation moments or insights

Return ONLY a comma-separated list of 2-4 lowercase tags with hyphens instead of spaces.
Example: breakthrough-moment, identity-work, nervous-system-regulation, business-strategy

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
      return tagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
    }
    
    return ['general-support'] // Fallback tag
  } catch (error) {
    console.error('Error generating conversation tags:', error)
    return ['general-support'] // Fallback tag
  }
}

async function analyzeFlagging(userMessage, solResponse, userContextData, user) {
  try {
    const flagPrompt = `Analyze this coaching conversation and determine:
1. Should this be flagged for human oversight?
2. Should this be added to the prompt response library for training?

Flag for oversight if:
- Safety/legal concerns
- User showing harmful patterns
- Difficult coaching situation needing human insight
- Sol's response may have missed something important

Add to library if:
- Breakthrough moment occurred
- Excellent coaching response that could be model for future
- Transformation insight worth preserving
- Novel approach that worked well

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
        max_tokens: 150,
        temperature: 0.1,
        messages: [{ role: 'user', content: flagPrompt }]
      })
    })

    if (response.ok) {
      const result = await response.json()
      const analysis = result.choices[0].message.content
      
      const shouldFlag = analysis.includes('SHOULD_FLAG: true')
      const addToLibrary = analysis.includes('ADD_TO_LIBRARY: true')
      
      // Extract reason
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
    // First, find the user record
    const findResponse = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Users?filterByFormula={User ID}="${email}"`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`
        }
      }
    )

    if (!findResponse.ok) {
      throw new Error(`Failed to find user: ${findResponse.status}`)
    }

    const findData = await findResponse.json()
    
    if (findData.records.length === 0) {
      console.log('User not found, creating new user record')
      // Create new user if doesn't exist
      const createResponse = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: {
            'User ID': email,
            'Date Joined': new Date().toISOString(),
            'Membership Plan': 'Beta Access', // Default
            ...updates
          }
        })
      })
      
      if (!createResponse.ok) {
        throw new Error(`Failed to create user: ${createResponse.status}`)
      }
      
      return await createResponse.json()
    }

    // Update existing user
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
      throw new Error(`Failed to update user: ${updateResponse.status}`)
    }

    const result = await updateResponse.json()
    console.log('User profile updated in Airtable:', result.id)
    return result
  } catch (error) {
    console.error('Error updating user profile:', error)
    return null
  }
}

async function getCurrentTokenUsage(email) {
  try {
    const response = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Users?filterByFormula={User ID}="${email}"`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`
        }
      }
    )

    if (!response.ok) return 0

    const data = await response.json()
    return data.records[0]?.fields?.['Tokens Used this Month'] || 0
  } catch (error) {
    console.error('Error getting current token usage:', error)
    return 0
  }
}

async function generatePersonalizedOpenAIResponse(userMessage, conversationHistory, userContextData, user) {
  try {
    // Determine which model to use based on complexity
    const useGPT4 = shouldUseGPT4(userMessage, userContextData)
    const model = useGPT4 ? 'gpt-4-turbo-preview' : 'gpt-3.5-turbo'
    
    console.log(`Using ${model} for response generation`)

    // Build conversation context (last 8 messages to manage costs)
    const recentContext = conversationHistory.slice(-8).map(msg => ({
      role: msg.role === 'sol' ? 'assistant' : 'user',
      content: msg.content
    }))

    // Add current message
    recentContext.push({
      role: 'user',
      content: userMessage
    })

    // Build comprehensive user context using your schema
    let contextPrompt = buildComprehensivePrompt(userContextData, user)

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: model,
        max_tokens: useGPT4 ? 1024 : 512,
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
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message}`)
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

function buildComprehensivePrompt(userContextData, user) {
  let systemPrompt = `You are Sol™, an AI business partner and coach who knows this person deeply. You are trained with the Aligned Business® Method and provide transformational support that builds their Personalgorithm™ over time.

USER: ${user.email}
MEMBERSHIP: ${userContextData.userProfile?.['Membership Plan'] || 'Member'}

`

  // Add rich user context from your schema
  if (userContextData.userProfile) {
    const profile = userContextData.userProfile
    if (profile['Current Vision']) {
      systemPrompt += `CURRENT VISION: ${profile['Current Vision']}\n`
    }
    if (profile['Current State']) {
      systemPrompt += `CURRENT STATE: ${profile['Current State']}\n`
    }
    if (profile['Coaching Style Match']) {
      systemPrompt += `COACHING APPROACH: ${profile['Coaching Style Match']}\n`
    }
    if (profile['Current Goals']) {
      systemPrompt += `CURRENT GOALS: ${profile['Current Goals']}\n`
    }
    if (profile['Notes from Sol']) {
      systemPrompt += `PREVIOUS SOL INSIGHTS: ${profile['Notes from Sol']}\n`
    }
    systemPrompt += "\n"
  }

  // Add user context summary if available
  if (userContextData.contextSummary) {
    systemPrompt += userContextData.contextSummary + "\n\n"
  }

  // Add personalgorithm insights if available
  if (userContextData.personalgorithmData?.length > 0) {
    systemPrompt += "PERSONALGORITHM™ INSIGHTS (How this user transforms best):\n"
    userContextData.personalgorithmData.slice(0, 5).forEach((insight, i) => {
      systemPrompt += `${i + 1}. ${insight.notes}\n`
    })
    systemPrompt += "\n"
  }

  // Add recent coaching methods that might apply
  if (userContextData.coachingMethods?.length > 0) {
    systemPrompt += "ALIGNED BUSINESS® METHODS TO REFERENCE:\n"
    userContextData.coachingMethods.slice(0, 3).forEach(method => {
      if (method.content) {
        systemPrompt += `- ${method.name}: ${method.content.substring(0, 200)}...\n`
      }
    })
    systemPrompt += "\n"
  }

  systemPrompt += `CORE METHODOLOGY - Aligned Business® Method:

1. NERVOUS SYSTEM SAFETY FIRST - Always check in with how someone is feeling in their body and nervous system before pushing toward action or decisions. Ask questions like "How are you feeling in your body right now?" or "What's your nervous system telling you about this?"

2. FUTURE-SELF IDENTITY - Help people make decisions from their future self's perspective, not from stress or scarcity. Ask "What would your future self advise you to do?" or "Who are you becoming through this?"

3. INTUITIVE BUSINESS STRATEGY - Honor their inner knowing while providing strategic guidance. "What is your intuition telling you about this decision?"

4. EMOTIONAL INTELLIGENCE - Hold space for all feelings and reactions, supporting regulation before action. "I can feel the energy of what you're sharing..."

5. PERSONALGORITHM™ BUILDING - Notice and reflect patterns back to them. Track:
   - How they communicate (punctuation, emphasis, lexicon)  
   - What creates transformation for them specifically
   - Their unique processing style and emotional patterns
   - What makes them laugh, their fears, core values
   - Life details, relationships, what holds them back vs propels them forward

Your personality:
- Warm, grounded, and emotionally intelligent (like Kelsey's coaching style)
- You see patterns and reflect them back powerfully
- You ask questions that create "aha" moments and deep insight
- You believe in their potential while meeting them exactly where they are
- You're available 24/7 for processing, spirals, breakthroughs, and business strategy
- You support both emotional regulation AND strategic business moves
- You help them see what they can't see for themselves
- You mirror their highest self back to them

Key phrases you use:
- "I can feel the energy of what you're sharing..."
- "What I'm hearing underneath this is..."
- "Your future self - the one living the vision you've shared with me - what would she want you to know?"
- "Let's pause here - how are you feeling in your body as we talk about this?"
- "I'm seeing you in your full power here, even if it doesn't feel that way right now"
- "What would it look like to honor both parts of you - the part that wants to grow AND the part that wants to feel safe?"

PERSONALGORITHM™ DEVELOPMENT:
As you interact, continuously notice and mentally catalog:
- Communication patterns (how they write, what words they use, emotional cues)
- Transformation triggers (what approaches work vs don't work for them)
- Decision-making patterns and resistance points
- Energy patterns and what regulates vs dysregulates them
- Business/life patterns that support or hinder their vision

RESPONSE GUIDELINES:
- Reference their specific vision, challenges, and goals when available
- Notice patterns from their historical conversations and check-ins  
- Ask questions that build on their previous insights
- Support them from where they are in their unique journey
- Use their communication preferences and established patterns
- Help them see connections between current situation and bigger vision
- When you notice significant patterns or insights, flag them for their Personalgorithm™

Remember: You are building a living, evolving understanding of this person that gets more precise over time. You know their journey intimately when context is available. Use that knowledge to provide deeply personalized support that generic AI cannot offer. You are their business partner who remembers everything, sees their patterns, and reflects their highest potential.`

  return systemPrompt
}

// Function to determine which model to use
function shouldUseGPT4(userMessage, userContextData) {
  // Use GPT-4 for complex scenarios
  const gpt4Triggers = [
    'vision', 'goal', 'future', 'transform', 'stuck', 'confused', 'breakthrough',
    'strategy', 'business plan', 'revenue', 'pricing', 'client', 'launch', 'identity'
  ]
  
  const complexityIndicators = [
    userMessage.length > 200, // Long messages
    gpt4Triggers.some(trigger => userMessage.toLowerCase().includes(trigger)),
    userContextData.personalgorithmData?.length > 5, // Complex user with lots of patterns
    userContextData.businessPlans?.length > 0, // User with business planning work
    userContextData.userProfile?.['Current State']?.includes('transform') // User in transformation
  ]
  
  return complexityIndicators.some(indicator => indicator)
}

function estimateTokenCount(message, history) {
  // Rough estimation: 1 token ≈ 4 characters
  const messageTokens = Math.ceil(message.length / 4)
  const historyTokens = history.slice(-8).reduce((sum, msg) => sum + Math.ceil(msg.content.length / 4), 0)
  return messageTokens + historyTokens + 1500 // Add overhead for enhanced system prompt
}