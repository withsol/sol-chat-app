import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('Testing Airtable connection...')
    console.log('AIRTABLE_TOKEN:', process.env.AIRTABLE_TOKEN ? 'Present' : 'Missing')
    console.log('AIRTABLE_BASE_ID:', process.env.AIRTABLE_BASE_ID ? 'Present' : 'Missing')

    // Test 1: Check if we can read the Users table
    console.log('Test 1: Reading Users table...')
    const usersResponse = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Users?maxRecords=1`, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
      }
    })

    const usersData = await usersResponse.json()
    console.log('Users response status:', usersResponse.status)
    console.log('Users data:', JSON.stringify(usersData, null, 2))

    // Test 2: Check MOST RECENT Messages (to avoid cached data)
    console.log('Test 2: Reading most recent Messages...')
    const messagesResponse = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Messages?maxRecords=3&sort[0][field]=Message ID&sort[0][direction]=desc`, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
      }
    })

    const messagesData = await messagesResponse.json()
    console.log('Messages response status:', messagesResponse.status)
    console.log('Recent Messages data:', JSON.stringify(messagesData, null, 2))

    // Test 3: Try to create a test message with STRING format
    console.log('Test 3: Creating test message with STRING User ID...')
    const testFields = {
      'Message ID': `test_${Date.now()}`,
      'User ID': 'kelsey.cronkhite@gmail.com',  // STRING format
      'User Message': 'Test message - string format',
      'Sol Response': '',
      'Timestamp': new Date().toISOString(),
      'Tokens Used': 10,
      'Tags': ['test']
    }

    console.log('Test fields to send:', JSON.stringify(testFields, null, 2))

    const createResponse = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fields: testFields })
    })

    const createData = await createResponse.json()
    console.log('Create response status:', createResponse.status)
    console.log('Create response data:', JSON.stringify(createData, null, 2))

    // Test 4: If string failed, try ARRAY format
    let createResponse2 = null
    let createData2 = null
    
    if (!createResponse.ok) {
      console.log('Test 4: String failed, trying ARRAY format...')
      const testFields2 = {
        'Message ID': `test_array_${Date.now()}`,
        'User ID': ['kelsey.cronkhite@gmail.com'],  // ARRAY format
        'User Message': 'Test message - array format',
        'Sol Response': '',
        'Timestamp': new Date().toISOString(),
        'Tokens Used': 10,
        'Tags': ['test']
      }

      createResponse2 = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fields: testFields2 })
      })

      createData2 = await createResponse2.json()
      console.log('Array format response status:', createResponse2.status)
      console.log('Array format response data:', JSON.stringify(createData2, null, 2))
    }

    return NextResponse.json({
      success: true,
      tests: {
        users: {
          status: usersResponse.status,
          success: usersResponse.ok,
          data: usersData
        },
        messages: {
          status: messagesResponse.status,
          success: messagesResponse.ok,
          data: messagesData
        },
        createString: {
          status: createResponse.status,
          success: createResponse.ok,
          data: createData
        },
        createArray: createResponse2 ? {
          status: createResponse2.status,
          success: createResponse2.ok,
          data: createData2
        } : null
      }
    })

  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json({ 
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}