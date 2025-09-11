import { createClient } from "@supabase/supabase-js";

// Gunakan service_role key, simpan di Netlify Environment Variables
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const { email, password } = JSON.parse(event.body || "{}");
    if (!email || !password) {
      return { statusCode: 400, body: JSON.stringify({ error: "Email dan password wajib diisi" }) };
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.session) {
      return { statusCode: 401, body: JSON.stringify({ error: error?.message || "Login gagal" }) };
    }

    // Format respons agar sesuai dengan yang dipakai di index.html
    return {
      statusCode: 200,
      body: JSON.stringify({
        session: data.session,    // full session untuk IndexedDB/localStorage
        user: data.user || data.session.user,
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server error: " + err.message })
    };
  }
}
