import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { paymentId } = await req.json();
    
    if (!paymentId) {
      throw new Error('Payment ID is required');
    }

    console.log('Approving Pi payment:', paymentId);

    const piApiKey = Deno.env.get('PI_API_KEY');
    
    // Approve the payment with Pi servers
    const approveResponse = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${piApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!approveResponse.ok) {
      const errorText = await approveResponse.text();
      console.error('Pi payment approval failed:', errorText);
      throw new Error('Failed to approve payment');
    }

    const approvalData = await approveResponse.json();
    console.log('Payment approved successfully:', approvalData);

    return new Response(
      JSON.stringify({ 
        success: true,
        payment: approvalData 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in pi-payment-approve:', error);
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
