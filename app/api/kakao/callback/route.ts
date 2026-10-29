import { NextResponse } from "next/server";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://site-eight-bay-39.vercel.app";
const callbackUrl = `${appUrl}/api/kakao/callback`;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const restApiKey = process.env.KAKAO_REST_API_KEY;
  const clientSecret = process.env.KAKAO_CLIENT_SECRET;
  if (!code || !restApiKey || !clientSecret) {
    return NextResponse.redirect(new URL("/?kakao=error", appUrl));
  }

  const tokenRequest = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: restApiKey,
    client_secret: clientSecret,
    redirect_uri: callbackUrl,
    code,
  });
  const tokenResponse = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: tokenRequest,
    cache: "no-store",
  });
  if (!tokenResponse.ok) return NextResponse.redirect(new URL("/?kakao=error", appUrl));
  const token = await tokenResponse.json() as { access_token?: string };
  if (!token.access_token) return NextResponse.redirect(new URL("/?kakao=error", appUrl));

  const template = {
    object_type: "text",
    text: "캠퍼스알림\n관심 키워드 공지를 확인하고 알림을 받아보세요.",
    link: { web_url: appUrl, mobile_web_url: appUrl },
    button_title: "캠퍼스알림 열기",
  };
  const sendRequest = new URLSearchParams({ template_object: JSON.stringify(template) });
  const sendResponse = await fetch("https://kapi.kakao.com/v2/api/talk/memo/default/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
    },
    body: sendRequest,
    cache: "no-store",
  });
  return NextResponse.redirect(new URL(sendResponse.ok ? "/?kakao=sent" : "/?kakao=error", appUrl));
}
