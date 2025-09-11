import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { email, password } = await request.json()
    
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    console.log('Checking Sol access for:', email)
    
    const isBetaMode = process.env.BETA_MODE === 'true'
    
    // Check Airtable with both email and password
    const airtableUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Users?filterByFormula=AND({User ID}="${email}",{Password}="${password}")`
    
    try {
      const airtableResponse = await fetch(airtableUrl, {
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        }
      })

      if (airtableResponse.ok) {
        const airtableData = await airtableResponse.json()
        
        if (airtableData.records && airtableData.records.length > 0) {
          const user = airtableData.records[0].fields
          const membershipPlan = user['Membership Plan']
          
          console.log('User authenticated with membership plan:', membershipPlan)
          
          if (isBetaMode) {
            return NextResponse.json({
              hasActiveSubscription: true,
              email,
              accessType: 'beta_tester',
              membershipPlan
            })
          }
        } else {
          console.log('Invalid email or password')
        }
      }
    } catch (airtableError) {
      console.error('Airtable Request Failed:', airtableError)
    }

    return NextResponse.json({ 
      hasActiveSubscription: false, 
      error: 'Invalid email or password. Please check your credentials and try again.'
    }, { status: 401 })

  } catch (error) {
    console.error('Authentication error:', error)
    return NextResponse.json({ 
      hasActiveSubscription: false, 
      error: 'Authentication check failed.' 
    }, { status: 500 })
  }
}