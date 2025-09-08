import { NextResponse } from 'next/server'

// Verify Sol course access with Thrivecart Learn
export async function POST(request) {
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    console.log('Checking Thrivecart Learn Sol course access for:', email)
    
    // Thrivecart Learn API endpoint to check student course enrollment
    const apiUrl = `https://api.thrivecart.com/learn/v1/students/${encodeURIComponent(email)}/enrollments`
    
    const thrivecartResponse = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.THRIVECART_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })

    console.log('Thrivecart API response status:', thrivecartResponse.status)

    if (!thrivecartResponse.ok) {
      const errorText = await thrivecartResponse.text()
      console.error('Thrivecart Learn API error:', thrivecartResponse.status, errorText)
      
      // For testing purposes, if API call fails, we'll allow access temporarily
      // Remove this fallback for production
      if (email === 'kelsey.cronkhite@gmail.com' || email === 'kelsey@thealignedbusiness.com') {
        console.log('Using test user fallback for:', email)
        return NextResponse.json({
          hasActiveSubscription: true,
          email,
          accessType: 'test_user_fallback'
        })
      }
      
      return NextResponse.json({ 
        hasActiveSubscription: false, 
        error: 'Unable to verify course access' 
      }, { status: 500 })
    }

    const enrollmentData = await thrivecartResponse.json()
    console.log('Enrollment data received:', JSON.stringify(enrollmentData, null, 2))
    
    // Check if user is enrolled in Sol course
    const hasSolEnrollment = enrollmentData.enrollments && 
      enrollmentData.enrollments.some(enrollment => 
        enrollment.course_name === 'Sol™' && 
        enrollment.status === 'active'
      )

    // Also check for variations of the course name
    const hasSolAccess = enrollmentData.enrollments && 
      enrollmentData.enrollments.some(enrollment => 
        (enrollment.course_name?.includes('Sol') || 
         enrollment.course_title?.includes('Sol')) &&
        enrollment.status === 'active'
      )

    const hasActiveSubscription = hasSolEnrollment || hasSolAccess

    console.log('Sol course access result:', hasActiveSubscription)
    console.log('Found enrollments:', enrollmentData.enrollments?.map(e => e.course_name))

    return NextResponse.json({
      hasActiveSubscription,
      email,
      enrollmentData: hasActiveSubscription ? enrollmentData : null,
      accessType: hasSolEnrollment ? 'sol_exact_match' : hasSolAccess ? 'sol_partial_match' : 'no_access'
    })

  } catch (error) {
    console.error('Course access verification error:', error)
    
    // Test user fallback during development
    if (email === 'kelsey.cronkhite@gmail.com' || email === 'kelsey@thealignedbusiness.com') {
      console.log('Using test user fallback due to error for:', email)
      return NextResponse.json({
        hasActiveSubscription: true,
        email,
        accessType: 'test_user_fallback'
      })
    }
    
    return NextResponse.json({ 
      hasActiveSubscription: false, 
      error: 'Course access check failed' 
    }, { status: 500 })
  }
}