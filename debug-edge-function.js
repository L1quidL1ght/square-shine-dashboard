#!/usr/bin/env node

/**
 * Debug Edge Function Call
 * This script mimics the exact same call the frontend makes to test the Edge Function
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://gtpqdakpaxovrcqkbnui.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0cHFkYWtwYXhvdnJjcWtibnVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjU2ODgsImV4cCI6MjA2ODYwMTY4OH0.fGhi1QUOwMey0uPNc_M2ipGNQSPeefnsJzISX1_v5Rc";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function debugEdgeFunction() {
  console.log('🔍 Debug Edge Function Call');
  console.log('============================');
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Using Edge Function: square-api`);
  console.log('');

  // Test 1: Simple locations call
  console.log('📍 TEST 1: Locations Endpoint');
  try {
    const { data, error } = await supabase.functions.invoke('square-api', {
      body: { 
        endpoint: '/locations',
        body: {}
      }
    });

    if (error) {
      console.log('❌ Edge Function Error:', error);
    } else {
      console.log('✅ Success:', data);
    }
  } catch (err) {
    console.log('❌ Network/Client Error:', err.message);
  }

  console.log('');

  // Test 2: Performance metrics call (exact same as frontend)
  console.log('📊 TEST 2: Performance Metrics (Frontend simulation)');
  const startDate = new Date('2025-01-13T17:00:00.000Z');
  const endDate = new Date('2025-01-20T17:00:00.000Z');
  
  try {
    const { data, error } = await supabase.functions.invoke('square-api', {
      body: { 
        endpoint: '/performance',
        body: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          teamMemberId: undefined
        }
      }
    });

    if (error) {
      console.log('❌ Edge Function Error:', error);
      console.log('Error details:', JSON.stringify(error, null, 2));
    } else {
      console.log('✅ Success:', data);
      console.log('Data details:', JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.log('❌ Network/Client Error:', err.message);
    console.log('Full error:', err);
  }

  console.log('');

  // Test 3: Check if Edge Function is deployed
  console.log('🚀 TEST 3: Edge Function Deployment Check');
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/square-api`, {
      method: 'OPTIONS',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`OPTIONS Response Status: ${response.status}`);
    console.log('CORS Headers:', Object.fromEntries([...response.headers.entries()]));
  } catch (err) {
    console.log('❌ Edge Function not accessible:', err.message);
  }
}

debugEdgeFunction().catch(console.error);