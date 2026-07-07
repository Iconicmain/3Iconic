'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, Upload, Activity } from 'lucide-react'

interface SpeedTestResults {
  ping: number
  download: number
  upload: number
  jitter?: number
}

interface SpeedTestProps {
  serverUrl?: string
  onResults?: (results: SpeedTestResults) => void
  onProgress?: (phase: 'ping' | 'download' | 'upload', progress: number) => void
}

export function SpeedTestLibreSpeed({ 
  serverUrl = '/api/speedtest', 
  onResults,
  onProgress 
}: SpeedTestProps) {
  const [testing, setTesting] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'ping' | 'download' | 'upload' | 'complete'>('idle')
  const [results, setResults] = useState<SpeedTestResults>({
    ping: 0,
    download: 0,
    upload: 0,
  })
  const [error, setError] = useState<string | null>(null)
  const testWorkerRef = useRef<Worker | null>(null)

  const runTest = async () => {
    setTesting(true)
    setError(null)
    setPhase('ping')
    setResults({ ping: 0, download: 0, upload: 0 })

    try {
      // Ping test
      const pingStart = performance.now()
      const pingResponse = await fetch(`${serverUrl}/ping`, { 
        method: 'GET',
        cache: 'no-cache'
      })
      const pingEnd = performance.now()
      const ping = Math.round(pingEnd - pingStart)
      
      setResults(prev => ({ ...prev, ping }))
      onProgress?.('ping', 100)
      
      // Download test
      setPhase('download')
      const downloadStart = performance.now()
      const downloadSize = 10 * 1024 * 1024 // 10MB
      const downloadResponse = await fetch(`${serverUrl}/download?size=${downloadSize}`, {
        method: 'GET',
        cache: 'no-cache'
      })
      
      if (!downloadResponse.ok) throw new Error('Download test failed')
      
      const reader = downloadResponse.body?.getReader()
      const chunks: Uint8Array[] = []
      let downloaded = 0
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          chunks.push(value)
          downloaded += value.length
          const progress = Math.min(100, (downloaded / downloadSize) * 100)
          onProgress?.('download', progress)
        }
      }
      
      const downloadEnd = performance.now()
      const downloadTime = (downloadEnd - downloadStart) / 1000 // seconds
      const downloadMbps = ((downloadSize * 8) / downloadTime) / 1_000_000 // Convert to Mbps
      
      setResults(prev => ({ ...prev, download: Math.round(downloadMbps) }))
      
      // Upload test
      setPhase('upload')
      const uploadSize = 5 * 1024 * 1024 // 5MB
      const uploadData = new Uint8Array(uploadSize)
      crypto.getRandomValues(uploadData)
      
      const uploadStart = performance.now()
      const uploadResponse = await fetch(`${serverUrl}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: uploadData,
        cache: 'no-cache'
      })
      
      if (!uploadResponse.ok) throw new Error('Upload test failed')
      
      const uploadEnd = performance.now()
      const uploadTime = (uploadEnd - uploadStart) / 1000 // seconds
      const uploadMbps = ((uploadSize * 8) / uploadTime) / 1_000_000 // Convert to Mbps
      
      setResults(prev => ({ ...prev, upload: Math.round(uploadMbps) }))
      onProgress?.('upload', 100)
      
      setPhase('complete')
      onResults?.(results)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speed test failed')
      console.error('Speed test error:', err)
    } finally {
      setTesting(false)
    }
  }

  return {
    testing,
    phase,
    results,
    error,
    runTest,
  }
}

