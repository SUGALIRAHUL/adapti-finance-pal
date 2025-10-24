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
    const tutorSchema = z.object({
      messages: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(5000, 'Message content too long')
      })).min(1, 'At least one message required').max(50, 'Too many messages'),
      type: z.enum(['chat', 'quiz']).optional().default('chat')
    });

    const validationResult = tutorSchema.safeParse(requestBody);
    if (!validationResult.success) {
      return new Response(JSON.stringify({ 
        error: 'Invalid input', 
        details: validationResult.error.issues 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { messages, type } = validationResult.data;
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

    // Get user's knowledge level
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('knowledge_level')
      .eq('id', user.id)
      .single();

    const knowledgeLevel = profile?.knowledge_level || 'beginner';

    let systemPrompt = '';
    if (type === 'chat') {
      systemPrompt = `You are an expert personal finance tutor. The user's current knowledge level is ${knowledgeLevel}. 
Adapt your teaching style to their level:
- Beginner: Use simple language, explain basic concepts, provide examples
- Intermediate: Use moderate complexity, discuss strategies, provide analysis
- Advanced: Use technical terms, discuss complex strategies, provide in-depth insights

Topics you can help with:
- Budgeting and saving strategies
- Investment basics (stocks, bonds, mutual funds, ETFs)
- Retirement planning
- Tax optimization
- Risk management
- Financial goal setting
- Debt management

Keep responses clear, educational, and actionable.`;
    } else if (type === 'quiz') {
      systemPrompt = `You are a quiz generator for personal finance education. Generate a quiz with 5 multiple-choice questions appropriate for ${knowledgeLevel} level.
Return the quiz in this exact JSON format:
{
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Why this answer is correct"
    }
  ]
}`;
    }

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
          ...messages
        ],
        stream: type === 'chat',
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

    if (type === 'chat') {
      return new Response(response.body, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
      });
    } else {
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error in ai-tutor function:', error);
    return new Response(JSON.stringify({ error: 'An error occurred. Please try again.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});