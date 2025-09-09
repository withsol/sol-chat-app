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

    // Test 2: Check if we can read the Messages table
    console.log('Test 2: Reading Messages table...')
    const messagesResponse = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Messages?maxRecords=1`, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
      }
    })

    const messagesData = await messagesResponse.json()
    console.log('Messages response status:', messagesResponse.status)
    console.log('Messages data:', JSON.stringify(messagesData, null, 2))

    // Test 3: Try to create a test message
    console.log('Test 3: Creating test message...')
    const testFields = {
      'Message ID': `test_${Date.now()}`,
      'User ID': 'kelsey.cronkhite@gmail.com',
      'User Message': 'Test message',
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
        create: {
          status: createResponse.status,
          success: createResponse.ok,
          data: createData
        }
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