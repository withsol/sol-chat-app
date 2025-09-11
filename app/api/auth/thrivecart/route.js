import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    console.log('Checking Sol access for:', email)
    
    // Check if we're in beta mode (you can control this via environment variable)
    const isBetaMode = process.env.BETA_MODE === 'true'
    
    if (isBetaMode) {
      // Beta: Check Airtable for beta testers
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
          
          // Beta testers get access
          const betaPlans = ['Test', 'Founding Member', 'Founding Member Life...', 'Beta']
          const isBetaTester = betaPlans.some(plan => 
            membershipPlan && membershipPlan.toLowerCase().includes(plan.toLowerCase())
          )
          
          if (isBetaTester) {
            console.log('Beta tester found in Airtable:', membershipPlan)
            return NextResponse.json({
              hasActiveSubscription: true,
              email,
              accessType: 'beta_tester',
              membershipPlan
            })
          }
        }
      }
    }

    // Production: Always check Thrivecart for Sol™ enrollment
    const apiUrl = `https://api.thrivecart.com/learn/v1/students/${encodeURIComponent(email)}/enrollments`
    
    const thrivecartResponse = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.THRIVECART_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })

    if (!thrivecartResponse.ok) {
      const errorText = await thrivecartResponse.text()
      console.error('Thrivecart API error:', thrivecartResponse.status, errorText)
      
      return NextResponse.json({ 
        hasActiveSubscription: false, 
        error: 'Unable to verify your subscription. Please ensure you have an active subscription to The Art of Becoming program.' 
      }, { status: 401 })
    }

    const enrollmentData = await thrivecartResponse.json()
    console.log('Thrivecart enrollment data:', JSON.stringify(enrollmentData, null, 2))
    
    // Check specifically for Sol™ course enrollment
    const hasSolEnrollment = enrollmentData.enrollments && 
      enrollmentData.enrollments.some(enrollment => 
        (enrollment.course_name === 'Sol™' || 
         enrollment.course_name === 'The Art of Becoming' || 
         enrollment.course_title?.includes('Sol')) &&
        enrollment.status === 'active'
      )

    if (hasSolEnrollment) {
      // If they have Thrivecart access, also add/update them in Airtable
      await updateUserInAirtable(email, enrollmentData)
    }

    return NextResponse.json({
      hasActiveSubscription: hasSolEnrollment,
      email,
      accessType: hasSolEnrollment ? 'thrivecart_subscription' : 'no_access',
      betaMode: isBetaMode
    })

  } catch (error) {
    console.error('Course access verification error:', error)
    return NextResponse.json({ 
      hasActiveSubscription: false, 
      error: 'Course access check failed. Please try again.' 
    }, { status: 500 })
  }
}

// Helper function to add/update user in Airtable when they have valid Thrivecart access
async function updateUserInAirtable(email, enrollmentData) {
  try {
    // Check if user already exists
    const existingUser = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Users?filterByFormula={User ID}="${email}"`, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
      }
    })

    const userData = await existingUser.json()
    
    if (userData.records && userData.records.length > 0) {
      // Update existing user
      const recordId = userData.records[0].id
      await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Users/${recordId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: {
            'Membership Plan': 'Active Subscription',
            'Date Joined': new Date().toISOString().split('T')[0]
          }
        })
      })
    } else {
      // Create new user
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
            'Membership Plan': 'Active Subscription',
            'Date Joined': new Date().toISOString().split('T')[0]
          }
        })
      })
    }
  } catch (error) {
    console.error('Error updating user in Airtable:', error)
  }
}