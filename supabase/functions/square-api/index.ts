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
    
    const squareToken = Deno.env.get('SQUARE_ACCESS_TOKEN');
    const locationId = Deno.env.get('SQUARE_LOCATION_ID');
    
    if (!squareToken || !locationId) {
      throw new Error('Missing required environment variables');
    }

    const { endpoint, body: requestBody } = await req.json();
    console.log('Request:', { endpoint, body: requestBody });

    let squareApiUrl = '';
    let requestOptions: RequestInit = {
      headers: {
        'Authorization': `Bearer ${squareToken}`,
        'Square-Version': '2023-10-18',
        'Content-Type': 'application/json'
      }
    };

    // Handle different endpoints with proper parameter extraction
    switch (endpoint) {
      case '/orders':
        const { startDate, endDate, teamMemberId } = requestBody || {};
        squareApiUrl = 'https://connect.squareup.com/v2/orders/search';
        requestOptions.method = 'POST';
        requestOptions.body = JSON.stringify({
          location_ids: [locationId],
          query: {
            filter: {
              date_time_filter: {
                created_at: {
                  start_at: startDate,
                  end_at: endDate
                }
              },
              ...(teamMemberId && {
                fulfillment_filter: {
                  fulfillment_types: ['PICKUP', 'SHIPMENT'],
                  fulfillment_states: ['PROPOSED', 'RESERVED', 'PREPARED', 'COMPLETED']
                }
              })
            }
          }
        });
        break;
        
      case '/performance':
        const { startDate: perfStartDate, endDate: perfEndDate, teamMemberId: perfTeamMemberId } = requestBody || {};
        squareApiUrl = 'https://connect.squareup.com/v2/orders/search';
        requestOptions.method = 'POST';
        requestOptions.body = JSON.stringify({
          location_ids: [locationId],
          query: {
            filter: {
              date_time_filter: {
                created_at: {
                  start_at: perfStartDate,
                  end_at: perfEndDate
                }
              }
            }
          }
        });
        break;
        
      default:
        throw new Error(`Unsupported endpoint: ${endpoint}`);
    }

    console.log('Making Square API call to:', squareApiUrl);
    const response = await fetch(squareApiUrl, requestOptions);
    const data = await response.json();
    
    console.log('Square API response:', { status: response.status, data });
    
    return new Response(JSON.stringify({
      success: response.ok,
      data: data,
      status: response.status
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