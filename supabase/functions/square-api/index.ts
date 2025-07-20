import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  console.log('=== Edge Function Called ===');
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('CORS preflight request');
    return new Response('ok', { headers: corsHeaders });
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

      case '/team-members':
        squareApiUrl = 'https://connect.squareup.com/v2/team-members/search';
        requestOptions.method = 'POST';
        requestOptions.body = JSON.stringify({
          query: {
            filter: {
              location_ids: [locationId],
              status: 'ACTIVE'
            }
          }
        });
        break;
        
      case '/locations':
        console.log('=== LOCATIONS DEBUG ===');
        console.log('Access token exists:', !!squareToken);
        console.log('Access token preview:', squareToken?.substring(0, 15) + '...');
        console.log('Making request to:', 'https://connect.squareup.com/v2/locations');
        
        squareApiUrl = 'https://connect.squareup.com/v2/locations';
        requestOptions.method = 'GET';
        break;
        
      default:
        throw new Error(`Unsupported endpoint: ${endpoint}`);
    }

    console.log('Making Square API call to:', squareApiUrl);
    const response = await fetch(squareApiUrl, requestOptions);
    
    // Add detailed response logging for locations endpoint
    if (endpoint === '/locations') {
      console.log('Locations response status:', response.status);
      console.log('Locations response headers:', Object.fromEntries(response.headers.entries()));
    }
    
    const data = await response.json();
    
    // Add detailed data logging for locations endpoint
    if (endpoint === '/locations') {
      console.log('Locations response data:', JSON.stringify(data, null, 2));
      if (!response.ok) {
        console.error('Locations API error:', data);
      }
    }
    
    console.log('Square API response:', { status: response.status, data });
    
    // Add detailed logging for locations endpoint
    if (endpoint === '/locations') {
      console.log('=== LOCATIONS DEBUG ===');
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      console.log('Locations data:', JSON.stringify(data, null, 2));
      console.log('Number of locations found:', data.locations?.length || 0);
      console.log('Environment SQUARE_LOCATION_ID:', locationId);
      console.log('=======================');
    }
    
    // Filter team members to show only servers
    if (endpoint === '/team-members' && response.ok && data.team_members) {
      console.log('=== TEAM MEMBERS FILTERING ===');
      console.log('Total team members before filtering:', data.team_members.length);
      
      const serversOnly = data.team_members.filter(member => {
        // Check if any job assignment includes "Server" in the job title
        const hasServerRole = member.wage_setting?.job_assignments?.some(job => 
          job.job_title?.toLowerCase().includes('server')
        );
        
        if (hasServerRole) {
          console.log(`✅ Server found: ${member.given_name} ${member.family_name} - Roles: ${
            member.wage_setting?.job_assignments?.map(j => j.job_title).join(', ') || 'None'
          }`);
        }
        
        return hasServerRole;
      });
      
      console.log('Servers found:', serversOnly.length);
      console.log('================================');
      
      // Replace the team_members array with filtered results
      data.team_members = serversOnly;
    }
    
    return new Response(JSON.stringify({
      success: response.ok,
      data: data,
      status: response.status
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
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
        ...corsHeaders
      }
    });
  }
})