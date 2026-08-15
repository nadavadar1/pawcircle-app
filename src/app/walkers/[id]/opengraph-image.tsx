import { ImageResponse } from "next/og";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { toVisualOrder } from "@/lib/toVisualOrder";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const AVATAR_COLORS = ["#1F3B2E", "#B5482A", "#C9982F", "#7C9A82"];

function avatarColorFor(name: string) {
  const code = name.charCodeAt(0) || 0;
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

// Satori's built-in default font has no Hebrew glyphs — without this, every
// Hebrew character renders as a blank box. Google Fonts' CSS endpoint is
// queried with the exact text used so it returns only the needed glyph
// subset, then the actual font binary is fetched from the URL it points to.
async function loadHebrewFont(text: string, weight: number) {
  const cssRes = await fetch(
    `https://fonts.googleapis.com/css2?family=Assistant:wght@${weight}&text=${encodeURIComponent(text)}`
  );
  const css = await cssRes.text();
  const match = css.match(/src: url\(([^)]+)\) format\('(?:opentype|truetype)'\)/);
  const fontUrl = match?.[1];
  if (!fontUrl) return null;
  const fontRes = await fetch(fontUrl);
  return fontRes.arrayBuffer();
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();

  const [{ data: walker }, { data: profile }, { data: trust }] = await Promise.all([
    supabase.from("walker_profiles").select("hourly_rate_ils, status").eq("id", id).maybeSingle(),
    supabase.from("profiles").select("full_name, photo_url, city").eq("id", id).maybeSingle(),
    supabase.from("walker_trust_status").select("is_community_verified, badge_area, avg_rating, review_count").eq("walker_id", id).maybeSingle(),
  ]);

  const name = walker && walker.status === "approved" && profile ? profile.full_name : "PawCircle";
  const city = profile?.city ?? "";
  const rate = walker?.hourly_rate_ils;

  const infoLine = [
    city,
    rate ? `${rate} ₪/שעה` : null,
    trust?.review_count ? `★ ${trust.avg_rating} (${trust.review_count})` : null,
  ]
    .filter(Boolean)
    .join("   ·   ");
  const badgeText = "מאומת/ת קהילתית";

  const allText = `PAWCIRCLE${name}${city}${badgeText}₪/שעה★()0123456789. ·`;
  const [regularFont, boldFont] = await Promise.all([loadHebrewFont(allText, 400), loadHebrewFont(allText, 800)]);
  const fonts = [
    regularFont ? { name: "Assistant", data: regularFont, weight: 400 as const, style: "normal" as const } : null,
    boldFont ? { name: "Assistant", data: boldFont, weight: 800 as const, style: "normal" as const } : null,
  ].filter((f): f is NonNullable<typeof f> => f !== null);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#1F3B2E",
          padding: 64,
          fontFamily: "Assistant",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, fontWeight: 800, color: "#E0B658", letterSpacing: 4, marginBottom: 40, direction: "ltr" }}>
          PAWCIRCLE
        </div>

        {profile?.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.photo_url}
            width={180}
            height={180}
            style={{ borderRadius: "50%", objectFit: "cover", border: "6px solid #C9982F", marginBottom: 32 }}
          />
        ) : (
          <div
            style={{
              width: 180,
              height: 180,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: avatarColorFor(name),
              border: "6px solid #C9982F",
              marginBottom: 32,
              fontSize: 80,
              fontWeight: 800,
              color: "#FBF7EC",
            }}
          >
            {name.charAt(0)}
          </div>
        )}

        <div style={{ display: "flex", fontSize: 56, fontWeight: 800, color: "#FBF7EC", marginBottom: 12 }}>
          {toVisualOrder(name)}
        </div>

        {infoLine && (
          <div style={{ display: "flex", fontSize: 28, color: "#FBF7EC", opacity: 0.8 }}>
            {toVisualOrder(infoLine)}
          </div>
        )}

        {trust?.is_community_verified && (
          <div
            style={{
              display: "flex",
              marginTop: 28,
              fontSize: 24,
              fontWeight: 800,
              color: "#1F3B2E",
              backgroundColor: "#C9982F",
              padding: "8px 24px",
              borderRadius: 999,
            }}
          >
            {toVisualOrder(badgeText)}
          </div>
        )}
      </div>
    ),
    { ...size, fonts }
  );
}
