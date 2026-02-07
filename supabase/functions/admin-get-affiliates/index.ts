import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ReferrerData {
  user_id: string;
  email: string;
  full_name: string | null;
  referral_code: string;
  referrals_count: number;
  total_bonus_given: number;
  suspicious_count: number;
  suspicion_score: number;
  is_banned: boolean;
  referral_banned: boolean;
  created_at: string;
}

interface ReferralDetail {
  id: string;
  referred_id: string;
  referred_email: string;
  referred_name: string | null;
  ip_address: string | null;
  created_at: string;
  is_fraud: boolean;
  banned_at: string | null;
  suspicion_reasons: string[];
}

// Known temporary email domains
const TEMP_EMAIL_DOMAINS = [
  "tempmail.com",
  "guerrillamail.com",
  "10minutemail.com",
  "throwaway.email",
  "mailinator.com",
  "temp-mail.org",
  "fakeinbox.com",
  "getnada.com",
  "mohmal.com",
  "tempail.com",
  "dispostable.com",
  "maildrop.cc",
  "yopmail.com",
];

function detectSuspiciousPatterns(
  referrals: any[],
  referrerEmail: string
): { count: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  // Check for email aliases (+)
  const aliasEmails = referrals.filter((r) => r.referred_email?.includes("+"));
  if (aliasEmails.length > 0) {
    reasons.push(`${aliasEmails.length} email alias (+) használat`);
    score += aliasEmails.length * 2;
  }

  // Check for same IP addresses
  const ipCounts: Record<string, number> = {};
  referrals.forEach((r) => {
    if (r.ip_address) {
      ipCounts[r.ip_address] = (ipCounts[r.ip_address] || 0) + 1;
    }
  });
  const duplicateIPs = Object.entries(ipCounts).filter(([_, count]) => count >= 3);
  if (duplicateIPs.length > 0) {
    const totalDuplicates = duplicateIPs.reduce((sum, [_, count]) => sum + count, 0);
    reasons.push(`${totalDuplicates} azonos IP címről`);
    score += totalDuplicates * 3;
  }

  // Check for rapid registrations (5+ in 24 hours)
  const sortedByDate = [...referrals].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  for (let i = 0; i < sortedByDate.length - 4; i++) {
    const start = new Date(sortedByDate[i].created_at).getTime();
    const end = new Date(sortedByDate[i + 4].created_at).getTime();
    if (end - start < 24 * 60 * 60 * 1000) {
      reasons.push(`5+ regisztráció 24 órán belül`);
      score += 10;
      break;
    }
  }

  // Check for temp email domains
  const tempEmails = referrals.filter((r) => {
    const domain = r.referred_email?.split("@")[1]?.toLowerCase();
    return domain && TEMP_EMAIL_DOMAINS.includes(domain);
  });
  if (tempEmails.length > 0) {
    reasons.push(`${tempEmails.length} temp email domain`);
    score += tempEmails.length * 4;
  }

  // Check for similar email patterns (user1, user2, user3)
  const emailBases = referrals.map((r) => {
    const email = r.referred_email || "";
    return email.replace(/\d+/g, "").split("@")[0];
  });
  const baseCounts: Record<string, number> = {};
  emailBases.forEach((base) => {
    if (base.length > 3) {
      baseCounts[base] = (baseCounts[base] || 0) + 1;
    }
  });
  const similarPatterns = Object.entries(baseCounts).filter(([_, count]) => count >= 3);
  if (similarPatterns.length > 0) {
    reasons.push(`Hasonló email minták (${similarPatterns.length} csoport)`);
    score += similarPatterns.reduce((sum, [_, count]) => sum + count, 0) * 2;
  }

  return { count: reasons.length, reasons };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the user is an admin
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin status
    const { data: adminUser } = await supabaseClient
      .from("admin_users")
      .select("role, is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (!adminUser) {
      return new Response(JSON.stringify({ error: "Not an admin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const referrerId = url.searchParams.get("referrer_id");

    // If specific referrer requested, return details
    if (referrerId) {
      const { data: referrals, error: refError } = await supabaseClient
        .from("referrals")
        .select("*")
        .eq("referrer_id", referrerId);

      if (refError) throw refError;

      // Get referred user details from auth
      const referredIds = referrals?.map((r) => r.referred_id) || [];
      const referredDetails: ReferralDetail[] = [];

      for (const referral of referrals || []) {
        const { data: authUser } = await supabaseClient.auth.admin.getUserById(
          referral.referred_id
        );
        
        const suspicionReasons: string[] = [];
        if (authUser?.user?.email?.includes("+")) {
          suspicionReasons.push("Email alias (+) használat");
        }
        if (referral.ip_address) {
          const sameIpCount = referrals?.filter(
            (r) => r.ip_address === referral.ip_address
          ).length || 0;
          if (sameIpCount >= 2) {
            suspicionReasons.push(`Azonos IP (${sameIpCount} regisztráció)`);
          }
        }
        const domain = authUser?.user?.email?.split("@")[1]?.toLowerCase();
        if (domain && TEMP_EMAIL_DOMAINS.includes(domain)) {
          suspicionReasons.push("Temp email domain");
        }

        referredDetails.push({
          id: referral.id,
          referred_id: referral.referred_id,
          referred_email: authUser?.user?.email || "N/A",
          referred_name: authUser?.user?.user_metadata?.full_name || null,
          ip_address: referral.ip_address,
          created_at: referral.created_at,
          is_fraud: referral.is_fraud || false,
          banned_at: referral.banned_at,
          suspicion_reasons: suspicionReasons,
        });
      }

      return new Response(JSON.stringify({ referrals: referredDetails }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all referrers (users who have a referral_code and have referred someone)
    const { data: allReferrals, error: allRefError } = await supabaseClient
      .from("referrals")
      .select("*")
      .order("created_at", { ascending: false });

    if (allRefError) throw allRefError;

    // Group by referrer_id
    const referrerMap = new Map<string, any[]>();
    for (const referral of allReferrals || []) {
      const existing = referrerMap.get(referral.referrer_id) || [];
      existing.push(referral);
      referrerMap.set(referral.referrer_id, existing);
    }

    // Build referrer data
    const referrers: ReferrerData[] = [];
    
    for (const [referrerId, referrals] of referrerMap) {
      // Get referrer profile
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("referral_code, full_name, referral_banned, referral_ban_reason, created_at")
        .eq("user_id", referrerId)
        .single();

      // Get referrer email from auth
      const { data: authUser } = await supabaseClient.auth.admin.getUserById(referrerId);

      // Get referred user emails for pattern detection
      const referredEmails: any[] = [];
      for (const ref of referrals) {
        const { data: refAuth } = await supabaseClient.auth.admin.getUserById(ref.referred_id);
        referredEmails.push({
          ...ref,
          referred_email: refAuth?.user?.email,
        });
      }

      const { count: suspiciousCount, reasons } = detectSuspiciousPatterns(
        referredEmails,
        authUser?.user?.email || ""
      );

      // Calculate suspicion score
      let suspicionScore = 0;
      if (reasons.some((r) => r.includes("alias"))) suspicionScore += 2;
      if (reasons.some((r) => r.includes("IP"))) suspicionScore += 3;
      if (reasons.some((r) => r.includes("24 órán"))) suspicionScore += 5;
      if (reasons.some((r) => r.includes("temp email"))) suspicionScore += 4;
      if (reasons.some((r) => r.includes("Hasonló"))) suspicionScore += 2;

      const totalBonus = referrals.reduce(
        (sum, r) => sum + (r.referrer_bonus || 0) + (r.referred_bonus || 0),
        0
      );

      referrers.push({
        user_id: referrerId,
        email: authUser?.user?.email || "N/A",
        full_name: profile?.full_name || null,
        referral_code: profile?.referral_code || "N/A",
        referrals_count: referrals.length,
        total_bonus_given: totalBonus,
        suspicious_count: suspiciousCount,
        suspicion_score: suspicionScore,
        is_banned: authUser?.user?.banned_until ? true : false,
        referral_banned: profile?.referral_banned || false,
        created_at: profile?.created_at || "",
      });
    }

    // Sort by suspicion score descending
    referrers.sort((a, b) => b.suspicion_score - a.suspicion_score);

    // Calculate stats
    const stats = {
      total_referrers: referrers.length,
      total_referrals: allReferrals?.length || 0,
      total_bonus: referrers.reduce((sum, r) => sum + r.total_bonus_given, 0),
      suspicious_count: referrers.filter((r) => r.suspicion_score >= 3).length,
    };

    return new Response(JSON.stringify({ referrers, stats }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
