import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { accessToken } = await req.json();
    
    if (!accessToken) {
      throw new Error('Access token is required');
    }

    console.log('Verifying Pi access token...');

    // Get Pi API key from environment
    const piApiKey = Deno.env.get('PI_API_KEY');
    if (!piApiKey) {
      console.error('PI_API_KEY not configured');
      throw new Error('Server configuration error: PI_API_KEY missing');
    }

    // Verify the access token with Pi servers
    const verifyResponse = await fetch('https://api.minepi.com/v2/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!verifyResponse.ok) {
      const errorText = await verifyResponse.text();
      console.error('Pi verification failed:', errorText);
      throw new Error(`Pi verification failed: ${verifyResponse.status}`);
    }

    const piUser = await verifyResponse.json();
    console.log('Pi user verified:', piUser.username);

    // Create or get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if profile exists with this Pi username
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, user_id')
      .eq('username', piUser.username)
      .maybeSingle();

    let profileId;
    let userId;

    if (existingProfile) {
      profileId = existingProfile.id;
      userId = existingProfile.user_id;
      console.log('Existing profile found:', profileId);
    } else {
      // Create a new auth user for this Pi user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: `${piUser.uid}@pi.network`,
        email_confirm: true,
        user_metadata: {
          pi_username: piUser.username,
          pi_uid: piUser.uid,
        },
      });

      if (authError) {
        console.error('Failed to create auth user:', authError);
        throw authError;
      }

      userId = authData.user.id;
      console.log('Created new auth user:', userId);

      // Create profile
      const { data: newProfile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          username: piUser.username,
          business_name: piUser.username,
        })
        .select()
        .single();

      if (profileError) {
        console.error('Failed to create profile:', profileError);
        throw profileError;
      }

      profileId = newProfile.id;
      console.log('Created new profile:', profileId);
    }

    // Generate session token for the user
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: `${piUser.uid}@pi.network`,
    });

    if (sessionError) {
      console.error('Failed to generate session:', sessionError);
      throw sessionError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: piUser,
        profileId,
        sessionToken: sessionData.properties.action_link,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in pi-auth:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
