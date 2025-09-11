import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { email, password } = await request.json()
    
    console.log('=== AUTHENTICATION ATTEMPT ===')
    console.log('Email:', email)
    console.log('Password provided:', password ? 'YES' : 'NO')
    
    if (!email || !password) {
      console.log('Missing email or password')
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    const isBetaMode = process.env.BETA_MODE === 'true'
    console.log('Beta mode:', isBetaMode)
    
    // Check Airtable with both email and password
    const airtableUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Users?filterByFormula=AND({User ID}="${email}",{Password}="${password}")`
    console.log('Airtable query URL:', airtableUrl)
    
    try {
      const airtableResponse = await fetch(airtableUrl, {
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('Airtable response status:', airtableResponse.status)

      if (airtableResponse.ok) {
        const airtableData = await airtableResponse.json()
        console.log('Airtable response data:', JSON.stringify(airtableData, null, 2))
        
        if (airtableData.records && airtableData.records.length > 0) {
          const user = airtableData.records[0].fields
          const membershipPlan = user['Membership Plan']
          
          console.log('SUCCESS: User found with plan:', membershipPlan)
          
          return NextResponse.json({
            hasActiveSubscription: true,
            email,
            accessType: 'beta_tester',
            membershipPlan
          })
        } else {
          console.log('FAIL: No matching user found with that email/password combination')
        }
      } else {
        const errorText = await airtableResponse.text()
        console.log('Airtable API error:', errorText)
      }
    } catch (airtableError) {
      console.error('Airtable request failed:', airtableError)
    }

    console.log('Authentication failed - returning 401')
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