
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
    let body
    try {
      body = await req.json()
      console.log('📦 Request body received:', JSON.stringify(body, null, 2))
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

    // Extract parameters properly - fix the inconsistent structure
    const { endpoint, body: requestData } = body
    console.log(`🎯 Endpoint: ${endpoint}`)
    console.log(`📋 Request Data: ${JSON.stringify(requestData, null, 2)}`)

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

    const baseUrl = environment === 'production' 
      ? 'https://connect.squareup.com/v2'
      : 'https://connect.squareupsandbox.com/v2'
    
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Square-Version': '2023-10-18'
    }

    let result

    // Handle different endpoints with standardized parameter extraction
    switch (endpoint) {
      case '/locations': {
        console.log('🔍 Fetching locations...')
        
        const response = await fetch(`${baseUrl}/locations`, {
          method: 'GET',
          headers
        })
        
        if (!response.ok) {
          const error = await response.text()
          console.error('❌ Locations API error:', error)
          throw new Error(`Square API error: ${response.status} ${error}`)
        }
        
        const data = await response.json()
        console.log(`✅ Locations fetched: ${data.locations?.length || 0} found`)
        
        result = {
          locations: data.locations?.map(loc => ({
            id: loc.id,
            name: loc.name,
            status: loc.status,
            address: loc.address
          })) || []
        }
        break
      }
      
      case '/team-members': {
        console.log('🔍 Fetching team members...')
        
        const response = await fetch(`${baseUrl}/team-members/search`, {
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
        })
        
        if (!response.ok) {
          const error = await response.text()
          console.error('❌ Team members API error:', error)
          throw new Error(`Square API error: ${response.status} ${error}`)
        }
        
        const data = await response.json()
        console.log(`✅ Team members fetched: ${data.team_members?.length || 0} found`)
        
        result = {
          teamMembers: data.team_members?.map(member => ({
            id: member.id,
            name: `${member.given_name || ''} ${member.family_name || ''}`.trim(),
            role: member.assigned_locations?.[0]?.job_title || 'Team Member',
            status: member.status
          })) || []
        }
        break
      }
      
      case '/orders': {
        console.log('🔍 Fetching orders...')
        
        // Fix: Extract parameters from requestData properly
        const { startDate, endDate, teamMemberId } = requestData || {}
        
        if (!startDate || !endDate) {
          throw new Error('Start date and end date are required')
        }
        
        console.log(`📅 Date range: ${startDate} to ${endDate}`)
        if (teamMemberId) {
          console.log(`👤 Team member filter: ${teamMemberId}`)
        }
        
        const searchBody = {
          location_ids: [locationId],
          query: {
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
            }
          },
          limit: 500
        }
        
        let allOrders: any[] = []
        let cursor: string | undefined
        let totalRequests = 0
        const maxRequests = 20
        
        do {
          if (totalRequests >= maxRequests) {
            console.log(`⚠️ Reached maximum requests limit (${maxRequests})`)
            break
          }
          
          if (cursor) {
            searchBody.cursor = cursor
          }
          
          console.log(`📡 Making request ${totalRequests + 1} to orders API...`)
          
          const response = await fetch(`${baseUrl}/orders/search`, {
            method: 'POST',
            headers,
            body: JSON.stringify(searchBody)
          })
          
          if (!response.ok) {
            const error = await response.text()
            console.error('❌ Orders API error:', error)
            throw new Error(`Square API error: ${response.status} ${error}`)
          }
          
          const data = await response.json()
          const orders = data.orders || []
          allOrders = allOrders.concat(orders)
          cursor = data.cursor
          
          console.log(`📦 Batch ${totalRequests + 1}: ${orders.length} orders, cursor: ${cursor ? 'exists' : 'none'}`)
          totalRequests++
          
        } while (cursor && totalRequests < maxRequests)
        
        // Filter by team member if specified
        if (teamMemberId && teamMemberId !== 'all') {
          const originalCount = allOrders.length
          allOrders = allOrders.filter(order => {
            return order.fulfillments?.some((fulfillment: any) => 
              fulfillment.fulfillment_entries?.some((entry: any) => entry.team_member_id === teamMemberId)
            )
          })
          console.log(`👤 Filtered orders by team member: ${originalCount} -> ${allOrders.length}`)
        }
        
        console.log(`✅ Orders fetched: ${allOrders.length} total orders`)
        
        result = { orders: allOrders }
        break
      }

      
      case '/performance': {
        console.log('🔍 Calculating performance metrics...')
        
        // Fix: Extract parameters from requestData properly
        const { startDate, endDate, teamMemberId } = requestData || {}
        
        if (!startDate || !endDate) {
          throw new Error('Start date and end date are required')
        }
        
        console.log(`📅 Performance date range: ${startDate} to ${endDate}`)
        if (teamMemberId) {
          console.log(`👤 Performance team member filter: ${teamMemberId}`)
        }
        
        // First get orders
        const searchBody = {
          location_ids: [locationId],
          query: {
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
            }
          },
          limit: 500
        }
        
        let allOrders: any[] = []
        let cursor: string | undefined
        let totalRequests = 0
        const maxRequests = 20
        
        do {
          if (totalRequests >= maxRequests) break
          
          if (cursor) {
            searchBody.cursor = cursor
          }
          
          console.log(`📡 Making performance request ${totalRequests + 1} to orders API...`)
          
          const response = await fetch(`${baseUrl}/orders/search`, {
            method: 'POST',
            headers,
            body: JSON.stringify(searchBody)
          })
          
          if (!response.ok) {
            const error = await response.text()
            console.error('❌ Performance orders API error:', error)
            throw new Error(`Square API error: ${response.status} ${error}`)
          }
          
          const data = await response.json()
          const orders = data.orders || []
          allOrders = allOrders.concat(orders)
          cursor = data.cursor
          
          console.log(`📦 Performance batch ${totalRequests + 1}: ${orders.length} orders`)
          totalRequests++
          
        } while (cursor && totalRequests < maxRequests)
        
        // Filter by team member if specified
        if (teamMemberId && teamMemberId !== 'all') {
          const originalCount = allOrders.length
          allOrders = allOrders.filter(order => {
            return order.fulfillments?.some((fulfillment: any) => 
              fulfillment.fulfillment_entries?.some((entry: any) => entry.team_member_id === teamMemberId)
            )
          })
          console.log(`👤 Performance filtered orders by team member: ${originalCount} -> ${allOrders.length}`)
        }
        
        // Calculate metrics
        const netSales = allOrders.reduce((sum, order) => 
          sum + (order.total_money?.amount || 0), 0) / 100
        
        const coverCount = allOrders.length
        const ppa = coverCount > 0 ? netSales / coverCount : 0
        
        // Calculate daily performance
        const dailyMap = new Map<string, { sales: number; covers: number }>()
        
        allOrders.forEach(order => {
          const date = new Date(order.created_at).toISOString().split('T')[0]
          const existing = dailyMap.get(date) || { sales: 0, covers: 0 }
          existing.sales += (order.total_money?.amount || 0) / 100
          existing.covers += 1
          dailyMap.set(date, existing)
        })
        
        const dailyPerformance = Array.from(dailyMap.entries())
          .map(([date, data]) => ({
            date,
            sales: data.sales,
            covers: data.covers
          }))
          .sort((a, b) => a.date.localeCompare(b.date))
        
        // Calculate top items
        const itemMap = new Map<string, { quantity: number; revenue: number }>()
        
        allOrders.forEach(order => {
          order.line_items?.forEach((item: any) => {
            const existing = itemMap.get(item.name) || { quantity: 0, revenue: 0 }
            existing.quantity += parseInt(item.quantity || '1')
            existing.revenue += (item.total_money?.amount || 0) / 100
            itemMap.set(item.name, existing)
          })
        })
        
        const topItems = Array.from(itemMap.entries())
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10)
        
        result = {
          netSales,
          coverCount,
          ppa,
          salesPerHour: 0, // Would need shift data
          totalHours: 0,   // Would need shift data
          totalShifts: 0,  // Would need shift data
          dailyPerformance,
          topItems
        }
        
        console.log(`✅ Performance calculated: $${netSales.toFixed(2)} sales, ${coverCount} covers`)
        break
      }
      
      default:
        console.error(`❌ Unknown endpoint: ${endpoint}`)
        throw new Error(`Unknown endpoint: ${endpoint}`)
    }

    console.log('✅ Sending result:', JSON.stringify(result, null, 2))

    return new Response(JSON.stringify(result), {
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
