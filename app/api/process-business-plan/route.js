// ==================== app/api/process-business-plan/route.js ====================

export async function POST(request) {
  console.log('=== PROCESSING BUSINESS PLAN ===')
  
  try {
    const { email, businessPlanData } = await request.json()
    
    if (!email || !businessPlanData) {
      return NextResponse.json({ 
        error: 'Email and business plan data required' 
      }, { status: 400 })
    }

    console.log('Processing business plan for user:', email)

    // Create business plan entry  
    const businessPlanEntry = await createBusinessPlanEntry(email, businessPlanData)
    
    // Update user profile with business context
    const profileUpdates = {}
    if (businessPlanData.topGoals) {
      profileUpdates['Current Goals'] = businessPlanData.topGoals
    }
    if (businessPlanData.businessType || businessPlanData.stage) {
      const existingProfile = await getUserProfile(email)
      const existingTags = existingProfile?.['Tags'] || ''
      const newTags = `${businessPlanData.businessType || ''}, business-planning, ${businessPlanData.stage || ''}`
      profileUpdates['Tags'] = existingTags ? `${existingTags}, ${newTags}` : newTags
    }
    
    if (Object.keys(profileUpdates).length > 0) {
      await updateUserProfile(email, profileUpdates)
    }
    
    // Create Personalgorithm entries from business plan insights
    if (businessPlanData.challenges) {
      await createPersonalgorithmEntryNew(
        email, 
        `Business challenges identified: ${businessPlanData.challenges}. This reveals areas where targeted support and strategy development will be most valuable.`,
        ['business-plan', 'challenges', 'strategy']
      )
    }
    
    if (businessPlanData.idealClient) {
      await createPersonalgorithmEntryNew(
        email,
        `Ideal client profile shows they understand their market and have clarity on who they serve best: ${businessPlanData.idealClient}`,
        ['business-plan', 'client-clarity', 'market-awareness']
      )
    }
    
    console.log('✅ Business plan processed successfully')

    return NextResponse.json({
      success: true,
      businessPlanEntry: businessPlanEntry,
      profileUpdates: profileUpdates,
      message: 'Business plan processed successfully! Your strategic insights have been added to your Personalgorithm™.'
    })

  } catch (error) {
    console.error('❌ Business plan processing error:', error)
    return NextResponse.json({
      error: 'Failed to process business plan',
      details: error.message
    }, { status: 500 })
  }
}

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
          'Potential Problem Solving': planData.challenges || '',
          'Top 3 Goals': planData.topGoals || '',
          'Next Steps': planData.nextSteps || '',
          'Ideal Client': planData.idealClient || '',
          'Current Offers & Pricing': planData.currentOffers || '',
          'Qualified Lead Factors': planData.leadFactors || '',
          'Marketing System': planData.marketingSystem || '',
          'Sales System': planData.salesSystem || '',
          'Sol Notes': `Generated from business planning session on ${new Date().toLocaleDateString()}`
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