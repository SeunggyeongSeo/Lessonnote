import { createClient, SupabaseClient } from "@supabase/supabase-js";

/* 환경변수: .env (또는 Vercel 환경변수)에 설정
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   설정이 없으면 앱은 "인메모리 데모"로 동작합니다(저장·공유 안 됨). */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const STATE_ID = "ln:data:v1";
export const isConfigured = Boolean(url && anon);

export const supabase: SupabaseClient | null = isConfigured
  ? createClient(url as string, anon as string)
  : null;

if (!isConfigured && typeof console !== "undefined") {
  console.warn("[레슨노트] Supabase 환경변수가 없어 인메모리 데모로 실행됩니다. 공유 저장을 쓰려면 .env를 설정하세요.");
}

/* 전체 앱 데이터(JSON 한 덩어리)를 단일 행(app_state)에 읽기/쓰기 */
export async function loadState(): Promise<any | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("app_state").select("data").eq("id", STATE_ID).maybeSingle();
  if (error) { console.error("[loadState]", error.message); return null; }
  return data?.data ?? null;
}

export async function saveState(state: any): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from("app_state")
    .upsert({ id: STATE_ID, data: state, updated_at: new Date().toISOString() });
  if (error) console.error("[saveState]", error.message);
}

/* 실시간 구독 — 다른 기기에서 바뀌면 즉시 반영 */
export function subscribeState(onChange: (state: any) => void): () => void {
  if (!supabase) return () => {};
  const ch = supabase
    .channel("app_state_" + STATE_ID)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "app_state", filter: `id=eq.${STATE_ID}` },
      (payload: any) => { if (payload?.new?.data) onChange(payload.new.data); }
    )
    .subscribe();
  return () => { try { supabase!.removeChannel(ch); } catch {} };
}

/* 알림장 사진·영상을 Supabase Storage(공개 버킷)에 올리고 공개 URL을 돌려줌.
   모든 기기에서 같은 URL로 보이고, 영상 재생·다운로드도 됩니다.
   버킷 설정은 supabase_storage.sql 참고(베타: 누구나 업로드/읽기). */
export const MEDIA_BUCKET = "media";

export async function uploadMedia(
  file: File,
  onProgress?: (pct: number) => void
): Promise<{ url: string; path: string } | null> {
  if (!supabase) return null;
  const guessExt = file.type.startsWith("video") ? "mp4" : "jpg";
  const raw = (file.name || "").split(".").pop() || "";
  const ext = (raw && raw.length <= 5 ? raw : guessExt).toLowerCase().replace(/[^a-z0-9]/g, "") || guessExt;
  const path = `diary/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) { console.error("[uploadMedia]", error.message); throw error; }
  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  if (onProgress) onProgress(100);
  return { url: data.publicUrl, path };
}

/* 자동 로그인 기억 — 각 기기 로컬에만 저장(서버 미전송) */
export const authStore = {
  get(): string | null { try { return localStorage.getItem("ln:auth"); } catch { return null; } },
  set(id: string) { try { localStorage.setItem("ln:auth", id); } catch {} },
  clear() { try { localStorage.removeItem("ln:auth"); } catch {} },
};
