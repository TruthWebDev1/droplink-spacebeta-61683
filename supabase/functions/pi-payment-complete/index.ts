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
    const { paymentId, txid } = await req.json();
    
    if (!paymentId || !txid) {
      throw new Error('Payment ID and transaction ID are required');
    }

    console.log('Completing Pi payment:', paymentId, txid);

    const piApiKey = Deno.env.get('PI_API_KEY');
    
    // Complete the payment with Pi servers
    const completeResponse = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${piApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ txid }),
    });

    if (!completeResponse.ok) {
      const errorText = await completeResponse.text();
      console.error('Pi payment completion failed:', errorText);
      throw new Error('Failed to complete payment');
    }

    const completionData = await completeResponse.json();
    console.log('Payment completed successfully:', completionData);

    // Update user's premium status in database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the profile ID from payment metadata
    if (completionData.metadata && completionData.metadata.profileId) {
      await supabase
        .from('profiles')
        .update({ has_premium: true })
        .eq('id', completionData.metadata.profileId);
      
      console.log('Updated premium status for profile:', completionData.metadata.profileId);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        payment: completionData 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in pi-payment-complete:', error);
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
