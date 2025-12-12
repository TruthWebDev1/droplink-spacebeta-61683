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
    console.log('Pi user verified:', piUser.username, 'uid:', piUser.uid);

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const email = `${piUser.uid}@pi.network`;
    let userId: string | null = null;
    let profileId: string | null = null;

    // Try to find existing auth user by email
    console.log('Looking for existing user with email:', email);
    
    const { data: existingUsers } = await supabase.auth.admin.listUsers({ 
      page: 1, 
      perPage: 1000 
    });
    
    const existingUser = existingUsers?.users?.find(
      (u: any) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
      userId = existingUser.id;
      console.log('Found existing auth user:', userId);
    } else {
      // Create new auth user
      console.log('Creating new auth user for:', email);
      const { data: newAuthUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          pi_username: piUser.username,
          pi_uid: piUser.uid,
        },
      });

      if (createError) {
        console.error('Failed to create auth user:', createError);
        throw createError;
      }

      userId = newAuthUser.user.id;
      console.log('Created new auth user:', userId);
    }

    // Check for existing profile
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, subscription_plan')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingProfile) {
      profileId = existingProfile.id;
      console.log('Found existing profile:', profileId);
    } else {
      // Also check by username
      const { data: profileByUsername } = await supabase
        .from('profiles')
        .select('id, user_id, subscription_plan')
        .eq('username', piUser.username)
        .maybeSingle();

      if (profileByUsername) {
        profileId = profileByUsername.id;
        // Update user_id if not set
        if (!profileByUsername.user_id) {
          await supabase
            .from('profiles')
            .update({ user_id: userId })
            .eq('id', profileId);
        }
        console.log('Found profile by username:', profileId);
      } else {
        // Create new profile with free plan
        console.log('Creating new profile for user:', userId);
        const { data: newProfile, error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: userId,
            username: piUser.username,
            business_name: piUser.username,
            subscription_plan: 'free'
          })
          .select('id')
          .single();

        if (profileError) {
          console.error('Profile creation error:', profileError);
          // Try to fetch if it was a duplicate
          const { data: fetchedProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();
          
          profileId = fetchedProfile?.id || null;
        } else {
          profileId = newProfile.id;
        }
        console.log('Profile created/found:', profileId);
      }
    }

    // Generate session token for the user
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

    if (sessionError) {
      console.error('Failed to generate session:', sessionError);
      throw sessionError;
    }

    console.log('Authentication successful for:', piUser.username);

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          username: piUser.username,
          uid: piUser.uid,
        },
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
