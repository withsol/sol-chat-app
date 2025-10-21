// app/api/generate-business-plan/route.js
import { NextResponse } from 'next/server'

export async function POST(request) {
  console.log('=== AUTO-GENERATING ALIGNED BUSINESS PLAN ===')
  
  try {
    const { email, planType = 'full', updateExisting = false } = await request.json()
    
    if (!email) {
      return NextResponse.json({ 
        error: 'Email required' 
      }, { status: 400 })
    }

    console.log('Generating business plan for:', email, 'Type:', planType)

    // Gather comprehensive user context for plan generation
    const userContext = await gatherUserContextForPlan(email)
    
    if (!userContext.userProfile) {
      return NextResponse.json({ 
        error: 'User profile not found' 
      }, { status: 404 })
    }

    // Check if user already has a recent business plan
    const existingPlan = userContext.businessPlans?.[0]
    if (existingPlan && !updateExisting) {
      const planAge = Date.now() - new Date(existingPlan['Date Submitted']).getTime()
      const daysSincePlan = planAge / (1000 * 60 * 60 * 24)
      
      if (daysSincePlan < 30) { // Less than 30 days old
        return NextResponse.json({
          success: false,
          message: 'You have a recent business plan. Use updateExisting=true to create a new one.',
          existingPlan: existingPlan,
          planAge: Math.round(daysSincePlan)
        })
      }
    }

    // Generate the business plan using Sol's intelligence
    const generatedPlan = await generateAlignedBusinessPlan(userContext, planType)
    
    // Create the business plan entry in Airtable
    const businessPlanEntry = await createBusinessPlanEntry(email, generatedPlan)
    
    // Update user profile with new business context
    const profileUpdates = {
      'Current Goals': generatedPlan.topGoals || userContext.userProfile['Current Goals'],
      'Current State': `Business plan updated: ${new Date().toLocaleDateString()}. ${generatedPlan.currentState || userContext.userProfile['Current State']}`
    }

    // Update tags with business planning context
    const existingTags = userContext.userProfile['Tags'] || ''
    const newTags = `business-plan-generated, strategic-planning, ${generatedPlan.businessStage || 'planning-stage'}`
    const allTags = existingTags ? `${existingTags}, ${newTags}` : newTags
    profileUpdates['Tags'] = allTags

    await updateUserProfile(email, profileUpdates)
    
    // Create Personalgorithm entries about their planning insights
    if (generatedPlan.personalgorithmInsights?.length > 0) {
      for (const insight of generatedPlan.personalgorithmInsights) {
        await createPersonalgorithmEntryNew(email, insight, ['business-plan-generated', 'strategic-insights'])
      }
    }

    console.log('✅ Business plan generated successfully')

    return NextResponse.json({
      success: true,
      businessPlan: generatedPlan,
      businessPlanEntry: businessPlanEntry,
      profileUpdates: profileUpdates,
      message: 'Your Aligned Business Plan has been generated based on everything Sol knows about you! Check your business plan for your custom strategy.',
      insights: {
        dataSourcesUsed: userContext.dataSources,
        planCompleteness: calculatePlanCompleteness(generatedPlan),
        nextSteps: generatedPlan.nextSteps
      }
    })

  } catch (error) {
    console.error('❌ Business plan generation error:', error)
    return NextResponse.json({
      error: 'Failed to generate business plan',
      details: error.message
    }, { status: 500 })
  }
}

// ==================== CONTEXT GATHERING ====================

async function gatherUserContextForPlan(email) {
  try {
    console.log('Gathering comprehensive context for business plan generation')
    
    // Get user record and related data
    const userProfile = await getUserProfile(email)
    const userRecordId = await getUserRecordId(email)
    
    if (!userRecordId) {
      throw new Error('User not found')
    }

    // Gather all relevant data in parallel
    const [
      personalgorithm,
      visioning,
      businessPlans,
      weeklyCheckins,
      recentMessages,
      alignedBusinessMethods
    ] = await Promise.allSettled([
      getPersonalgorithmData(userRecordId),
      getVisioningData(userRecordId),
      getBusinessPlanData(userRecordId),
      getWeeklyCheckins(userRecordId),
      getRecentMessages(email),
      getAlignedBusinessMethods()
    ])

    const context = {
      userProfile,
      personalgorithm: personalgorithm.status === 'fulfilled' ? personalgorithm.value : [],
      visioning: visioning.status === 'fulfilled' ? visioning.value : null,
      businessPlans: businessPlans.status === 'fulfilled' ? businessPlans.value : [],
      weeklyCheckins: weeklyCheckins.status === 'fulfilled' ? weeklyCheckins.value : [],
      recentMessages: recentMessages.status === 'fulfilled' ? recentMessages.value : [],
      alignedBusinessMethods: alignedBusinessMethods.status === 'fulfilled' ? alignedBusinessMethods.value : [],
      dataSources: []
    }

    // Track what data sources we have for transparency
    if (userProfile) context.dataSources.push('User Profile')
    if (context.personalgorithm.length > 0) context.dataSources.push(`Personalgorithm (${context.personalgorithm.length} insights)`)
    if (context.visioning) context.dataSources.push('Visioning Homework')
    if (context.businessPlans.length > 0) context.dataSources.push(`Previous Business Plans (${context.businessPlans.length})`)
    if (context.weeklyCheckins.length > 0) context.dataSources.push(`Weekly Check-ins (${context.weeklyCheckins.length})`)
    if (context.recentMessages.length > 0) context.dataSources.push(`Recent Conversations (${context.recentMessages.length})`)

    console.log('Context gathered from:', context.dataSources.join(', '))
    
    return context

  } catch (error) {
    console.error('Error gathering user context:', error)
    throw error
  }
}

// ==================== BUSINESS PLAN GENERATION ====================

async function generateAlignedBusinessPlan(userContext, planType = 'full') {
  try {
    console.log('Generating Aligned Business Plan using Sol intelligence...')
    
    const planPrompt = buildBusinessPlanPrompt(userContext, planType)
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        max_tokens: 2000,
        temperature: 0.4,
        messages: [{ role: 'user', content: planPrompt }]
      })
    })

    if (!response.ok) {
      throw new Error(`Business plan generation failed: ${response.status}`)
    }

    const result = await response.json()
    const planContent = result.choices[0].message.content

    console.log('Raw plan generated, parsing...')

    // Parse the structured plan response
    const businessPlan = parseBusinessPlanResponse(planContent, userContext)
    
    console.log('✅ Business plan generated successfully')
    return businessPlan

  } catch (error) {
    console.error('Error generating business plan:', error)
    throw error
  }
}

function buildBusinessPlanPrompt(userContext, planType) {
  const { userProfile, personalgorithm, visioning, businessPlans, weeklyCheckins, alignedBusinessMethods } = userContext
  
  let prompt = `You are Sol™, creating a personalized Aligned Business Plan using Kelsey's Aligned Business® Method. Generate a comprehensive business plan based on everything you know about this person.

USER CONTEXT:
Email: ${userProfile['User ID'] || 'Unknown'}
Current Vision: ${userProfile['Current Vision'] || 'Not set'}
Current Goals: ${userProfile['Current Goals'] || 'Not set'}
Current State: ${userProfile['Current State'] || 'Not set'}
Coaching Style Match: ${userProfile['Coaching Style Match'] || 'Not determined'}
Tags: ${userProfile['Tags'] || 'None'}

`

  // Add Personalgorithm insights
  if (personalgorithm.length > 0) {
    prompt += `PERSONALGORITHM INSIGHTS (How this person operates best):\n`
    personalgorithm.forEach((insight, i) => {
      prompt += `${i + 1}. ${insight['Personalgorithm™ Notes']}\n`
    })
    prompt += '\n'
  }

  // Add visioning data if available
  if (visioning) {
    prompt += `VISIONING HOMEWORK INSIGHTS:\n`
    if (visioning['Summary of Visioning']) {
      prompt += `Summary: ${visioning['Summary of Visioning']}\n`
    }
    if (visioning['Action Steps']) {
      prompt += `Action Steps: ${visioning['Action Steps']}\n`
    }
    if (visioning['Notes for Sol']) {
      prompt += `Sol Notes: ${visioning['Notes for Sol']}\n`
    }
    prompt += '\n'
  }

  // Add recent check-in data
  if (weeklyCheckins.length > 0) {
    const latestCheckin = weeklyCheckins[0]
    prompt += `LATEST WEEKLY CHECK-IN:\n`
    if (latestCheckin['This is who I am now...']) {
      prompt += `Identity: ${latestCheckin['This is who I am now...']}\n`
    }
    if (latestCheckin['What worked this week?']) {
      prompt += `Recent Wins: ${latestCheckin['What worked this week?']}\n`
    }
    if (latestCheckin['What would you love help with right now?']) {
      prompt += `Current Challenges: ${latestCheckin['What would you love help with right now?']}\n`
    }
    prompt += '\n'
  }

  // Add previous business plan context
  if (businessPlans.length > 0) {
    const previousPlan = businessPlans[0]
    prompt += `PREVIOUS BUSINESS PLAN CONTEXT:\n`
    if (previousPlan['Future Vision']) {
      prompt += `Previous Vision: ${previousPlan['Future Vision']}\n`
    }
    if (previousPlan['Top 3 Goals']) {
      prompt += `Previous Goals: ${previousPlan['Top 3 Goals']}\n`
    }
    prompt += '\n'
  }

  prompt += `ALIGNED BUSINESS® METHOD PRINCIPLES:
1. Nervous system safety first - sustainable growth aligned with capacity
2. Future-self identity - decisions from expansion, not stress
3. Intuitive business strategy - honor inner knowing + strategic guidance
4. Emotional intelligence - hold space for feelings while taking action
5. Personalgorithm building - leverage unique patterns and strengths

Create a comprehensive Aligned Business Plan in this EXACT format:

FUTURE_VISION: {
  "longTermVision": "3-7 year vision statement based on their patterns and goals",
  "coreValues": "3-5 core values that drive their business decisions",
  "missionStatement": "clear mission based on their purpose and what they've shared"
}

BUSINESS_ANALYSIS: {
  "businessStage": "startup/growing/scaling/established based on context",
  "currentStrengths": "what they do well based on Personalgorithm insights",
  "keyOpportunities": "growth opportunities aligned with their vision",
  "problemsToSolve": "main challenges to address based on their context"
}

TOP_3_GOALS: {
  "goal1": "specific, measurable 90-day goal based on their capacity",
  "goal2": "specific, measurable 90-day goal aligned with their vision", 
  "goal3": "specific, measurable 90-day goal leveraging their strengths"
}

IDEAL_CLIENT: {
  "clientProfile": "detailed ideal client based on their visioning and Personalgorithm",
  "clientProblems": "specific problems their business solves",
  "qualifiedLeadFactors": "3-5 factors that make someone a qualified lead"
}

OFFERS_STRATEGY: {
  "currentOffers": "their current offerings with recommended improvements",
  "futureOffers": "recommended new offerings based on their vision and strengths",
  "pricingStrategy": "pricing approach aligned with their values and market position"
}

MARKETING_SYSTEM: {
  "discoverability": "how ideal clients will find them (aligned with their style)",
  "nurturingStrategy": "how to build trust and relationships",
  "conversionStrategy": "how qualified leads become paying clients"
}

SALES_SYSTEM: {
  "salesProcess": "step-by-step sales process aligned with their communication style",
  "salesSystemComponents": "tools and systems needed for their sales process",
  "conversionOptimization": "how to improve their sales conversion based on their patterns"
}

NEXT_STEPS: {
  "immediate30Days": "3-5 specific actions for the next 30 days",
  "next60Days": "3-5 specific actions for days 31-60", 
  "next90Days": "3-5 specific actions for days 61-90"
}

PERSONALGORITHM_INSIGHTS: [
  "insight about how this plan leverages their unique patterns",
  "insight about potential resistance points based on their history",
  "insight about what will make this plan successful for them specifically"
]

Base everything on their actual context and Personalgorithm patterns. Make it deeply personal and actionable, not generic business advice.`

  return prompt
}

function parseBusinessPlanResponse(planContent, userContext) {
  try {
    // Extract JSON sections from the response
    const sections = {}
    
    const sectionNames = [
      'FUTURE_VISION', 'BUSINESS_ANALYSIS', 'TOP_3_GOALS', 'IDEAL_CLIENT',
      'OFFERS_STRATEGY', 'MARKETING_SYSTEM', 'SALES_SYSTEM', 'NEXT_STEPS',
      'PERSONALGORITHM_INSIGHTS'
    ]
    
    for (const sectionName of sectionNames) {
      const sectionMatch = planContent.match(new RegExp(`${sectionName}: (\\{[\\s\\S]*?\\})`, 'i'))
      if (sectionMatch) {
        try {
          sections[sectionName] = JSON.parse(sectionMatch[1])
        } catch (parseError) {
          console.error(`Failed to parse ${sectionName}:`, parseError)
          sections[sectionName] = {}
        }
      }
    }

    // Extract array section
    const insightsMatch = planContent.match(/PERSONALGORITHM_INSIGHTS: \[([^\]]*)\]/s)
    let personalgorithmInsights = []
    if (insightsMatch) {
      personalgorithmInsights = insightsMatch[1]
        .split('\n')
        .map(line => line.replace(/^[\s",-]+|[\s",-]+$/g, '').trim())
        .filter(line => line.length > 10)
    }

    // Build the final business plan object
    const businessPlan = {
      // Future Vision
      futureVision: sections.FUTURE_VISION?.longTermVision || 'Vision to be developed',
      coreValues: sections.FUTURE_VISION?.coreValues || 'Values to be defined',
      missionStatement: sections.FUTURE_VISION?.missionStatement || 'Mission to be crafted',
      
      // Business Analysis
      businessStage: sections.BUSINESS_ANALYSIS?.businessStage || 'growing',
      currentStrengths: sections.BUSINESS_ANALYSIS?.currentStrengths || 'Strengths to be identified',
      keyOpportunities: sections.BUSINESS_ANALYSIS?.keyOpportunities || 'Opportunities to be explored',
      challenges: sections.BUSINESS_ANALYSIS?.problemsToSolve || 'Challenges to be addressed',
      
      // Goals
      topGoals: formatGoals(sections.TOP_3_GOALS),
      
      // Ideal Client
      idealClient: sections.IDEAL_CLIENT?.clientProfile || 'Ideal client to be defined',
      clientProblems: sections.IDEAL_CLIENT?.clientProblems || 'Client problems to be identified',
      qualifiedLeadFactors: sections.IDEAL_CLIENT?.qualifiedLeadFactors || 'Lead qualification to be developed',
      
      // Offers & Pricing
      currentOffers: sections.OFFERS_STRATEGY?.currentOffers || userContext.userProfile['Current Offerings'] || 'Offers to be defined',
      futureOffers: sections.OFFERS_STRATEGY?.futureOffers || 'Future offers to be developed',
      pricingStrategy: sections.OFFERS_STRATEGY?.pricingStrategy || 'Pricing strategy to be determined',
      
      // Marketing
      marketingSystem: formatMarketingSystem(sections.MARKETING_SYSTEM),
      discoverability: sections.MARKETING_SYSTEM?.discoverability || 'Discovery strategy to be developed',
      nurturingStrategy: sections.MARKETING_SYSTEM?.nurturingStrategy || 'Nurturing approach to be defined',
      
      // Sales
      salesSystem: formatSalesSystem(sections.SALES_SYSTEM),
      salesProcess: sections.SALES_SYSTEM?.salesProcess || 'Sales process to be developed',
      
      // Next Steps
      nextSteps: formatNextSteps(sections.NEXT_STEPS),
      immediate30Days: sections.NEXT_STEPS?.immediate30Days || 'Next steps to be defined',
      
      // Insights
      personalgorithmInsights: personalgorithmInsights,
      
      // Metadata
      generatedDate: new Date().toISOString(),
      basedOnData: userContext.dataSources,
      planCompleteness: 'Generated from available context'
    }

    return businessPlan

  } catch (error) {
    console.error('Error parsing business plan response:', error)
    
    // Return fallback plan
    return createFallbackBusinessPlan(userContext)
  }
}

function formatGoals(goalsSection) {
  if (!goalsSection) return 'Goals to be determined based on vision and capacity'
  
  const goals = []
  if (goalsSection.goal1) goals.push(`1) ${goalsSection.goal1}`)
  if (goalsSection.goal2) goals.push(`2) ${goalsSection.goal2}`)
  if (goalsSection.goal3) goals.push(`3) ${goalsSection.goal3}`)
  
  return goals.length > 0 ? goals.join(' ') : 'Goals to be determined'
}

function formatMarketingSystem(marketingSection) {
  if (!marketingSection) return 'Marketing system to be developed based on communication style and ideal client'
  
  return `Discovery: ${marketingSection.discoverability || 'TBD'}. Nurturing: ${marketingSection.nurturingStrategy || 'TBD'}. Conversion: ${marketingSection.conversionStrategy || 'TBD'}.`
}

function formatSalesSystem(salesSection) {
  if (!salesSection) return 'Sales system to be developed based on communication preferences and client needs'
  
  return `Process: ${salesSection.salesProcess || 'TBD'}. Components: ${salesSection.salesSystemComponents || 'TBD'}. Optimization: ${salesSection.conversionOptimization || 'TBD'}.`
}

function formatNextSteps(nextStepsSection) {
  if (!nextStepsSection) return 'Next steps to be determined based on current capacity and priorities'
  
  const steps = []
  if (nextStepsSection.immediate30Days) steps.push(`30 days: ${nextStepsSection.immediate30Days}`)
  if (nextStepsSection.next60Days) steps.push(`60 days: ${nextStepsSection.next60Days}`)
  if (nextStepsSection.next90Days) steps.push(`90 days: ${nextStepsSection.next90Days}`)
  
  return steps.length > 0 ? steps.join(' | ') : 'Action plan to be developed'
}

function createFallbackBusinessPlan(userContext) {
  const userProfile = userContext.userProfile
  
  return {
    futureVision: userProfile['Current Vision'] || 'Business vision to be developed through coaching',
    topGoals: userProfile['Current Goals'] || 'Goals to be defined based on vision and capacity',
    challenges: 'Strategic challenges to be identified and addressed',
    idealClient: 'Ideal client profile to be developed',
    currentOffers: 'Current offerings to be documented and optimized',
    marketingSystem: 'Marketing system to be built based on strengths and communication style',
    salesSystem: 'Sales system to be developed aligned with values and client needs',
    nextSteps: 'Action plan to be created based on priorities and capacity',
    personalgorithmInsights: [
      'Business plan generated from available context - ready for strategic development',
      'Comprehensive planning shows commitment to structured business growth'
    ],
    generatedDate: new Date().toISOString(),
    basedOnData: userContext.dataSources,
    planCompleteness: 'Foundational plan created - ready for development'
  }
}

function calculatePlanCompleteness(plan) {
  const requiredFields = ['futureVision', 'topGoals', 'idealClient', 'currentOffers', 'marketingSystem', 'salesSystem', 'nextSteps']
  const completedFields = requiredFields.filter(field => 
    plan[field] && plan[field] !== 'TBD' && !plan[field].includes('to be')
  ).length
  
  return Math.round((completedFields / requiredFields.length) * 100)
}

// ==================== BUSINESS PLAN CREATION ====================

async function createBusinessPlanEntry(email, planData) {
  try {
    // Get user record ID for linking
    const userRecordId = await getUserRecordId(email)
    if (!userRecordId) {
      throw new Error('User record not found for business plan entry')
    }

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
          'Potential Problem Solving': Array.isArray(planData.challenges) ? planData.challenges.join(', ') : (planData.challenges || ''),
          'Top 3 Goals': Array.isArray(planData.topGoals) ? planData.topGoals.join(', ') : (planData.topGoals || ''),
          'Next Steps': Array.isArray(planData.nextSteps) ? planData.nextSteps.join(', ') : (planData.nextSteps || ''),
          'Ideal Client': planData.idealClient || '',
          'Current Offers & Pricing': planData.currentOffers || '',
          'Qualified Lead Factors': Array.isArray(planData.qualifiedLeadFactors) ? planData.qualifiedLeadFactors.join(', ') : (planData.qualifiedLeadFactors || ''),
          'Marketing System': planData.marketingSystem || '',
          'Sales System': planData.salesSystem || '',
          'Sol Notes': `Auto-generated business plan on ${new Date().toLocaleDateString()}. Based on: ${planData.basedOnData?.join(', ') || 'user profile'}. Completeness: ${calculatePlanCompleteness(planData)}%`
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to create business plan entry: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log('✅ Business plan entry created:', result.id)
    return result
    
  } catch (error) {
    console.error('Error creating business plan entry:', error)
    throw error
  }
}

// ==================== HELPER FUNCTIONS ====================

// Helper funtions //

async function fetchUserContextForPersonalgorithm(email) {
  try {
    const [userProfile, recentMessages, existingPersonalgorithm] = await Promise.allSettled([
      getUserProfile(email),
      getRecentMessages(email, 5),
      getPersonalgorithmData(email, 5)
    ])

    const context = {
      userProfile: userProfile.status === 'fulfilled' ? userProfile.value : null,
      recentMessages: recentMessages.status === 'fulfilled' ? recentMessages.value : [],
      existingPersonalgorithm: existingPersonalgorithm.status === 'fulfilled' ? existingPersonalgorithm.value : []
    }

    let summary = "USER CONTEXT FOR PERSONALGORITHM™ ANALYSIS:\n\n"
    
    if (context.userProfile) {
      summary += `Current Vision: ${context.userProfile['Current Vision'] || 'Not set'}\n`
      summary += `Current State: ${context.userProfile['Current State'] || 'Not set'}\n`
      summary += `Tags: ${context.userProfile['Tags'] || 'None'}\n\n`
    }
    
    if (context.existingPersonalgorithm.length > 0) {
      summary += "EXISTING PERSONALGORITHM™ PATTERNS:\n"
      context.existingPersonalgorithm.slice(0, 3).forEach((entry, i) => {
        summary += `${i + 1}. ${entry.notes}\n`
      })
    }
    
    context.contextSummary = summary
    return context

  } catch (error) {
    console.error('Error fetching user context for Personalgorithm™:', error)
    return { contextSummary: 'Limited context available' }
  }
}

function parsePersonalgorithmAnalysis(analysis) {
  const categories = [
    'COMMUNICATION_PATTERNS',
    'DECISION_MAKING_STYLE', 
    'TRANSFORMATION_TRIGGERS',
    'EMOTIONAL_PATTERNS',
    'BUSINESS_MINDSET',
    'PROCESSING_STYLE',
    'STRENGTHS_LEVERAGE',
    'GROWTH_EDGES',
    'UNIQUE_FACTORS'
  ]

  const insights = {}

  for (const category of categories) {
    const match = analysis.match(new RegExp(`${category}: \\[([\\s\\S]*?)\\]`))
    if (match) {
      insights[category] = match[1]
        .split('\n')
        .map(line => line.replace(/^["\s,-]+|["\s,-]+$/g, '').trim())
        .filter(line => line.length > 20)
    } else {
      insights[category] = []
    }
  }

  return insights
}

async function createPersonalgorithmEntry(email, notes, tags = ['auto-generated']) {
  try {
    const userRecordId = await getUserRecordId(email)
    if (!userRecordId) return null

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
          'User': [userRecordId],
          'Personalgorithm™ Notes': notes,
          'Date created': new Date().toISOString(),
          'Tags': Array.isArray(tags) ? tags.join(', ') : tags
        }
      })
    })

    if (response.ok) {
      const result = await response.json()
      console.log('✅ Personalgorithm™ entry created:', result.id)
      return result
    }
    return null
  } catch (error) {
    console.error('Error creating Personalgorithm™ entry:', error)
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
    console.error('Error getting user profile:', error)
    return null
  }
}

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

    if (!response.ok) return null
    const data = await response.json()
    return data.records.length > 0 ? data.records[0].id : null
  } catch (error) {
    console.error('Error getting user record ID:', error)
    return null
  }
}

async function getPersonalgorithmData(userRecordId) {
  try {
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Personalgorithm™?filterByFormula=FIND("${userRecordId}", ARRAYJOIN({User}))>0&sort[0][field]=Date created&sort[0][direction]=desc&maxRecords=10`
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}` }
    })

    if (response.ok) {
      const data = await response.json()
      return data.records.map(record => record.fields)
    }
    return []
  } catch (error) {
    console.error('Error getting Personalgorithm data:', error)
    return []
  }
}

async function getVisioningData(userRecordId) {
  try {
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Visioning?filterByFormula=FIND("${userRecordId}", ARRAYJOIN({User ID}))>0&sort[0][field]=Date of Submission&sort[0][direction]=desc&maxRecords=1`
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}` }
    })

    if (response.ok) {
      const data = await response.json()
      return data.records.length > 0 ? data.records[0].fields : null
    }
    return null
  } catch (error) {
    console.error('Error getting visioning data:', error)
    return null
  }
}

async function getBusinessPlanData(userRecordId) {
  try {
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Aligned Business® Plans?filterByFormula=FIND("${userRecordId}", ARRAYJOIN({User ID}))>0&sort[0][field]=Date Submitted&sort[0][direction]=desc&maxRecords=3`
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}` }
    })

    if (response.ok) {
      const data = await response.json()
      return data.records.map(record => record.fields)
    }
    return []
  } catch (error) {
    console.error('Error getting business plan data:', error)
    return []
  }
}

async function getWeeklyCheckins(userRecordId) {
  try {
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Weekly Check-in?filterByFormula=FIND("${userRecordId}", ARRAYJOIN({User ID}))>0&sort[0][field]=Check-in Date&sort[0][direction]=desc&maxRecords=3`
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}` }
    })

    if (response.ok) {
      const data = await response.json()
      return data.records.map(record => record.fields)
    }
    return []
  } catch (error) {
    console.error('Error getting weekly check-ins:', error)
    return []
  }
}

async function getRecentMessages(email) {
  try {
    const encodedEmail = encodeURIComponent(email)
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Messages?filterByFormula={User ID}="${encodedEmail}"&sort[0][field]=Timestamp&sort[0][direction]=desc&maxRecords=5`
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}` }
    })

    if (response.ok) {
      const data = await response.json()
      return data.records.map(record => record.fields)
    }
    return []
  } catch (error) {
    console.error('Error getting recent messages:', error)
    return []
  }
}

async function getAlignedBusinessMethods() {
  try {
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Aligned Business® Method?maxRecords=10`
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}` }
    })

    if (response.ok) {
      const data = await response.json()
      return data.records.map(record => record.fields)
    }
    return []
  } catch (error) {
    console.error('Error getting Aligned Business methods:', error)
    return []
  }
}

async function updateUserProfile(email, updates) {
  try {
    const findResponse = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Users?filterByFormula={User ID}="${encodeURIComponent(email)}"`,
      { headers: { 'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}` } }
    )

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

async function createPersonalgorithmEntryNew(email, notes, tags = ['auto-generated']) {
  try {
    const userRecordId = await getUserRecordId(email)
    if (!userRecordId) return null

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
          'User': [userRecordId],
          'Personalgorithm™ Notes': notes,
          'Date created': new Date().toISOString(),
          'Tags': Array.isArray(tags) ? tags.join(', ') : tags
        }
      })
    })

    if (response.ok) {
      console.log('✅ Personalgorithm entry created')
      return await response.json()
    }
    return null
  } catch (error) {
    console.error('Error creating Personalgorithm entry:', error)
    return null
  }
}