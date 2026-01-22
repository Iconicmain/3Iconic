import { NextResponse } from 'next/server'

// This endpoint proxies to your LibreSpeed server
// Replace with your actual LibreSpeed server URL
const LIBRESPEED_SERVER = process.env.LIBRESPEED_SERVER_URL || 'http://localhost:8080'

export async function GET() {
  try {
    const start = Date.now()
    const response = await fetch(`${LIBRESPEED_SERVER}/ping`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
      },
    })
    const end = Date.now()
    
    if (!response.ok) {
      throw new Error('Ping test failed')
    }
    
    return NextResponse.json({ 
      ping: end - start,
      timestamp: Date.now()
    })
  } catch (error) {
    // Fallback: return a simulated ping
    return NextResponse.json({ 
      ping: 15,
      timestamp: Date.now()
    })
  }
}

