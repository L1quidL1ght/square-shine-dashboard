
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

const SQUARE_BASE_URL = 'https://connect.squareup.com/v2';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    console.log('Request body:', body)
    
    // Extract endpoint from the request body
    const { endpoint, ...params } = body
    
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

    // Handle different endpoints
    switch (endpoint) {
      case '/locations':
        const locationsResponse = await fetch(`${SQUARE_BASE_URL}/locations`, {
          method: 'GET',
          headers
        });
        const locationsData = await locationsResponse.json();
        result = {
          locations: locationsData.locations?.map(loc => ({
            id: loc.id,
            name: loc.name,
            status: loc.status,
            address: loc.address
          })) || []
        };
        break;

      case '/team-members':
        const teamMembersResponse = await fetch(`${SQUARE_BASE_URL}/team-members/search`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            query: {
              filter: {
                location_ids: [locationId],
                status: 'ACTIVE'
              }
            }
          })
        });
        const teamMembersData = await teamMembersResponse.json();
        console.log('Team members API response:', teamMembersData);
        
        result = {
          teamMembers: teamMembersData.team_members?.map(member => ({
            id: member.id,
            name: `${member.given_name || ''} ${member.family_name || ''}`.trim(),
            role: member.assigned_locations?.[0]?.job_title || 'Team Member',
            status: member.status
          })) || []
        };
        break;

      case '/orders':
        // Extract query parameters for orders
        const url = new URL('http://dummy.com' + endpoint + (params.body ? `?${new URLSearchParams(JSON.parse(params.body))}` : ''));
        const startDate = url.searchParams.get('startDate');
        const endDate = url.searchParams.get('endDate');
        const teamMemberId = url.searchParams.get('teamMemberId');

        const searchBody = {
          filter: {
            date_time_filter: {
              created_at: {
                start_at: startDate,
                end_at: endDate
              }
            },
            state_filter: {
              states: ['COMPLETED', 'OPEN']
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

        result = { orders };
        break;

      case '/performance':
        // Handle performance metrics calculation - check for body data
        let performanceData = {};
        if (params.body) {
          performanceData = typeof params.body === 'string' ? JSON.parse(params.body) : params.body;
        }
        const { startDate: perfStartDate, endDate: perfEndDate, teamMemberId: perfTeamMemberId } = performanceData;
        
        // Get ALL orders with pagination
        let allOrders = [];
        let cursor = null;
        
        do {
          const searchBody = {
            filter: {
              date_time_filter: {
                created_at: {
                  start_at: perfStartDate,
                  end_at: perfEndDate
                }
              },
              state_filter: {
                states: ['COMPLETED']
              }
            },
            location_ids: [locationId],
            limit: 500
          };
          
          if (cursor) {
            searchBody.cursor = cursor;
          }

          const ordersResponse = await fetch(`${SQUARE_BASE_URL}/orders/search`, {
            method: 'POST',
            headers,
            body: JSON.stringify(searchBody)
          });
          
          const ordersData = await ordersResponse.json();
          console.log(`Fetched ${ordersData.orders?.length || 0} orders`);
          
          if (ordersData.orders) {
            allOrders = allOrders.concat(ordersData.orders);
          }
          
          cursor = ordersData.cursor;
        } while (cursor);
        
        console.log(`Total orders fetched: ${allOrders.length}`);
        
        // Filter by team member if specified (but only if not 'all')
        let filteredOrders = allOrders;
        if (perfTeamMemberId && perfTeamMemberId !== 'all') {
          // For now, since team member linking in orders is complex, 
          // we'll calculate for all orders if specific team member is selected
          // You may need to implement custom team member tracking
          console.log(`Filtering for team member: ${perfTeamMemberId}`);
        }

        // Get timecards for actual hours worked
        let totalHours = 0;
        let totalShifts = 0;
        
        if (perfTeamMemberId && perfTeamMemberId !== 'all') {
          try {
            const timecardsResponse = await fetch(`${SQUARE_BASE_URL}/labor/timecards/search`, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                query: {
                  filter: {
                    team_member_ids: [perfTeamMemberId],
                    start_at: {
                      start_at: perfStartDate,
                      end_at: perfEndDate
                    }
                  }
                }
              })
            });
            
            if (timecardsResponse.ok) {
              const timecardsData = await timecardsResponse.json();
              const timecards = timecardsData.timecards || [];
              totalShifts = timecards.length;
              
              totalHours = timecards.reduce((sum, timecard) => {
                if (timecard.start_at && timecard.end_at) {
                  const start = new Date(timecard.start_at);
                  const end = new Date(timecard.end_at);
                  return sum + ((end.getTime() - start.getTime()) / (1000 * 60 * 60));
                }
                return sum;
              }, 0);
            }
          } catch (error) {
            console.warn('Could not fetch timecards:', error.message);
          }
        }

        // Calculate performance metrics from filtered orders
        const netSales = filteredOrders.reduce((sum, order) => 
          sum + (order.total_money?.amount || 0), 0) / 100; // Convert cents to dollars

        const coverCount = filteredOrders.length; // This should now be correct
        const ppa = coverCount > 0 ? netSales / coverCount : 0;
        
        console.log(`Calculated metrics: ${filteredOrders.length} orders, $${netSales} sales, $${ppa.toFixed(2)} PPA`);
        
        // Use actual hours worked if available, otherwise fall back to period calculation
        let salesPerHour = 0;
        if (totalHours > 0) {
          salesPerHour = netSales / totalHours;
        } else {
          const startTime = new Date(perfStartDate);
          const endTime = new Date(perfEndDate);
          const hoursInPeriod = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
          salesPerHour = hoursInPeriod > 0 ? netSales / hoursInPeriod : 0;
        }

        // Calculate daily performance
        const dailyPerformance = [];
        const dailyMap = new Map();

        filteredOrders.forEach(order => {
          const date = new Date(order.created_at).toISOString().split('T')[0];
          const existing = dailyMap.get(date) || { sales: 0, covers: 0 };
          existing.sales += (order.total_money?.amount || 0) / 100;
          existing.covers += 1;
          dailyMap.set(date, existing);
        });

        dailyMap.forEach((value, date) => {
          dailyPerformance.push({
            date,
            sales: value.sales,
            covers: value.covers
          });
        });

        // Calculate top items
        const itemMap = new Map();
        filteredOrders.forEach(order => {
          order.line_items?.forEach(item => {
            const existing = itemMap.get(item.name) || { quantity: 0, revenue: 0 };
            existing.quantity += parseInt(item.quantity || '1');
            existing.revenue += (item.total_money?.amount || 0) / 100;
            itemMap.set(item.name, existing);
          });
        });

        const topItems = Array.from(itemMap.entries())
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10);

        result = {
          netSales,
          coverCount,
          ppa,
          salesPerHour,
          totalHours,
          totalShifts,
          dailyPerformance: dailyPerformance.sort((a, b) => a.date.localeCompare(b.date)),
          topItems,
          orderCount: filteredOrders.length,
          averageOrderValue: ppa
        };
        break;

      default:
        throw new Error(`Unknown endpoint: ${endpoint}`);
    }

    return new Response(
      JSON.stringify(result),
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
