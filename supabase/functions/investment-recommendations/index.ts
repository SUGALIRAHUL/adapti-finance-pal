import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    
    // Validate input
    const investmentSchema = z.object({
      riskProfile: z.enum(['conservative', 'moderate', 'aggressive']).optional().default('moderate'),
      investmentAmount: z.number().min(1, 'Investment amount must be positive').max(1000000000, 'Investment amount too large').optional().default(10000)
    });

    const validationResult = investmentSchema.safeParse(requestBody);
    if (!validationResult.success) {
      return new Response(JSON.stringify({ 
        error: 'Invalid input', 
        details: validationResult.error.issues 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { riskProfile, investmentAmount } = validationResult.data;
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if MFA is enabled and enforce it
    const { data: mfaData } = await supabaseClient
      .from('mfa_secrets')
      .select('enabled')
      .eq('user_id', user.id)
      .single();

    if (mfaData?.enabled) {
      const mfaToken = req.headers.get('X-MFA-Token');
      if (!mfaToken) {
        return new Response(
          JSON.stringify({ error: 'MFA token required for this operation' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate MFA token
      const validateResponse = await supabaseClient.functions.invoke('mfa-setup', {
        body: { action: 'validate', token: mfaToken }
      });

      if (validateResponse.error || !validateResponse.data?.valid) {
        return new Response(
          JSON.stringify({ error: 'Invalid MFA token' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get user's existing investments for context
    const { data: investments } = await supabaseClient
      .from('investments')
      .select('*')
      .eq('user_id', user.id);

    const systemPrompt = `You are an investment advisor providing educational recommendations. 
Based on the user's risk profile (${riskProfile}) and available investment amount ($${investmentAmount}), suggest 3-5 investment options.

IMPORTANT: Include a clear disclaimer that these are educational suggestions only and not financial advice.

For each recommendation, provide:
1. Investment type (stocks, bonds, ETFs, mutual funds, etc.)
2. Specific sector or category
3. Allocation percentage
4. Risk level (low/medium/high)
5. Expected return range (realistic estimates)
6. Brief rationale

Current portfolio: ${investments?.length || 0} existing investments

Return your response as a JSON object with this structure:
{
  "disclaimer": "Educational purposes only disclaimer text",
  "recommendations": [
    {
      "name": "Investment name",
      "type": "Investment type",
      "sector": "Sector/Category",
      "allocation": 30,
      "risk": "medium",
      "expectedReturn": "7-10%",
      "rationale": "Why this investment"
    }
  ],
  "summary": "Overall portfolio strategy summary"
}`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Provide investment recommendations for a ${riskProfile} risk profile with $${investmentAmount} to invest.` 
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Service temporarily unavailable. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Service unavailable. Please contact support.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.error('AI gateway error:', response.status, await response.text());
      return new Response(JSON.stringify({ error: 'An error occurred. Please try again.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Try to parse JSON response
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const recommendations = JSON.parse(jsonMatch[0]);
        return new Response(JSON.stringify(recommendations), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
    }

    // Fallback: return raw content
    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in investment-recommendations function:', error);
    return new Response(JSON.stringify({ error: 'An error occurred. Please try again.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});