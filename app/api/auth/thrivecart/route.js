import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    console.log('=== SOL AUTHENTICATION DEBUG ===')
    console.log('Email:', email)
    console.log('BETA_MODE:', process.env.BETA_MODE)
    console.log('AIRTABLE_BASE_ID:', process.env.AIRTABLE_BASE_ID ? 'SET' : 'NOT SET')
    console.log('AIRTABLE_TOKEN:', process.env.AIRTABLE_TOKEN ? 'SET' : 'NOT SET') // Changed this line
    
    const isBetaMode = process.env.BETA_MODE === 'true'
    console.log('Is Beta Mode:', isBetaMode)
    
    // Check Airtable
    const airtableUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Users?filterByFormula={User ID}="${email}"`
    console.log('Airtable URL:', airtableUrl)
    
    try {
      const airtableResponse = await fetch(airtableUrl, {
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`, // Changed this line
          'Content-Type': 'application/json'
        }
      })

      console.log('Airtable Response Status:', airtableResponse.status)
      
      if (airtableResponse.ok) {
        const airtableData = await airtableResponse.json()
        console.log('Airtable Data:', JSON.stringify(airtableData, null, 2))
        
        if (airtableData.records && airtableData.records.length > 0) {
          const user = airtableData.records[0].fields
          const membershipPlan = user['Membership Plan']
          
          console.log('Found user with membership plan:', membershipPlan)
          
          if (isBetaMode) {
            // Just allow any user in Airtable during beta
            console.log('BETA MODE: Granting access')
            return NextResponse.json({
              hasActiveSubscription: true,
              email,
              accessType: 'beta_tester',
              membershipPlan
            })
          }
        } else {
          console.log('No user found in Airtable')
        }
      } else {
        const errorText = await airtableResponse.text()
        console.error('Airtable Error:', airtableResponse.status, errorText)
      }
    } catch (airtableError) {
      console.error('Airtable Request Failed:', airtableError)
    }

    console.log('Access denied')
    return NextResponse.json({ 
      hasActiveSubscription: false, 
      error: 'No access found. Please contact support.'
    }, { status: 401 })

  } catch (error) {
    console.error('Authentication error:', error)
    return NextResponse.json({ 
      hasActiveSubscription: false, 
      error: 'Authentication check failed.' 
    }, { status: 500 })
  }
}