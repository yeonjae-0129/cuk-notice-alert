"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Bell, BookOpen, Check, ChevronRight, Clock3, GraduationCap, LogOut, Plus, Search, ShieldCheck, Smartphone, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type Notice = { id: number; title: string; department: string; date: string; period: string; body: string };

const notices: Notice[] = [
  { id: 1, title: "2026학년도 2학기 교내장학금 추가 신청 안내", department: "학생지원팀", date: "2026.09.18", period: "2026.09.21 09:00 ~ 09.25 17:00", body: "교내장학금 추가 신청을 안내합니다. 신청을 희망하는 재학생은 기간 내 신청서와 증빙서류를 제출해 주세요." },
  { id: 2, title: "2026 동계 현장실습 및 인턴십 참가자 모집", department: "취·창업지원팀", date: "2026.09.17", period: "2026.09.17 ~ 09.30", body: "동계 현장실습과 인턴십에 참여할 학생을 모집합니다. 전공별 참여 기업과 지원 자격을 확인한 뒤 신청해 주세요." },
  { id: 3, title: "성심교정 기숙사 추가 입사 신청 안내", department: "기숙사운영팀", date: "2026.09.16", period: "2026.09.18 ~ 09.22", body: "성심교정 기숙사 잔여석에 대한 추가 입사 신청을 받습니다. 선발 기준과 제출 서류를 확인해 주세요." },
  { id: 4, title: "2026학년도 2학기 수강취소 기간 안내", department: "학사지원팀", date: "2026.09.15", period: "2026.09.23 ~ 09.25", body: "2학기 수강취소 신청 기간과 유의사항을 안내합니다. 취소 후 최소 이수학점을 반드시 확인해 주세요." },
  { id: 5, title: "중앙도서관 추석 연휴 운영시간 안내", department: "중앙도서관", date: "2026.09.14", period: "2026.10.03 ~ 10.05", body: "추석 연휴 기간 중앙도서관 자료실과 열람실 운영시간이 변경됩니다. 방문 전 운영시간을 확인해 주세요." },
];

const matchingKeywords = (notice: Notice, keywords: string[]) => {
  const text = `${notice.title} ${notice.body}`.toLowerCase();
  return keywords.filter((keyword) => text.includes(keyword.toLowerCase()));
};

export default function Home() {
  const [screen, setScreen] = useState<"login" | "dashboard">("login");
  const [keywords, setKeywords] = useState(["장학", "인턴"]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [push, setPush] = useState<Notice | null>(null);
  const [detail, setDetail] = useState<Notice | null>(null);
  const matches = useMemo(() => notices.filter((notice) => matchingKeywords(notice, keywords).length), [keywords]);

  function addKeyword(event?: FormEvent) {
    event?.preventDefault();
    const next = draft.trim();
    if (!next) return setError("키워드를 입력해 주세요.");
    if (keywords.some((keyword) => keyword.toLowerCase() === next.toLowerCase())) return setError("이미 등록한 키워드예요.");
    setKeywords((current) => [...current, next]);
    setDraft(""); setError(""); setHasRun(false); setPush(null);
  }

  function removeKeyword(keyword: string) {
    setKeywords((current) => current.filter((item) => item !== keyword));
    setHasRun(false); setPush(null); setError("");
  }

  function simulateArrival() {
    if (!keywords.length) return setError("알림을 받을 키워드를 하나 이상 추가해 주세요.");
    setChecking(true); setPush(null); setHasRun(false);
    window.setTimeout(() => {
      setPush(matches.find((notice) => notice.id === 2) ?? matches[0] ?? null);
      setHasRun(true); setChecking(false);
    }, 850);
  }

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
        setScreen("dashboard"); setKeywords(next); setPush(null); setHasRun(false);
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
        <p className="login-copy">가톨릭대학교 전체 공지에서 원하는 키워드를 찾아 휴대폰 푸시로 알려드려요.</p>
        <Button className="login-button" size="lg" onClick={() => setScreen("dashboard")}><GraduationCap /> 학교 계정 로그인 체험 <ChevronRight /></Button>
        <div className="privacy-note"><ShieldCheck /> 실제 학교 계정 정보는 입력하거나 전송하지 않습니다.</div>
      </section>
      <p className="mockup-label">가상 샘플로 만든 서비스 목업입니다.</p>
    </main>
  );

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand-row"><div className="small-brand"><Bell /></div><div><strong>가대알림</strong><span>공지 키워드 푸시</span></div></div>
        <div className="profile-row"><div className="profile-copy"><strong>김가대</strong><span>재학생 · 가상 사용자</span></div><div className="avatar">김</div><Button variant="ghost" size="icon" aria-label="로그아웃" onClick={() => setScreen("login")}><LogOut /></Button></div>
      </header>

      <div className="workspace">
        <section className="control-panel" aria-labelledby="keyword-title">
          <div className="eyebrow"><span /> 알림 설정</div>
          <h1 id="keyword-title">어떤 공지를<br />기다리고 있나요?</h1>
          <p className="section-copy">전체 공지의 제목과 본문에서 등록한 키워드가 하나라도 발견되면 알려드려요.</p>
          <form className="keyword-form" onSubmit={addKeyword}>
            <label htmlFor="keyword">관심 키워드</label>
            <div className="input-row"><Input id="keyword" value={draft} onChange={(event) => { setDraft(event.target.value); setError(""); }} placeholder="예: 장학, 인턴, 기숙사" aria-invalid={Boolean(error)} aria-describedby="keyword-message" /><Button type="submit" variant="outline"><Plus /> 추가</Button></div>
            <p id="keyword-message" className={error ? "form-message error" : "form-message"}>{error || "Enter를 눌러도 추가할 수 있어요."}</p>
          </form>
          <div className="keyword-list" aria-label="등록된 키워드">
            {!keywords.length ? <p className="empty-keywords">아직 등록한 관심 키워드가 없어요.</p> : keywords.map((keyword) => <span className="keyword-chip" key={keyword}>{keyword}<button onClick={() => removeKeyword(keyword)} aria-label={`${keyword} 키워드 삭제`}><X /></button></span>)}
          </div>
          <div className="rule-card">
            <div><Search /><span><small>검색 범위</small><strong>가톨릭대학교 전체 공지</strong></span></div>
            <div><Check /><span><small>일치 조건</small><strong>키워드 하나 이상</strong></span></div>
          </div>
          <Button className="simulate-button" size="lg" onClick={simulateArrival} disabled={checking}>{checking ? <><span className="spinner" /> 공지를 확인하고 있어요</> : <><Sparkles /> 데모: 새 공지 도착시키기</>}</Button>
          <p className="demo-note">시연용 버튼입니다. 실제 휴대폰 알림은 발송되지 않아요.</p>
        </section>

        <section className="preview-panel" aria-labelledby="preview-title">
          <div className="preview-heading"><div><div className="eyebrow"><span /> 실시간 미리보기</div><h2 id="preview-title">관심 공지를 기다리고 있어요</h2></div><Badge variant="outline" className="live-badge"><span /> 알림 대기 중</Badge></div>
          <div className="phone-stage">
            <div className="phone" aria-label="휴대폰 푸시 알림 미리보기">
              <div className="phone-top"><span>9:41</span><div className="dynamic-island" /><span>5G ◒</span></div>
              <div className="phone-date"><strong>9월 19일 토요일</strong><span>14:32</span></div>
              {push ? <button className="push-card" onClick={() => setDetail(push)}><div className="push-head"><span className="push-icon"><Bell /></span><strong>가대알림</strong><time>방금</time></div><h3>새 관심 공지가 올라왔어요</h3><p>{push.title}</p><span className="match-pill">‘{matchingKeywords(push, keywords)[0]}’ 키워드와 일치</span><small>시연용 알림 · 눌러서 자세히 보기</small></button> : <div className="phone-empty"><span><Bell /></span><strong>{hasRun ? "일치하는 새 공지가 없어요" : "알림이 여기에 도착해요"}</strong><p>{hasRun ? "다른 키워드를 등록하고 다시 시도해 보세요." : "데모 버튼을 누르면 관심 공지 푸시를 확인할 수 있어요."}</p></div>}
              <div className="phone-bottom"><span>⌁</span><span>◉</span></div>
            </div>
            <div className="sample-summary"><div className="summary-icon"><Smartphone /></div><div><span>샘플 매칭 결과</span><strong>{keywords.length ? `${notices.length}건 중 ${matches.length}건 일치` : "키워드를 추가해 주세요"}</strong><p>{keywords.length ? `${notices.length - matches.length}건은 관심 키워드와 일치하지 않아 알림에서 제외됩니다.` : "키워드가 있어야 샘플 공지를 비교할 수 있어요."}</p></div></div>
          </div>
        </section>
      </div>

      <Sheet open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}>
        <SheetContent className="notice-sheet sm:max-w-[520px]">
          {detail && <><SheetHeader className="sheet-header"><Badge className="sample-badge">가상 샘플 공지</Badge><SheetTitle className="sheet-title">{detail.title}</SheetTitle><SheetDescription>{detail.department} · {detail.date}</SheetDescription></SheetHeader><div className="sheet-body"><div className="match-box"><Sparkles /><span><small>알림을 보낸 이유</small><strong>‘{matchingKeywords(detail, keywords).join("·")}’ 키워드가 발견됐어요</strong></span></div><div className="info-row"><Clock3 /><span><small>신청·운영 기간</small><strong>{detail.period}</strong></span></div><div className="notice-copy"><h3>공지 내용</h3><p>{detail.body}</p></div><div className="requirements"><h3>확인할 내용</h3><ul><li><Check /> 공지의 신청 대상과 지원 자격</li><li><Check /> 마감 전 필요한 제출 서류</li><li><Check /> 담당 부서의 추가 안내</li></ul></div><p className="source-note"><BookOpen /> 화면 시연을 위해 작성한 가상 내용으로 실제 학교 공지가 아닙니다.</p></div></>}
        </SheetContent>
      </Sheet>
    </main>
  );
}
