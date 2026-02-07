import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const REFERRAL_BONUS = 10000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { new_user_id, referral_code } = await req.json();

    if (!new_user_id || !referral_code) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing referral: new_user=${new_user_id}, code=${referral_code}`);

    // 1. Find the referrer by their referral code
    const { data: referrer, error: referrerError } = await supabase
      .from('profiles')
      .select('user_id, referral_code')
      .eq('referral_code', referral_code.toUpperCase())
      .single();

    if (referrerError || !referrer) {
      console.log('Invalid referral code:', referral_code);
      return new Response(
        JSON.stringify({ error: 'Invalid referral code', success: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Check for self-referral
    if (referrer.user_id === new_user_id) {
      console.log('Self-referral attempt blocked');
      return new Response(
        JSON.stringify({ error: 'Self-referral not allowed', success: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Check if this user already received a referral bonus
    const { data: newUserProfile, error: newUserError } = await supabase
      .from('profiles')
      .select('referral_bonus_received, referred_by')
      .eq('user_id', new_user_id)
      .single();

    if (newUserError) {
      console.error('Error fetching new user profile:', newUserError);
      return new Response(
        JSON.stringify({ error: 'User profile not found', success: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (newUserProfile.referral_bonus_received) {
      console.log('User already received referral bonus');
      return new Response(
        JSON.stringify({ error: 'Referral bonus already claimed', success: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Add bonus to referred user (new user)
    const { error: updateReferredError } = await supabase
      .from('profiles')
      .update({
        extra_words_balance: supabase.rpc ? undefined : 0, // Will use RPC below
        referred_by: referrer.user_id,
        referral_bonus_received: true,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', new_user_id);

    // Use RPC to safely increment the balance
    const { error: rpcReferredError } = await supabase.rpc('add_extra_credits_internal', {
      p_user_id: new_user_id,
      p_word_count: REFERRAL_BONUS
    });

    if (rpcReferredError) {
      console.error('Error adding credits to referred user:', rpcReferredError);
    }

    // Update the referred_by and referral_bonus_received flags
    await supabase
      .from('profiles')
      .update({
        referred_by: referrer.user_id,
        referral_bonus_received: true,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', new_user_id);

    // 5. Add bonus to referrer
    const { error: rpcReferrerError } = await supabase.rpc('add_extra_credits_internal', {
      p_user_id: referrer.user_id,
      p_word_count: REFERRAL_BONUS
    });

    if (rpcReferrerError) {
      console.error('Error adding credits to referrer:', rpcReferrerError);
    }

    // 6. Create referral record
    const { error: referralInsertError } = await supabase
      .from('referrals')
      .insert({
        referrer_id: referrer.user_id,
        referred_id: new_user_id,
        referral_code: referral_code.toUpperCase(),
        referrer_bonus: REFERRAL_BONUS,
        referred_bonus: REFERRAL_BONUS,
        status: 'completed'
      });

    if (referralInsertError) {
      console.error('Error creating referral record:', referralInsertError);
    }

    console.log(`Referral processed successfully: ${referrer.user_id} -> ${new_user_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Referral bonus applied',
        bonus: REFERRAL_BONUS 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
