import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  console.log('=== Edge Function Called ===');
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('CORS preflight request');
    return new Response('ok', { 
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE'
      } 
    });
  }

  try {
    console.log('Processing POST request');
    
    // Test environment variables
    const squareToken = Deno.env.get('SQUARE_ACCESS_TOKEN');
    const locationId = Deno.env.get('SQUARE_LOCATION_ID');
    console.log('Environment check:', {
      hasToken: !!squareToken,
      tokenLength: squareToken?.length,
      hasLocationId: !!locationId
    });

    // Parse request body
    const body = await req.json();
    console.log('Request body:', JSON.stringify(body, null, 2));

    // Test basic Square API call
    console.log('Testing Square API...');
    const response = await fetch('https://connect.squareup.com/v2/locations', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${squareToken}`,
        'Square-Version': '2023-10-18',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Square API response status:', response.status);
    const data = await response.json();
    console.log('Square API data:', JSON.stringify(data, null, 2));
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Diagnostic test completed',
      results: {
        environmentOk: !!squareToken && !!locationId,
        squareApiStatus: response.status,
        locationsFound: data.locations?.length || 0,
        requestReceived: body
      }
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Edge Function Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      stack: error.stack,
      name: error.name
    }), {
      status: 200, // Return 200 so we can see the error details
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
})