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

    const paymentData = await completeResponse.json();
    console.log('Payment completed successfully:', paymentData);

    // Update user's subscription status in database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get subscription details from payment metadata
    const profileId = paymentData.metadata?.profile_id || paymentData.metadata?.profileId;
    const plan = paymentData.metadata?.plan;
    const period = paymentData.metadata?.period;
    const piAmount = paymentData.amount;
    
    if (profileId && plan && period) {
      // Calculate expiration date
      const now = new Date();
      const expiresAt = new Date(now);
      if (period === 'yearly') {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      } else {
        expiresAt.setMonth(expiresAt.getMonth() + 1);
      }

      // Update profile subscription
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          subscription_plan: plan,
          subscription_expires_at: expiresAt.toISOString(),
          subscription_period: period,
          has_premium: true
        })
        .eq('id', profileId);

      if (updateError) {
        console.error('Failed to update profile:', updateError);
        throw updateError;
      }

      // Record the transaction
      const { error: txError } = await supabase
        .from('subscription_transactions')
        .insert({
          profile_id: profileId,
          plan,
          period,
          pi_amount: piAmount,
          pi_payment_id: paymentId,
          pi_txid: txid,
          expires_at: expiresAt.toISOString()
        });

      if (txError) {
        console.error('Failed to record transaction:', txError);
      }

      console.log(`Updated profile ${profileId} to ${plan} (${period}) until ${expiresAt.toISOString()}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        payment: paymentData 
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
