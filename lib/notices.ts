export type UniversityId = "catholic" | "snu" | "yonsei" | "korea" | "sogang" | "skku";

export type University = {
  id: UniversityId;
  name: string;
  shortName: string;
  sourceUrl: string;
  feedUrl?: string;
};

export const UNIVERSITIES: University[] = [
  { id: "catholic", name: "가톨릭대학교", shortName: "가톨릭대", sourceUrl: "https://www.catholic.ac.kr/ko/campuslife/notice.do" },
  { id: "snu", name: "서울대학교", shortName: "서울대", sourceUrl: "https://www.snu.ac.kr/snunow/notice/genernal" },
  { id: "yonsei", name: "연세대학교", shortName: "연세대", sourceUrl: "https://www.yonsei.ac.kr/bbs/sc/58/artclList.do" },
  { id: "korea", name: "고려대학교", shortName: "고려대", sourceUrl: "https://www.korea.ac.kr/ko/566/subview.do" },
  { id: "sogang", name: "서강대학교", shortName: "서강대", sourceUrl: "https://www.sogang.ac.kr/ko/home/notice", feedUrl: "https://www.sogang.ac.kr/api/api/v1/mainKo/BbsData/boardListMultiConfigId?pageNum=1&pageSize=10&bbsConfigFks=1&title=&content=&username=&category=" },
  { id: "skku", name: "성균관대학교", shortName: "성균관대", sourceUrl: "https://www.skku.edu/skku/campus/skk_comm/notice01.do?article.offset=0&articleLimit=10&mode=list" },
];

export const NOTICE_URL = UNIVERSITIES[0].sourceUrl;

export type OfficialNotice = {
  id: string;
  universityId: UniversityId;
  universityName: string;
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

function rowsFrom(html: string) {
  return html.match(/<tr\b[\s\S]*?<\/tr>/gi) ?? [];
}

function absoluteUrl(base: string, path: string) {
  return new URL(path, base).toString();
}

function notice(university: University, input: Omit<OfficialNotice, "universityId" | "universityName">): OfficialNotice {
  return { ...input, id: `${university.id}-${input.id}`, universityId: university.id, universityName: university.name };
}

function catholicNotices(html: string, university: University) {
  const seen = new Set<string>();
  return rowsFrom(html).flatMap((row) => {
    const articleNo = row.match(/data-article-no=["'](\d+)["']/i)?.[1];
    const title = firstMatch(row, /<a\b[^>]*class=["'][^"']*b-title[^"']*["'][^>]*>([\s\S]*?)<\/a>/i);
    if (!articleNo || !title || seen.has(articleNo)) return [];
    seen.add(articleNo);
    return [notice(university, {
      id: articleNo,
      title,
      category: firstMatch(row, /class=["'][^"']*b-cate[^"']*["'][^>]*>([\s\S]*?)<\/span>/i) || "전체",
      date: firstMatch(row, /class=["'][^"']*b-date[^"']*["'][^>]*>([\s\S]*?)<\/span>/i),
      department: firstMatch(row, /class=["'][^"']*b-writer[^"']*["'][^>]*>([\s\S]*?)<\/span>/i) || university.name,
      url: `${university.sourceUrl}?article.offset=0&articleLimit=10&articleNo=${articleNo}&mode=view`,
    })];
  });
}

function snuNotices(html: string, university: University) {
  const seen = new Set<string>();
  return rowsFrom(html).flatMap((row) => {
    const href = row.match(/href=["']([^"']*bbsidx=\d+[^"']*)["']/i)?.[1];
    const id = href?.match(/bbsidx=(\d+)/i)?.[1];
    const title = firstMatch(row, /class=["']txt["'][^>]*>([\s\S]*?)<\/span>/i);
    if (!id || !href || !title || seen.has(id)) return [];
    seen.add(id);
    return [notice(university, {
      id,
      title,
      category: "일반공지",
      department: university.name,
      date: firstMatch(row, /class=["']col-date["'][^>]*>([\s\S]*?)<\/td>/i),
      url: absoluteUrl(university.sourceUrl, href),
    })];
  });
}

function yonseiNotices(html: string, university: University) {
  const items = html.match(/<li\b[^>]*class=["'][^"']*board-(?:noti|list)[^"']*["'][\s\S]*?<\/li>/gi) ?? [];
  const seen = new Set<string>();
  return items.flatMap((item) => {
    const href = item.match(/href=["']([^"']*\/(\d+)\/artclView\.do)["']/i)?.[1];
    const id = href?.match(/\/(\d+)\/artclView\.do/i)?.[1];
    const title = firstMatch(item, /class=["'][^"']*title[^"']*["'][^>]*>[\s\S]*?<strong[^>]*>([\s\S]*?)<\/strong>/i);
    if (!id || !href || !title || seen.has(id)) return [];
    seen.add(id);
    return [notice(university, {
      id,
      title,
      category: firstMatch(item, /class=["']notice-title["'][^>]*>([\s\S]*?)<\/span>/i) || "공지",
      department: firstMatch(item, /class=["']etc-area["'][^>]*>([\s\S]*?)<\/div>/i) || university.name,
      date: firstMatch(item, /class=["']date-area["'][^>]*>[\s\S]*?<span[^>]*>작성일<\/span>\s*([^<]+)/i),
      url: absoluteUrl(university.sourceUrl, href),
    })];
  });
}

function koreaNotices(html: string, university: University) {
  const seen = new Set<string>();
  return rowsFrom(html).flatMap((row) => {
    const id = row.match(/jf_view\(['"](\d+)['"]/i)?.[1];
    const title = firstMatch(row, /class=["'][^"']*td-title[^"']*["'][^>]*>[\s\S]*?<a\b[^>]*>([\s\S]*?)<\/a>/i);
    if (!id || !title || seen.has(id)) return [];
    seen.add(id);
    return [notice(university, {
      id,
      title,
      category: "일반공지",
      department: firstMatch(row, /class=["'][^"']*td-write[^"']*["'][^>]*>([\s\S]*?)<\/td>/i) || university.name,
      date: firstMatch(row, /class=["'][^"']*td-date[^"']*["'][^>]*>([\s\S]*?)<\/td>/i),
      url: university.sourceUrl,
    })];
  });
}

function sogangNotices(body: string, university: University) {
  const data = JSON.parse(body) as { data?: { list?: Array<{ pkId?: number; title?: string; displayName?: string; regDate?: string }> } };
  const seen = new Set<number>();
  return (data.data?.list ?? []).flatMap((item) => {
    if (!item.pkId || !item.title || seen.has(item.pkId)) return [];
    seen.add(item.pkId);
    const date = item.regDate?.match(/^(\d{4})(\d{2})(\d{2})/)?.slice(1).join(".") ?? "";
    return [notice(university, {
      id: String(item.pkId), title: item.title, category: "일반공지", department: item.displayName || university.name, date,
      url: `https://www.sogang.ac.kr/ko/detail/${item.pkId}`,
    })];
  });
}

function skkuNotices(html: string, university: University) {
  const seen = new Set<string>();
  const items = html.match(/<dl class=["']board-list-content-wrap[\s\S]*?<\/dl>/gi) ?? [];
  return items.flatMap((item) => {
    const href = item.match(/href=["']([^"']*articleNo=(\d+)[^"']*)["']/i)?.[1];
    const id = href?.match(/articleNo=(\d+)/i)?.[1];
    const title = firstMatch(item, /<a\b[^>]*articleNo=\d+[^>]*>([\s\S]*?)<\/a>/i);
    const info = [...item.matchAll(/<li>\s*([\s\S]*?)\s*<\/li>/gi)].map((match) => decodeHtml(match[1]));
    if (!id || !href || !title || seen.has(id)) return [];
    seen.add(id);
    return [notice(university, {
      id, title, category: firstMatch(item, /c-board-list-category["'][^>]*>([\s\S]*?)<\/span>/i) || "공지",
      department: info[1] || university.name,
      date: info.find((value) => /^\d{4}-\d{2}-\d{2}$/.test(value)) || "",
      url: absoluteUrl(university.sourceUrl, href),
    })];
  });
}

export function universityFromId(id: string | null | undefined) {
  return UNIVERSITIES.find((university) => university.id === id) ?? null;
}

export async function fetchOfficialNotices(universityId: UniversityId = "catholic"): Promise<OfficialNotice[]> {
  const university = universityFromId(universityId);
  if (!university) throw new Error("Unsupported university");
  const response = await fetch(university.feedUrl ?? university.sourceUrl, {
    headers: {
      Accept: university.id === "sogang" ? "application/json" : "text/html,application/xhtml+xml",
      "Accept-Language": "ko-KR,ko;q=0.9",
      "User-Agent": "Campus-Notice-Alert/1.0 (student web application)",
    },
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Official site responded with ${response.status}`);

  const html = await response.text();
  const parser = { catholic: catholicNotices, snu: snuNotices, yonsei: yonseiNotices, korea: koreaNotices, sogang: sogangNotices, skku: skkuNotices }[university.id];
  const notices = parser(html, university).slice(0, 10);
  if (!notices.length) throw new Error("No notices could be parsed");
  return notices;
}

export function matchingKeywords(notice: OfficialNotice, keywords: string[]) {
  const text = `${notice.title} ${notice.category} ${notice.department}`.toLowerCase();
  return keywords.filter((keyword) => text.includes(keyword.toLowerCase()));
}
