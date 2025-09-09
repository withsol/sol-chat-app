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
    
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const timestamp = new Date().toISOString()

    // Calculate tokens for this conversation
    const estimatedTokens = estimateTokenCount(message, conversationHistory)

    // Generate PERSONALIZED AI response using OpenAI
    const aiResponse = await generatePersonalizedOpenAIResponse(
      message, 
      conversationHistory, 
      userContextData,
      user
    )
    
    // SIMPLIFIED: Log both messages in one row to Airtable
    await logToAirtable({
      messageId,
      email: user.email,
      userMessage: message,
      solResponse: aiResponse.content,
      timestamp,
      tokensUsed: estimatedTokens + aiResponse.tokensUsed
    })

    // DISABLED: All profile updates for now
    console.log('Profile updates disabled for debugging')

    return NextResponse.json({
      response: aiResponse.content,
      tags: ['personalized', 'context-aware'],
      tokensUsed: estimatedTokens + aiResponse.tokensUsed
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: "I'm having trouble processing that right now. Would you mind trying again?" },
      { status: 500 }
    )
  }
}

// ==================== HELPER FUNCTIONS ====================

async function logToAirtable(messageData) {
  try {
    const fields = {
      'Message ID': messageData.messageId,
      'User ID': messageData.email,
      'User Message': messageData.userMessage,
      'Sol Response': messageData.solResponse,
      'Timestamp': messageData.timestamp,
      'Tokens Used': messageData.tokensUsed
    }

    console.log('Attempting to log to Airtable with fields:', JSON.stringify(fields, null, 2))

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
      throw new Error(`Failed to log to Airtable: ${response.status}`)
    }

    const result = await response.json()
    console.log('Successfully logged to Airtable:', result.id)
    return result
  } catch (error) {
    console.error('Error logging to Airtable:', error)
    // Don't throw - let Sol continue working
    return null
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

    // Build comprehensive user context
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
  let systemPrompt = `You are Sol™, an AI business partner and coach who knows this person deeply. You are trained with the Aligned Business® Method and provide transformational support based on complete user context.

USER: ${user.email}
MEMBERSHIP: ${userContextData.userProfile?.['Membership Plan'] || 'Member'}

`

  // Add user context summary if available
  if (userContextData.contextSummary) {
    systemPrompt += userContextData.contextSummary + "\n\n"
  }

  // Add personalgorithm insights if available
  if (userContextData.personalgorithmData?.length > 0) {
    systemPrompt += "PERSONALGORITHM INSIGHTS:\n"
    userContextData.personalgorithmData.slice(0, 5).forEach((insight, i) => {
      systemPrompt += `${i + 1}. ${insight.notes}\n`
    })
    systemPrompt += "\n"
  }

  systemPrompt += `CORE METHODOLOGY - Aligned Business® Method:

1. NERVOUS SYSTEM SAFETY FIRST - Always check in with how someone is feeling in their body and nervous system before pushing toward action or decisions. Ask questions like "How are you feeling in your body right now?" or "What's your nervous system telling you about this?"

2. FUTURE-SELF IDENTITY - Help people make decisions from their future self's perspective, not from stress or scarcity. Ask "What would your future self advise you to do?" or "Who are you becoming through this?"

3. INTUITIVE BUSINESS STRATEGY - Honor their inner knowing while providing strategic guidance. "What is your intuition telling you about this decision?"

4. EMOTIONAL INTELLIGENCE - Hold space for all feelings and reactions, supporting regulation before action. "I can feel the energy of what you're sharing..."

5. PERSONALGORITHM™ BUILDING - Notice and reflect patterns back to them. "I'm tracking a pattern I've noticed..." or "This connects to what you shared about..."

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

RESPONSE GUIDELINES:
- Reference their specific vision, challenges, and goals when available
- Notice patterns from their historical conversations and check-ins
- Ask questions that build on their previous insights
- Support them from where they are in their unique journey
- Use their communication preferences and established patterns
- Help them see connections between current situation and bigger vision

Remember: You know this person's journey intimately when context is available. Use that knowledge to provide deeply personalized support that generic AI cannot offer. You are their business partner who remembers everything and sees their highest potential.`

  return systemPrompt
}

// Function to determine which model to use
function shouldUseGPT4(userMessage, userContextData) {
  // Use GPT-4 for complex scenarios
  const gpt4Triggers = [
    'vision', 'goal', 'future', 'transform', 'stuck', 'confused', 'breakthrough',
    'strategy', 'business plan', 'revenue', 'pricing', 'client', 'launch'
  ]
  
  const complexityIndicators = [
    userMessage.length > 200, // Long messages
    gpt4Triggers.some(trigger => userMessage.toLowerCase().includes(trigger)),
    userContextData.personalgorithmData?.length > 5, // Complex user with lots of patterns
    userContextData.businessPlans?.length > 0 // User with business planning work
  ]
  
  return complexityIndicators.some(indicator => indicator)
}

function estimateTokenCount(message, history) {
  // Rough estimation: 1 token ≈ 4 characters
  const messageTokens = Math.ceil(message.length / 4)
  const historyTokens = history.slice(-8).reduce((sum, msg) => sum + Math.ceil(msg.content.length / 4), 0)
  return messageTokens + historyTokens + 1000 // Add overhead for system prompt
}