// ==================== API HELPER FUNCTIONS ====================

// Helper function to log messages to Airtable
async function logToAirtable(messageData) {
  try {
    const fields = {}
    
    // Set the appropriate fields based on what's provided
    if (messageData.messageId) fields['Message ID'] = messageData.messageId
    if (messageData.email) fields['User ID'] = [messageData.email] // Array for linked record
    if (messageData.userMessage) fields['User Message'] = messageData.userMessage
    if (messageData.solResponse) fields['Sol Response'] = messageData.solResponse
    if (messageData.timestamp) fields['Timestamp'] = messageData.timestamp
    if (messageData.tokensUsed) fields['Tokens Used'] = messageData.tokensUsed
    if (messageData.tags) fields['Tags'] = messageData.tags

    const response = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fields })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Airtable logging error:', errorData)
      throw new Error(`Failed to log to Airtable: ${response.status}`)
    }

    const result = await response.json()
    console.log('Message logged to Airtable:', result.id)
    return result
  } catch (error) {
    console.error('Error logging to Airtable:', error)
    throw error
  }
}

// Helper function to update user fields
async function updateUserField(email, updates) {
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
    console.log('User updated in Airtable:', result.id)
    return result
  } catch (error) {
    console.error('Error updating user field:', error)
    throw error
  }
}

// Helper function to create Personalgorithm entries
async function createPersonalgorithmEntry(email, notes, tags = []) {
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
          'User ID': [email], // Array for linked record
          'Personalgorithm™ Notes': notes,
          'Date created': new Date().toISOString(),
          'Tags': tags
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Failed to create Personalgorithm entry: ${response.status}`)
    }

    const result = await response.json()
    console.log('Personalgorithm entry created:', result.id)
    return result
  } catch (error) {
    console.error('Error creating Personalgorithm entry:', error)
    throw error
  }
}

// Helper function to create transcript entries
async function createTranscriptEntry(email, dateRange, transcriptLevel, fullTranscript, summary, insights) {
  try {
    const transcriptId = `ts_${dateRange}_${email.split('@')[0]}_${Date.now()}`
    
    const response = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Transcripts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          'Transcript ID': transcriptId,
          'User ID': [email], // Array for linked record
          'Dates of Transcript': dateRange,
          'Transcript Level': transcriptLevel,
          'Full Transcript': fullTranscript,
          'Summary': summary,
          'Insights': insights
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Failed to create transcript: ${response.status}`)
    }

    const result = await response.json()
    console.log('Transcript created:', result.id)
    return result
  } catch (error) {
    console.error('Error creating transcript:', error)
    throw error
  }
}

// Helper function to check and update monthly token rollover
async function checkMonthlyTokenRollover(email) {
  try {
    const user = await fetchUserProfile(email)
    if (!user) return

    const currentMonth = new Date().toISOString().slice(0, 7) // "2025-09"
    const lastTokenReset = user['Token Usage History']?.split('\n')[0]?.includes(currentMonth)

    if (!lastTokenReset) {
      // Need to rollover tokens for new month
      const currentUsage = user['Tokens Used this Month'] || 0
      const currentHistory = user['Token Usage History'] || ''
      
      const newHistory = `${currentMonth}: ${currentUsage} tokens\n${currentHistory}`
      
      await updateUserField(email, {
        'Tokens Used this Month': 0,
        'Token Usage History': newHistory
      })
      
      console.log(`Token rollover completed for ${email}`)
    }
  } catch (error) {
    console.error('Error checking token rollover:', error)
  }
}

// Export functions for use in other files
export {
  logToAirtable,
  updateUserField,
  createPersonalgorithmEntry,
  createTranscriptEntry,
  checkMonthlyTokenRollover
}

// ==================== OPENAI INTEGRATION SETUP ====================

/*
ENVIRONMENT VARIABLES YOU NEED TO ADD:

1. In your .env.local file, add:
   OPENAI_API_KEY=your_openai_api_key_here

2. In your Vercel environment variables (if deployed), add:
   OPENAI_API_KEY=your_openai_api_key_here

STEPS TO GET OPENAI API KEY:

1. Go to https://platform.openai.com/
2. Sign up or log in to your account
3. Go to "API Keys" in the dashboard
4. Click "Create new secret key"
5. Name it "Sol App" or similar
6. Copy the key and add it to your environment variables

OPENAI API PRICING (as of 2024):
- GPT-4 Turbo: $0.01 per 1K input tokens, $0.03 per 1K output tokens
- GPT-3.5 Turbo: $0.0005 per 1K input tokens, $0.0015 per 1K output tokens

COST OPTIMIZATION STRATEGY:
- Use GPT-3.5 for routine responses, daily summaries, tag generation
- Use GPT-4 for vision updates, Personalgorithm analysis, complex coaching
- This can reduce costs by 60-80% vs using GPT-4 for everything

USAGE MONITORING:
- OpenAI provides usage tracking in their dashboard
- The API returns actual token usage in the response
- We track this in the 'Tokens Used' field in your Messages table
*/

// Enhanced OpenAI response function with model selection
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
    
    // Check if response should trigger Personalgorithm analysis
    if (shouldAnalyzeForPersonalgorithm(userMessage, result.choices[0].message.content)) {
      // Queue for Personalgorithm analysis (could be async)
      setTimeout(() => analyzeForPersonalgorithm(user.email, userMessage, result.choices[0].message.content), 1000)
    }
    
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

// Function to analyze conversations for Personalgorithm insights
async function analyzeForPersonalgorithm(email, userMessage, solResponse) {
  try {
    const analysisPrompt = `Analyze this coaching conversation for Personalgorithm insights:

USER MESSAGE: ${userMessage}
SOL RESPONSE: ${solResponse}

Look for:
1. Communication patterns (punctuation, emphasis, word choice)
2. Emotional processing style
3. Decision-making patterns
4. Transformation triggers
5. Learning preferences
6. Resistance patterns
7. Values and beliefs expressed

Create a brief Personalgorithm insight (1-2 sentences) if you notice something significant about how this person operates, communicates, or can be best supported. If no significant pattern emerges, respond with "No significant pattern identified."`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo', // Use cheaper model for analysis
        max_tokens: 150,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: analysisPrompt
          }
        ]
      })
    })

    if (response.ok) {
      const result = await response.json()
      const insight = result.choices[0].message.content.trim()
      
      if (insight !== "No significant pattern identified.") {
        // Create Personalgorithm entry
        await createPersonalgorithmEntry(email, insight, ['auto-generated', 'communication-pattern'])
        console.log(`Personalgorithm insight created for ${email}`)
      }
    }
  } catch (error) {
    console.error('Error analyzing for Personalgorithm:', error)
  }
}

function shouldAnalyzeForPersonalgorithm(userMessage, solResponse) {
  // Analyze every 5th message to avoid over-analysis
  return Math.random() < 0.2 // 20% chance
}

// ==================== PACKAGE.JSON DEPENDENCIES ====================

/*
Make sure your package.json includes these dependencies:

{
  "dependencies": {
    "next": "^13.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}

No additional packages needed for OpenAI integration - we're using fetch API directly.
*/