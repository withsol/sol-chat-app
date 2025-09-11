import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    console.log('Checking Sol access for:', email)
    
    // Check if we're in beta mode
    const isBetaMode = process.env.BETA_MODE === 'true'
    
    // Always check Airtable first (for both beta and production)
    try {
      const airtableResponse = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Users?filterByFormula={User ID}="${email}"`, {
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      })

      if (airtableResponse.ok) {
        const airtableData = await airtableResponse.json()
        
        if (airtableData.records && airtableData.records.length > 0) {
          const user = airtableData.records[0].fields
          const membershipPlan = user['Membership Plan']
          
          console.log('User found in Airtable with plan:', membershipPlan)
          
          // In beta mode, allow beta testers
          if (isBetaMode) {
            const betaPlans = ['Test', 'Founding Member', 'Founding Member Life', 'Beta', 'Active']
            const isBetaTester = betaPlans.some(plan => 
              membershipPlan && membershipPlan.toLowerCase().includes(plan.toLowerCase())
            )
            
            if (isBetaTester) {
              console.log('Beta tester access granted for:', email)
              return NextResponse.json({
                hasActiveSubscription: true,
                email,
                accessType: 'beta_tester',
                membershipPlan
              })
            }
          } else {
            // Production mode - only allow active subscriptions
            const productionPlans = ['Active', 'Subscription', 'Paid']
            const hasActiveSubscription = productionPlans.some(plan => 
              membershipPlan && membershipPlan.toLowerCase().includes(plan.toLowerCase())
            )
            
            if (hasActiveSubscription) {
              console.log('Production access granted for:', email)
              return NextResponse.json({
                hasActiveSubscription: true,
                email,
                accessType: 'airtable_subscriber',
                membershipPlan
              })
            }
          }
        }
      }
    } catch (airtableError) {
      console.error('Airtable check failed:', airtableError)
    }

    // Only try Thrivecart if Airtable didn't grant access AND we're not in beta mode
    if (!isBetaMode) {
      try {
        console.log('Checking Thrivecart for:', email)
        const apiUrl = `https://api.thrivecart.com/learn/v1/students/${encodeURIComponent(email)}/enrollments`
        
        const thrivecartResponse = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.THRIVECART_API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        })

        if (thrivecartResponse.ok) {
          const enrollmentData = await thrivecartResponse.json()
          
          const hasSolEnrollment = enrollmentData.enrollments && 
            enrollmentData.enrollments.some(enrollment => 
              (enrollment.course_name === 'Sol™' || 
               enrollment.course_name === 'The Art of Becoming' || 
               enrollment.course_title?.includes('Sol')) &&
              enrollment.status === 'active'
            )

          if (hasSolEnrollment) {
            // Add them to Airtable for future reference
            await updateUserInAirtable(email, 'Active Subscription')
            
            return NextResponse.json({
              hasActiveSubscription: true,
              email,
              accessType: 'thrivecart_subscription'
            })
          }
        } else {
          console.error('Thrivecart API error:', thrivecartResponse.status)
        }
      } catch (thrivecartError) {
        console.error('Thrivecart check failed:', thrivecartError)
      }
    }

    // No access found
    return NextResponse.json({ 
      hasActiveSubscription: false, 
      error: isBetaMode 
        ? 'No beta access found. Please contact support if you should have access.'
        : 'No active subscription found. Please ensure you have an active subscription to The Art of Becoming program.'
    }, { status: 401 })

  } catch (error) {
    console.error('Authentication error:', error)
    return NextResponse.json({ 
      hasActiveSubscription: false, 
      error: 'Authentication check failed. Please try again.' 
    }, { status: 500 })
  }
}

async function updateUserInAirtable(email, membershipPlan) {
  try {
    await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          'User ID': email,
          'First Name': email.split('@')[0],
          'Membership Plan': membershipPlan,
          'Date Joined': new Date().toISOString().split('T')[0]
        }
      })
    })
  } catch (error) {
    console.error('Error adding user to Airtable:', error)
  }
}