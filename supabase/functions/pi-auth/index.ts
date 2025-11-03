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

    const email = `${piUser.uid}@pi.network`;

    if (existingProfile) {
      profileId = existingProfile.id;
      userId = existingProfile.user_id;
      console.log('Existing profile found:', profileId);
    } else {
      console.log('No existing profile found. Ensuring auth user exists for', email);

      // Try to find an existing auth user first
      let authUserId: string | null = null;
      try {
        const { data: usersData, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
        if (listError) {
          console.warn('listUsers error (safe to ignore):', listError);
        } else {
          const match = usersData?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
          if (match) authUserId = match.id;
        }
      } catch (e) {
        console.warn('listUsers threw (safe to continue):', e);
      }

      if (!authUserId) {
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: {
            pi_username: piUser.username,
            pi_uid: piUser.uid,
          },
        });

        if (authError) {
          // If the email already exists, fetch that user and continue
          // @ts-ignore code property exists on AuthApiError
          if ((authError as any).code === 'email_exists') {
            console.warn('Auth user already exists, fetching existing user by email');
            const { data: usersData2 } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
            const match2 = usersData2?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
            if (match2) authUserId = match2.id;
          } else {
            console.error('Failed to create auth user:', authError);
            throw authError;
          }
        } else {
          authUserId = authData.user.id;
          console.log('Created new auth user:', authUserId);
        }
      }

      if (!authUserId) {
        throw new Error('Unable to resolve auth user id');
      }

      userId = authUserId;

      // Ensure profile exists for this user
      const { data: newProfile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          username: piUser.username,
          business_name: piUser.username,
        })
        .select()
        .maybeSingle();

      if (profileError) {
        // Ignore unique violations and fetch the profile
        console.warn('Profile insert error, attempting to fetch existing profile:', profileError);
      }

      if (newProfile) {
        profileId = newProfile.id;
      } else {
        const { data: fetchedProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', piUser.username)
          .maybeSingle();
        profileId = fetchedProfile?.id;
      }

      console.log('Resolved profile id:', profileId);
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
