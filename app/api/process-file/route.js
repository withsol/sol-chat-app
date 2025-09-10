import { NextResponse } from 'next/server'

export async function POST(request) {
  console.log('=== FILE PROCESSING API ===')
  
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const email = formData.get('email')
    
    if (!file || !email) {
      return NextResponse.json({ 
        error: 'File and email required' 
      }, { status: 400 })
    }

    console.log('Processing file:', file.name, 'for user:', email)

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    let extractedText = ''
    
    // Handle different file types
    if (file.type === 'application/pdf') {
      console.log('Processing PDF with alternative method...')
      
      try {
        // Method 1: Try using built-in Node.js approach with external service
        extractedText = await extractPDFWithExternalService(buffer, file.name)
        
        if (!extractedText) {
          // Method 2: Fallback to simple buffer analysis
          extractedText = await extractPDFWithBufferAnalysis(buffer)
        }
        
      } catch (pdfError) {
        console.error('PDF processing error:', pdfError)
        return NextResponse.json({ 
          error: 'Failed to process PDF. Please try one of these alternatives: 1) Copy and paste the text directly into chat, 2) Save as .txt file and upload, 3) Use Google Docs to convert PDF to text.',
          details: pdfError.message
        }, { status: 400 })
      }
  
    } else if (file.type === 'text/plain') {
      extractedText = buffer.toString('utf-8')
    } else {
      return NextResponse.json({ 
        error: 'Unsupported file type. Please upload PDF or text files.' 
      }, { status: 400 })
    }

    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Could not extract text from file. The PDF may be image-based, password-protected, or corrupted. Please copy and paste the content directly.' 
      }, { status: 400 })
    }

    console.log('Text extraction successful, length:', extractedText.length)

    // Analyze document type and route to appropriate processor
    const documentType = analyzeDocumentType(extractedText, file.name)
    console.log('Detected document type:', documentType)

    let result
    
    if (documentType === 'visioning') {
      // Process as visioning document
      try {
        const response = await fetch(`${getBaseUrl(request)}/api/process-visioning`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email,
            visioningText: extractedText
          })
        })
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('Process visioning failed:', response.status, errorText)
          throw new Error(`Visioning processing failed: ${response.status}`)
        }
        
        result = await response.json()
        
        return NextResponse.json({
          success: true,
          type: 'visioning',
          message: `🎯 Visioning homework processed successfully! I've extracted your business vision, goals, ideal client details, and created ${result.personalgorithmCount || 0} Personalgorithm™ insights. Your profile has been updated with your vision and I can now coach you with much more personalized support.`,
          ...result
        })
      } catch (visioningError) {
        console.error('Visioning processing error:', visioningError)
        return NextResponse.json({
          error: 'Failed to process visioning document',
          details: visioningError.message
        }, { status: 500 })
      }
      
    } else if (documentType === 'business-plan') {
      // Process as business plan
      try {
        const businessPlanData = extractBusinessPlanData(extractedText)
        
        const response = await fetch(`${getBaseUrl(request)}/api/process-business-plan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email,
            businessPlanData: businessPlanData
          })
        })
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('Process business plan failed:', response.status, errorText)
          throw new Error(`Business plan processing failed: ${response.status}`)
        }
        
        result = await response.json()
        
        return NextResponse.json({
          success: true,
          type: 'business-plan',
          message: `💼 Aligned Business Plan processed successfully! I've extracted your business vision, goals, ideal client profile, and strategic context. This has been added to your Personalgorithm™ and I can now provide much more targeted business coaching.`,
          ...result
        })
      } catch (businessPlanError) {
        console.error('Business plan processing error:', businessPlanError)
        return NextResponse.json({
          error: 'Failed to process business plan',
          details: businessPlanError.message
        }, { status: 500 })
      }
      
    } else {
      // General document - create a summary and add to Sol's knowledge
      try {
        const summary = await createDocumentSummary(extractedText, file.name)
        
        // Add to user's context as a general insight
        await addGeneralDocumentInsight(email, file.name, summary, extractedText.substring(0, 1000))
        
        return NextResponse.json({
          success: true,
          type: 'general',
          message: `📄 Document "${file.name}" processed successfully! I've created a summary and added the key insights to your Personalgorithm™. I can now reference this information in our conversations.`
        })
      } catch (generalError) {
        console.error('General document processing error:', generalError)
        return NextResponse.json({
          error: 'Failed to process general document',
          details: generalError.message
        }, { status: 500 })
      }
    }

  } catch (error) {
    console.error('❌ File processing error:', error)
    return NextResponse.json({
      error: 'Failed to process file',
      details: error.message
    }, { status: 500 })
  }
}

// ==================== PDF EXTRACTION METHODS ====================

async function extractPDFWithExternalService(buffer, filename) {
  try {
    // Use PDFShift API or similar service for PDF text extraction
    // This is a placeholder - you'd need to sign up for a service like PDFShift
    console.log('Attempting external PDF service extraction...')
    
    // For now, return null to trigger fallback method
    return null
  } catch (error) {
    console.error('External PDF service failed:', error)
    return null
  }
}

async function extractPDFWithBufferAnalysis(buffer) {
  try {
    // Simple text extraction from PDF buffer
    // This works for some PDFs but not all
    const bufferString = buffer.toString('binary')
    
    // Look for text content in the PDF structure
    const textMatches = bufferString.match(/\((.*?)\)/g)
    
    if (textMatches) {
      const extractedText = textMatches
        .map(match => match.replace(/[()]/g, ''))
        .filter(text => text.length > 2)
        .join(' ')
      
      if (extractedText.length > 50) {
        console.log('Buffer analysis extraction successful')
        return extractedText
      }
    }
    
    // Alternative: Look for stream content
    const streamMatches = bufferString.match(/stream\s*(.*?)\s*endstream/gs)
    
    if (streamMatches) {
      const streamText = streamMatches
        .map(match => match.replace(/stream|endstream/g, ''))
        .join(' ')
        .replace(/[^\x20-\x7E]/g, ' ') // Remove non-printable characters
        .replace(/\s+/g, ' ')
        .trim()
      
      if (streamText.length > 50) {
        console.log('Stream analysis extraction successful')
        return streamText
      }
    }
    
    console.log('Buffer analysis could not extract meaningful text')
    return null
    
  } catch (error) {
    console.error('Buffer analysis failed:', error)
    return null
  }
}

// ==================== DOCUMENT ANALYSIS FUNCTIONS ====================

function analyzeDocumentType(text, filename) {
  const content = text.toLowerCase()
  const name = filename.toLowerCase()
  
  // Check for visioning homework indicators
  const visioningIndicators = [
    'basic brand analysis', 'audience analysis', 'competitive analysis',
    'vision homework', 'visioning homework', 'free write',
    'ideal audience member', 'mission statement', 'core values',
    'what differentiates you', 'current reality', 'mindset'
  ]
  
  const visioningScore = visioningIndicators.filter(indicator => 
    content.includes(indicator)
  ).length
  
  // Check for business plan indicators
  const businessPlanIndicators = [
    'business plan', 'aligned business', 'future vision',
    'top 3 goals', 'ideal client', 'marketing system',
    'sales system', 'current offers', 'pricing'
  ]
  
  const businessPlanScore = businessPlanIndicators.filter(indicator => 
    content.includes(indicator)
  ).length
  
  // Check filename
  if (name.includes('visioning') || name.includes('vision')) {
    return 'visioning'
  }
  
  if (name.includes('business plan') || name.includes('aligned business')) {
    return 'business-plan'
  }
  
  // Score-based detection
  if (visioningScore >= 3) {
    return 'visioning'
  }
  
  if (businessPlanScore >= 2) {
    return 'business-plan'
  }
  
  return 'general'
}

function extractBusinessPlanData(text) {
  return {
    futureVision: extractSection(text, ['future vision', 'vision']),
    topGoals: extractSection(text, ['top 3 goals', 'goals', 'objectives']),
    challenges: extractSection(text, ['challenges', 'problems', 'obstacles']),
    idealClient: extractSection(text, ['ideal client', 'target client', 'perfect client']),
    currentOffers: extractSection(text, ['current offers', 'services', 'products']),
    marketingSystem: extractSection(text, ['marketing system', 'marketing']),
    salesSystem: extractSection(text, ['sales system', 'sales process'])
  }
}

function extractSection(text, keywords) {
  const lines = text.split('\n')
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase()
    
    if (keywords.some(keyword => line.includes(keyword))) {
      // Found a matching section, extract the content
      let content = []
      for (let j = i + 1; j < lines.length && j < i + 10; j++) {
        const nextLine = lines[j].trim()
        if (nextLine.length === 0) continue
        if (nextLine.length < 5) break // Likely a header for next section
        content.push(nextLine)
        if (content.join(' ').length > 500) break // Reasonable limit
      }
      return content.join(' ')
    }
  }
  
  return ''
}

async function createDocumentSummary(text, filename) {
  try {
    const summaryPrompt = `Create a brief summary of this document:

FILENAME: ${filename}
CONTENT: ${text.substring(0, 2000)}

Provide a 2-3 sentence summary of what this document contains and its key insights.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        max_tokens: 200,
        temperature: 0.3,
        messages: [{ role: 'user', content: summaryPrompt }]
      })
    })

    if (response.ok) {
      const result = await response.json()
      return result.choices[0].message.content
    }
    
    return `Document: ${filename} - ${text.substring(0, 200)}...`
  } catch (error) {
    console.error('Error creating document summary:', error)
    return `Document: ${filename} uploaded`
  }
}

async function addGeneralDocumentInsight(email, filename, summary, excerpt) {
  try {
    const userRecordId = await getUserRecordId(email)
    if (!userRecordId) return
    
    const personalgorithmId = `p_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const response = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Personalgorithm™`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          'Personalgorithm™ ID': personalgorithmId,
          'User': [userRecordId],
          'Personalgorithm™ Notes': `Document uploaded: ${filename}. Summary: ${summary}. This provides context about their work and interests.`,
          'Date created': new Date().toISOString(),
          'Tags': 'document-upload, general-context'
        }
      })
    })

    if (response.ok) {
      console.log('✅ General document insight created')
    }
    
  } catch (error) {
    console.error('Error adding general document insight:', error)
  }
}

// ==================== HELPER FUNCTIONS ====================

function getBaseUrl(request) {
  const host = request.headers.get('host')
  const protocol = request.headers.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https')
  return `${protocol}://${host}`
}

async function getUserRecordId(email) {
  try {
    const encodedEmail = encodeURIComponent(email)
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Users?filterByFormula={User ID}="${encodedEmail}"`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) return null
    const data = await response.json()
    return data.records.length > 0 ? data.records[0].id : null
  } catch (error) {
    console.error('Error getting user record ID:', error)
    return null
  }
}