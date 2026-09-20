export const NOTICE_URL = "https://www.catholic.ac.kr/ko/campuslife/notice.do";

export type OfficialNotice = {
  id: string;
  title: string;
  category: string;
  department: string;
  date: string;
  url: string;
};

function decodeHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function firstMatch(value: string, pattern: RegExp) {
  const match = value.match(pattern);
  return match ? decodeHtml(match[1]) : "";
}

export async function fetchOfficialNotices(): Promise<OfficialNotice[]> {
  const response = await fetch(NOTICE_URL, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "ko-KR,ko;q=0.9",
      "User-Agent": "CUK-Notice-Alert/1.0 (student web application)",
    },
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) throw new Error(`Official site responded with ${response.status}`);

  const html = await response.text();
  const rows = html.match(/<tr\b[\s\S]*?<\/tr>/gi) ?? [];
  const seen = new Set<string>();
  const notices = rows.flatMap((row) => {
    const articleNo = row.match(/data-article-no=["'](\d+)["']/i)?.[1];
    const title = firstMatch(row, /<a\b[^>]*class=["'][^"']*b-title[^"']*["'][^>]*>([\s\S]*?)<\/a>/i);
    if (!articleNo || !title || seen.has(articleNo)) return [];
    seen.add(articleNo);

    const category = firstMatch(row, /class=["'][^"']*b-cate[^"']*["'][^>]*>([\s\S]*?)<\/span>/i) || "전체";
    const date = firstMatch(row, /class=["'][^"']*b-date[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
    const department = firstMatch(row, /class=["'][^"']*b-writer[^"']*["'][^>]*>([\s\S]*?)<\/span>/i) || "가톨릭대학교";
    const url = `${NOTICE_URL}?article.offset=0&articleLimit=10&articleNo=${articleNo}&mode=view`;
    return [{ id: articleNo, title, category, department, date, url }];
  }).slice(0, 10);

  if (!notices.length) throw new Error("No notices could be parsed");
  return notices;
}

export function matchingKeywords(notice: OfficialNotice, keywords: string[]) {
  const text = `${notice.title} ${notice.category} ${notice.department}`.toLowerCase();
  return keywords.filter((keyword) => text.includes(keyword.toLowerCase()));
}
