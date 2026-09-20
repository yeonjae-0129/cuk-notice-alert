"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Bell, BellRing, BookOpen, Check, ChevronRight, ExternalLink, GraduationCap, ListFilter, LogOut, Newspaper, Plus, RefreshCw, Search, Send, ShieldCheck, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type Notice = { id: string; title: string; category: string; department: string; date: string; url: string };
type PushState = "idle" | "working" | "enabled" | "test-ready" | "sent" | "denied" | "unsupported" | "config-missing" | "error";
type PageView = "settings" | "preview" | "matches" | "all";

const fallbackNotices: Notice[] = [
  { id: "sample-1", title: "2026학년도 2학기 교내장학금 추가 신청 안내", category: "장학", department: "학생지원팀", date: "2026.09.18", url: "https://www.catholic.ac.kr/ko/campuslife/notice.do" },
  { id: "sample-2", title: "2026 동계 현장실습 및 인턴십 참가자 모집", category: "취창업", department: "취업지원팀", date: "2026.09.17", url: "https://www.catholic.ac.kr/ko/campuslife/notice.do" },
];

const matchingKeywords = (notice: Notice, keywords: string[]) => {
  const text = `${notice.title} ${notice.category} ${notice.department}`.toLowerCase();
  return keywords.filter((keyword) => text.includes(keyword.toLowerCase()));
};

function applicationServerKey(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

export default function Home() {
  const [screen, setScreen] = useState<"login" | "dashboard">("login");
  const [view, setView] = useState<PageView>("settings");
  const [keywords, setKeywords] = useState(["장학", "인턴"]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [detail, setDetail] = useState<Notice | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [sourceStatus, setSourceStatus] = useState<"loading" | "live" | "error">("loading");
  const [fetchedAt, setFetchedAt] = useState("");
  const [pushState, setPushState] = useState<PushState>("idle");
  const matches = useMemo(() => notices.filter((notice) => matchingKeywords(notice, keywords).length), [keywords, notices]);
  const push = hasRun && !checking ? matches[0] ?? null : null;
  const pageNotices = view === "matches" ? matches : notices;

  function openPage(next: Exclude<PageView, "settings">) {
    window.history.pushState({ noticeView: next }, "", `?view=${next}`);
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    if (view === "settings") return;
    window.history.back();
  }

  async function loadNotices() {
    setSourceStatus("loading");
    try {
      const response = await fetch("/api/notices", { cache: "no-store" });
      if (!response.ok) throw new Error("공지 조회 실패");
      const data = await response.json() as { notices: Notice[]; fetchedAt: string };
      setNotices(data.notices);
      setFetchedAt(data.fetchedAt);
      setSourceStatus("live");
    } catch {
      setNotices(fallbackNotices);
      setSourceStatus("error");
    }
  }

  async function getBrowserSubscription(create: boolean) {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setPushState("unsupported");
      return null;
    }
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      setPushState("config-missing");
      return null;
    }
    const registration = await navigator.serviceWorker.register("/sw.js");
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription && create) {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushState("denied");
        return null;
      }
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey(publicKey),
      });
    }
    return subscription;
  }

  async function enableRealPush() {
    if (!keywords.length) return setError("알림을 받을 키워드를 하나 이상 추가해 주세요.");
    setPushState("working");
    try {
      const subscription = await getBrowserSubscription(true);
      if (!subscription) return;
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON(), keywords }),
      });
      setPushState(response.ok ? "enabled" : response.status === 503 ? "test-ready" : "error");
    } catch {
      setPushState("error");
    }
  }

  async function sendTestPush() {
    setPushState("working");
    try {
      const subscription = await getBrowserSubscription(false);
      if (!subscription) return setPushState("error");
      const response = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      setPushState(response.ok ? "sent" : "error");
    } catch {
      setPushState("error");
    }
  }

  function addKeyword(event?: FormEvent) {
    event?.preventDefault();
    const next = draft.trim();
    if (!next) return setError("키워드를 입력해 주세요.");
    if (keywords.some((keyword) => keyword.toLowerCase() === next.toLowerCase())) return setError("이미 등록한 키워드예요.");
    setKeywords((current) => [...current, next]);
    setDraft(""); setError(""); setHasRun(false);
  }

  function removeKeyword(keyword: string) {
    setKeywords((current) => current.filter((item) => item !== keyword));
    setHasRun(false); setError("");
  }

  async function simulateArrival() {
    if (!keywords.length) return setError("알림을 받을 키워드를 하나 이상 추가해 주세요.");
    setChecking(true); setHasRun(false);
    await loadNotices();
    setHasRun(true); setChecking(false);
    openPage("preview");
  }

  useEffect(() => {
    const initial = window.setTimeout(() => { void loadNotices(); }, 0);
    const interval = window.setInterval(() => { void loadNotices(); }, 300_000);
    return () => { window.clearTimeout(initial); window.clearInterval(interval); };
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const requested = new URLSearchParams(window.location.search).get("view");
      setView(requested === "preview" || requested === "matches" || requested === "all" ? requested : "settings");
    };
    const initial = window.setTimeout(handlePopState, 0);
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.clearTimeout(initial);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("Notification" in window)) {
      const pending = window.setTimeout(() => setPushState("unsupported"), 0);
      return () => window.clearTimeout(pending);
    }
    if (Notification.permission === "granted") {
      void navigator.serviceWorker.ready
        .then((registration) => registration.pushManager.getSubscription())
        .then((subscription) => { if (subscription) setPushState("test-ready"); });
    } else if (Notification.permission === "denied") {
      const pending = window.setTimeout(() => setPushState("denied"), 0);
      return () => window.clearTimeout(pending);
    }
  }, []);

  useEffect(() => {
    const context = (document as Document & { modelContext?: { registerTool?: (tool: unknown, options?: { signal?: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({
      name: "configure_notice_keywords",
      title: "공지 키워드 설정",
      description: "가대알림 데모의 관심 키워드를 설정합니다.",
      inputSchema: { type: "object", properties: { keywords: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 5 } }, required: ["keywords"], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input: unknown) {
        const values = (input as { keywords?: unknown }).keywords;
        if (!Array.isArray(values) || !values.length || values.some((value) => typeof value !== "string" || !value.trim())) throw new Error("유효한 키워드가 필요합니다.");
        const next = [...new Set(values.map((value) => String(value).trim()))].slice(0, 5);
        setScreen("dashboard"); setView("settings"); setKeywords(next); setHasRun(false);
        return { keywords: next, status: "configured" };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  if (screen === "login") return (
    <main className="login-shell">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <section className="login-card" aria-labelledby="login-title">
        <div className="brand-mark" aria-hidden="true"><Bell /></div>
        <Badge className="demo-badge">DEMO</Badge>
        <h1 id="login-title">가대알림</h1>
        <p className="login-lead">학교 공지, 기다리지 말고<br />내 관심사만 알림으로.</p>
        <p className="login-copy">가톨릭대학교 공식 공지에서 원하는 키워드를 찾아 실제 웹 푸시로 알려드려요.</p>
        <Button className="login-button" size="lg" onClick={() => { setScreen("dashboard"); setView("settings"); }}><GraduationCap /> 학교 계정 로그인 체험 <ChevronRight /></Button>
        <div className="privacy-note"><ShieldCheck /> 실제 학교 계정 정보는 입력하거나 전송하지 않습니다.</div>
      </section>
      <p className="mockup-label">공식 공개 공지 연결 · 학교 계정 로그인은 데모입니다.</p>
    </main>
  );

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand-row"><div className="small-brand"><Bell /></div><div><strong>가대알림</strong><span>공지 키워드 푸시</span></div></div>
        <div className="profile-row"><div className="profile-copy"><strong>김가대</strong><span>재학생 · 가상 사용자</span></div><div className="avatar">김</div><Button variant="ghost" size="icon" aria-label="로그아웃" onClick={() => { setScreen("login"); setView("settings"); }}><LogOut /></Button></div>
      </header>

      {view === "settings" ? <div className="workspace settings-view">
        <section className="control-panel" aria-labelledby="keyword-title">
          <div className="eyebrow"><span /> 알림 설정</div>
          <h1 id="keyword-title">어떤 공지를<br />기다리고 있나요?</h1>
          <p className="section-copy">최신 공지의 제목·분류·작성 부서에서 등록한 키워드가 하나라도 발견되면 알려드려요.</p>
          <form className="keyword-form" onSubmit={addKeyword}>
            <label htmlFor="keyword">관심 키워드</label>
            <div className="input-row"><Input id="keyword" value={draft} onChange={(event) => { setDraft(event.target.value); setError(""); }} placeholder="예: 장학, 인턴, 기숙사" aria-invalid={Boolean(error)} aria-describedby="keyword-message" /><Button type="submit" variant="outline"><Plus /> 추가</Button></div>
            <p id="keyword-message" className={error ? "form-message error" : "form-message"}>{error || "Enter를 눌러도 추가할 수 있어요."}</p>
          </form>
          <div className="keyword-list" aria-label="등록된 키워드">
            {!keywords.length ? <p className="empty-keywords">아직 등록한 관심 키워드가 없어요.</p> : keywords.map((keyword) => <span className="keyword-chip" key={keyword}>{keyword}<button onClick={() => removeKeyword(keyword)} aria-label={`${keyword} 키워드 삭제`}><X /></button></span>)}
          </div>
          <div className="rule-card">
            <div><Search /><span><small>검색 범위</small><strong>공식 홈페이지 최신 공지 {notices.length}건</strong></span></div>
            <div><Check /><span><small>일치 조건</small><strong>키워드 하나 이상</strong></span></div>
          </div>
          <div className="push-setup-card">
            <div className="push-setup-heading"><BellRing /><span><small>실제 웹 푸시</small><strong>{pushState === "enabled" ? "새 공지 자동 알림 사용 중" : pushState === "sent" ? "테스트 알림을 전송했어요" : "이 기기에서 알림 받기"}</strong></span></div>
            <div className="push-actions">
              <Button type="button" onClick={enableRealPush} disabled={pushState === "working"}>{pushState === "working" ? "처리 중…" : pushState === "enabled" ? "키워드 설정 갱신" : "알림 권한 켜기"}</Button>
              {(pushState === "enabled" || pushState === "test-ready" || pushState === "sent") && <Button type="button" variant="outline" onClick={sendTestPush}><Send /> 테스트 푸시</Button>}
            </div>
            <p>{pushState === "idle" && "권한을 허용하면 앱이 닫혀 있어도 알림을 받을 수 있어요."}{pushState === "enabled" && "현재 키워드와 구독이 서버에 저장됐어요."}{pushState === "test-ready" && "브라우저 구독은 준비됐지만 자동 발송 DB 설정이 필요해요."}{pushState === "sent" && "운영체제 알림 창에서 실제 도착 여부를 확인해 주세요."}{pushState === "denied" && "브라우저 설정에서 이 사이트의 알림을 허용해 주세요."}{pushState === "unsupported" && "이 브라우저는 웹 푸시를 지원하지 않아요."}{pushState === "config-missing" && "서버의 푸시 키 설정이 아직 필요해요."}{pushState === "error" && "푸시 설정에 실패했어요. 잠시 후 다시 시도해 주세요."}</p>
          </div>
          <Button className="simulate-button" size="lg" onClick={simulateArrival} disabled={checking}>{checking ? <><span className="spinner" /> 공식 공지를 확인하고 있어요</> : <><RefreshCw /> 최신 공지 확인하고 미리보기</>}</Button>
          <p className="demo-note">{sourceStatus === "live" ? `공식 홈페이지 연결됨${fetchedAt ? ` · ${new Date(fetchedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} 확인` : ""} · 5분마다 갱신` : sourceStatus === "error" ? "공식 홈페이지 연결 실패 · 샘플 공지를 표시합니다." : "공식 홈페이지에서 공지를 불러오는 중입니다."}<br />실제 기기 알림은 위에서 권한을 켜면 받을 수 있어요.</p>
        </section>
      </div> : view === "preview" ? <div className="workspace preview-view">
        <section className="preview-panel" aria-labelledby="preview-title">
          <div className="preview-toolbar"><Button variant="ghost" onClick={goBack}><ArrowLeft /> 알림 설정으로</Button></div>
          <div className="preview-heading"><div><div className="eyebrow"><span /> 실시간 미리보기</div><h2 id="preview-title">관심 공지를 기다리고 있어요</h2></div><Badge variant="outline" className="live-badge"><span /> 알림 대기 중</Badge></div>
          <div className="phone-stage">
            <div className="phone" aria-label="휴대폰 푸시 알림 미리보기">
              <div className="phone-top"><span>9:41</span><div className="dynamic-island" /><span>5G ◒</span></div>
              <div className="phone-date"><strong>9월 19일 토요일</strong><span>14:32</span></div>
              {push ? <button className="push-card" onClick={() => setDetail(push)}><div className="push-head"><span className="push-icon"><Bell /></span><strong>가대알림</strong><time>{push.date}</time></div><h3>관심 공지를 찾았어요</h3><p>{push.title}</p><span className="match-pill">‘{matchingKeywords(push, keywords)[0]}’ 키워드와 일치</span><small>푸시 미리보기 · 눌러서 원문 확인</small></button> : <div className="phone-empty"><span><Bell /></span><strong>{hasRun ? "일치하는 최신 공지가 없어요" : "알림이 여기에 도착해요"}</strong><p>{hasRun ? "다른 키워드를 등록하고 다시 확인해 보세요." : "최신 공지 확인 버튼을 누르면 푸시 형태로 확인할 수 있어요."}</p></div>}
              <div className="phone-bottom"><span>⌁</span><span>◉</span></div>
            </div>
          </div>
          <nav className="page-links" aria-label="공지 목록 이동">
            <button onClick={() => openPage("matches")}><span className="page-link-icon matched-icon"><ListFilter /></span><span><small>내 관심 키워드</small><strong>일치 공지 {matches.length}건 모두 보기</strong></span><ChevronRight /></button>
            <button onClick={() => openPage("all")}><span className="page-link-icon"><Newspaper /></span><span><small>가톨릭대학교 공식 홈페이지</small><strong>전체 최신 공지 {notices.length}건 보기</strong></span><ChevronRight /></button>
          </nav>
        </section>
      </div> : <section className="results-page" aria-labelledby="results-title">
        <div className="results-toolbar"><Button variant="ghost" onClick={goBack}><ArrowLeft /> 뒤로가기</Button>{view === "all" && <a href="https://www.catholic.ac.kr/ko/campuslife/notice.do" target="_blank" rel="noreferrer">학교 공지 전체 보기 <ExternalLink /></a>}</div>
        <div className="results-heading"><div className="eyebrow"><span /> {view === "matches" ? "내 관심 키워드" : "공식 홈페이지"}</div><h1 id="results-title">{view === "matches" ? "키워드 일치 공지" : "전체 최신 공지"}</h1><p>{view === "matches" ? `‘${keywords.join(" · ")}’ 중 하나 이상 일치한 공지 ${matches.length}건입니다.` : `가톨릭대학교 공식 홈페이지에서 가져온 최신 공지 ${notices.length}건입니다.`}</p></div>
        <div className="results-card notice-list">
          {pageNotices.map((notice) => {
            const found = matchingKeywords(notice, keywords);
            return <button key={notice.id} className={`notice-list-item${found.length ? " matched" : ""}`} onClick={() => setDetail(notice)}><span className="notice-category">{notice.category}</span><span className="notice-main"><strong>{notice.title}</strong><small>{notice.department} · {notice.date}</small></span>{found.length ? <span className="notice-match">{found.join(" · ")} 일치</span> : <ChevronRight />}</button>;
          })}
          {!pageNotices.length && <div className="notice-list-empty">{view === "matches" ? "현재 최신 공지에는 등록한 키워드와 일치하는 결과가 없어요." : "공식 공지를 불러오고 있어요."}</div>}
        </div>
      </section>}

      <Sheet open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}>
        <SheetContent className="notice-sheet sm:max-w-[520px]">
          {detail && <><SheetHeader className="sheet-header"><Badge className="sample-badge">{detail.id.startsWith("sample-") ? "연결 실패 시 샘플" : "가톨릭대학교 공식 공지"}</Badge><SheetTitle className="sheet-title">{detail.title}</SheetTitle><SheetDescription>{detail.category} · {detail.department} · {detail.date}</SheetDescription></SheetHeader><div className="sheet-body"><div className="match-box"><Sparkles /><span><small>{matchingKeywords(detail, keywords).length ? "알림을 보여준 이유" : "전체 공지에서 선택"}</small><strong>{matchingKeywords(detail, keywords).length ? `‘${matchingKeywords(detail, keywords).join("·")}’ 키워드가 발견됐어요` : "관심 키워드와 관계없이 원문을 확인할 수 있어요"}</strong></span></div><div className="notice-copy"><h3>원문에서 확인하세요</h3><p>신청 대상, 기간, 첨부파일 등 자세한 내용은 가톨릭대학교 공식 공지 페이지에서 확인할 수 있어요.</p></div><a className="simulate-button inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 font-semibold" href={detail.url} target="_blank" rel="noreferrer">공식 원문 보기 <ExternalLink className="h-4 w-4" /></a><p className="source-note"><BookOpen /> 공지 제목과 게시 정보는 학교 공식 홈페이지에서 가져왔습니다. 알림 권한을 켜면 실제 웹 푸시도 받을 수 있습니다.</p></div></>}
        </SheetContent>
      </Sheet>
    </main>
  );
}
