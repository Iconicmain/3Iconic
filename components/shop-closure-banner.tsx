'use client'

import { useState, useEffect } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { X, Store } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ShopClosureBanner() {
  const [isClosed, setIsClosed] = useState(false)
  const [message, setMessage] = useState('')
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const checkShopStatus = async () => {
      try {
        const response = await fetch('/api/settings/shop')
        if (response.ok) {
          const data = await response.json()
          setIsClosed(data.isClosed)
          setMessage(data.message || 'We are currently closed. Please check back later.')
        }
      } catch (error) {
        console.error('Error checking shop status:', error)
      }
    }

    checkShopStatus()
    // Check every minute
    const interval = setInterval(checkShopStatus, 60000)

    return () => clearInterval(interval)
  }, [])

  if (!isClosed || !isVisible) {
    return null
  }

  return (
    <Alert className="border-destructive bg-destructive/10 mb-4">
      <Store className="h-4 w-4" />
      <AlertTitle className="flex items-center justify-between">
        <span>Shop Currently Closed</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsVisible(false)}
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}


