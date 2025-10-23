import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as OTPAuth from "https://deno.land/x/otpauth@v9.1.4/dist/otpauth.esm.js";

// Encryption utilities using Web Crypto API
async function getEncryptionKey(): Promise<CryptoKey> {
  const keyMaterial = Deno.env.get('MFA_ENCRYPTION_KEY') || 'default-encryption-key-change-in-production';
  const enc = new TextEncoder();
  const keyData = enc.encode(keyMaterial.padEnd(32, '0').substring(0, 32));
  
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptSecret(plaintext: string): Promise<string> {
  const key = await getEncryptionKey();
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  );
  
  // Combine IV and encrypted data, then base64 encode
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

async function decryptSecret(ciphertext: string): Promise<string> {
  const key = await getEncryptionKey();
  const dec = new TextDecoder();
  
  // Decode base64 and separate IV from encrypted data
  const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  );
  
  return dec.decode(decrypted);
}

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

      // Encrypt and store secret in database
      const encryptedSecret = await encryptSecret(secret.base32);
      const { error: insertError } = await supabaseClient
        .from('mfa_secrets')
        .upsert({
          user_id: user.id,
          secret: encryptedSecret,
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

      // Decrypt secret before using
      const decryptedSecret = await decryptSecret(mfaData.secret);
      const totp = new OTPAuth.TOTP({
        issuer: 'FinanceTutor',
        label: user.email,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(decryptedSecret),
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

      // Decrypt secret before using
      const decryptedSecret = await decryptSecret(mfaData.secret);
      const totp = new OTPAuth.TOTP({
        issuer: 'FinanceTutor',
        label: user.email,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(decryptedSecret),
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
    return new Response(JSON.stringify({ error: 'An error occurred. Please try again.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});