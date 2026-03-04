import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  completeRedirectFlow,
  createSubscription,
} from '../_shared/gocardless.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  redirect_flow_id: string;
  session_token: string;
  plan: 'monthly' | 'yearly';
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  taxId?: string;
  phone?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();

    if (!body.redirect_flow_id || !body.session_token || !body.plan || !body.email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Complete GoCardless redirect flow → get mandate + customer
    console.log('Completing GoCardless redirect flow...');
    const completedFlow = await completeRedirectFlow(body.redirect_flow_id, body.session_token);
    const mandateId = completedFlow.links.mandate;
    const customerId = completedFlow.links.customer;

    // 2. Fetch plan_id from subscription_plans table
    const { data: planRow, error: planError } = await supabase
      .from('subscription_plans')
      .select('id')
      .eq('name', body.plan)
      .single();

    if (planError || !planRow) {
      throw new Error(`Plan '${body.plan}' not found in subscription_plans`);
    }

    // 3. Create GoCardless subscription against the mandate
    const PLAN_AMOUNTS: Record<string, {
      amount: number; currency: string; interval: number;
      intervalUnit: 'monthly' | 'yearly'; name: string;
    }> = {
      monthly: { amount: 14400,  currency: 'EUR', interval: 1, intervalUnit: 'monthly', name: 'Certigestion - Mensuel' },
      yearly:  { amount: 144000, currency: 'EUR', interval: 1, intervalUnit: 'yearly',  name: 'Certigestion - Annuel'  },
    };
    const planDetails = PLAN_AMOUNTS[body.plan];

    console.log('Creating GoCardless subscription...');
    const subscription = await createSubscription(
      mandateId,
      planDetails.amount,
      planDetails.currency,
      planDetails.interval,
      planDetails.intervalUnit,
      planDetails.name,
      { email: body.email, plan: body.plan }
    );

    // 4. Create or retrieve Supabase Auth user
    let userId: string;
    const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const existingUser = users?.find((u) => u.email === body.email);

    if (existingUser) {
      userId = existingUser.id;
      console.log('User already exists:', userId);
    } else {
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: body.email,
        email_confirm: true,
        user_metadata: {
          first_name: body.firstName,
          last_name: body.lastName,
          company: body.company,
          tax_id: body.taxId,
          phone: body.phone,
        },
      });
      if (createError) throw new Error(`Failed to create user: ${createError.message}`);
      userId = newUser.user.id;
      console.log('New user created:', userId);
    }

    // 5. Insert subscription into our database with the correct schema
    const now = new Date().toISOString();
    const endsAt = body.plan === 'yearly'
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      : new Date(Date.now() + 31  * 24 * 60 * 60 * 1000).toISOString();

    const { error: subError } = await supabase.from('subscriptions').insert({
      user_id:                  userId,
      plan_id:                  planRow.id,
      status:                   'active',
      payment_provider:         'gocardless',
      external_subscription_id: subscription.id,
      external_customer_id:     customerId,
      external_mandate_id:      mandateId,
      starts_at:                now,
      ends_at:                  endsAt,
      billing_first_name:       body.firstName,
      billing_last_name:        body.lastName,
      billing_company:          body.company  || null,
      billing_tax_id:           body.taxId    || null,
      billing_email:            body.email,
      billing_phone:            body.phone    || null,
      metadata: { plan: body.plan, gocardless_status: subscription.status },
    });

    if (subError) {
      console.warn('Could not insert subscription record:', subError.message);
      // Non-fatal — GoCardless subscription is already created
    }

    // 6. Generate magic link for auto-login
    const APP_URL = Deno.env.get('APP_URL') || 'http://localhost:5173';
    const { data: magicLinkData, error: magicLinkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: body.email,
      options: { redirectTo: `${APP_URL}/dashboard` },
    });
    if (magicLinkError) {
      console.error('Magic link generation failed:', magicLinkError.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        subscription_id: subscription.id,
        auto_login: !!magicLinkData,
        magic_link_url: magicLinkData?.properties?.action_link || null,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error completing GoCardless checkout:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
