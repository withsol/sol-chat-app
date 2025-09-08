import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const response = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Users`, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`
      }
    })
    
    if (response.ok) {
      return NextResponse.json({ status: 'connected' })
    } else {
      return NextResponse.json({ status: 'error' }, { status: 500 })
    }
  } catch (error) {
    console.error('Connection test failed:', error)
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}