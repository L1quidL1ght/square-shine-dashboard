
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log(`🚀 Edge Function called: ${req.method} ${req.url}`)
  
  try {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      console.log('✅ CORS preflight handled')
      return new Response('ok', { 
        headers: corsHeaders
      })
    }

    // Parse request body
    let requestData
    try {
      requestData = await req.json()
      console.log('📦 Request data received:', JSON.stringify(requestData, null, 2))
    } catch (e) {
      console.error('❌ Failed to parse JSON:', e)
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON in request body',
        details: e.message 
      }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { endpoint, body: requestBody } = requestData

    console.log(`🎯 Endpoint: ${endpoint}`)
    console.log(`📋 Body: ${JSON.stringify(requestBody, null, 2)}`)

    // Check environment variables
    const accessToken = Deno.env.get('SQUARE_ACCESS_TOKEN')
    const locationId = Deno.env.get('SQUARE_LOCATION_ID')
    const environment = Deno.env.get('SQUARE_ENVIRONMENT') || 'sandbox'

    console.log('🔑 Environment check:', {
      hasAccessToken: !!accessToken,
      hasLocationId: !!locationId,
      environment,
      accessTokenPreview: accessToken ? `${accessToken.substring(0, 10)}...` : 'missing'
    })

    if (!accessToken || !locationId) {
      console.error('❌ Missing Square API credentials')
      return new Response(JSON.stringify({ 
        error: 'Missing Square API credentials',
        details: {
          hasAccessToken: !!accessToken,
          hasLocationId: !!locationId
        }
      }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Return test response for now
    const testResponse = {
      success: true,
      endpoint,
      timestamp: new Date().toISOString(),
      environment,
      message: 'Edge Function is working! Basic setup verified.',
      receivedData: {
        endpoint,
        bodyKeys: requestBody ? Object.keys(requestBody) : [],
        hasCredentials: {
          accessToken: !!accessToken,
          locationId: !!locationId
        }
      }
    }

    console.log('✅ Sending test response:', JSON.stringify(testResponse, null, 2))

    return new Response(JSON.stringify(testResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('💥 Unexpected error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message,
      stack: error.stack,
      details: error.toString()
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
