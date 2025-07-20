import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

const SQUARE_BASE_URL = 'https://connect.squareup.com/v2';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, ...params } = await req.json()
    
    const accessToken = Deno.env.get('SQUARE_ACCESS_TOKEN')
    const locationId = Deno.env.get('SQUARE_LOCATION_ID')
    
    if (!accessToken || !locationId) {
      throw new Error('Missing Square API credentials')
    }

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Square-Version': '2023-10-18',
      'Content-Type': 'application/json'
    }

    let result;

    switch (action) {
      case 'getTeamMembers':
        const teamResponse = await fetch(`${SQUARE_BASE_URL}/team-members`, {
          method: 'GET',
          headers
        });
        const teamData = await teamResponse.json();
        result = teamData.team_members || [];
        break;

      case 'getOrders':
        const { startDate, endDate, teamMemberId } = params;
        const searchBody = {
          filter: {
            date_time_filter: {
              created_at: {
                start_at: startDate,
                end_at: endDate
              }
            },
            state_filter: {
              states: ['COMPLETED']
            }
          },
          location_ids: [locationId],
          limit: 1000
        };

        const ordersResponse = await fetch(`${SQUARE_BASE_URL}/orders/search`, {
          method: 'POST',
          headers,
          body: JSON.stringify(searchBody)
        });
        const ordersData = await ordersResponse.json();
        let orders = ordersData.orders || [];

        // Filter by team member if specified
        if (teamMemberId) {
          orders = orders.filter(order => 
            order.fulfillments?.some(f => 
              f.fulfillment_entries?.some(e => e.team_member_id === teamMemberId)
            )
          );
        }

        result = orders;
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Square API Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: error
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})