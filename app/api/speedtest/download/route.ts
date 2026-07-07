import { NextResponse } from 'next/server'

const LIBRESPEED_SERVER = process.env.LIBRESPEED_SERVER_URL || 'http://localhost:8080'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const size = searchParams.get('size') || '10485760' // 10MB default
    
    const response = await fetch(`${LIBRESPEED_SERVER}/download?size=${size}`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
      },
    })
    
    if (!response.ok) {
      throw new Error('Download test failed')
    }
    
    // Stream the response back to the client
    return new NextResponse(response.body, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    // Fallback: return empty response (client will handle fallback)
    return NextResponse.json({ error: 'Download test unavailable' }, { status: 503 })
  }
}

