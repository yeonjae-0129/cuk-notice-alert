import { NextResponse } from "next/server";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://site-eight-bay-39.vercel.app";
const callbackUrl = `${appUrl}/api/kakao/callback`;

export async function GET() {
  const restApiKey = process.env.KAKAO_REST_API_KEY;
  if (!restApiKey) return NextResponse.json({ error: "Kakao is not configured" }, { status: 503 });

  const authorizeUrl = new URL("https://kauth.kakao.com/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", restApiKey);
  authorizeUrl.searchParams.set("redirect_uri", callbackUrl);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", "talk_message");
  return NextResponse.redirect(authorizeUrl);
}
