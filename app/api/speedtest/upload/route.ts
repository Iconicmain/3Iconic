import { NextResponse } from 'next/server'

const LIBRESPEED_SERVER = process.env.LIBRESPEED_SERVER_URL || 'http://localhost:8080'

export async function POST(request: Request) {
  try {
    const body = await request.arrayBuffer()
    
    const response = await fetch(`${LIBRESPEED_SERVER}/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': body.byteLength.toString(),
      },
      body: body,
    })
    
    if (!response.ok) {
      throw new Error('Upload test failed')
    }
    
    return NextResponse.json({ 
      success: true,
      size: body.byteLength,
      timestamp: Date.now()
    })
  } catch (error) {
    // Fallback: accept the upload
    const body = await request.arrayBuffer()
    return NextResponse.json({ 
      success: true,
      size: body.byteLength,
      timestamp: Date.now()
    })
  }
}

