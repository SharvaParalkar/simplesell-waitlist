/**
 * Cloudflare Pages Function: POST /api/waitlist
 *
 * Inserts an email into the Supabase waitlist table using the
 * service role key stored as a Cloudflare Pages environment secret.
 *
 * Required environment variables (set in CF Pages dashboard):
 *   SUPABASE_URL              — e.g. https://xyzxyz.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY — the service_role secret key
 */

export async function onRequestPost(context) {
  const { env, request } = context;

  // CORS headers so the page can call this function
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  // Validate env vars are present
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ success: false, error: 'Server configuration error.' }),
      { status: 500, headers: corsHeaders }
    );
  }

  // Parse request body
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid request body.' }),
      { status: 400, headers: corsHeaders }
    );
  }

  const email = (body.email || '').toLowerCase().trim();

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return new Response(
      JSON.stringify({ success: false, error: 'Please enter a valid email address.' }),
      { status: 400, headers: corsHeaders }
    );
  }

  // Insert into Supabase via REST API
  const supabaseResponse = await fetch(
    `${env.SUPABASE_URL}/rest/v1/waitlist`,
    {
      method: 'POST',
      headers: {
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ email }),
    }
  );

  if (!supabaseResponse.ok) {
    const errorBody = await supabaseResponse.text();

    // Unique constraint violation — email already on list
    if (supabaseResponse.status === 409 || errorBody.includes('23505')) {
      return new Response(
        JSON.stringify({ success: false, error: 'This email is already on the waitlist!' }),
        { status: 409, headers: corsHeaders }
      );
    }

    console.error('Supabase error:', supabaseResponse.status, errorBody);
    return new Response(
      JSON.stringify({ success: false, error: 'Something went wrong. Please try again.' }),
      { status: 500, headers: corsHeaders }
    );
  }

  return new Response(
    JSON.stringify({ success: true, message: "Thanks for joining! We'll be in touch soon." }),
    { status: 200, headers: corsHeaders }
  );
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
