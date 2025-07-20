import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE'
      } 
    });
  }

  try {
    const body = await req.json();
    const squareToken = Deno.env.get('SQUARE_ACCESS_TOKEN');
    const locationId = Deno.env.get('SQUARE_LOCATION_ID');
    
    // Test basic Square API call
    const response = await fetch('https://connect.squareup.com/v2/locations', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${squareToken}`,
        'Square-Version': '2023-10-18',
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Basic test successful',
      squareApiTest: {
        status: response.status,
        hasLocations: !!data.locations,
        locationCount: data.locations?.length || 0
      },
      environment: {
        hasToken: !!squareToken,
        hasLocationId: !!locationId,
        tokenPreview: squareToken?.substring(0, 10) + '...'
      },
      requestReceived: body
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      stack: error.stack
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
})