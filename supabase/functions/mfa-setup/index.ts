import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as OTPAuth from "https://deno.land/x/otpauth@v9.1.4/dist/otpauth.esm.js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, token } = await req.json();
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

    if (action === 'setup') {
      // Generate new secret
      const secret = new OTPAuth.Secret({ size: 20 });
      const totp = new OTPAuth.TOTP({
        issuer: 'FinanceTutor',
        label: user.email,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: secret,
      });

      // Store secret in database
      const { error: insertError } = await supabaseClient
        .from('mfa_secrets')
        .upsert({
          user_id: user.id,
          secret: secret.base32,
          enabled: false,
        });

      if (insertError) {
        console.error('Error storing MFA secret:', insertError);
        return new Response(JSON.stringify({ error: 'Failed to setup MFA' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const otpauthUrl = totp.toString();
      return new Response(JSON.stringify({ 
        secret: secret.base32,
        qrCodeUrl: otpauthUrl 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'verify') {
      // Verify token
      const { data: mfaData } = await supabaseClient
        .from('mfa_secrets')
        .select('secret')
        .eq('user_id', user.id)
        .single();

      if (!mfaData) {
        return new Response(JSON.stringify({ error: 'MFA not setup' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const totp = new OTPAuth.TOTP({
        issuer: 'FinanceTutor',
        label: user.email,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(mfaData.secret),
      });

      const delta = totp.validate({ token, window: 1 });
      const isValid = delta !== null;

      if (isValid) {
        // Enable MFA
        await supabaseClient
          .from('mfa_secrets')
          .update({ enabled: true })
          .eq('user_id', user.id);
      }

      return new Response(JSON.stringify({ valid: isValid }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'check') {
      // Check if MFA is enabled
      const { data: mfaData } = await supabaseClient
        .from('mfa_secrets')
        .select('enabled')
        .eq('user_id', user.id)
        .single();

      return new Response(JSON.stringify({ 
        enabled: mfaData?.enabled || false 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'validate') {
      // Validate token for authentication
      const { data: mfaData } = await supabaseClient
        .from('mfa_secrets')
        .select('secret, enabled')
        .eq('user_id', user.id)
        .single();

      if (!mfaData?.enabled) {
        return new Response(JSON.stringify({ valid: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const totp = new OTPAuth.TOTP({
        issuer: 'FinanceTutor',
        label: user.email,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(mfaData.secret),
      });

      const delta = totp.validate({ token, window: 1 });
      const isValid = delta !== null;

      return new Response(JSON.stringify({ valid: isValid }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in mfa-setup function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});