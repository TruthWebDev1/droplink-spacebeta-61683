import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { profileId, message, sessionId } = await req.json();
    console.log('AI Chat request:', { profileId, message, sessionId });

    if (!profileId || !message || !sessionId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Fetch AI configuration for this profile
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const configResponse = await fetch(
      `${supabaseUrl}/rest/v1/ai_support_config?profile_id=eq.${profileId}&select=*`,
      {
        headers: {
          'apikey': supabaseKey!,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    const configs = await configResponse.json();
    const config = configs[0];

    if (!config || !config.enabled) {
      return new Response(JSON.stringify({ error: 'AI support is not enabled for this profile' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch profile info
    const profileResponse = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${profileId}&select=business_name,description`,
      {
        headers: {
          'apikey': supabaseKey!,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    const profiles = await profileResponse.json();
    const profile = profiles[0];

    // Fetch recent chat history for context
    const historyResponse = await fetch(
      `${supabaseUrl}/rest/v1/ai_chat_messages?profile_id=eq.${profileId}&session_id=eq.${sessionId}&order=created_at.desc&limit=10`,
      {
        headers: {
          'apikey': supabaseKey!,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    const history = await historyResponse.json();
    const messages = history.reverse().map((msg: any) => ({
      role: msg.role,
      content: msg.content
    }));

    // Build system prompt
    let systemPrompt = `You are a helpful AI assistant for ${profile?.business_name || 'this business'}.`;
    
    if (profile?.description) {
      systemPrompt += ` About the business: ${profile.description}`;
    }
    
    if (config.business_info) {
      systemPrompt += `\n\nAdditional business information:\n${config.business_info}`;
    }
    
    if (config.faqs) {
      systemPrompt += `\n\nFrequently Asked Questions:\n${config.faqs}`;
    }
    
    if (config.custom_instructions) {
      systemPrompt += `\n\nSpecial instructions: ${config.custom_instructions}`;
    }

    systemPrompt += `\n\nBe helpful, friendly, and professional. If you don't know something, be honest about it.`;

    console.log('System prompt:', systemPrompt);

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
          { role: 'user', content: message }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits depleted. Please contact support.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const assistantMessage = aiData.choices[0].message.content;

    console.log('AI response:', assistantMessage);

    // Save messages to database
    await fetch(`${supabaseUrl}/rest/v1/ai_chat_messages`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey!,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify([
        {
          profile_id: profileId,
          session_id: sessionId,
          role: 'user',
          content: message
        },
        {
          profile_id: profileId,
          session_id: sessionId,
          role: 'assistant',
          content: assistantMessage
        }
      ])
    });

    return new Response(JSON.stringify({ 
      message: assistantMessage,
      success: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in ai-chat function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});