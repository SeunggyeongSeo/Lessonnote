import React, { useState, useRef, useEffect } from "react";
import { isConfigured, loadState, saveState, subscribeState, authStore, uploadMedia } from "./supabaseClient";
import {
  Home, TrendingUp, CalendarDays, MessageCircle, Settings, CreditCard,
  Bell, Heart, MessageSquare, Play, Camera, Video, Check, CheckCheck,
  ChevronRight, ChevronLeft, X, Music2, Send, Clock, User, Users, Star,
  Sparkles, Receipt, FileText, Plus, Pencil, Trash2, Building2, GraduationCap,
  Shield, ChevronDown, PlusCircle, LogOut, KeyRound, Mail, Lock, Copy,
  UserPlus, MailCheck, ShieldCheck, Search, CornerDownRight, Paperclip, Archive, RotateCcw, ChevronUp, Move, AlertTriangle, Tablet, Download
} from "lucide-react";

/* ============================================================
   레슨노트 (LessonNote) — 음악학원 통합 소통 플랫폼
   v4: 이메일 인증 · 비밀번호 재설정 · 다자녀 학부모 지원
   ============================================================ */

const PALETTE = ["#6A4C7A", "#E07A55", "#6FAE93", "#3F7CA8", "#C2548A", "#C9912F"];
const ICONS = ["🎹", "☀️", "🎵", "🎼", "⭐", "🎶", "🏆", "📚", "🎻", "🎺"];
const AVATARS = ["🎀", "🎧", "🌟", "🐰", "⭐", "🎈", "🌸", "🦊"];
const MEDIA_HUES = ["linear-gradient(140deg,#F6D9C2,#E8A98A)", "linear-gradient(140deg,#D7C7E6,#A98BC4)", "linear-gradient(140deg,#C9E2D5,#86B79E)", "linear-gradient(140deg,#F4E2C0,#DBB571)", "linear-gradient(140deg,#E6C9D2,#C98EA0)"];
const uid = (p = "x") => p + Math.random().toString(36).slice(2, 8);
const genCode = () => "LN-" + Math.random().toString(36).slice(2, 7).toUpperCase();
const gen6 = () => String(Math.floor(100000 + Math.random() * 900000));
const hhmm = () => { const d = new Date(); return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`; };
const WD = ["일", "월", "화", "수", "목", "금", "토"];
const fmtClock = (ts) => { const d = new Date(ts); let h = d.getHours(); const ap = h < 12 ? "오전" : "오후"; h = h % 12 || 12; return `${ap} ${h}:${String(d.getMinutes()).padStart(2, "0")}`; };
const hhmmOf = (ts) => { const d = new Date(ts); return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`; };
const fmtDay = (ts) => { const d = new Date(ts); const now = new Date(); const yr = d.getFullYear() !== now.getFullYear() ? `${d.getFullYear()}년 ` : ""; return `${yr}${d.getMonth() + 1}월 ${d.getDate()}일 (${WD[d.getDay()]})`; };
const sameDay = (a, b) => a && b && new Date(a).toDateString() === new Date(b).toDateString();
const toLocalInput = (d) => { const p = n => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
const ym = () => { const d = new Date(); return `${d.getFullYear()}년 ${d.getMonth() + 1}월`; };
const ymKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const ymLabel = (k) => { const [y, m] = k.split("-"); return `${y}년 ${parseInt(m)}월`; };
const ymShort = (k) => `${parseInt(k.split("-")[1])}월`;
/* 시간표: 13:00~19:00, 30분 격자 + 수업 길이(분) */
const SLOTS = (() => { const o = []; for (let m = 13 * 60; m < 19 * 60; m += 30) o.push(`${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`); return o; })();
const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const addMin = (t, d) => { const x = toMin(t) + (d || 0); return `${Math.floor(x / 60)}:${String(x % 60).padStart(2, "0")}`; };
const fmtRange = (t, d) => `${t}–${addMin(t, d || 50)}`;
/* 자동 로그인용 인메모리 세션 (브라우저 저장소 미사용 — 실서비스에선 보안 토큰 저장) */
const SESSION = { accountId: null };
/* Supabase 미설정(인메모리/아티팩트) 시 폴백: 파일을 data URL로 인코딩 */
const fileToDataUrl = (f) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); });

const ATT = {
  present: { label: "출석", color: "#3F8267", dot: "#6FAE93", bg: "#E4F1EA" },
  late: { label: "지각", color: "#B5872F", dot: "#DBA254", bg: "#FBEFD8" },
  absent: { label: "결석", color: "#C45A48", dot: "#E07A55", bg: "#FBE0DC" },
  upcoming: { label: "예정", color: "#8C8493", dot: "#C9BEAF", bg: "#EEE7DB" },
};
const ATT_ORDER = ["present", "late", "absent", "upcoming"];
const REPORT_ITEMS = ["독보 및 초견", "손 모양", "리듬감 및 템포조절", "개인연습과 성실도", "이론학습", "마음가짐"];
const REPORT_CRIT = { "독보 및 초견": "악보를 처음 보고 건반으로 옮길 수 있는가", "손 모양": "팔꿈치·손목·손 모양과 움직임의 자세는 어떠한가", "리듬감 및 템포조절": "음표의 길이표현과 셈여림을 잘 표현하는가", "개인연습과 성실도": "개인연습 성취도와 성실한 태도로 레슨에 임하는가", "이론학습": "얼마나 알고 있는지와 잘 적용하는가", "마음가짐": "열심히 하려는 의욕과 흥미가 있는가" };
const GRADES = ["매우우수", "우수", "보통", "노력요함"];
const GRADE_COLOR = { "매우우수": "#3F8267", "우수": "#6A4C7A", "보통": "#B5683F", "노력요함": "#C45A48" };
const BY_LABEL = { parent: "학부모", teacher: "선생님", director: "원장님" };

/* ---------------- seed (익명화 · 랩뮤직연세) ----------------
   · 학원: 랩뮤직연세 / 원장: 엄*수
   · 강사 6명: A·B·C(피아노) · D(바이올린) · E(피아노) · F(바이올린)
   · 학생 30명 — 실제 명단의 다양성(바이올린 유무·자녀수·수업횟수·요일·담당교사) 반영, 이름 전부 마스킹
   · 2자녀 가정 2곳(정*민→s1·s2 / 최*아→s3·s4)
   ------------------------------------------------------------ */
const SEED = {
  academies: { ac1: { id: "ac1", name: "랩뮤직연세", tagline: "함께 자라는 음악 시간", directorName: "엄*수", inviteCode: "LN-LABMUSIC", open: "12:30", close: "19:00" } },
  accounts: [
    { id: "a_dir", role: "admin", name: "엄*수", email: "director@demo.kr", password: "1234", academyId: "ac1", verified: true },
    { id: "a_t1", role: "teacher", name: "A", email: "teacher1@demo.kr", password: "1234", academyId: "ac1", teacherId: "t1", verified: true },
    { id: "a_t2", role: "teacher", name: "B", email: "teacher2@demo.kr", password: "1234", academyId: "ac1", teacherId: "t2", verified: true },
    { id: "a_t3", role: "teacher", name: "C", email: "teacher3@demo.kr", password: "1234", academyId: "ac1", teacherId: "t3", verified: true },
    { id: "a_t4", role: "teacher", name: "D", email: "teacher4@demo.kr", password: "1234", academyId: "ac1", teacherId: "t4", verified: true },
    { id: "a_t5", role: "teacher", name: "E", email: "teacher5@demo.kr", password: "1234", academyId: "ac1", teacherId: "t5", verified: true },
    { id: "a_t6", role: "teacher", name: "F", email: "teacher6@demo.kr", password: "1234", academyId: "ac1", teacherId: "t6", verified: true },
    { id: "a_p1", role: "parent", name: "정*민", email: "parent1@demo.kr", password: "1234", academyId: "ac1", studentIds: ["s1", "s2"], verified: true },
    { id: "a_p2", role: "parent", name: "최*아", email: "parent2@demo.kr", password: "1234", academyId: "ac1", studentIds: ["s3", "s4"], verified: true },
    { id: "a_p3", role: "parent", name: "박*우", email: "parent3@demo.kr", password: "1234", academyId: "ac1", studentIds: ["s5"], verified: true },
    { id: "a_p4", role: "parent", name: "김*영", email: "parent4@demo.kr", password: "1234", academyId: "ac1", studentIds: ["s6"], verified: true },
    { id: "a_p5", role: "parent", name: "정*호", email: "parent5@demo.kr", password: "1234", academyId: "ac1", studentIds: ["s7"], verified: true },
    { id: "a_p6", role: "parent", name: "윤*진", email: "parent6@demo.kr", password: "1234", academyId: "ac1", studentIds: ["s8"], verified: true },
    { id: "a_p7", role: "parent", name: "강*정", email: "parent7@demo.kr", password: "1234", academyId: "ac1", studentIds: ["s9"], verified: true },
    { id: "a_p8", role: "parent", name: "조*경", email: "parent8@demo.kr", password: "1234", academyId: "ac1", studentIds: ["s10"], verified: true },
    { id: "a_p9", role: "parent", name: "한*영", email: "parent9@demo.kr", password: "1234", academyId: "ac1", studentIds: ["s11"], verified: true },
    { id: "a_p10", role: "parent", name: "임*은", email: "parent10@demo.kr", password: "1234", academyId: "ac1", studentIds: ["s12"], verified: true },
    { id: "a_p11", role: "parent", name: "송*아", email: "parent11@demo.kr", password: "1234", academyId: "ac1", studentIds: [], verified: true },
    { id: "a_par", role: "parent", name: "정*민", email: "parent@demo.kr", password: "1234", academyId: "ac1", studentIds: ["s1", "s2"], verified: true },
    { id: "a_tea", role: "teacher", name: "A", email: "teacher@demo.kr", password: "1234", academyId: "ac1", teacherId: "t1", verified: true },
  ],
  teachers: [
    { id: "t1", academyId: "ac1", name: "A", subject: "피아노", color: "#6A4C7A" },
    { id: "t2", academyId: "ac1", name: "B", subject: "피아노", color: "#E07A55" },
    { id: "t3", academyId: "ac1", name: "C", subject: "피아노", color: "#6FAE93" },
    { id: "t4", academyId: "ac1", name: "D", subject: "바이올린", color: "#3F7CA8" },
    { id: "t5", academyId: "ac1", name: "E", subject: "피아노", color: "#C2548A" },
    { id: "t6", academyId: "ac1", name: "F", subject: "바이올린", color: "#DBA254" },
  ],
  students: [
    { id: "s1", academyId: "ac1", name: "이*경", age: "7세", teacherId: "t1", days: 412, avatar: "🎀", pin: "7016" },
    { id: "s2", academyId: "ac1", name: "이*윤", age: "9세", teacherId: "t1", days: 230, avatar: "🎧", pin: "3925" },
    { id: "s3", academyId: "ac1", name: "최*린", age: "11세", teacherId: "t2", days: 540, avatar: "🌟", pin: "5840" },
    { id: "s4", academyId: "ac1", name: "최*온", age: "8세", teacherId: "t4", days: 120, avatar: "🎻", pin: "4127" },
    { id: "s5", academyId: "ac1", name: "김*준", age: "10세", teacherId: "t3", days: 310, avatar: "🎵", pin: "6398" },
    { id: "s6", academyId: "ac1", name: "정*나", age: "7세", teacherId: "t3", days: 95, avatar: "🌸", pin: "2051" },
    { id: "s7", academyId: "ac1", name: "윤*아", age: "9세", teacherId: "t4", days: 200, avatar: "🎻", pin: "8264" },
    { id: "s8", academyId: "ac1", name: "강*현", age: "12세", teacherId: "t5", days: 480, avatar: "🎤", pin: "5719" },
    { id: "s9", academyId: "ac1", name: "조*재", age: "8세", teacherId: "t5", days: 60, avatar: "⭐", pin: "3402" },
    { id: "s10", academyId: "ac1", name: "한*린", age: "10세", teacherId: "t6", days: 150, avatar: "🎼", pin: "9085" },
    { id: "s11", academyId: "ac1", name: "박*서", age: "6세", teacherId: "t1", days: 40, avatar: "🐰", pin: "1186" },
    { id: "s12", academyId: "ac1", name: "임*우", age: "13세", teacherId: "t6", days: 600, avatar: "🎈", pin: "7723" },
  ],
  diary: [
    { id: "d1", studentId: "s1", teacherId: "t1", date: "6월 2일 (월)", title: "오늘은 체르니 16번을 끝냈어요! 🎉", text: "어려워하던 마지막 마디를 완벽하게 연주했어요. 손목 힘 빼는 연습이 큰 도움이 되었답니다.", media: [{ t: "photo", h: 0, e: "🎹" }, { t: "video", h: 1, e: "🎬" }, { t: "photo", h: 3, e: "🎼" }], likes: 2, liked: false, commentList: [{ aid: "a_par", by: "parent", name: "정*민", text: "우와 정말 잘했네요! 감사합니다 선생님 😊", time: "15:30", replies: [{ aid: "a_tea", by: "teacher", name: "A", text: "감사합니다 어머님! 다음 주도 화이팅이에요 🎵", time: "15:34" }] }] },
    { id: "d2", studentId: "s1", teacherId: "t2", date: "5월 30일 (금)", title: "이론 — 화성학 기초 완료", text: "으뜸화음·딸림화음을 배우고 음표 카드로 직접 화음을 만들어보았어요.", media: [{ t: "photo", h: 2, e: "📓" }], likes: 1, liked: true, commentList: [] },
    { id: "d3", studentId: "s2", teacherId: "t1", date: "6월 1일 (일)", title: "손가락 번호 마스터! 🎯", text: "스케일 연습에서 손가락 번호를 헷갈리지 않고 연주했어요.", media: [{ t: "photo", h: 4, e: "🎵" }], likes: 1, liked: false, commentList: [] },
  ],
  goals: [
    { id: "g0", studentId: "s1", title: "봄 기초 다지기", icon: "🌸", tone: "#C2548A", status: "archived", archivedYM: "2026-04", items: [{ n: "하농 1~5번", done: true, doneYM: "2026-03" }, { n: "체르니 No.10~12", done: true, doneYM: "2026-04" }] },
    { id: "g1", studentId: "s1", title: "체르니 30번 중반까지 달성", icon: "🎹", tone: "#E07A55", items: [{ n: "체르니 No.13", done: true, doneYM: "2026-05" }, { n: "체르니 No.14", done: true, doneYM: "2026-05" }, { n: "체르니 No.15", done: true, doneYM: "2026-06" }, { n: "체르니 No.16", done: true, doneYM: "2026-06" }, { n: "체르니 No.17", done: false }, { n: "체르니 No.18", done: false }] },
    { id: "g2", studentId: "s1", title: "썸머 레파토리 완성", icon: "☀️", tone: "#DBA254", items: [{ n: "부르크뮐러 — 아라베스크", done: true, doneYM: "2026-06" }, { n: "엘가 — 사랑의 인사", done: true, doneYM: "2026-06" }, { n: "베토벤 — 엘리제를 위하여", done: false }, { n: "이루마 — River Flows in You", done: false }] },
    { id: "g3", studentId: "s2", title: "바이엘 하권 완주", icon: "🎵", tone: "#6FAE93", items: [{ n: "바이엘 80~85", done: true, doneYM: "2026-05" }, { n: "바이엘 86~90", done: false }] },
  ],
  reports: [
    { id: "rp1", studentId: "s1", teacherId: "t1", term: "2026 상반기", date: "6월 5일", course: "체르니30 초반", books: "소나티네, 반주레시피2, 세모재즈", theory: "이론7권, 계이름6권", grades: { "독보 및 초견": "보통", "손 모양": "보통", "리듬감 및 템포조절": "우수", "개인연습과 성실도": "우수", "이론학습": "우수", "마음가짐": "보통" }, comment: "목표를 가지고 연주곡을 완성하는 과정에서 성장의 폭이 무척 큰 학생입니다. 독보력과 테크닉이 발전했고, 이전보다 흥미도가 올라간 것 같아 보입니다. 체르니30을 진급하며 점점 심화되는 난이도에도 성실히 연습하고 있어요. 앞으로도 더 성장할 모습을 응원하겠습니다 :)" },
  ],
  schedule: [
    { id: "sc1", studentId: "s1", teacherId: "t1", day: "월", time: "16:00", dur: 50, kind: "피아노 정규", room: "1관 A실", att: "present" },
    { id: "sc2", studentId: "s1", teacherId: "t1", day: "수", time: "16:00", dur: 60, kind: "피아노 정규", room: "1관 A실", att: "present" },
    { id: "sc3", studentId: "s1", teacherId: "t2", day: "금", time: "17:00", dur: 50, kind: "이론·실기", room: "2관 이론실", att: "upcoming" },
    { id: "sc4", studentId: "s2", teacherId: "t1", day: "화", time: "15:30", dur: 30, kind: "피아노 정규", room: "1관 B실", att: "present" },
    { id: "sc5", studentId: "s2", teacherId: "t1", day: "목", time: "15:00", dur: 50, kind: "피아노 정규", room: "1관 B실", att: "upcoming" },
    { id: "sc6", studentId: "s4", teacherId: "t4", day: "화", time: "16:00", dur: 30, kind: "바이올린 정규", room: "바이올린실", att: "present" },
    { id: "sc7", studentId: "s3", teacherId: "t2", day: "목", time: "17:00", dur: 50, kind: "피아노 정규", room: "1관 A실", att: "upcoming" },
  ],
  payments: [
    { id: "p1", studentId: "s1", month: "2026년 6월 수강료", amount: 220000, status: "pending", due: "6월 5일까지", items: ["피아노 정규 (주 2회)", "이론·실기 (주 1회)", "교재비 — 체르니30"] },
    { id: "p2", studentId: "s1", month: "2026년 5월 수강료", amount: 220000, status: "done", date: "5월 4일 결제", method: "신용카드 ****4821" },
    { id: "p3", studentId: "s1", month: "2026년 4월 수강료", amount: 200000, status: "done", date: "4월 3일 결제", method: "계좌이체" },
    { id: "p4", studentId: "s2", month: "2026년 6월 수강료", amount: 180000, status: "pending", due: "6월 5일까지", items: ["피아노 정규 (주 2회)", "교재비 — 바이엘 하권"] },
    { id: "p5", studentId: "s3", month: "2026년 6월 수강료", amount: 200000, status: "done", date: "6월 2일 결제", method: "신용카드 ****1130" },
    { id: "p6", studentId: "s4", month: "2026년 6월 수강료", amount: 170000, status: "pending", due: "6월 10일까지", items: ["바이올린 정규 (주 1회)", "교재비 — 스즈키1"] },
  ],
  chats: {
    "s1|tp": [{ by: "teacher", text: "안녕하세요 어머님 :) 오늘 수업 정말 잘했어요!", time: "15:02" }, { by: "parent", text: "선생님 감사합니다 🙏", time: "15:10" }, { by: "teacher", text: "다음 주부터 체르니 17번 들어갑니다!", time: "15:12" }],
    "s1|pd": [{ by: "director", text: "어머님, 7월 발표회 안내드립니다!", time: "11:00" }],
    "s1|td": [{ by: "director", text: "A 선생님, 발표회 곡 진행 어떤가요?", time: "09:30" }, { by: "teacher", text: "아라베스크 거의 완성됐습니다!", time: "09:41" }],
    "s2|tp": [{ by: "parent", text: "선생님 요즘 어떤가요?", time: "18:20" }, { by: "teacher", text: "바이엘 진도가 아주 빨라요! 칭찬 많이 해주세요 😊", time: "18:25" }],
  },
  notifications: [
    { id: "n1", academyId: "ac1", aud: { kind: "parentOf", studentId: "s1" }, type: "diary", text: "📒 새 알림장 · 오늘은 체르니 16번을 끝냈어요!", time: "15:13", readBy: [] },
    { id: "n2", academyId: "ac1", aud: { kind: "parentOf", studentId: "s1" }, type: "chat", key: "s1|pd", text: "💬 엄*수 원장님 · 7월 발표회 안내드립니다!", time: "11:00", readBy: [] },
    { id: "n3", academyId: "ac1", aud: { kind: "admin" }, type: "chat", key: "s2|tp", text: "💬 이*윤 학부모 · 선생님 요즘 어떤가요?", time: "18:20", readBy: [] },
  ],
  linkRequests: [
    { id: "lr1", accountId: "a_p11", studentId: "s13", academyId: "ac1", parentName: "송*아", status: "pending", time: "10:05" },
  ],
  leads: [
    { id: "ld1", academyId: "ac1", name: "송*린", grade: "신목초2", phone: "010-8321-1124", trialDate: "1/5(월) 2:10", status: "trial", memo: "" },
    { id: "ld2", academyId: "ac1", name: "한*아", grade: "신목초4", phone: "010-2061-5198", trialDate: "1/13(화) 1:50", status: "registered", memo: "피아노 쇼팽반에서 체르니30 진행중" },
    { id: "ld3", academyId: "ac1", name: "박*나", grade: "갈산초4", phone: "010-8635-5199", trialDate: "1/5(월) 4:10", status: "registered", memo: "갈산초 오케 합격, 수준 높아 따라갈지 상담" },
    { id: "ld4", academyId: "ac1", name: "백*림", grade: "목동초4", phone: "010-8987-2404", trialDate: "1/21(수) 5:50", status: "registered", memo: "지인 소개" },
  ],
  makeups: [
    { id: "mk1", academyId: "ac1", name: "이*우", absentDate: "12/1(월)", reason: "병결", makeupDate: "1/9(금) 2:40", done: true },
    { id: "mk2", academyId: "ac1", name: "강*주", absentDate: "12/19(금)", reason: "병결", makeupDate: "1/14(수) 5:00", done: true },
    { id: "mk3", academyId: "ac1", name: "오*서", absentDate: "12/18(목)", reason: "여행", makeupDate: "12/27(토) 당일결석", done: false },
    { id: "mk4", academyId: "ac1", name: "윤*연", absentDate: "1/5(월)", reason: "여행", makeupDate: "1/16(금) 6:30", done: true },
    { id: "mk5", academyId: "ac1", name: "구*은", absentDate: "1/8(목)~16(금)", reason: "눈 수술", makeupDate: "3회 차감", done: true },
    { id: "mk6", academyId: "ac1", name: "배*아", absentDate: "2/3(화)", reason: "당일병결", makeupDate: "2/24(화) 12:30", done: false },
  ],
  announcements: [
    { id: "an1", academyId: "ac1", by: "엄*수 원장", audience: "everyone", title: "7월 정기 발표회 안내", text: "7월 20일(일) 오후 2시, 학원 대강당에서 정기 발표회가 열립니다. 참가 곡은 담당 선생님과 상의해 주세요!", date: "6월 2일", time: "10:00" },
    { id: "an2", academyId: "ac1", by: "엄*수 원장", audience: "parents", title: "6월 교재비 안내", text: "이번 달 교재가 변경되어 교재비가 청구됩니다. 결제 탭에서 확인 부탁드립니다.", date: "6월 1일", time: "09:30" },
  ],
  classes: [
    { id: "c_mo", academyId: "ac1", name: "모차르트반", color: "#C2548A", type: "grid" },
    { id: "c_su", academyId: "ac1", name: "슈만반", color: "#DBA254", type: "grid" },
    { id: "c_ch", academyId: "ac1", name: "쇼팽반", color: "#3F7CA8", type: "grid" },
    { id: "c_vn", academyId: "ac1", name: "바이올린", color: "#6FAE93", type: "list" },
    { id: "c_mk", academyId: "ac1", name: "보강", color: "#8E6BB0", type: "list" },
  ],
  roster: [
    { id: "r1", academyId: "ac1", classId: "c_mo", day: "월", time: "13:30", name: "박*온", present: true, memo: "" },
    { id: "r2", academyId: "ac1", classId: "c_mo", day: "월", time: "13:30", name: "장*은", present: true, memo: "" },
    { id: "r3", academyId: "ac1", classId: "c_mo", day: "월", time: "13:30", name: "서*인", present: false, absent: true, memo: "오늘 결석 (감기)" },
    { id: "r4", academyId: "ac1", classId: "c_mo", day: "월", time: "14:00", name: "이*우", present: true, memo: "" },
    { id: "r5", academyId: "ac1", classId: "c_mo", day: "월", time: "14:00", name: "최*우", present: false, memo: "교재 준비물 안내" },
    { id: "r6", academyId: "ac1", classId: "c_su", day: "월", time: "13:30", name: "이*용", present: false, memo: "" },
    { id: "r7", academyId: "ac1", classId: "c_su", day: "월", time: "14:00", name: "김*인", present: true, memo: "" },
    { id: "r8", academyId: "ac1", classId: "c_su", day: "월", time: "14:30", name: "이*인", present: true, memo: "" },
    { id: "r9", academyId: "ac1", classId: "c_ch", day: "월", time: "15:00", name: "김*윤", present: true, memo: "발표회 곡 점검" },
    { id: "r10", academyId: "ac1", classId: "c_ch", day: "월", time: "15:30", name: "이*나", present: false, memo: "" },
    { id: "v1", academyId: "ac1", classId: "c_vn", day: "월", time: "13:50", name: "최*온", studentId: "s4", present: false, memo: "" },
    { id: "v2", academyId: "ac1", classId: "c_vn", day: "월", time: "14:20", name: "윤*아", studentId: "s7", present: false, memo: "" },
    { id: "v3", academyId: "ac1", classId: "c_vn", day: "월", time: "14:40", name: "정*연", present: true, memo: "" },
    { id: "v4", academyId: "ac1", classId: "c_vn", day: "월", time: "15:30", name: "김*인", present: false, memo: "3:10-3:50" },
    { id: "v5", academyId: "ac1", classId: "c_vn", day: "월", time: "18:40", name: "김*후", present: true, memo: "체험" },
    { id: "v6", academyId: "ac1", classId: "c_vn", day: "월", time: "19:10", name: "이*율", present: false, memo: "체험 · 결석" },
  ],
};

/* 익명 확장: 다양성 테스트용 학생 s13~s30 (총 30명)
   — 바이올린 유무 · 수업횟수(주1~3회) · 요일 · 담당교사 · 수납상태 · 명단 배치를 분산 */
(function seedMore() {
  const SUR = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오", "서", "신", "권", "황", "안", "남"];
  const LAST = ["우", "서", "윤", "아", "준", "현", "민", "호", "연", "율", "은", "진", "후", "원", "빈", "결", "하", "솔"];
  const AV = ["🎀", "🎧", "🌟", "🐰", "⭐", "🎈", "🌸", "🦊", "🎵", "🎼"];
  const PIANO = ["t1", "t2", "t3", "t5"];
  const VIOLIN = ["t4", "t6"];
  const DAYS = ["월", "화", "수", "목", "금"];
  const BOOKS = ["바이엘 하권", "체르니100", "체르니30", "스즈키1", "스즈키3", "하농", "부르크뮐러", "레파토리4"];
  for (let i = 13; i <= 30; i++) {
    const sid = "s" + i;
    const isViolin = i % 3 === 0;
    const tid = isViolin ? VIOLIN[i % VIOLIN.length] : PIANO[i % PIANO.length];
    const name = SUR[(i * 5) % SUR.length] + "*" + LAST[(i * 3) % LAST.length];
    SEED.students.push({ id: sid, academyId: "ac1", name, age: (6 + (i % 8)) + "세", teacherId: tid, days: 30 + ((i * 17) % 600), avatar: AV[i % AV.length], pin: String(1000 + ((i * 37) % 9000)) });
    const freq = 1 + (i % 3);
    for (let k = 0; k < freq; k++) {
      const day = DAYS[(i + k * 2) % DAYS.length];
      const time = SLOTS[(i + k) % SLOTS.length] || "16:00";
      SEED.schedule.push({ id: uid("sc"), studentId: sid, teacherId: tid, day, time, dur: [30, 50, 60][i % 3], kind: isViolin ? "바이올린 정규" : "피아노 정규", room: isViolin ? "바이올린실" : ((i % 3) + 1) + "관", att: "upcoming" });
    }
    const amount = 150000 + (i % 5) * 20000;
    SEED.payments.push((i % 4) === 0
      ? { id: "p" + sid, studentId: sid, month: "2026년 6월 수강료", amount, status: "pending", due: "6월 10일까지", items: [(isViolin ? "바이올린" : "피아노") + " 정규 (주 " + freq + "회)", "교재비 — " + BOOKS[i % BOOKS.length]] }
      : { id: "p" + sid, studentId: sid, month: "2026년 6월 수강료", amount, status: "done", date: "6월 4일 결제", method: "신용카드 ****" + (1000 + (i % 9000)) });
    const cls = isViolin ? "c_vn" : ["c_mo", "c_su", "c_ch"][i % 3];
    SEED.roster.push({ id: uid("r"), academyId: "ac1", classId: cls, day: DAYS[i % DAYS.length], time: SLOTS[(i * 2) % SLOTS.length] || "14:00", name, studentId: sid, present: (i % 2) === 0, memo: "" });
  }
})();

/* ---------------- styles ---------------- */
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=Gowun+Dodum&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,500&display=swap');
:root{
  --paper:#FAF5EC;--card:#FFFEFA;--ink:#2A2530;--ink-soft:#8B8390;--ink-faint:#B7B0B9;
  --line:#EFE7D8;--line-soft:#F4EEE2;--plum:#6A4C7A;--plum-deep:#4D3759;
  --coral:#EE9573;--coral-deep:#E07A55;--gold:#C9912F;--gold-soft:#DBA254;--mint:#6FAE93;--sky:#8FB4CB;
  --r-lg:20px;--r-md:16px;--r-sm:12px;
  --sh-sm:0 1px 2px rgba(74,55,82,.05),0 3px 10px -5px rgba(74,55,82,.12);
  --sh-md:0 2px 4px rgba(74,55,82,.04),0 14px 30px -18px rgba(74,55,82,.24);
  --sh-lg:0 4px 10px rgba(74,55,82,.05),0 26px 52px -22px rgba(74,55,82,.32);
}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
.dc-root{font-family:'Gowun Dodum',sans-serif;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;line-height:1.5;letter-spacing:-.005em;background:radial-gradient(900px 600px at 15% -10%,#F2E7D8 0,transparent 55%),radial-gradient(900px 700px at 110% 20%,#E9DEEF 0,transparent 52%),#F0E8DB;min-height:100vh;width:100%;display:flex;align-items:center;justify-content:center;padding:18px;color:var(--ink);}
.dc-phone{width:100%;max-width:430px;height:880px;max-height:94vh;background:var(--paper);border-radius:40px;overflow:hidden;position:relative;display:flex;flex-direction:column;box-shadow:0 30px 70px -34px rgba(74,55,82,.5),0 0 0 7px #fff,0 0 0 8px #EADFCD;}
.dc-serif{font-family:'Gowun Batang',serif;letter-spacing:-.01em;}.dc-fr{font-family:'Fraunces',serif;}
.dc-head{position:relative;padding:17px 20px 18px;flex-shrink:0;background:linear-gradient(150deg,#6E5080 0,var(--plum-deep) 58%,#3a2945 100%);color:#fff;overflow:hidden;box-shadow:inset 0 -1px 0 rgba(0,0,0,.08);}
.dc-staff{position:absolute;inset:0;opacity:.08;pointer-events:none;background-image:repeating-linear-gradient(0deg,#fff 0 1px,transparent 1px 13px);mask-image:linear-gradient(180deg,transparent,#000 30%,#000 70%,transparent);}
.dc-glow{position:absolute;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,var(--coral) 0,transparent 70%);opacity:.34;filter:blur(8px);right:-40px;top:-54px;}
.dc-avatar{width:44px;height:44px;border-radius:15px;display:flex;align-items:center;justify-content:center;font-size:21px;flex-shrink:0;background:linear-gradient(140deg,#FBE3D2,#F4C9AE);box-shadow:0 5px 14px -6px rgba(224,122,85,.6),inset 0 1px 0 rgba(255,255,255,.5);}
.dc-body{flex:1;overflow-y:auto;overflow-x:hidden;padding:18px 16px 112px;scrollbar-width:none;}.dc-body::-webkit-scrollbar{display:none;}
.dc-card{background:var(--card);border:1px solid var(--line);border-radius:var(--r-lg);box-shadow:var(--sh-md);}
.dc-pill{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;padding:4px 11px;border-radius:999px;font-weight:700;letter-spacing:-.01em;}
.dc-thumb{position:relative;border-radius:var(--r-md);overflow:hidden;aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:30px;}
.dc-play{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(42,37,48,.28);}
.dc-play span{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.94);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px -4px rgba(0,0,0,.3);}
.dc-bar{height:9px;border-radius:999px;background:#EEE5D6;overflow:hidden;box-shadow:inset 0 1px 2px rgba(74,55,82,.08);}.dc-bar-fill{height:100%;border-radius:999px;transition:width .6s cubic-bezier(.4,1.2,.5,1);}
.dc-check{width:24px;height:24px;border-radius:8px;border:2px solid var(--line);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:.2s;cursor:pointer;}.dc-check.on{background:var(--mint);border-color:var(--mint);}
.dc-tt-cell{border-radius:11px;font-size:11px;padding:7px 6px;line-height:1.35;cursor:pointer;transition:transform .15s,box-shadow .15s;color:#fff;font-weight:700;box-shadow:0 4px 10px -6px rgba(74,55,82,.4);}.dc-tt-cell:active{transform:scale(.96);}
.dc-bubble{max-width:74%;padding:10px 13px;border-radius:18px;font-size:13.5px;line-height:1.55;box-shadow:var(--sh-sm);}
.dc-bubble.me{background:linear-gradient(140deg,#6E5080,var(--plum-deep));color:#fff;border-bottom-right-radius:5px;}
.dc-bubble.them{background:#fff;border:1px solid var(--line);border-bottom-left-radius:5px;}
.dc-nav{position:absolute;left:0;right:0;bottom:0;display:flex;justify-content:space-around;padding:9px 8px 16px;background:rgba(255,254,250,.86);backdrop-filter:blur(16px) saturate(1.4);-webkit-backdrop-filter:blur(16px) saturate(1.4);border-top:1px solid var(--line-soft);}
.dc-nav-btn{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;font-size:10.5px;font-weight:700;letter-spacing:-.01em;color:var(--ink-faint);background:none;border:none;cursor:pointer;padding:4px 0;transition:color .2s;}
.dc-nav-btn.on{color:var(--plum);}
.dc-nav-ico{width:42px;height:30px;border-radius:13px;display:flex;align-items:center;justify-content:center;transition:.25s;}.dc-nav-btn.on .dc-nav-ico{background:linear-gradient(140deg,#F3E2D3,#EAD3E1);box-shadow:inset 0 1px 0 rgba(255,255,255,.6);}
.dc-overlay{position:absolute;inset:0;background:rgba(42,37,48,.46);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);display:flex;align-items:flex-end;z-index:60;animation:fade .2s ease;}
.dc-sheet{width:100%;max-height:88%;overflow-y:auto;background:var(--paper);border-radius:26px 26px 0 0;padding:8px 20px 28px;box-shadow:0 -10px 40px -16px rgba(74,55,82,.4);animation:rise .32s cubic-bezier(.3,1.1,.4,1);scrollbar-width:none;}.dc-sheet::-webkit-scrollbar{display:none;}
.dc-grab{width:40px;height:5px;border-radius:99px;background:var(--line);margin:8px auto 16px;}
@keyframes fade{from{opacity:0}to{opacity:1}}@keyframes rise{from{transform:translateY(40px);opacity:.6}to{transform:translateY(0);opacity:1}}
@keyframes pop{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}@keyframes floaty{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
.dc-enter{animation:pop .4s cubic-bezier(.3,1.4,.5,1) both;}
.dc-btn{border:none;cursor:pointer;font-family:inherit;font-weight:700;transition:transform .18s,box-shadow .18s,background .18s;}.dc-btn:active{transform:scale(.97);}.dc-btn:focus-visible{outline:2px solid var(--plum);outline-offset:2px;}
.dc-fab{position:absolute;right:18px;bottom:90px;width:54px;height:54px;border-radius:19px;background:linear-gradient(140deg,var(--coral),var(--coral-deep));color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 14px 28px -10px rgba(224,122,85,.62),inset 0 1px 0 rgba(255,255,255,.3);z-index:40;}
.dc-input{width:100%;border:1px solid var(--line);background:#fff;border-radius:14px;padding:12px 14px;font-size:14px;font-family:inherit;outline:none;color:var(--ink);transition:border-color .18s,box-shadow .18s;}.dc-input:focus{border-color:var(--plum);box-shadow:0 0 0 3px rgba(106,76,122,.12);}
.dc-label{font-size:12px;font-weight:700;color:var(--plum);margin-bottom:6px;display:block;letter-spacing:-.01em;}
.dc-section-tt{font-size:13px;font-weight:700;color:var(--plum);display:flex;align-items:center;gap:6px;letter-spacing:-.01em;}
.dc-auth{position:absolute;inset:0;background:linear-gradient(160deg,#6A4C7A 0,#4D3759 45%,#2f2240 100%);color:#fff;display:flex;flex-direction:column;padding:0 26px;overflow-y:auto;scrollbar-width:none;}.dc-auth::-webkit-scrollbar{display:none;}
.dc-auth-in{width:100%;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.10);border-radius:14px;padding:13px 15px 13px 42px;font-size:14px;font-family:inherit;outline:none;color:#fff;transition:border-color .18s,background .18s;}
.dc-auth-in::placeholder{color:rgba(255,255,255,.6);}.dc-auth-in:focus{border-color:#EE9573;background:rgba(255,255,255,.16);}
@media (prefers-reduced-motion:reduce){*{animation-duration:.01ms!important;transition-duration:.01ms!important;}}
`;

/* ---------------- shared ---------------- */
function Tag({ bg, color, children }) { return <span className="dc-pill" style={{ background: bg, color }}>{children}</span>; }
function ViewTitle({ icon, kr, en, sub }) { return (<div style={{ marginBottom: 16 }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 28, height: 28, borderRadius: 10, background: "linear-gradient(140deg,#F3E2D3,#EAD3E1)", color: "var(--plum)", display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div><h2 className="dc-serif" style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{kr}</h2>{en && <span className="dc-fr" style={{ fontSize: 12, fontStyle: "italic", color: "var(--ink-soft)" }}>{en}</span>}</div>{sub && <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 5, paddingLeft: 2 }}>{sub}</div>}</div>); }
function Sheet({ title, onClose, children }) { return (<div className="dc-overlay" onClick={onClose}><div className="dc-sheet" onClick={e => e.stopPropagation()}><div className="dc-grab" /><div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}><div className="dc-serif" style={{ fontSize: 18, fontWeight: 700, flex: 1 }}>{title}</div><button className="dc-btn" onClick={onClose} style={{ background: "#F0E7D9", borderRadius: 12, padding: 8 }}><X size={18} color="#8C8493" /></button></div>{children}</div></div>); }
function ConfirmModal({ title, message, confirmLabel, danger = true, onConfirm, onClose }) {
  return (<div className="dc-overlay" onClick={onClose} style={{ alignItems: "center", justifyContent: "center" }}>
    <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 22, padding: 22, width: "84%", maxWidth: 320, boxShadow: "0 18px 50px rgba(45,40,51,.35)" }}>
      <div style={{ width: 46, height: 46, borderRadius: 15, background: danger ? "#FBE0DC" : "#F0E7D9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>{danger ? <Trash2 size={22} color="#C45A48" /> : <Check size={22} color="var(--plum)" />}</div>
      <div className="dc-serif" style={{ fontSize: 17, fontWeight: 700, textAlign: "center" }}>{title}</div>
      {message && <div style={{ fontSize: 12.5, color: "var(--ink-soft)", textAlign: "center", marginTop: 7, lineHeight: 1.6 }}>{message}</div>}
      <div style={{ display: "flex", gap: 9, marginTop: 18 }}>
        <button className="dc-btn" onClick={onClose} style={{ flex: 1, padding: 13, borderRadius: 14, background: "#F0E7D9", color: "var(--ink)", fontSize: 14 }}>취소</button>
        <button className="dc-btn" onClick={() => { onConfirm && onConfirm(); onClose(); }} style={{ flex: 1, padding: 13, borderRadius: 14, background: danger ? "linear-gradient(140deg,#E07A55,#C45A48)" : "linear-gradient(140deg,#6A4C7A,#4D3759)", color: "#fff", fontSize: 14, fontWeight: 700 }}>{confirmLabel || "삭제"}</button>
      </div>
    </div>
  </div>);
}
function Field({ label, value, onChange, placeholder }) { return (<div style={{ marginBottom: 14 }}><label className="dc-label">{label}</label><input className="dc-input" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} /></div>); }
function PrimaryBtn({ onClick, children, tone = "linear-gradient(140deg,#6A4C7A,#4D3759)" }) { return <button className="dc-btn" onClick={onClick} style={{ width: "100%", padding: 15, borderRadius: 16, background: tone, color: "#fff", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>{children}</button>; }
function Empty({ msg }) { return <div style={{ textAlign: "center", color: "var(--ink-soft)", fontSize: 13, padding: "40px 0", lineHeight: 1.7 }}>{msg}</div>; }
function Row({ icon, label, value }) { return <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", background: "#FFFDF8", border: "1px solid var(--line)", borderRadius: 14 }}><div style={{ color: "var(--plum)" }}>{icon}</div><div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{label}</div><div style={{ marginLeft: "auto", fontSize: 13.5, fontWeight: 700 }}>{value}</div></div>; }
// module-scope auth input (avoids focus-loss remount bug)
function AuthInput({ icon, ...props }) { return (<div style={{ position: "relative", marginBottom: 12 }}><span style={{ position: "absolute", left: 14, top: 14, color: "rgba(255,255,255,.7)" }}>{icon}</span><input className="dc-auth-in" {...props} /></div>); }

/* ============================================================
   AUTH — 로그인 / 가입+이메일인증 / 비밀번호 재설정
   ============================================================ */
function SearchBox({ value, onChange, placeholder }) {
  return (<div style={{ position: "relative", marginBottom: 10 }}><span style={{ position: "absolute", left: 12, top: 12, color: "var(--ink-soft)" }}><Search size={15} /></span><input className="dc-input" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ paddingLeft: 36 }} />{value && <button className="dc-btn" onClick={() => onChange("")} style={{ position: "absolute", right: 8, top: 8, background: "#F0E7D9", borderRadius: 8, padding: 5 }}><X size={13} color="#8C8493" /></button>}</div>);
}
function Chips({ options, value, onChange }) {
  return (<div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>{options.map(o => <button key={o.v} className="dc-btn" onClick={() => onChange(o.v)} style={{ padding: "6px 12px", borderRadius: 999, fontSize: 12, background: value === o.v ? "var(--plum)" : "#fff", color: value === o.v ? "#fff" : "var(--ink-soft)", border: "1px solid var(--line)" }}>{o.label}</button>)}</div>);
}
function MoreBtn({ onClick, remaining }) {
  return <button className="dc-btn" onClick={onClick} style={{ width: "100%", padding: 12, borderRadius: 14, background: "#F0E7D9", color: "var(--plum)", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><ChevronDown size={15} /> {remaining}명 더 보기</button>;
}

function AuthScreen({ data, onLogin, onSignup, onReset }) {
  const [mode, setMode] = useState("login"); // login|choose|signup|verify|forgot|reset
  const [signRole, setSignRole] = useState(null);
  const [pending, setPending] = useState(null);   // {role, form, code}
  const [reset, setResetState] = useState(null);   // {email, code}
  const [email, setEmail] = useState(""); const [pw, setPw] = useState("");
  const [code, setCode] = useState(""); const [newPw, setNewPw] = useState("");
  const [err, setErr] = useState(""); const [notice, setNotice] = useState(""); const [remember, setRemember] = useState(true);

  const tryLogin = () => {
    const acc = data.accounts.find(a => a.email === email.trim().toLowerCase() && a.password === pw);
    if (!acc) { setErr("이메일 또는 비밀번호가 올바르지 않아요."); return; }
    if (!acc.verified) { setErr("이메일 인증이 완료되지 않은 계정이에요."); return; }
    onLogin(acc.id, remember);
  };

  const goVerify = (role, form) => { setPending({ role, form, code: gen6() }); setCode(""); setErr(""); setMode("verify"); };
  const confirmVerify = () => {
    if (code.trim() !== pending.code) { setErr("인증코드가 일치하지 않아요."); return; }
    onSignup(pending.role, pending.form); // 계정 생성 + 자동 로그인
  };

  const startForgot = () => { setEmail(""); setErr(""); setNotice(""); setMode("forgot"); };
  const sendReset = () => {
    const acc = data.accounts.find(a => a.email === email.trim().toLowerCase());
    if (!acc) { setErr("가입된 이메일을 찾을 수 없어요."); return; }
    setResetState({ email: acc.email, code: gen6() }); setCode(""); setNewPw(""); setErr(""); setMode("reset");
  };
  const confirmReset = () => {
    if (code.trim() !== reset.code) { setErr("인증코드가 일치하지 않아요."); return; }
    if (newPw.length < 4) { setErr("비밀번호는 4자 이상 입력해주세요."); return; }
    onReset(reset.email, newPw); setNotice("비밀번호가 변경되었어요. 새 비밀번호로 로그인하세요."); setMode("login"); setPw("");
  };

  const DemoCode = ({ value }) => (
    <div style={{ background: "rgba(255,255,255,.12)", border: "1px dashed rgba(255,255,255,.4)", borderRadius: 14, padding: 14, marginBottom: 16, textAlign: "center" }}>
      <div style={{ fontSize: 11.5, opacity: .8, marginBottom: 6 }}>📧 데모 — 실제 서비스에선 이메일/문자로 전송됩니다</div>
      <div className="dc-fr" style={{ fontSize: 28, fontWeight: 600, letterSpacing: "6px" }}>{value}</div>
    </div>
  );

  return (
    <div className="dc-auth">
      <div style={{ paddingTop: 52, textAlign: "center" }}>
        <div style={{ width: 72, height: 72, margin: "0 auto 14px", borderRadius: 24, background: "linear-gradient(140deg,#EE9573,#E07A55)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 16px 40px -10px rgba(238,149,115,.6)", animation: "floaty 4s ease-in-out infinite" }}><Music2 size={34} color="#fff" /></div>
        <div className="dc-fr" style={{ fontSize: 28, fontWeight: 600, fontStyle: "italic" }}>LessonNote</div>
        <div style={{ fontSize: 12.5, opacity: .8, marginTop: 3 }}>음악학원 통합 소통 플랫폼 · 레슨노트</div>
      </div>

      {mode === "login" && (
        <div style={{ marginTop: 30, paddingBottom: 30 }}>
          {notice && <div style={{ fontSize: 12.5, color: "#BFE6D2", marginBottom: 12, textAlign: "center" }}>{notice}</div>}
          <AuthInput icon={<Mail size={16} />} type="email" placeholder="이메일" value={email} onChange={e => { setEmail(e.target.value); setErr(""); }} />
          <AuthInput icon={<Lock size={16} />} type="password" placeholder="비밀번호" value={pw} onChange={e => { setPw(e.target.value); setErr(""); }} />
          {err && <div style={{ fontSize: 12, color: "#FBC9BC", marginBottom: 10 }}>{err}</div>}
          <button className="dc-btn" onClick={() => setRemember(r => !r)} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", color: "rgba(255,255,255,.9)", fontSize: 13, marginBottom: 12, padding: 2 }}><span style={{ width: 20, height: 20, borderRadius: 6, border: "2px solid rgba(255,255,255,.6)", background: remember ? "#EE9573" : "transparent", borderColor: remember ? "#EE9573" : "rgba(255,255,255,.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>{remember && <Check size={13} color="#fff" />}</span> 자동 로그인 (다음 접속 시 자동 입장)</button>
          <button className="dc-btn" onClick={tryLogin} style={{ width: "100%", padding: 15, borderRadius: 16, background: "#fff", color: "var(--plum-deep)", fontSize: 15, marginTop: 4 }}>로그인</button>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 13 }}>
            <button className="dc-btn" onClick={startForgot} style={{ background: "none", color: "rgba(255,255,255,.85)" }}>비밀번호를 잊으셨나요?</button>
            <button className="dc-btn" onClick={() => { setErr(""); setMode("choose"); }} style={{ background: "none", color: "#FBD9C9", display: "flex", alignItems: "center", gap: 5 }}><UserPlus size={14} /> 회원가입</button>
          </div>
          <div style={{ marginTop: 26, padding: 14, borderRadius: 16, background: "rgba(255,255,255,.10)", border: "1px solid rgba(255,255,255,.18)" }}>
            <div style={{ fontSize: 12, opacity: .85, marginBottom: 10, textAlign: "center" }}>👇 데모 계정으로 바로 체험하기</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[["a_dir", "원장", Shield], ["a_tea", "강사", Music2], ["a_par", "학부모", User]].map(([id, label, I]) => (
                <button key={id} className="dc-btn" onClick={() => onLogin(id, remember)} style={{ flex: 1, padding: "11px 0", borderRadius: 13, background: "rgba(255,255,255,.16)", color: "#fff", fontSize: 12.5, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}><I size={17} />{label}</button>
              ))}
            </div>
            <div style={{ fontSize: 10.5, opacity: .65, marginTop: 9, textAlign: "center" }}>학부모 데모 계정은 자녀 2명(승경·도윤)이 연결돼 있어요</div>
          </div>
        </div>
      )}

      {mode === "choose" && (
        <div style={{ marginTop: 30, paddingBottom: 30 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, textAlign: "center" }}>어떤 회원으로 가입할까요?</div>
          {[["admin", "원장 · 새 학원 개설", "학원을 만들고 강사·학생을 관리해요", Shield, "#EE9573"], ["teacher", "강사로 합류", "초대코드로 학원에 합류해요", Music2, "#8FB4CB"], ["parent", "학부모로 합류", "초대코드로 자녀와 연결해요", User, "#C2548A"]].map(([r, t, s, I, c]) => (
            <button key={r} className="dc-btn" onClick={() => { setSignRole(r); setErr(""); setMode("signup"); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 13, padding: 15, borderRadius: 16, background: "rgba(255,255,255,.10)", border: "1px solid rgba(255,255,255,.2)", color: "#fff", marginBottom: 11, textAlign: "left" }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: c, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><I size={20} /></div>
              <div style={{ flex: 1 }}><div style={{ fontSize: 14.5, fontWeight: 700 }}>{t}</div><div style={{ fontSize: 12, opacity: .8 }}>{s}</div></div><ChevronRight size={18} />
            </button>
          ))}
          <button className="dc-btn" onClick={() => setMode("login")} style={{ width: "100%", padding: 13, background: "transparent", color: "rgba(255,255,255,.8)", fontSize: 13, marginTop: 6 }}>← 로그인으로 돌아가기</button>
        </div>
      )}

      {mode === "signup" && <SignupForm role={signRole} data={data} onBack={() => setMode("choose")} onValid={(form) => goVerify(signRole, form)} />}

      {mode === "verify" && pending && (
        <div style={{ marginTop: 30, paddingBottom: 30 }}>
          <div style={{ textAlign: "center", marginBottom: 18 }}><MailCheck size={40} style={{ marginBottom: 8 }} /><div className="dc-serif" style={{ fontSize: 18, fontWeight: 700 }}>이메일 인증</div><div style={{ fontSize: 12.5, opacity: .8, marginTop: 4 }}>{pending.form.email} 로 보낸<br />6자리 인증코드를 입력해주세요</div></div>
          <DemoCode value={pending.code} />
          <AuthInput icon={<ShieldCheck size={16} />} inputMode="numeric" placeholder="인증코드 6자리" value={code} onChange={e => { setCode(e.target.value); setErr(""); }} />
          {err && <div style={{ fontSize: 12, color: "#FBC9BC", marginBottom: 10 }}>{err}</div>}
          <button className="dc-btn" onClick={confirmVerify} style={{ width: "100%", padding: 15, borderRadius: 16, background: "#fff", color: "var(--plum-deep)", fontSize: 15 }}>인증하고 시작하기</button>
          <button className="dc-btn" onClick={() => { setErr(""); setMode("signup"); }} style={{ width: "100%", padding: 13, background: "transparent", color: "rgba(255,255,255,.8)", fontSize: 13, marginTop: 8 }}>← 정보 다시 입력</button>
        </div>
      )}

      {mode === "forgot" && (
        <div style={{ marginTop: 30, paddingBottom: 30 }}>
          <div style={{ textAlign: "center", marginBottom: 18 }}><KeyRound size={38} style={{ marginBottom: 8 }} /><div className="dc-serif" style={{ fontSize: 18, fontWeight: 700 }}>비밀번호 재설정</div><div style={{ fontSize: 12.5, opacity: .8, marginTop: 4 }}>가입한 이메일로 인증코드를 보내드려요</div></div>
          <AuthInput icon={<Mail size={16} />} type="email" placeholder="이메일" value={email} onChange={e => { setEmail(e.target.value); setErr(""); }} />
          {err && <div style={{ fontSize: 12, color: "#FBC9BC", marginBottom: 10 }}>{err}</div>}
          <button className="dc-btn" onClick={sendReset} style={{ width: "100%", padding: 15, borderRadius: 16, background: "#fff", color: "var(--plum-deep)", fontSize: 15 }}>인증코드 받기</button>
          <button className="dc-btn" onClick={() => { setErr(""); setMode("login"); }} style={{ width: "100%", padding: 13, background: "transparent", color: "rgba(255,255,255,.8)", fontSize: 13, marginTop: 8 }}>← 로그인으로</button>
        </div>
      )}

      {mode === "reset" && reset && (
        <div style={{ marginTop: 30, paddingBottom: 30 }}>
          <div style={{ textAlign: "center", marginBottom: 16 }}><div className="dc-serif" style={{ fontSize: 18, fontWeight: 700 }}>새 비밀번호 설정</div><div style={{ fontSize: 12.5, opacity: .8, marginTop: 4 }}>{reset.email}</div></div>
          <DemoCode value={reset.code} />
          <AuthInput icon={<ShieldCheck size={16} />} inputMode="numeric" placeholder="인증코드 6자리" value={code} onChange={e => { setCode(e.target.value); setErr(""); }} />
          <AuthInput icon={<Lock size={16} />} type="password" placeholder="새 비밀번호" value={newPw} onChange={e => { setNewPw(e.target.value); setErr(""); }} />
          {err && <div style={{ fontSize: 12, color: "#FBC9BC", marginBottom: 10 }}>{err}</div>}
          <button className="dc-btn" onClick={confirmReset} style={{ width: "100%", padding: 15, borderRadius: 16, background: "#fff", color: "var(--plum-deep)", fontSize: 15 }}>비밀번호 변경</button>
        </div>
      )}
    </div>
  );
}

function SignupForm({ role, data, onBack, onValid }) {
  const [f, setF] = useState({ name: "", email: "", pw: "", academy: "", tagline: "", subject: "피아노", code: "", studentIds: [] });
  const [err, setErr] = useState("");
  const set = (k, v) => { setF(s => ({ ...s, [k]: v })); setErr(""); };
  const toggleChild = (sid) => setF(s => ({ ...s, studentIds: s.studentIds.includes(sid) ? s.studentIds.filter(x => x !== sid) : [...s.studentIds, sid] }));

  const matchedAcademy = Object.values(data.academies).find(a => a.inviteCode.toUpperCase() === f.code.trim().toUpperCase());
  const academyStudents = matchedAcademy ? data.students.filter(s => s.academyId === matchedAcademy.id) : [];

  const submit = () => {
    if (!f.name.trim() || !f.email.trim() || !f.pw.trim()) { setErr("이름·이메일·비밀번호를 입력해주세요."); return; }
    if (data.accounts.find(a => a.email === f.email.trim().toLowerCase())) { setErr("이미 가입된 이메일이에요."); return; }
    if (f.pw.length < 4) { setErr("비밀번호는 4자 이상이어야 해요."); return; }
    if (role === "admin" && !f.academy.trim()) { setErr("학원 이름을 입력해주세요."); return; }
    if (role !== "admin") {
      if (!matchedAcademy) { setErr("유효한 초대코드를 입력해주세요."); return; }
      if (role === "parent" && f.studentIds.length === 0) { setErr("연결할 자녀를 1명 이상 선택해주세요."); return; }
    }
    onValid({ ...f, email: f.email.trim().toLowerCase() });
  };

  return (
    <div style={{ marginTop: 26, paddingBottom: 30 }}>
      <div className="dc-serif" style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>{role === "admin" ? "새 학원 개설" : role === "teacher" ? "강사 가입" : "학부모 가입"}</div>
      {role === "admin" && (<><AuthInput icon={<Building2 size={16} />} placeholder="학원 이름 (예: 랩뮤직연세)" value={f.academy} onChange={e => set("academy", e.target.value)} /><AuthInput icon={<Sparkles size={16} />} placeholder="학원 슬로건 (예: 함께 자라는 음악 시간)" value={f.tagline} onChange={e => set("tagline", e.target.value)} /><div style={{ height: 6 }} /></>)}
      {role !== "admin" && <AuthInput icon={<KeyRound size={16} />} placeholder="학원 초대코드 (예: LN-DACAPO)" value={f.code} onChange={e => set("code", e.target.value)} />}
      {role !== "admin" && f.code && <div style={{ fontSize: 12, marginBottom: 12, color: matchedAcademy ? "#BFE6D2" : "#FBC9BC" }}>{matchedAcademy ? `✓ ${matchedAcademy.name} 학원을 찾았어요!` : "해당 코드의 학원을 찾을 수 없어요."}</div>}
      <AuthInput icon={<User size={16} />} placeholder={role === "admin" ? "원장 이름" : role === "teacher" ? "강사 이름" : "학부모 이름"} value={f.name} onChange={e => set("name", e.target.value)} />
      {role === "teacher" && <AuthInput icon={<Music2 size={16} />} placeholder="담당 과목 (예: 피아노)" value={f.subject} onChange={e => set("subject", e.target.value)} />}
      {role === "parent" && matchedAcademy && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, opacity: .85, marginBottom: 8 }}>연결할 자녀 선택 (여러 명 가능)</div>
          {academyStudents.length === 0 && <div style={{ fontSize: 12, color: "#FBC9BC" }}>아직 등록된 학생이 없어요. 원장님께 등록을 요청하세요.</div>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{academyStudents.map(s => { const on = f.studentIds.includes(s.id); return <button key={s.id} className="dc-btn" onClick={() => toggleChild(s.id)} style={{ padding: "9px 13px", borderRadius: 12, background: on ? "#EE9573" : "rgba(255,255,255,.12)", color: "#fff", fontSize: 13, border: "1px solid rgba(255,255,255,.2)", display: "flex", alignItems: "center", gap: 5 }}>{on && <Check size={13} />}{s.avatar} {s.name}</button>; })}</div>
        </div>
      )}
      <AuthInput icon={<Mail size={16} />} type="email" placeholder="이메일" value={f.email} onChange={e => set("email", e.target.value)} />
      <AuthInput icon={<Lock size={16} />} type="password" placeholder="비밀번호 (4자 이상)" value={f.pw} onChange={e => set("pw", e.target.value)} />
      {err && <div style={{ fontSize: 12, color: "#FBC9BC", marginBottom: 10 }}>{err}</div>}
      <button className="dc-btn" onClick={submit} style={{ width: "100%", padding: 15, borderRadius: 16, background: "#fff", color: "var(--plum-deep)", fontSize: 15, marginTop: 4 }}>인증코드 받기</button>
      <button className="dc-btn" onClick={onBack} style={{ width: "100%", padding: 13, background: "transparent", color: "rgba(255,255,255,.8)", fontSize: 13, marginTop: 8 }}>← 뒤로</button>
    </div>
  );
}

/* ============================================================
   1. 알림장
   ============================================================ */
function MediaViewer({ list, index, onClose }) {
  const items = (list || []).filter(m => m.url);
  const [i, setI] = useState(index || 0);
  if (!items.length) return null;
  const cur = Math.max(0, Math.min(i, items.length - 1));
  const m = items[cur];
  const go = (d) => setI(v => (((v + d) % items.length) + items.length) % items.length);
  const save = async () => {
    const fname = m.name || (m.t === "video" ? "lessonnote-video.mp4" : "lessonnote-photo.jpg");
    try {
      const res = await fetch(m.url); const blob = await res.blob();
      const file = new File([blob], fname, { type: blob.type || (m.t === "video" ? "video/mp4" : "image/jpeg") });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return; }
      const u = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = u; a.download = fname; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
    } catch (e) { try { window.open(m.url, "_blank"); } catch (e2) { } }
  };
  const navBtn = { position: "absolute", top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,.16)", color: "#fff", borderRadius: "50%", width: 42, height: 42, display: "flex", alignItems: "center", justifyContent: "center" };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(18,14,22,.94)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <button className="dc-btn" onClick={(e) => { e.stopPropagation(); save(); }} style={{ position: "absolute", top: 16, left: 16, background: "rgba(255,255,255,.16)", color: "#fff", borderRadius: 12, padding: "9px 13px", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}><Download size={17} /> 저장</button>
      <button className="dc-btn" onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,.16)", color: "#fff", borderRadius: 12, padding: 9 }}><X size={20} /></button>
      {items.length > 1 && <button className="dc-btn" onClick={(e) => { e.stopPropagation(); go(-1); }} style={{ ...navBtn, left: 10 }}><ChevronLeft size={22} /></button>}
      {items.length > 1 && <button className="dc-btn" onClick={(e) => { e.stopPropagation(); go(1); }} style={{ ...navBtn, right: 10 }}><ChevronRight size={22} /></button>}
      <div onClick={e => e.stopPropagation()} style={{ maxWidth: "92%", maxHeight: "82%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {m.t === "video"
          ? <video key={m.url} src={m.url} controls autoPlay playsInline style={{ maxWidth: "100%", maxHeight: "82vh", borderRadius: 12, background: "#000" }} />
          : <img src={m.url} alt="" style={{ maxWidth: "100%", maxHeight: "82vh", borderRadius: 12, objectFit: "contain" }} />}
      </div>
      {items.length > 1 && <div style={{ position: "absolute", bottom: 18, left: 0, right: 0, textAlign: "center", color: "#fff", fontSize: 12.5, opacity: .85 }}>{cur + 1} / {items.length}</div>}
    </div>
  );
}
function DiaryView({ data, student, canEdit, defaultTeacherId, me, api }) {
  const [compose, setCompose] = useState(false);
  const [openComments, setOpenComments] = useState(null);
  const [viewer, setViewer] = useState(null);
  const [dq, setDq] = useState(""); const [limit, setLimit] = useState(8);
  const tName = id => (data.teachers.find(t => t.id === id) || {}).name || "선생님";
  const all = data.diary.filter(d => d.studentId === student.id);
  const q = dq.trim();
  const filtered = q ? all.filter(d => (d.title || "").includes(q) || (d.text || "").includes(q) || tName(d.teacherId).includes(q)) : all;
  const entries = filtered.slice(0, limit);
  return (
    <div>
      <ViewTitle icon={<Home size={15} />} kr="알림장" en="Daily Note" sub={`${student.name} 학생의 하루를 사진·영상으로 만나보세요`} />
      {all.length > 5 && <SearchBox value={dq} onChange={v => { setDq(v); setLimit(8); }} placeholder="제목·내용·선생님 검색" />}
      {q && <div style={{ fontSize: 12, color: "var(--ink-soft)", margin: "0 4px 10px" }}>‘{q}’ 검색 결과 {filtered.length}개</div>}
      {all.length === 0 && <Empty msg="아직 등록된 알림장이 없어요." />}
      {all.length > 0 && filtered.length === 0 && <Empty msg="검색 결과가 없어요." />}
      {entries.map((en, i) => { const cs = en.commentList || []; const ccount = cs.length + cs.reduce((a, c) => a + ((c.replies || []).length), 0); const isOpen = openComments === en.id; const isAdminAuthor = en.authorRole === "admin"; const authorLabel = isAdminAuthor ? `${en.authorName || "원장"} 원장님` : (en.authorRole === "teacher" ? `${en.authorName || tName(en.teacherId)} 선생님` : `${tName(en.teacherId)} 선생님`); return (
        <div key={en.id} className="dc-card dc-enter" style={{ padding: 16, marginBottom: 16, animationDelay: `${Math.min(i, 6) * 0.05}s` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 13, background: "linear-gradient(140deg,#6A4C7A,#4D3759)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>{isAdminAuthor ? <Shield size={17} /> : <Music2 size={17} />}</div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 13.5, fontWeight: 700 }}>{authorLabel}</div><div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>{en.ts ? `${fmtDay(en.ts)} ${fmtClock(en.ts)}` : en.date}</div></div>
            {canEdit ? <button className="dc-btn" onClick={() => api.confirm({ title: "알림장을 삭제할까요?", message: en.title, onConfirm: () => api.deleteDiary(en.id) })} style={{ background: "#FBE0DC", borderRadius: 10, padding: 7 }}><Trash2 size={15} color="#C45A48" /></button> : <Tag bg="#F3E2D3" color="#B5683F">알림장</Tag>}
          </div>
          <div className="dc-serif" style={{ fontSize: 16, fontWeight: 700, marginBottom: 7, lineHeight: 1.4 }}>{en.title}</div>
          <div style={{ fontSize: 13, color: "#544c5c", lineHeight: 1.7, marginBottom: 13 }}>{en.text}</div>
          {en.media.length > 0 && <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(en.media.length, 3)},1fr)`, gap: 8, marginBottom: 13 }}>{en.media.map((m, j) => (<div key={j} onClick={() => m.url && setViewer({ list: en.media, i: j })} className="dc-thumb" style={{ background: m.url ? "#000" : MEDIA_HUES[m.h], overflow: "hidden", cursor: m.url ? "pointer" : "default" }}>{m.url ? (m.t === "video" ? <video src={m.url} muted playsInline preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <img src={m.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />) : <span>{m.e}</span>}{m.t === "video" && <div className="dc-play"><span><Play size={15} fill="#6A4C7A" color="#6A4C7A" /></span></div>}<div style={{ position: "absolute", top: 6, left: 6 }}>{m.t === "video" ? <Video size={13} color="#fff" /> : <Camera size={13} color="#fff" />}</div></div>))}</div>}
          <div style={{ display: "flex", gap: 18, alignItems: "center", paddingTop: 11, borderTop: "1px solid var(--line)" }}>
            <button className="dc-btn" onClick={() => api.toggleLike(en.id)} style={{ background: "none", display: "flex", alignItems: "center", gap: 6, color: en.liked ? "var(--coral-deep)" : "var(--ink-soft)", fontSize: 12.5 }}><Heart size={17} fill={en.liked ? "#E07A55" : "none"} /> {en.likes}</button>
            <button className="dc-btn" onClick={() => setOpenComments(isOpen ? null : en.id)} style={{ background: "none", display: "flex", alignItems: "center", gap: 6, color: isOpen ? "var(--plum)" : "var(--ink-soft)", fontSize: 12.5 }}><MessageSquare size={16} /> 댓글 {ccount}</button>
            <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: 4 }}><CheckCheck size={14} color="#6FAE93" /> 읽음</span>
          </div>
          {isOpen && <CommentSection entry={en} me={me} api={api} />}
        </div>
      ); })}
      {filtered.length > limit && <button className="dc-btn" onClick={() => setLimit(l => l + 10)} style={{ width: "100%", padding: 13, borderRadius: 14, background: "#F0E7D9", color: "var(--plum)", fontSize: 13.5, fontWeight: 700, marginBottom: 8 }}>더보기 ({filtered.length - limit}개 남음)</button>}
      {canEdit && <button className="dc-fab dc-btn" onClick={() => setCompose(true)}><Plus size={26} /></button>}
      {compose && <ComposeDiary student={student} defaultTeacherId={defaultTeacherId} me={me} onSave={(e) => { api.addDiary(e); setCompose(false); }} onClose={() => setCompose(false)} />}
      {viewer && <MediaViewer list={viewer.list} index={viewer.i} onClose={() => setViewer(null)} />}
    </div>
  );
}
function CommentBubble({ c, canManage, onEdit, onDelete, onReply }) {
  const [editing, setEditing] = useState(false); const [val, setVal] = useState(c.text);
  return (
    <div style={{ flex: 1, background: "#F8F1E6", borderRadius: 12, padding: "8px 11px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ fontSize: 12, fontWeight: 700, flex: 1 }}>{c.name} <span style={{ fontSize: 10.5, color: "var(--ink-soft)", fontWeight: 400 }}>· {BY_LABEL[c.by]} · {c.time}{c.edited ? " (수정됨)" : ""}</span></div>
        {canManage && !editing && <button className="dc-btn" onClick={() => { setVal(c.text); setEditing(true); }} style={{ background: "none", padding: 2, color: "var(--ink-soft)" }}><Pencil size={13} /></button>}
        {canManage && !editing && <button className="dc-btn" onClick={onDelete} style={{ background: "none", padding: 2, color: "#C9A0A0" }}><Trash2 size={13} /></button>}
      </div>
      {editing ? (
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          <input value={val} onChange={e => setVal(e.target.value)} style={{ flex: 1, border: "1px solid var(--line)", borderRadius: 10, padding: "7px 10px", fontSize: 13, fontFamily: "inherit", outline: "none" }} />
          <button className="dc-btn" onClick={() => { if (val.trim()) { onEdit(val.trim()); setEditing(false); } }} style={{ background: "var(--plum)", color: "#fff", borderRadius: 10, padding: "0 12px", fontSize: 12.5 }}>저장</button>
          <button className="dc-btn" onClick={() => setEditing(false)} style={{ background: "#EFE6D8", color: "var(--ink-soft)", borderRadius: 10, padding: "0 10px", fontSize: 12.5 }}>취소</button>
        </div>
      ) : (<>
        <div style={{ fontSize: 13, color: "#544c5c", marginTop: 2, lineHeight: 1.5 }}>{c.text}</div>
        {onReply && <button className="dc-btn" onClick={onReply} style={{ background: "none", padding: "4px 0 0", color: "var(--plum)", fontSize: 11.5 }}>답글</button>}
      </>)}
    </div>
  );
}
function CommentSection({ entry, me, api }) {
  const [ctext, setCtext] = useState("");
  const [replyTo, setReplyTo] = useState(null); const [rtext, setRtext] = useState("");
  const cs = entry.commentList || [];
  const myBy = me.role === "parent" ? "parent" : me.role === "teacher" ? "teacher" : "director";
  const mine = (x) => x.aid === me.id || me.role === "admin";
  const Avatar = ({ by, sz = 28 }) => <div style={{ width: sz, height: sz, borderRadius: 9, flexShrink: 0, background: by === "teacher" ? "#6A4C7A" : by === "director" ? "#4D3759" : "#C2548A", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>{(BY_LABEL[by] || "")[0]}</div>;
  const addC = () => { const t = ctext.trim(); if (!t) return; api.addComment(entry.id, { aid: me.id, by: myBy, name: me.name, text: t, time: hhmm(), replies: [] }); setCtext(""); };
  const addR = (ci) => { const t = rtext.trim(); if (!t) return; api.addReply(entry.id, ci, { aid: me.id, by: myBy, name: me.name, text: t, time: hhmm() }); setRtext(""); setReplyTo(null); };
  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
      {cs.length === 0 && <div style={{ fontSize: 12.5, color: "var(--ink-soft)", textAlign: "center", padding: "6px 0 12px" }}>첫 댓글을 남겨보세요.</div>}
      {cs.map((c, ci) => (
        <div key={ci} style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 9 }}>
            <Avatar by={c.by} />
            <CommentBubble c={c} canManage={mine(c)} onEdit={(t) => api.editComment(entry.id, ci, t)} onDelete={() => api.deleteComment(entry.id, ci)} onReply={() => { setReplyTo(replyTo === ci ? null : ci); setRtext(""); }} />
          </div>
          {(c.replies || []).map((r, ri) => (
            <div key={ri} style={{ display: "flex", gap: 8, marginTop: 8, marginLeft: 30 }}>
              <CornerDownRight size={14} color="#C9BEAF" style={{ marginTop: 8, flexShrink: 0 }} />
              <Avatar by={r.by} sz={24} />
              <CommentBubble c={r} canManage={mine(r)} onEdit={(t) => api.editReply(entry.id, ci, ri, t)} onDelete={() => api.deleteReply(entry.id, ci, ri)} />
            </div>
          ))}
          {replyTo === ci && (
            <div style={{ display: "flex", gap: 6, marginTop: 8, marginLeft: 30 }}>
              <input value={rtext} onChange={e => setRtext(e.target.value)} onKeyDown={e => e.key === "Enter" && addR(ci)} placeholder="답글 입력…" style={{ flex: 1, border: "1px solid var(--line)", borderRadius: 12, padding: "8px 11px", fontSize: 12.5, fontFamily: "inherit", outline: "none" }} />
              <button className="dc-btn" onClick={() => addR(ci)} style={{ background: "linear-gradient(140deg,#6A4C7A,#4D3759)", color: "#fff", borderRadius: 12, padding: "0 13px", fontSize: 12.5 }}>등록</button>
            </div>
          )}
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
        <input value={ctext} onChange={e => setCtext(e.target.value)} onKeyDown={e => e.key === "Enter" && addC()} placeholder="댓글을 입력하세요…" style={{ flex: 1, border: "1px solid var(--line)", background: "#fff", borderRadius: 14, padding: "10px 13px", fontSize: 13, fontFamily: "inherit", outline: "none" }} />
        <button className="dc-btn" onClick={addC} style={{ width: 40, height: 40, borderRadius: 13, background: "linear-gradient(140deg,#6A4C7A,#4D3759)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Send size={16} /></button>
      </div>
    </div>
  );
}
function ComposeDiary({ student, defaultTeacherId, me, initialText, initialTitle, onSave, onClose }) {
  const [title, setTitle] = useState(initialTitle || ""); const [text, setText] = useState(initialText || ""); const [mediaList, setMediaList] = useState([]);
  const fileRef = useRef(null); const camRef = useRef(null);
  const onPick = async (e) => {
    const files = Array.from(e.target.files || []); e.target.value = "";
    for (const f of files) {
      const lid = uid("m"); const t = f.type.startsWith("video") ? "video" : "photo"; const preview = URL.createObjectURL(f);
      setMediaList(m => [...m, { lid, t, name: f.name, preview, url: "", uploading: true, error: false }]);
      try {
        const res = await uploadMedia(f);
        if (res && res.url) setMediaList(m => m.map(x => x.lid === lid ? { ...x, url: res.url, path: res.path, uploading: false } : x));
        else { const dataUrl = await fileToDataUrl(f); setMediaList(m => m.map(x => x.lid === lid ? { ...x, url: dataUrl, uploading: false } : x)); }
      } catch (err) { setMediaList(m => m.map(x => x.lid === lid ? { ...x, uploading: false, error: true } : x)); }
    }
  };
  const removeMedia = (lid) => setMediaList(m => m.filter(x => x.lid !== lid));
  const anyUploading = mediaList.some(m => m.uploading);
  const save = () => {
    if (!title.trim() || anyUploading) return;
    const media = mediaList.filter(m => m.url && !m.error).map(m => ({ t: m.t, url: m.url, name: m.name, ...(m.path ? { path: m.path } : {}) }));
    const dd = new Date();
    onSave({ id: uid("d"), studentId: student.id, teacherId: defaultTeacherId, authorRole: me && me.role, authorName: me && me.name, authorId: me && me.id, date: `${dd.getMonth() + 1}월 ${dd.getDate()}일`, ts: dd.getTime(), title, text, media, likes: 0, liked: false, commentList: [] });
  };
  const photos = mediaList.filter(m => m.t === "photo").length, vids = mediaList.filter(m => m.t === "video").length;
  const attachBtn = { flex: 1, padding: "13px 0", borderRadius: 14, background: "#F8F1E6", color: "var(--plum)", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, border: "1.5px dashed #D8B79E" };
  return (<Sheet title={`${student.name} 알림장 작성`} onClose={onClose}>
    <Field label="제목" value={title} onChange={setTitle} placeholder="예) 오늘은 체르니 16번을 끝냈어요!" />
    <label className="dc-label">내용</label>
    <textarea className="dc-input" value={text} onChange={e => setText(e.target.value)} placeholder="오늘 수업 내용을 적어주세요" style={{ minHeight: 90, resize: "none", marginBottom: 14 }} />
    <label className="dc-label">사진·영상 첨부 (개수 제한 없음)</label>
    <input ref={fileRef} type="file" accept="image/*,video/*" multiple onChange={onPick} style={{ display: "none" }} />
    <input ref={camRef} type="file" accept="image/*,video/*" capture="environment" onChange={onPick} style={{ display: "none" }} />
    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
      <button className="dc-btn" onClick={() => fileRef.current && fileRef.current.click()} style={attachBtn}><Paperclip size={16} /> 갤러리</button>
      <button className="dc-btn" onClick={() => camRef.current && camRef.current.click()} style={attachBtn}><Camera size={16} /> 카메라 촬영</button>
    </div>
    {mediaList.length > 0 && <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 7, marginBottom: 10 }}>{mediaList.map((m) => (<div key={m.lid} className="dc-thumb" style={{ background: "#000", overflow: "hidden" }}>{m.t === "video" ? <video src={m.preview || m.url} muted playsInline preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <img src={m.preview || m.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}{m.t === "video" && !m.uploading && !m.error && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(255,255,255,.85)", display: "flex", alignItems: "center", justifyContent: "center" }}><Play size={13} fill="#6A4C7A" color="#6A4C7A" /></span></div>}{m.uploading && <div style={{ position: "absolute", inset: 0, background: "rgba(20,16,24,.55)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, fontWeight: 700 }}>올리는 중…</div>}{m.error && <div style={{ position: "absolute", inset: 0, background: "rgba(160,60,48,.7)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, fontWeight: 700 }}>실패</div>}<button className="dc-btn" onClick={() => removeMedia(m.lid)} style={{ position: "absolute", top: 3, right: 3, width: 18, height: 18, borderRadius: "50%", background: "rgba(45,40,51,.6)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}><X size={11} /></button></div>))}</div>}
    {mediaList.length > 0 && <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 14 }}>사진 {photos}장 · 영상 {vids}개{anyUploading ? " · 업로드 중…" : " 첨부됨"}</div>}
    <PrimaryBtn onClick={save} tone={anyUploading ? "#C9BEAF" : undefined}>{anyUploading ? <><Clock size={16} /> 업로드가 끝나면 등록할 수 있어요</> : <><Send size={16} /> 알림장 등록</>}</PrimaryBtn>
  </Sheet>);
}

/* ============================================================
   2. 진도율
   ============================================================ */
function ProgressView({ data, student, canEdit, api }) {
  const [addGoalOpen, setAddGoal] = useState(false); const [addSongFor, setAddSongFor] = useState(null); const [showArchive, setShowArchive] = useState(false);
  const [reportCompose, setReportCompose] = useState(false); const [reportOpen, setReportOpen] = useState(null); const [reportEdit, setReportEdit] = useState(null);
  const reports = (data.reports || []).filter(r => r.studentId === student.id);
  const curYM = ymKey(); const [selYM, setSelYM] = useState(curYM);
  const goals = data.goals.filter(g => g.studentId === student.id);
  const activeGoals = goals.filter(g => g.status !== "archived");
  const archivedGoals = goals.filter(g => g.status === "archived");
  const allItems = goals.flatMap(g => g.items);
  const total = allItems.length; const cumulative = allItems.filter(i => i.done).length;
  const overall = total ? Math.round(cumulative / total * 100) : 0;
  const monthCount = (k) => allItems.filter(i => i.done && i.doneYM === k).length;
  const months = Array.from(new Set([curYM, ...allItems.filter(i => i.done && i.doneYM).map(i => i.doneYM)])).sort().reverse();
  const monthsByYear = months.reduce((acc, k) => { const y = k.split("-")[0]; (acc[y] = acc[y] || []).push(k); return acc; }, {});
  const years = Object.keys(monthsByYear).sort().reverse();
  const isCur = selYM === curYM; const selCount = monthCount(selYM);
  return (
    <div>
      <ViewTitle icon={<TrendingUp size={15} />} kr="진도율" en="Progress" sub={`${student.name}의 진도 · 완료한 곡이 매달 쌓여요`} />
      <div className="dc-card dc-enter" style={{ padding: 18, marginBottom: 14, background: "linear-gradient(150deg,#6A4C7A,#4D3759)", color: "#fff", border: "none" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 }}>
          <div><div style={{ fontSize: 12, opacity: .85 }}>{ymLabel(selYM)} 완료</div><div className="dc-fr" style={{ fontSize: 40, fontWeight: 600, lineHeight: 1 }}>{selCount}<span style={{ fontSize: 16 }}>곡</span></div></div>
          <div style={{ textAlign: "right", fontSize: 12.5, opacity: .92, lineHeight: 1.8 }}><div><Sparkles size={14} style={{ verticalAlign: "-2px" }} /> 누적 <b className="dc-fr" style={{ fontSize: 17 }}>{cumulative}</b>곡</div><div>전체 달성률 {overall}%</div></div>
        </div>
        <div className="dc-bar" style={{ background: "rgba(255,255,255,.22)" }}><div className="dc-bar-fill" style={{ width: `${overall}%`, background: "linear-gradient(90deg,#F4C9AE,#DBA254)" }} /></div>
      </div>

      <div className="dc-card dc-enter" style={{ padding: 16, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: reports.length ? 12 : 0 }}><div className="dc-section-tt" style={{ flex: 1 }}><FileText size={14} /> 개인 평가서 {reports.length > 0 && <Tag bg="#F0E7D9" color="var(--plum)">{reports.length}</Tag>}</div>{canEdit && <button className="dc-btn" onClick={() => setReportCompose(true)} style={{ background: "linear-gradient(140deg,#6A4C7A,#4D3759)", color: "#fff", borderRadius: 10, padding: "7px 12px", fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}><Plus size={14} /> 평가서 작성</button>}</div>
        {reports.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>아직 평가서가 없어요. 학기별 평가서가 여기에 차곡차곡 쌓여요.</div> : reports.map(r => (
          <button key={r.id} className="dc-btn" onClick={() => setReportOpen(r)} style={{ width: "100%", textAlign: "left", background: "#FAF3E8", borderRadius: 12, padding: "11px 13px", marginBottom: 8, display: "flex", alignItems: "center", gap: 11 }}>
            <div style={{ width: 34, height: 34, borderRadius: 11, background: "linear-gradient(140deg,#6A4C7A,#4D3759)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><FileText size={16} /></div>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13.5, fontWeight: 700 }}>{r.term || "평가서"}</div><div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>{r.course || ""} · {r.date}</div></div>
            <ChevronRight size={16} color="var(--ink-soft)" />
          </button>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <CalendarDays size={15} color="var(--plum)" />
        <select className="dc-input" value={selYM} onChange={e => setSelYM(e.target.value)} style={{ flex: 1, marginBottom: 0, appearance: "auto", fontWeight: 700, color: "var(--plum-deep)" }}>{years.map(y => <optgroup key={y} label={`${y}년 (${monthsByYear[y].reduce((a, k) => a + monthCount(k), 0)}곡)`}>{monthsByYear[y].map(k => <option key={k} value={k}>{ymShort(k)}{k === curYM ? " · 이번달" : ""} — {monthCount(k)}곡</option>)}</optgroup>)}</select>
      </div>

      {activeGoals.length === 0 && archivedGoals.length === 0 && <Empty msg="등록된 목표가 없어요." />}
      {!isCur && !activeGoals.some(g => g.items.some(i => i.done && i.doneYM === selYM)) && activeGoals.length > 0 && <Empty msg={`${ymLabel(selYM)}에 완료한 곡이 없어요.`} />}

      {activeGoals.map((g, gi) => {
        const total = g.items.length; const doneAll = g.items.filter(i => i.done).length; const pct = total ? Math.round(doneAll / total * 100) : 0; const allDone = total > 0 && doneAll === total;
        const monthItems = g.items.map((it, idx) => ({ it, idx })).filter(x => x.it.done && x.it.doneYM === selYM);
        const remaining = g.items.map((it, idx) => ({ it, idx })).filter(x => !x.it.done);
        if (!isCur && monthItems.length === 0) return null;
        return (
          <div key={g.id} className="dc-card dc-enter" style={{ padding: 16, marginBottom: 14, animationDelay: `${gi * 0.05}s` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}><div style={{ fontSize: 22 }}>{g.icon}</div><div style={{ flex: 1, minWidth: 0 }}><div className="dc-serif" style={{ fontSize: 15, fontWeight: 700 }}>{g.title}</div><div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>{ymShort(selYM)} <b style={{ color: g.tone }}>+{monthItems.length}곡</b> · 누적 {doneAll}/{total}</div></div><div className="dc-fr" style={{ fontSize: 17, fontWeight: 600, color: g.tone }}>{pct}%</div>{canEdit && isCur && <button className="dc-btn" onClick={() => api.confirm({ title: "목표를 삭제할까요?", message: `${g.title} · 곡 기록도 함께 삭제돼요.`, onConfirm: () => api.deleteGoal(g.id) })} style={{ background: "none", padding: 4 }}><Trash2 size={15} color="#C9BEAF" /></button>}</div>
            <div className="dc-bar" style={{ marginBottom: monthItems.length || (isCur && remaining.length) ? 14 : 0 }}><div className="dc-bar-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg,${g.tone},#DBA254)` }} /></div>

            {monthItems.length > 0 && <>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--mint)", marginBottom: 7, display: "flex", alignItems: "center", gap: 5 }}><CheckCheck size={13} /> {ymShort(selYM)} 완료 {monthItems.length}곡</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: isCur && remaining.length ? 14 : 0 }}>{monthItems.map(({ it, idx }) => (<div key={idx} style={{ display: "flex", alignItems: "center", gap: 9 }}><button className="dc-btn" disabled={!canEdit || !isCur} onClick={() => canEdit && isCur && api.toggleSong(g.id, idx)} style={{ background: "none", padding: 0, display: "flex", alignItems: "center", gap: 10, flex: 1, cursor: canEdit && isCur ? "pointer" : "default" }}><div className="dc-check on">{<Check size={15} color="#fff" />}</div><span style={{ fontSize: 13.5, color: "var(--ink-soft)", textDecoration: "line-through", textAlign: "left" }}>{it.n}</span></button>{canEdit && isCur && <button className="dc-btn" onClick={() => api.deleteSong(g.id, idx)} style={{ background: "none", padding: 2 }}><X size={14} color="#C9BEAF" /></button>}</div>))}</div>
            </>}

            {isCur && remaining.length > 0 && <>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", marginBottom: 7 }}>남은 곡 {remaining.length}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>{remaining.map(({ it, idx }) => (<div key={idx} style={{ display: "flex", alignItems: "center", gap: 9 }}><button className="dc-btn" disabled={!canEdit} onClick={() => canEdit && api.toggleSong(g.id, idx)} style={{ background: "none", padding: 0, display: "flex", alignItems: "center", gap: 10, flex: 1, cursor: canEdit ? "pointer" : "default" }}><div className="dc-check" />{<span style={{ fontSize: 13.5, color: "var(--ink)", textAlign: "left" }}>{it.n}</span>}</button>{canEdit && <button className="dc-btn" onClick={() => api.deleteSong(g.id, idx)} style={{ background: "none", padding: 2 }}><X size={14} color="#C9BEAF" /></button>}</div>))}</div>
            </>}

            {canEdit && isCur && <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button className="dc-btn" onClick={() => setAddSongFor(g.id)} style={{ flex: 1, background: "#F0E7D9", color: "var(--plum)", borderRadius: 12, padding: "9px 0", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><PlusCircle size={15} /> 곡 추가</button>
              <button className="dc-btn" onClick={() => api.archiveGoal(g.id)} style={{ flex: 1, background: allDone ? "#E4F1EA" : "#F8F1E6", color: allDone ? "#3F8267" : "var(--ink-soft)", borderRadius: 12, padding: "9px 0", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Archive size={15} /> 완료 보관</button>
            </div>}
          </div>
        );
      })}
      {!isCur && <div style={{ fontSize: 11.5, color: "var(--ink-soft)", textAlign: "center", marginBottom: 14 }}>지난 달 기록이에요. 곡 완료 체크는 ‘이번달’에서 할 수 있어요.</div>}

      {archivedGoals.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <button className="dc-btn" onClick={() => setShowArchive(v => !v)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", borderRadius: 14, background: "#F4ECDD", color: "var(--plum)", fontSize: 13.5, fontWeight: 700 }}><Archive size={16} /> 완료 보관함 <Tag bg="#fff" color="var(--plum)">{archivedGoals.length}</Tag><span style={{ marginLeft: "auto" }}>{showArchive ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</span></button>
          {showArchive && archivedGoals.map(g => { const dn = g.items.filter(i => i.done).length; return (
            <div key={g.id} className="dc-card" style={{ padding: 15, marginTop: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}><div style={{ fontSize: 20 }}>{g.icon}</div><div style={{ flex: 1, minWidth: 0 }}><div className="dc-serif" style={{ fontSize: 14.5, fontWeight: 700 }}>{g.title}</div><div style={{ fontSize: 11, color: "var(--ink-soft)" }}>{g.archivedYM ? ymLabel(g.archivedYM) + " 보관" : "보관됨"} · {dn}곡 완료</div></div><Tag bg="#E4F1EA" color="#3F8267">완료</Tag>{canEdit && <button className="dc-btn" onClick={() => api.unarchiveGoal(g.id)} style={{ background: "none", padding: 4 }} title="다시 진행"><RotateCcw size={15} color="var(--ink-soft)" /></button>}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>{g.items.map((it, k) => <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--ink-soft)" }}><CheckCheck size={13} color="#6FAE93" /><span style={{ flex: 1 }}>{it.n}</span>{it.doneYM && <span style={{ fontSize: 10.5 }}>{ymShort(it.doneYM)}</span>}</div>)}</div>
            </div>
          ); })}
        </div>
      )}

      {canEdit && isCur && <button className="dc-fab dc-btn" onClick={() => setAddGoal(true)}><Plus size={26} /></button>}
      {reportCompose && <ReportForm student={student} onSave={(v) => { api.addReport({ ...v, studentId: student.id, teacherId: student.teacherId }); setReportCompose(false); }} onClose={() => setReportCompose(false)} />}
      {reportEdit && <ReportForm student={student} initial={reportEdit} onSave={(v) => { api.updateReport(reportEdit.id, v); setReportEdit(null); }} onClose={() => setReportEdit(null)} />}
      {reportOpen && <ReportDetail report={reportOpen} student={student} canEdit={canEdit} onEdit={() => { setReportEdit(reportOpen); setReportOpen(null); }} onDelete={() => { const id = reportOpen.id; api.confirm({ title: "평가서를 삭제할까요?", message: reportOpen.term, onConfirm: () => api.deleteReport(id) }); setReportOpen(null); }} onClose={() => setReportOpen(null)} />}
      {addGoalOpen && <AddGoal onSave={(g) => { api.addGoal({ ...g, studentId: student.id }); setAddGoal(false); }} onClose={() => setAddGoal(false)} />}
      {addSongFor && <AddSong onSave={(n) => { api.addSong(addSongFor, n); setAddSongFor(null); }} onClose={() => setAddSongFor(null)} />}
    </div>
  );
}
function ReportForm({ student, initial, onSave, onClose }) {
  const [term, setTerm] = useState(initial?.term || `${new Date().getFullYear()} ${new Date().getMonth() < 6 ? "상반기" : "하반기"}`);
  const [course, setCourse] = useState(initial?.course || ""); const [books, setBooks] = useState(initial?.books || ""); const [theory, setTheory] = useState(initial?.theory || "");
  const [grades, setGrades] = useState(initial?.grades || {}); const [comment, setComment] = useState(initial?.comment || "");
  return (<Sheet title={initial ? "평가서 수정" : "개인 평가서 작성"} onClose={onClose}>
    <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 12 }}>{student.name} 학생 · 항목을 탭으로 체크하고 의견만 적으면 끝이에요.</div>
    <Field label="학기/회차" value={term} onChange={setTerm} placeholder="예) 2026 상반기" />
    <Field label="과정 (피아노 등)" value={course} onChange={setCourse} placeholder="예) 체르니30 초반" />
    <Field label="병용교재" value={books} onChange={setBooks} placeholder="예) 소나티네, 반주레시피2" />
    <Field label="이론교재" value={theory} onChange={setTheory} placeholder="예) 이론7권, 계이름6권" />
    <label className="dc-label">종합 평가</label>
    <div style={{ marginBottom: 16 }}>{REPORT_ITEMS.map(it => (
      <div key={it} style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{it}</div>
        <div style={{ display: "flex", gap: 5 }}>{GRADES.map(g => <button key={g} className="dc-btn" onClick={() => setGrades(p => ({ ...p, [it]: g }))} style={{ flex: 1, padding: "7px 0", borderRadius: 9, fontSize: 11, fontWeight: grades[it] === g ? 700 : 400, background: grades[it] === g ? GRADE_COLOR[g] : "#fff", color: grades[it] === g ? "#fff" : "var(--ink-soft)", border: "1px solid var(--line)" }}>{g}</button>)}</div>
      </div>
    ))}</div>
    <label className="dc-label">선생님 의견</label>
    <textarea className="dc-input" value={comment} onChange={e => setComment(e.target.value)} placeholder="학생의 성장·태도·앞으로의 방향을 적어주세요" style={{ minHeight: 110, resize: "none", marginBottom: 18 }} />
    <PrimaryBtn onClick={() => term.trim() && onSave({ term: term.trim(), course: course.trim(), books: books.trim(), theory: theory.trim(), grades, comment: comment.trim() })}><Check size={16} /> {initial ? "수정 저장" : "평가서 발행"}</PrimaryBtn>
  </Sheet>);
}
function ReportDetail({ report, student, canEdit, onEdit, onDelete, onClose }) {
  return (<Sheet title="개인 평가서" onClose={onClose}>
    <div style={{ textAlign: "center", marginBottom: 16 }}><div style={{ width: 46, height: 46, borderRadius: 15, background: "linear-gradient(140deg,#6A4C7A,#4D3759)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" }}><FileText size={22} /></div><div className="dc-serif" style={{ fontSize: 19, fontWeight: 700 }}>{report.term}</div><div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{student.name} · {report.date}</div></div>
    <div style={{ background: "#F8F1E6", borderRadius: 13, padding: "12px 14px", marginBottom: 16, fontSize: 12.5, lineHeight: 1.9, color: "#544c5c" }}>
      {report.course && <div><b style={{ color: "var(--ink)" }}>과정</b> · {report.course}</div>}
      {report.books && <div><b style={{ color: "var(--ink)" }}>병용교재</b> · {report.books}</div>}
      {report.theory && <div><b style={{ color: "var(--ink)" }}>이론</b> · {report.theory}</div>}
    </div>
    <label className="dc-label">종합 평가</label>
    <div style={{ marginBottom: 16 }}>{REPORT_ITEMS.filter(it => report.grades && report.grades[it]).map(it => (
      <div key={it} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid var(--line)" }}>
        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 700 }}>{it}</div><div style={{ fontSize: 10.5, color: "var(--ink-soft)" }}>{REPORT_CRIT[it]}</div></div>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", background: GRADE_COLOR[report.grades[it]], borderRadius: 999, padding: "4px 11px", flexShrink: 0 }}>{report.grades[it]}</span>
      </div>
    ))}</div>
    {report.comment && <><label className="dc-label">선생님 의견</label><div className="dc-serif" style={{ fontSize: 13.5, lineHeight: 1.85, color: "#473f52", background: "#FAF3E8", borderRadius: 13, padding: "13px 15px", marginBottom: 16 }}>{report.comment}</div></>}
    {canEdit && <div style={{ display: "flex", gap: 8 }}>
      <button className="dc-btn" onClick={onEdit} style={{ flex: 2, padding: 13, borderRadius: 14, background: "linear-gradient(140deg,#6A4C7A,#4D3759)", color: "#fff", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Pencil size={15} /> 수정</button>
      <button className="dc-btn" onClick={onDelete} style={{ flex: 1, padding: 13, borderRadius: 14, background: "#FBE0DC", color: "#C45A48", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Trash2 size={15} /> 삭제</button>
    </div>}
  </Sheet>);
}
function AddGoal({ onSave, onClose }) { const [title, setTitle] = useState(""); const [icon, setIcon] = useState("🎹"); const [tone, setTone] = useState("#E07A55"); return (<Sheet title="새 진도 목표" onClose={onClose}><Field label="목표 이름" value={title} onChange={setTitle} placeholder="예) 체르니 30번 중반까지 달성" /><label className="dc-label">아이콘</label><div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>{ICONS.map(ic => <button key={ic} className="dc-btn" onClick={() => setIcon(ic)} style={{ fontSize: 20, width: 42, height: 42, borderRadius: 12, background: icon === ic ? "#F3E2D3" : "#fff", border: `2px solid ${icon === ic ? "#E07A55" : "var(--line)"}` }}>{ic}</button>)}</div><label className="dc-label">색상</label><div style={{ display: "flex", gap: 10, marginBottom: 20 }}>{PALETTE.map(c => <button key={c} className="dc-btn" onClick={() => setTone(c)} style={{ width: 34, height: 34, borderRadius: 11, background: c, border: tone === c ? "3px solid #2D2833" : "3px solid transparent" }} />)}</div><PrimaryBtn onClick={() => title.trim() && onSave({ id: uid("g"), title, icon, tone, items: [] })}><Check size={16} /> 목표 추가</PrimaryBtn></Sheet>); }
function AddSong({ onSave, onClose }) { const [n, setN] = useState(""); return (<Sheet title="곡 추가" onClose={onClose}><Field label="곡 이름" value={n} onChange={setN} placeholder="예) 체르니 No.19" /><PrimaryBtn onClick={() => n.trim() && onSave(n)}><Plus size={16} /> 추가</PrimaryBtn></Sheet>); }

/* ============================================================
   3. 시간표
   ============================================================ */
function ScheduleView({ data, student, canEdit, academyTeachers, me, api }) {
  const days = ["월", "화", "수", "목", "금", "토"]; const today = "월";
  const [sel, setSel] = useState(null); const [addOpen, setAdd] = useState(false); const [addCtx, setAddCtx] = useState(null); const [editLesson, setEditLesson] = useState(null);
  const [mode, setMode] = useState(me.role === "parent" ? "personal" : "names");
  const [selTid, setSelTid] = useState(me.role === "teacher" ? me.teacherId : academyTeachers[0]?.id);
  const [allDay, setAllDay] = useState("월");
  const [moveMode, setMoveMode] = useState(false); const [moveSrc, setMoveSrc] = useState(null); const [dragId, setDragId] = useState(null);
  const [kiosk, setKiosk] = useState(false); const [doneNow, setDoneNow] = useState([]); const [composeCtx, setComposeCtx] = useState(null);
  const [pkid, setPkid] = useState("all");
  const [namesDay, setNamesDay] = useState("월"); const [rosterAdd, setRosterAdd] = useState(null); const [rosterEdit, setRosterEdit] = useState(null); const [namesClass, setNamesClass] = useState("all"); const [namesQ, setNamesQ] = useState("");
  const classes = (data.classes || []).filter(c => c.academyId === student.academyId);
  const myKids = me.role === "parent" ? data.students.filter(s => (me.studentIds || []).includes(s.id)) : [];
  const personalKids = myKids.length ? myKids : [student];
  const KID_COLORS = ["#E07A55", "#6A4C7A", "#3F7CA8", "#C2548A", "#5B8C5A"];
  const childColors = Object.fromEntries(personalKids.map((k, i) => [k.id, KID_COLORS[i % KID_COLORS.length]]));
  const openSel = (l) => { setDoneNow([]); setSel(l); };
  const tName = id => (data.teachers.find(t => t.id === id) || {}).name || "?"; const tColor = id => (data.teachers.find(t => t.id === id) || {}).color || "#6A4C7A";
  const sName = id => (data.students.find(s => s.id === id) || {}).name || "?";
  const studentLessons = data.schedule.filter(s => s.studentId === student.id);
  const teacherLessons = data.schedule.filter(l => l.teacherId === selTid);
  const counts = ATT_ORDER.map(a => studentLessons.filter(l => l.att === a).length);
  const scopeIds = new Set(data.students.filter(s => s.academyId === student.academyId && (me.role === "teacher" ? s.teacherId === me.teacherId : true)).map(s => s.id));
  const rosterAll = data.schedule.filter(l => scopeIds.has(l.studentId));
  const teacherStudents = data.students.filter(s => s.academyId === student.academyId && s.teacherId === selTid);
  const modeOptions = me.role === "teacher" ? [["names", "명단"], ["teacher", "내 시간표"], ["roster", "요일별"]] : [["names", "명단"], ["all", "전체"], ["teacher", "강사별"], ["personal", "학생별"], ["roster", "요일별"]];
  const ROW = 26; const PXMIN = ROW / 30;
  const academy = data.academies[student.academyId] || {};
  const openMin = toMin(academy.open || "13:00"); const closeMin = Math.max(openMin + 60, toMin(academy.close || "19:00"));
  const cells = Math.max(1, Math.ceil((closeMin - openMin) / 30)); const trackH = cells * ROW;
  const fmtHM = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
  const Gutter = () => <div style={{ width: 34, position: "relative", height: trackH, flexShrink: 0 }}>{Array.from({ length: cells + 1 }).map((_, i) => <div key={i} style={{ position: "absolute", top: i * ROW - 6, right: 2, fontSize: 9, color: "var(--ink-soft)", fontWeight: (openMin + i * 30) % 60 === 0 ? 700 : 400 }}>{fmtHM(openMin + i * 30)}</div>)}</div>;
  const colBlockClick = (l, dnd) => { if (dnd && moveMode) setMoveSrc(s => (s && s.id === l.id) ? null : l); else openSel(l); };
  const renderTrack = (colDay, colTid, items, variant, dnd, byChild = false, kidColors = {}) => {
    const sorted = [...items].sort((a, b) => toMin(a.time) - toMin(b.time));
    const lanes = []; const packed = sorted.map(it => { const s = toMin(it.time), e = s + (it.dur || 50); let ln = lanes.findIndex(end => end <= s); if (ln < 0) { ln = lanes.length; lanes.push(e); } else lanes[ln] = e; return { it, ln }; }); const lc = Math.max(1, lanes.length);
    return (<>
      {Array.from({ length: cells }).map((_, i) => { const startM = openMin + i * 30; const start = fmtHM(startM); return <div key={"c" + i} onClick={() => { if (dnd && moveMode) { if (moveSrc) { api.updateLesson(moveSrc.id, { day: colDay, time: start, teacherId: colTid }); setMoveSrc(null); } } else if (canEdit) setAddCtx({ day: colDay, start, teacherId: colTid }); }} onDragOver={dnd ? e => { if (dragId) e.preventDefault(); } : undefined} onDrop={dnd ? () => { if (dragId) { api.updateLesson(dragId, { day: colDay, time: start, teacherId: colTid }); setDragId(null); } } : undefined} style={{ position: "absolute", top: i * ROW, left: 0, right: 0, height: ROW - 2, borderRadius: 6, background: (dnd && moveMode && moveSrc) ? "#EFE3D2" : (i % 2 ? "#F7EFE2" : "#F4ECDD"), cursor: (dnd || canEdit) ? "pointer" : "default" }} />; })}
      {packed.map(({ it: l, ln }) => { const top = (toMin(l.time) - openMin) * PXMIN; const h = Math.max(15, (l.dur || 50) * PXMIN - 2); const picked = dnd && ((moveSrc && moveSrc.id === l.id) || dragId === l.id); const bg = byChild ? (kidColors[l.studentId] || "#6A4C7A") : tColor(l.teacherId); return (
        <div key={l.id} draggable={!!dnd} onDragStart={dnd ? () => setDragId(l.id) : undefined} onDragEnd={dnd ? () => setDragId(null) : undefined} onClick={() => colBlockClick(l, dnd)} style={{ position: "absolute", top, height: h, left: `calc(${ln / lc * 100}% + 1px)`, width: `calc(${100 / lc}% - 2px)`, background: `linear-gradient(140deg,${bg},${bg}cc)`, color: "#fff", borderRadius: 8, padding: "3px 5px", fontSize: 10, fontWeight: 700, lineHeight: 1.15, overflow: "hidden", cursor: dnd && moveMode ? "pointer" : (dnd ? "grab" : "pointer"), outline: picked ? "2.5px solid #2D2833" : "none", boxShadow: "0 1px 4px rgba(74,55,89,.22)", opacity: dragId === l.id ? .5 : 1 }}>
          {byChild ? sName(l.studentId) : (variant === "teacher" ? sName(l.studentId) : l.kind.split(" ")[0])}{h > 24 && <div style={{ fontWeight: 400, opacity: .92, fontSize: 8.5 }}>{fmtRange(l.time, l.dur)}</div>}
          <span style={{ position: "absolute", top: 3, right: 3, width: 5, height: 5, borderRadius: "50%", background: ATT[l.att].dot, boxShadow: "0 0 0 1.5px rgba(255,255,255,.6)" }} />
        </div>); })}
    </>);
  };

  const WeekGrid = ({ list, variant, byChild = false, kidColors = {} }) => (
    <>
      <div style={{ display: "flex", gap: 4, marginBottom: 5 }}><div style={{ width: 34, flexShrink: 0 }} />{days.map((d, i) => <div key={d} style={{ flex: 1, textAlign: "center", fontSize: 12, fontWeight: 700, padding: "5px 0", borderRadius: 9, color: d === today ? "#fff" : i === 5 ? "var(--sky)" : "var(--ink)", background: d === today ? "linear-gradient(140deg,#EE9573,#E07A55)" : "transparent" }}>{d}</div>)}</div>
      <div className="dc-card" style={{ padding: 8, display: "flex", gap: 4 }}><Gutter />{days.map(d => <div key={d} style={{ flex: 1, position: "relative", height: trackH }}>{renderTrack(d, variant === "teacher" ? selTid : undefined, list.filter(l => l.day === d), variant, false, byChild, kidColors)}</div>)}</div>
      <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 8, padding: "0 4px" }}>운영 {fmtHM(openMin)}~{fmtHM(closeMin)} · 블록 높이=수업 길이 · {canEdit ? "빈칸을 눌러 추가" : "블록을 눌러 상세"}</div>
    </>
  );

  const AllGrid = () => { const cols = academyTeachers; const dayLessons = data.schedule.filter(l => l.day === allDay && cols.some(t => t.id === l.teacherId)); return (
    <>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, marginBottom: 10 }}>{days.map(d => <button key={d} className="dc-btn" onClick={() => setAllDay(d)} style={{ flexShrink: 0, width: 40, padding: "7px 0", borderRadius: 999, fontSize: 13, fontWeight: allDay === d ? 700 : 400, background: allDay === d ? "linear-gradient(140deg,#EE9573,#E07A55)" : "#fff", color: allDay === d ? "#fff" : "var(--ink)", border: "1px solid var(--line)" }}>{d}</button>)}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}><button className="dc-btn" onClick={() => { setMoveMode(v => !v); setMoveSrc(null); }} style={{ padding: "8px 13px", borderRadius: 12, background: moveMode ? "linear-gradient(140deg,#6A4C7A,#4D3759)" : "#F0E7D9", color: moveMode ? "#fff" : "var(--plum)", fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}><Move size={15} /> {moveMode ? "이동 모드 끄기" : "수업 이동"}</button><span style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>{moveMode ? (moveSrc ? "옮길 칸을 누르세요" : "이동할 수업을 누르세요") : "끌어 옮기거나 ‘수업 이동’을 켜세요"}</span></div>
      <div style={{ display: "flex", gap: 4, marginBottom: 5 }}><div style={{ width: 34, flexShrink: 0 }} />{cols.map(t => <div key={t.id} style={{ flex: 1, minWidth: 70, textAlign: "center", fontSize: 11.5, fontWeight: 700, color: "#fff", background: t.color, borderRadius: 9, padding: "5px 2px" }}>{t.name}</div>)}</div>
      <div className="dc-card" style={{ padding: 8, display: "flex", gap: 4, overflowX: "auto" }}><Gutter />{cols.map(tc => <div key={tc.id} style={{ flex: 1, minWidth: 70, position: "relative", height: trackH }}>{renderTrack(allDay, tc.id, dayLessons.filter(l => l.teacherId === tc.id), "teacher", true)}</div>)}</div>
      <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 8, padding: "0 4px" }}>운영 {fmtHM(openMin)}~{fmtHM(closeMin)} · 빈칸=추가 · 끌기/탭으로 이동</div>
    </>
  ); };

  return (
    <div>
      <ViewTitle icon={<CalendarDays size={15} />} kr="시간표" en="Schedule" sub={mode === "roster" ? "요일별 수업·학생 배치 — 수업을 옮기면 자동 반영" : mode === "all" ? "학원 전체 시간표 · 강사별 한눈에 조정" : mode === "teacher" ? "강사별 주간 시간표" : "13~19시 · 30분 단위, 블록 높이는 수업 길이"} />
      {canEdit && (<div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center" }}><div style={{ display: "flex", gap: 5, flex: 1, background: "#F0E7D9", borderRadius: 14, padding: 4 }}>{modeOptions.map(([k, l]) => <button key={k} className="dc-btn" onClick={() => setMode(k)} style={{ flex: 1, padding: "8px 0", borderRadius: 11, background: mode === k ? "#fff" : "transparent", color: mode === k ? "var(--plum-deep)" : "var(--ink-soft)", fontSize: 12 }}>{l}</button>)}</div><button className="dc-btn" onClick={() => setKiosk(true)} title="출석 키오스크" style={{ background: "linear-gradient(140deg,#6A4C7A,#4D3759)", color: "#fff", borderRadius: 13, padding: "10px 12px", display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 700, flexShrink: 0 }}><Tablet size={15} /> 출석</button></div>)}

      {mode === "personal" && (() => {
        const multi = personalKids.length > 1;
        const shownKids = (multi && pkid !== "all") ? personalKids.filter(k => k.id === pkid) : personalKids;
        const list = data.schedule.filter(l => shownKids.some(k => k.id === l.studentId));
        const byChild = multi && pkid === "all";
        const cnt = ATT_ORDER.map(a => list.filter(l => l.att === a).length);
        return (<>
          {multi && <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, marginBottom: 12 }}>
            <button className="dc-btn" onClick={() => setPkid("all")} style={{ flexShrink: 0, padding: "7px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: pkid === "all" ? 700 : 400, background: pkid === "all" ? "linear-gradient(140deg,#6A4C7A,#4D3759)" : "#fff", color: pkid === "all" ? "#fff" : "var(--ink)", border: "1px solid var(--line)" }}>통합 보기</button>
            {personalKids.map(k => <button key={k.id} className="dc-btn" onClick={() => setPkid(k.id)} style={{ flexShrink: 0, padding: "7px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: pkid === k.id ? 700 : 400, background: pkid === k.id ? childColors[k.id] : "#fff", color: pkid === k.id ? "#fff" : "var(--ink)", border: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: childColors[k.id] }} />{k.name}</button>)}
          </div>}
          <WeekGrid list={list} variant="student" byChild={byChild} kidColors={childColors} />
          {byChild && <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12, padding: "0 4px" }}>{personalKids.map(k => <span key={k.id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: "var(--ink)" }}><span style={{ width: 11, height: 11, borderRadius: 4, background: childColors[k.id] }} /> {k.name}</span>)}</div>}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12, padding: "0 4px" }}>{ATT_ORDER.map(k => <span key={k} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--ink-soft)" }}><span style={{ width: 9, height: 9, borderRadius: "50%", background: ATT[k].dot }} /> {ATT[k].label}</span>)}</div>
          <div className="dc-card" style={{ padding: 14, marginTop: 14 }}><div className="dc-section-tt" style={{ marginBottom: 10 }}><Star size={14} /> 이번 주 출결 현황{multi && pkid === "all" ? " · 자녀 전체" : multi ? ` · ${sName(pkid)}` : ""}</div><div style={{ display: "flex", gap: 8 }}>{ATT_ORDER.map((k, i) => <div key={k} style={{ flex: 1, textAlign: "center", padding: "10px 0", borderRadius: 14, background: "#F8F1E6" }}><div className="dc-fr" style={{ fontSize: 22, fontWeight: 600, color: ATT[k].dot }}>{cnt[i]}</div><div style={{ fontSize: 11, color: "var(--ink-soft)" }}>{ATT[k].label}</div></div>)}</div></div>
        </>);
      })()}

      {mode === "teacher" && (<>
        {me.role === "admin" && <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 4, marginBottom: 12 }}>{academyTeachers.map(t => <button key={t.id} className="dc-btn" onClick={() => setSelTid(t.id)} style={{ flexShrink: 0, padding: "7px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: selTid === t.id ? 700 : 400, background: selTid === t.id ? t.color : "#fff", color: selTid === t.id ? "#fff" : "var(--ink)", border: "1px solid var(--line)" }}>{t.name}</button>)}</div>}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, padding: "0 2px" }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: tColor(selTid) }} /><span className="dc-serif" style={{ fontSize: 15, fontWeight: 700 }}>{tName(selTid)} 선생님</span><span style={{ marginLeft: "auto", fontSize: 12, color: "var(--ink-soft)" }}>주 {teacherLessons.length}회 · 학생 {new Set(teacherLessons.map(l => l.studentId)).size}명</span></div>
        <WeekGrid list={teacherLessons} variant="teacher" />
      </>)}

      {mode === "all" && <AllGrid />}

      {mode === "names" && (() => {
        const times = Array.from({ length: cells }, (_, i) => fmtHM(openMin + i * 30));
        const roster = (data.roster || []).filter(r => r.academyId === student.academyId && r.day === namesDay);
        const nq2 = namesQ.trim();
        const shownClasses = namesClass === "all" ? classes : classes.filter(c => c.id === namesClass);
        const COLW = shownClasses.length === 1 ? Math.max(220, 320) : 158;
        const slotOf = (r) => { const m = toMin(r.time); const idx = Math.min(times.length - 1, Math.max(0, Math.floor((m - openMin) / 30))); return times[idx]; };
        const cellItems = (c, t) => { let arr = c.type === "list" ? roster.filter(r => r.classId === c.id && slotOf(r) === t).sort((a, b) => toMin(a.time) - toMin(b.time)) : roster.filter(r => r.classId === c.id && r.time === t); if (nq2) arr = arr.filter(r => r.name.includes(nq2)); return arr; };
        const dayRoster = roster.filter(r => shownClasses.some(c => c.id === r.classId));
        const presentN = dayRoster.filter(r => r.present).length; const doneN = dayRoster.filter(r => r.done).length; const absentN = dayRoster.filter(r => r.absent).length;
        const Entry = ({ r, showTime }) => (
          <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 2px", borderLeft: r.absent ? "3px solid #E0584A" : "3px solid transparent", paddingLeft: r.absent ? 5 : 2, borderRadius: r.absent ? 4 : 0, background: r.absent ? "rgba(224,88,74,.07)" : "transparent" }}>
            <button className="dc-btn" onClick={() => api.toggleRosterPresent(r.id)} title="출석(등원)" style={{ background: "none", padding: 0, flexShrink: 0 }}><div className={"dc-check" + (r.present ? " on" : "")} style={{ width: 19, height: 19 }}>{r.present && <Check size={13} color="#fff" />}</div></button>
            <button className="dc-btn" onClick={() => api.toggleRosterDone(r.id)} title="레슨 완료" style={{ background: "none", padding: 0, flexShrink: 0 }}><div style={{ width: 19, height: 19, borderRadius: 7, border: `2px solid ${r.done ? "#6A4C7A" : "#D8CCBC"}`, background: r.done ? "#6A4C7A" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>{r.done && <Music2 size={11} color="#fff" />}</div></button>
            <button className="dc-btn" onClick={() => canEdit && setRosterEdit(r)} style={{ background: "none", padding: 0, flex: 1, minWidth: 0, textAlign: "left", cursor: canEdit ? "pointer" : "default" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: r.absent ? "#D2483A" : (r.present ? "var(--ink)" : "#9C93A6"), textDecoration: r.absent ? "line-through" : "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{showTime && <span className="dc-fr" style={{ color: "var(--plum)", fontWeight: 700, marginRight: 4 }}>{r.time}</span>}{r.name}{r.makeup && <span style={{ fontSize: 9.5, color: "#fff", background: "#8E6BB0", fontWeight: 700, marginLeft: 5, padding: "1px 5px", borderRadius: 999 }}>보강</span>}{r.absent && <span style={{ fontSize: 9.5, color: "#fff", background: "#E0584A", fontWeight: 700, marginLeft: 5, padding: "1px 5px", borderRadius: 999 }}>결석</span>}{r.done && !r.absent && <span style={{ fontSize: 9.5, color: "var(--plum)", fontWeight: 700, marginLeft: 4 }}>레슨✓</span>}</div>
              {r.memo && <div style={{ fontSize: 10.5, color: "#C45A48", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>✎ {r.memo}</div>}
              {(r.inTime || r.outTime) && <div style={{ fontSize: 10, color: "#3F8267", fontWeight: 700, whiteSpace: "nowrap" }}>🟢 등원 {r.inTime || "—"}{r.outTime ? ` · 🏠 하원 ${r.outTime}` : ""}</div>}
            </button>
          </div>
        );
        return (
          <div>
            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, marginBottom: 10 }}>{days.map(d => <button key={d} className="dc-btn" onClick={() => setNamesDay(d)} style={{ flexShrink: 0, width: 42, padding: "8px 0", borderRadius: 999, fontSize: 13, fontWeight: namesDay === d ? 700 : 400, background: namesDay === d ? "linear-gradient(140deg,#EE9573,#E07A55)" : "#fff", color: namesDay === d ? "#fff" : "var(--ink)", border: "1px solid var(--line)" }}>{d}</button>)}</div>
            {classes.length > 1 && <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, marginBottom: 10 }}><button className="dc-btn" onClick={() => setNamesClass("all")} style={{ flexShrink: 0, padding: "6px 13px", borderRadius: 999, fontSize: 12, fontWeight: namesClass === "all" ? 700 : 400, background: namesClass === "all" ? "#6A4C7A" : "#fff", color: namesClass === "all" ? "#fff" : "var(--ink)", border: "1px solid var(--line)" }}>전체 반</button>{classes.map(c => <button key={c.id} className="dc-btn" onClick={() => setNamesClass(c.id)} style={{ flexShrink: 0, padding: "6px 13px", borderRadius: 999, fontSize: 12, fontWeight: namesClass === c.id ? 700 : 400, background: namesClass === c.id ? c.color : "#fff", color: namesClass === c.id ? "#fff" : "var(--ink)", border: "1px solid var(--line)" }}>{c.name}</button>)}</div>}
            <SearchBox value={namesQ} onChange={setNamesQ} placeholder="이 요일 명단에서 학생 찾기" />
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <div className="dc-card" style={{ flex: 1, padding: "9px 0", textAlign: "center" }}><div className="dc-fr" style={{ fontSize: 17, fontWeight: 600, color: "#3F8267" }}>{presentN}<span style={{ fontSize: 11, color: "var(--ink-soft)" }}>/{dayRoster.length}</span></div><div style={{ fontSize: 10.5, color: "var(--ink-soft)" }}>출석</div></div>
              <div className="dc-card" style={{ flex: 1, padding: "9px 0", textAlign: "center" }}><div className="dc-fr" style={{ fontSize: 17, fontWeight: 600, color: "var(--plum)" }}>{doneN}<span style={{ fontSize: 11, color: "var(--ink-soft)" }}>/{dayRoster.length}</span></div><div style={{ fontSize: 10.5, color: "var(--ink-soft)" }}>레슨완료</div></div>
              <div className="dc-card" style={{ flex: 1, padding: "9px 0", textAlign: "center" }}><div className="dc-fr" style={{ fontSize: 17, fontWeight: 600, color: "#E0584A" }}>{absentN}</div><div style={{ fontSize: 10.5, color: "var(--ink-soft)" }}>결석</div></div>
            </div>
            {classes.length === 0 ? <Empty msg="반이 없어요. 관리 → 반 관리에서 추가해주세요." /> : (
              <div style={{ overflowX: "auto", paddingBottom: 6 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", minWidth: 40 + shownClasses.length * (COLW + 8) }}>
                  <div style={{ width: 40, flexShrink: 0 }} />
                  {shownClasses.map(c => (<div key={c.id} style={{ width: COLW, flexShrink: 0, textAlign: "center", fontWeight: 700, fontSize: 13, color: "#fff", background: `linear-gradient(140deg,${c.color},${c.color}cc)`, borderRadius: 11, padding: "8px 4px" }}>{c.name}<span style={{ fontSize: 9.5, opacity: .85, fontWeight: 400 }}> · {c.type === "list" ? "개인" : "반"}</span></div>))}
                </div>
                {times.map((t, ti) => (
                  <div key={t} style={{ display: "flex", gap: 8, marginTop: 8, minWidth: 40 + shownClasses.length * (COLW + 8) }}>
                    <div style={{ width: 40, flexShrink: 0, paddingTop: 8, textAlign: "center", fontSize: 11, fontWeight: t.endsWith(":00") ? 700 : 400, color: t.endsWith(":00") ? "var(--plum)" : "var(--ink-soft)" }}>{t}</div>
                    {shownClasses.map(c => { const items = cellItems(c, t); const notAll = items.length > 0 && items.some(r => !r.present); return (
                      <div key={c.id} style={{ width: COLW, flexShrink: 0, background: ti % 2 ? "#F8F1E6" : "#FBF6EC", border: "1px solid var(--line)", borderRadius: 11, padding: 7, minHeight: 44 }}>
                        {items.map(r => <Entry key={r.id} r={r} showTime={c.type === "list"} />)}
                        {canEdit && items.length > 1 && <button className="dc-btn" onClick={() => api.setRosterPresentBulk(items.map(r => r.id), notAll)} style={{ width: "100%", marginTop: 4, padding: "4px 0", borderRadius: 7, background: notAll ? "rgba(63,130,103,.12)" : "rgba(196,90,72,.1)", color: notAll ? "#3F8267" : "#C45A48", fontSize: 10.5, fontWeight: 700 }}>{notAll ? "✓ 모두 출석" : "출석 해제"}</button>}
                        {canEdit && !nq2 && <button className="dc-btn" onClick={() => setRosterAdd({ classId: c.id, time: t })} style={{ width: "100%", marginTop: items.length ? 5 : 0, padding: "5px 0", borderRadius: 8, background: "rgba(106,76,122,.08)", color: "var(--plum)", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}><Plus size={12} /> 추가</button>}
                      </div>
                    ); })}
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", margin: "10px 4px 0", fontSize: 11, color: "var(--ink-soft)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 14, height: 14, borderRadius: 5, background: "#6FAE93" }} /> 출석(등원)</span>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 14, height: 14, borderRadius: 5, background: "#6A4C7A", display: "flex", alignItems: "center", justifyContent: "center" }}><Music2 size={9} color="#fff" /></span> 레슨완료(강사 체크)</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 6, padding: "0 4px", lineHeight: 1.7 }}>← 좌우로 넘기면 같은 시간 각 반을 비교할 수 있어요. 왼쪽 ✓=출석, 음표 체크=레슨 완료. 이름을 누르면 등·하원 시각·메모·삭제를 편집할 수 있어요.</div>
          </div>
        );
      })()}

      {mode === "roster" && days.map(d => {
        const items = rosterAll.filter(l => l.day === d).sort((a, b) => toMin(a.time) - toMin(b.time));
        return (
          <div key={d} className="dc-card" style={{ padding: 14, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 26, height: 26, borderRadius: 9, background: d === today ? "linear-gradient(140deg,#EE9573,#E07A55)" : "#F0E7D9", color: d === today ? "#fff" : "var(--plum)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>{d}</div><div className="dc-serif" style={{ fontSize: 15, fontWeight: 700 }}>{d}요일</div><span style={{ marginLeft: "auto", fontSize: 12, color: "var(--ink-soft)" }}>{items.length}건</span></div>
            {items.length === 0 ? <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 8 }}>수업 없음</div> : items.map(l => (
              <button key={l.id} className="dc-btn" onClick={() => openSel(l)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 0", marginTop: 8, borderTop: "1px solid var(--line)", background: "none", textAlign: "left" }}><span className="dc-fr" style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", width: 76 }}>{fmtRange(l.time, l.dur)}</span><span style={{ width: 8, height: 8, borderRadius: "50%", background: tColor(l.teacherId), flexShrink: 0 }} /><span style={{ flex: 1, fontSize: 13.5, fontWeight: 700 }}>{sName(l.studentId)}</span><span style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>{tName(l.teacherId)} T.</span><span style={{ width: 8, height: 8, borderRadius: "50%", background: ATT[l.att].dot, flexShrink: 0 }} /></button>
            ))}
          </div>
        );
      })}

      {canEdit && mode !== "roster" && mode !== "all" && <button className="dc-fab dc-btn" onClick={() => setAdd(true)}><Plus size={26} /></button>}

      {sel && (<Sheet title={sel.kind} onClose={() => setSel(null)}>
        <div style={{ display: "flex", flexDirection: "column", gap: 11, marginBottom: 16 }}><Row icon={<User size={16} />} label="학생" value={sName(sel.studentId)} /><Row icon={<Clock size={16} />} label="시간" value={`${sel.day}요일 ${fmtRange(sel.time, sel.dur)} (${sel.dur || 50}분)`} /><Row icon={<Music2 size={16} />} label="담당 강사" value={`${tName(sel.teacherId)} 선생님`} /><Row icon={<Home size={16} />} label="강의실" value={sel.room} /></div>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--plum)", marginBottom: 8 }}>출결 상태 {canEdit && <span style={{ color: "var(--ink-soft)", fontWeight: 400 }}>(눌러서 변경)</span>}</div>
        <button className="dc-btn" disabled={!canEdit} onClick={() => { if (canEdit) { api.cycleAtt(sel.id); setSel(s => ({ ...s, att: ATT_ORDER[(ATT_ORDER.indexOf(s.att) + 1) % 4] })); } }} style={{ width: "100%", padding: 14, borderRadius: 16, background: ATT[sel.att].bg, color: ATT[sel.att].color, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: ATT[sel.att].dot }} />{ATT[sel.att].label}</button>
        {canEdit && <div style={{ display: "flex", gap: 8, marginTop: 14 }}><button className="dc-btn" onClick={() => { setEditLesson(sel); setSel(null); }} style={{ flex: 1, padding: 13, borderRadius: 14, background: "#F0E7D9", color: "var(--plum)", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Pencil size={15} /> 이동·수정</button><button className="dc-btn" onClick={() => { const id = sel.id; api.confirm({ title: "수업을 삭제할까요?", message: `${sName(sel.studentId)} · ${sel.day}요일 ${fmtRange(sel.time, sel.dur)}`, onConfirm: () => api.deleteLesson(id) }); setSel(null); }} style={{ flex: 1, padding: 13, borderRadius: 14, background: "#FBE0DC", color: "#C45A48", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Trash2 size={15} /> 삭제</button></div>}
        {canEdit && (() => { const sgoals = data.goals.filter(g => g.studentId === sel.studentId && g.status !== "archived"); const stuObj = data.students.find(s => s.id === sel.studentId); return (
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
            <div className="dc-section-tt" style={{ marginBottom: 10 }}><TrendingUp size={14} /> 오늘 수업 마무리</div>
            {sgoals.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 12 }}>등록된 진도 목표가 없어요.</div> : sgoals.map(g => { const rem = g.items.map((it, idx) => ({ it, idx })).filter(x => !x.it.done); return (
              <div key={g.id} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11.5, color: "var(--ink-soft)", fontWeight: 700, marginBottom: 6 }}>{g.icon} {g.title}</div>
                {rem.length === 0 ? <div style={{ fontSize: 12, color: "var(--mint)" }}>모든 곡 완료 🎉</div> : <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{rem.map(({ it, idx }) => <button key={idx} className="dc-btn" onClick={() => { api.toggleSong(g.id, idx); setDoneNow(prev => [...prev, it.n]); }} style={{ padding: "7px 11px", borderRadius: 999, background: "#fff", color: "var(--ink)", border: "1px solid var(--line)", fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}><div className="dc-check" style={{ width: 15, height: 15 }} /> {it.n}</button>)}</div>}
              </div>
            ); })}
            {doneNow.length > 0 && <div style={{ fontSize: 12, color: "var(--mint)", background: "#E4F1EA", borderRadius: 10, padding: "8px 11px", margin: "4px 0 12px", display: "flex", alignItems: "center", gap: 6 }}><CheckCheck size={14} /> 오늘 체크: {doneNow.join(", ")}</div>}
            <button className="dc-btn" onClick={() => { const txt = doneNow.length ? `오늘은 ${doneNow.join(", ")}${doneNow.length > 1 ? "을" : "를"} 완료했어요! 다음 시간도 화이팅이에요 🎵` : ""; setComposeCtx({ student: stuObj, teacherId: sel.teacherId, text: txt }); setSel(null); }} style={{ width: "100%", padding: 13, borderRadius: 14, background: "linear-gradient(140deg,#6A4C7A,#4D3759)", color: "#fff", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}><Home size={15} /> 이 학생 알림장 쓰기{doneNow.length ? " (진도 자동 입력)" : ""}</button>
          </div>
        ); })()}
      </Sheet>)}

      {addOpen && <LessonForm title="수업 추가" teachers={academyTeachers} days={days} students={mode === "teacher" ? teacherStudents : null} open={academy.open || "13:00"} close={academy.close || "19:00"} lessons={data.schedule} initial={mode === "teacher" ? { teacherId: selTid } : null} onSave={(l) => { api.addLesson({ ...l, id: uid("sc"), studentId: l.studentId || student.id }); setAdd(false); }} onClose={() => setAdd(false)} />}
      {addCtx && <LessonForm title="수업 추가" teachers={academyTeachers} days={days} students={data.students.filter(s => s.academyId === student.academyId && (addCtx.teacherId ? s.teacherId === addCtx.teacherId : true))} open={academy.open || "13:00"} close={academy.close || "19:00"} lessons={data.schedule} initial={{ day: addCtx.day, start: addCtx.start, teacherId: addCtx.teacherId }} onSave={(l) => { api.addLesson({ ...l, id: uid("sc"), studentId: l.studentId || student.id }); setAddCtx(null); }} onClose={() => setAddCtx(null)} />}
      {editLesson && <LessonForm title="수업 이동·수정" teachers={academyTeachers} days={days} open={academy.open || "13:00"} close={academy.close || "19:00"} lessons={data.schedule} initial={editLesson} onSave={(l) => { api.updateLesson(editLesson.id, l); setEditLesson(null); }} onClose={() => setEditLesson(null)} />}
      {composeCtx && composeCtx.student && <ComposeDiary student={composeCtx.student} defaultTeacherId={composeCtx.teacherId} initialTitle="오늘의 레슨" initialText={composeCtx.text} onSave={(e) => { api.addDiary(e); setComposeCtx(null); }} onClose={() => setComposeCtx(null)} />}
      {rosterAdd && <RosterAdd students={data.students.filter(s => s.academyId === student.academyId)} fixedTime={(classes.find(c => c.id === rosterAdd.classId) || {}).type === "list" ? "" : rosterAdd.time} onSave={(name, time, sid) => { api.addRoster({ academyId: student.academyId, classId: rosterAdd.classId, day: namesDay, time: time || rosterAdd.time, name, studentId: sid }); setRosterAdd(null); }} onClose={() => setRosterAdd(null)} />}
      {rosterEdit && <RosterEdit entry={rosterEdit} onSave={(patch) => { api.updateRoster(rosterEdit.id, patch); setRosterEdit(null); }} onDelete={() => { const id = rosterEdit.id; api.confirm({ title: "명단에서 삭제할까요?", message: rosterEdit.name, onConfirm: () => api.deleteRoster(id) }); setRosterEdit(null); }} onClose={() => setRosterEdit(null)} />}
      {kiosk && <KioskOverlay data={data} academy={academy} students={data.students.filter(s => scopeIds.has(s.id) && data.schedule.some(l => l.studentId === s.id && l.day === today))} allStudents={data.students.filter(s => s.academyId === student.academyId)} api={api} tName={tName} onClose={() => setKiosk(false)} />}
    </div>
  );
}
function ClassForm({ initial, onSave, onClose }) {
  const [name, setName] = useState(initial?.name || ""); const [type, setType] = useState(initial?.type || "grid");
  return (<Sheet title={initial ? "반 정보 수정" : "반 추가"} onClose={onClose}>
    <Field label="반 이름" value={name} onChange={setName} placeholder="예) 모차르트반 / 바이올린" />
    <label className="dc-label">명단 유형</label>
    <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
      <button className="dc-btn" onClick={() => setType("grid")} style={{ flex: 1, padding: "11px 0", borderRadius: 12, background: type === "grid" ? "#6A4C7A" : "#fff", color: type === "grid" ? "#fff" : "var(--ink)", border: "1px solid var(--line)", fontSize: 13, fontWeight: type === "grid" ? 700 : 400 }}>반(30분 격자)</button>
      <button className="dc-btn" onClick={() => setType("list")} style={{ flex: 1, padding: "11px 0", borderRadius: 12, background: type === "list" ? "#6A4C7A" : "#fff", color: type === "list" ? "#fff" : "var(--ink)", border: "1px solid var(--line)", fontSize: 13, fontWeight: type === "list" ? 700 : 400 }}>개인(시간 자유)</button>
    </div>
    <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 18, lineHeight: 1.6 }}>{type === "grid" ? "피아노 그룹처럼 30분 격자에 학생을 넣는 방식이에요." : "바이올린 개인레슨처럼 1:50, 2:45 등 시간을 자유롭게 적는 목록이에요."}</div>
    <PrimaryBtn onClick={() => name.trim() && onSave(name.trim(), type)}><Check size={16} /> {initial ? "저장" : "추가"}</PrimaryBtn>
  </Sheet>);
}
function AssignClass({ cls, students, onAssign, onClose }) {
  const DAYS = ["월", "화", "수", "목", "금", "토"];
  const SLOTS30 = (() => { const o = []; for (let m = 13 * 60; m < 19 * 60; m += 30) o.push(`${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`); return o; })();
  const [sq, setSq] = useState(""); const [name, setName] = useState(""); const [sid, setSid] = useState(null); const [daysSel, setDaysSel] = useState([]); const [time, setTime] = useState(cls.type === "list" ? "" : "16:00");
  const fs = sq.trim() ? students.filter(s => s.name.includes(sq.trim())) : students.slice(0, 8);
  const toggleDay = d => setDaysSel(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d]);
  const ok = name.trim() && daysSel.length && time.trim();
  return (<Sheet title={`${cls.name} 학생 배정`} onClose={onClose}>
    <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 12, lineHeight: 1.6 }}>학생을 고르고 <b style={{ color: "var(--plum)" }}>요일·시간</b>을 정하면 그 요일 명단에 등록돼요. 등록 학생을 고르면 <b style={{ color: "var(--plum)" }}>고유번호(PIN)</b>가 연결되어 키오스크 출석과 자동 연동됩니다.</div>
    <label className="dc-label">학생</label>
    <SearchBox value={sq} onChange={setSq} placeholder="학생 이름 검색" />
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12, maxHeight: 120, overflowY: "auto" }}>{fs.map(s => <button key={s.id} className="dc-btn" onClick={() => { setSid(s.id); setName(s.name); }} style={{ padding: "8px 13px", borderRadius: 12, background: sid === s.id ? "#6A4C7A" : "#fff", color: sid === s.id ? "#fff" : "var(--ink)", border: "1px solid var(--line)", fontSize: 13 }}>{s.name} <span style={{ opacity: .6, fontSize: 11 }}>#{s.pin}</span></button>)}</div>
    <div style={{ display: "flex", gap: 8, marginBottom: 6 }}><input className="dc-input" value={name} onChange={e => { setName(e.target.value); setSid(null); }} placeholder="또는 이름 직접 입력" style={{ marginBottom: 0, flex: 1 }} /></div>
    <div style={{ fontSize: 11, color: sid ? "#3F8267" : "var(--ink-soft)", marginBottom: 14 }}>{sid ? "✓ 고유번호 연결됨 — 키오스크 출석과 자동 연동돼요." : "직접 입력한 이름은 키오스크 출석 연동이 안 돼요."}</div>
    <label className="dc-label">요일 (여러 개 선택 가능)</label>
    <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>{DAYS.map(d => <button key={d} className="dc-btn" onClick={() => toggleDay(d)} style={{ flex: 1, padding: "9px 0", borderRadius: 11, background: daysSel.includes(d) ? "linear-gradient(140deg,#EE9573,#E07A55)" : "#fff", color: daysSel.includes(d) ? "#fff" : "var(--ink)", border: "1px solid var(--line)", fontSize: 13, fontWeight: daysSel.includes(d) ? 700 : 400 }}>{d}</button>)}</div>
    <label className="dc-label">시간</label>
    {cls.type === "list"
      ? <input className="dc-input" value={time} onChange={e => setTime(e.target.value)} placeholder="자유 입력 · 예) 2:45, 14:20" style={{ marginBottom: 18 }} />
      : <select className="dc-input" value={time} onChange={e => setTime(e.target.value)} style={{ marginBottom: 18, appearance: "auto" }}>{SLOTS30.map(t => <option key={t} value={t}>{t}</option>)}</select>}
    <PrimaryBtn onClick={() => ok && onAssign(name.trim(), daysSel, time.trim(), sid)}><Check size={16} /> {daysSel.length > 1 ? `${daysSel.length}개 요일에 ` : ""}배정</PrimaryBtn>
    {!ok && <div style={{ fontSize: 11.5, color: "var(--ink-soft)", textAlign: "center", marginTop: 10 }}>학생·요일·시간을 모두 입력하면 배정돼요.</div>}
  </Sheet>);
}
function RosterAdd({ students, fixedTime, onSave, onClose }) {
  const [sq, setSq] = useState(""); const [custom, setCustom] = useState(""); const [time, setTime] = useState(fixedTime || "");
  const fs = sq.trim() ? students.filter(s => s.name.includes(sq.trim())) : students.slice(0, 8);
  const needTime = !fixedTime;
  const go = (name, sid) => { if (needTime && !time.trim()) return; onSave(name, needTime ? time.trim() : fixedTime, sid || null); };
  return (<Sheet title="학생 추가" onClose={onClose}>
    {needTime && <><label className="dc-label">시간 (자유 입력 · 예 1:50, 14:20)</label><input className="dc-input" value={time} onChange={e => setTime(e.target.value)} placeholder="예) 2:45" style={{ marginBottom: 14 }} /></>}
    <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 12 }}>등록된 학생을 누르면 <b style={{ color: "var(--plum)" }}>고유번호(PIN)</b>가 연결돼 키오스크 출석과 연동돼요. 이름 직접 입력은 연동되지 않아요.</div>
    <SearchBox value={sq} onChange={setSq} placeholder="학생 이름 검색" />
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16, maxHeight: 150, overflowY: "auto" }}>{fs.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>검색 결과가 없어요.</div> : fs.map(s => <button key={s.id} className="dc-btn" onClick={() => go(s.name, s.id)} style={{ padding: "9px 14px", borderRadius: 12, background: "#fff", color: "var(--ink)", border: "1px solid var(--line)", fontSize: 13.5 }}>{s.name} <span style={{ opacity: .55, fontSize: 11 }}>#{s.pin}</span></button>)}</div>
    <label className="dc-label">또는 직접 입력 (연동 안 됨)</label>
    <div style={{ display: "flex", gap: 8 }}><input className="dc-input" value={custom} onChange={e => setCustom(e.target.value)} placeholder="이름" style={{ marginBottom: 0, flex: 1 }} /><button className="dc-btn" onClick={() => custom.trim() && go(custom.trim(), null)} style={{ background: "linear-gradient(140deg,#EE9573,#E07A55)", color: "#fff", borderRadius: 12, padding: "0 18px", fontSize: 14, fontWeight: 700 }}>추가</button></div>
  </Sheet>);
}
function RosterEdit({ entry, onSave, onDelete, onClose }) {
  const [name, setName] = useState(entry.name); const [memo, setMemo] = useState(entry.memo || ""); const [present, setPresent] = useState(!!entry.present); const [done, setDone] = useState(!!entry.done); const [absent, setAbsent] = useState(!!entry.absent); const [time, setTime] = useState(entry.time || ""); const [inTime, setInTime] = useState(entry.inTime || ""); const [outTime, setOutTime] = useState(entry.outTime || "");
  return (<Sheet title="명단 항목" onClose={onClose}>
    <div style={{ display: "flex", gap: 10 }}>
      <div style={{ width: 110 }}><label className="dc-label">시간</label><input className="dc-input" value={time} onChange={e => setTime(e.target.value)} placeholder="예) 2:45" style={{ marginBottom: 14 }} /></div>
      <div style={{ flex: 1 }}><Field label="이름" value={name} onChange={setName} /></div>
    </div>
    <label className="dc-label">출결</label>
    <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
      <button className="dc-btn" onClick={() => { setPresent(v => !v); setAbsent(false); }} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px 0", borderRadius: 13, background: present ? "#E4F1EA" : "#F8F1E6", border: "1px solid " + (present ? "#9CCBB4" : "var(--line)") }}><div className={"dc-check" + (present ? " on" : "")} style={{ width: 19, height: 19 }}>{present && <Check size={12} color="#fff" />}</div><span style={{ fontSize: 13, fontWeight: 700, color: present ? "#3F8267" : "var(--ink)" }}>출석</span></button>
      <button className="dc-btn" onClick={() => { setAbsent(v => !v); setPresent(false); setDone(false); }} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px 0", borderRadius: 13, background: absent ? "#FBE0DC" : "#F8F1E6", border: "1px solid " + (absent ? "#EFA89C" : "var(--line)") }}><div style={{ width: 19, height: 19, borderRadius: 7, border: `2px solid ${absent ? "#E0584A" : "#D8CCBC"}`, background: absent ? "#E0584A" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>{absent && <X size={12} color="#fff" />}</div><span style={{ fontSize: 13, fontWeight: 700, color: absent ? "#C45A48" : "var(--ink)" }}>결석</span></button>
      <button className="dc-btn" onClick={() => setDone(v => !v)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px 0", borderRadius: 13, background: done ? "#EFE7F0" : "#F8F1E6", border: "1px solid var(--line)" }}><div style={{ width: 19, height: 19, borderRadius: 7, border: `2px solid ${done ? "#6A4C7A" : "#D8CCBC"}`, background: done ? "#6A4C7A" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>{done && <Music2 size={11} color="#fff" />}</div><span style={{ fontSize: 13, fontWeight: 700, color: done ? "var(--plum)" : "var(--ink)" }}>레슨완료</span></button>
    </div>
    <label className="dc-label">등원 · 하원 시각</label>
    <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16 }}>
      <input className="dc-input" value={inTime} onChange={e => setInTime(e.target.value)} placeholder="등원 예) 14:03" style={{ marginBottom: 0, flex: 1 }} />
      <span style={{ color: "var(--ink-soft)" }}>~</span>
      <input className="dc-input" value={outTime} onChange={e => setOutTime(e.target.value)} placeholder="하원 예) 15:10" style={{ marginBottom: 0, flex: 1 }} />
    </div>
    <label className="dc-label">세부사항 / 특이사항 (결석사유·체험·시간메모)</label>
    <textarea className="dc-input" value={memo} onChange={e => setMemo(e.target.value)} placeholder="예) 결석(감기), 체험, 2:10-2:50" style={{ minHeight: 64, resize: "none", marginBottom: 18 }} />
    <div style={{ display: "flex", gap: 8 }}>
      <button className="dc-btn" onClick={onDelete} style={{ flex: 1, padding: 14, borderRadius: 14, background: "#FBE0DC", color: "#C45A48", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Trash2 size={15} /> 삭제</button>
      <button className="dc-btn" onClick={() => onSave({ name: name.trim() || entry.name, memo, present, done, absent, time: time.trim() || entry.time, inTime: inTime.trim(), outTime: outTime.trim() })} style={{ flex: 2, padding: 14, borderRadius: 14, background: "linear-gradient(140deg,#6A4C7A,#4D3759)", color: "#fff", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Check size={15} /> 저장</button>
    </div>
  </Sheet>);
}
function KioskOverlay({ data, academy, students, allStudents, api, tName, onClose }) {
  const [now, setNow] = useState(Date.now());
  const [pin, setPin] = useState(""); const [msg, setMsg] = useState(null);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);
  const elapsed = (ms) => { const m = Math.max(0, Math.floor((now - ms) / 60000)); return m < 60 ? `${m}분` : `${Math.floor(m / 60)}시간 ${m % 60}분`; };
  const state = (s) => (s.inAt && !s.outAt) ? "in" : (s.inAt && s.outAt) ? "out" : "none";
  const toast = (txt) => { setMsg(txt); setTimeout(() => setMsg(null), 1800); };
  const act = (s) => { const st = state(s); if (st === "in") { api.studentCheckOut(s.id); toast(`${s.name} 하원 처리 · 학부모 알림 전송`); } else { api.studentCheckIn(s.id); toast(`${s.name} 등원! · 학부모 알림 전송`); } };
  const press = (n) => { const np = (pin + n).slice(0, 4); setPin(np); if (np.length === 4) { const found = allStudents.find(s => s.pin === np); if (found) { act(found); } else toast("일치하는 PIN이 없어요"); setTimeout(() => setPin(""), 250); } };
  const inList = students.filter(s => state(s) === "in").sort((a, b) => a.inAt - b.inAt);
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 60, background: "linear-gradient(165deg,#4D3759,#2D2833)", color: "#fff", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "18px 18px 10px", display: "flex", alignItems: "center", gap: 10 }}><div style={{ flex: 1 }}><div className="dc-serif" style={{ fontSize: 21, fontWeight: 700 }}>등·하원 체크</div><div style={{ fontSize: 12, opacity: .8 }}>{academy.name} · PIN 4자리 또는 이름을 누르세요</div></div><button className="dc-btn" onClick={onClose} style={{ background: "rgba(255,255,255,.16)", color: "#fff", borderRadius: 12, padding: "8px 12px", fontSize: 12.5, display: "flex", alignItems: "center", gap: 5 }}><X size={15} /> 종료</button></div>
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 18px 24px" }}>
        <div style={{ background: "rgba(255,255,255,.08)", borderRadius: 20, padding: 16, marginBottom: 16 }}>
          <div style={{ textAlign: "center", letterSpacing: 14, fontSize: 30, fontWeight: 700, height: 38, fontFamily: "ui-monospace,monospace" }}>{pin.padEnd(4, "·")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 12 }}>
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(n => <button key={n} className="dc-btn" onClick={() => press(n)} style={{ padding: "14px 0", borderRadius: 14, background: "rgba(255,255,255,.92)", color: "var(--ink)", fontSize: 20, fontWeight: 700 }}>{n}</button>)}
            <button className="dc-btn" onClick={() => setPin("")} style={{ padding: "14px 0", borderRadius: 14, background: "rgba(255,255,255,.16)", color: "#fff", fontSize: 13 }}>지움</button>
            <button className="dc-btn" onClick={() => press("0")} style={{ padding: "14px 0", borderRadius: 14, background: "rgba(255,255,255,.92)", color: "var(--ink)", fontSize: 20, fontWeight: 700 }}>0</button>
            <button className="dc-btn" onClick={() => setPin(p => p.slice(0, -1))} style={{ padding: "14px 0", borderRadius: 14, background: "rgba(255,255,255,.16)", color: "#fff", fontSize: 16 }}>←</button>
          </div>
        </div>
        {inList.length > 0 && <div style={{ background: "rgba(111,174,147,.18)", border: "1px solid rgba(111,174,147,.5)", borderRadius: 16, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 10, opacity: .95 }}>🟢 등원 중 {inList.length}명 — 경과 시간</div>
          {inList.map(s => <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0" }}><span style={{ fontSize: 18 }}>{s.avatar}</span><span style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{s.name}</span><span className="dc-fr" style={{ fontSize: 13, opacity: .9 }}>{elapsed(s.inAt)} 경과</span><button className="dc-btn" onClick={() => act(s)} style={{ background: "#fff", color: "#3F8267", borderRadius: 9, padding: "6px 11px", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}><LogOut size={13} /> 하원</button></div>)}
        </div>}
        <div style={{ fontSize: 12, opacity: .7, margin: "4px 2px 8px" }}>오늘 수업 학생 · 이름을 눌러 등원/하원</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {students.length === 0 && <div style={{ gridColumn: "1 / -1", textAlign: "center", opacity: .8, padding: "30px 0" }}>오늘 예정된 학생이 없어요.</div>}
          {students.map(s => { const st = state(s); const bg = st === "in" ? "linear-gradient(150deg,#6FAE93,#3F8267)" : st === "out" ? "rgba(255,255,255,.35)" : "rgba(255,255,255,.94)"; return (
            <button key={s.id} className="dc-btn" onClick={() => act(s)} disabled={st === "out"} style={{ borderRadius: 18, padding: "14px 10px", background: bg, color: st === "none" ? "var(--ink)" : "#fff", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minHeight: 104, justifyContent: "center" }}>
              <div style={{ fontSize: 28 }}>{st === "in" ? "🟢" : st === "out" ? "🏠" : s.avatar}</div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{s.name}</div>
              <div style={{ fontSize: 11, opacity: .85 }}>{st === "in" ? `등원 ${elapsed(s.inAt)} · 누르면 하원` : st === "out" ? "하원 완료" : "터치하여 등원"}</div>
            </button>
          ); })}
        </div>
      </div>
      {msg && <div style={{ position: "absolute", left: "50%", bottom: 28, transform: "translateX(-50%)", background: "rgba(20,16,26,.92)", color: "#fff", padding: "11px 18px", borderRadius: 999, fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>{msg}</div>}
    </div>
  );
}
function LessonForm({ title, teachers, days, students, initial, open, close, lessons, onSave, onClose }) {
  const LENGTHS = [30, 40, 45, 50, 60, 90];
  const pad = (t) => { const [h, m] = (t || "16:00").split(":"); return `${String(parseInt(h)).padStart(2, "0")}:${(m || "00").padStart(2, "0")}`; };
  const [day, setDay] = useState(typeof initial?.day === "string" ? initial.day : "월");
  const [start, setStart] = useState(pad(initial?.start || initial?.time || "16:00"));
  const [dur, setDur] = useState(initial?.dur || 50);
  const [kind, setKind] = useState(initial?.kind || "피아노 정규"); const [room, setRoom] = useState(initial?.room || "1관 A실");
  const [tid, setTid] = useState(initial?.teacherId || teachers[0]?.id);
  const [sid, setSid] = useState(initial?.studentId || students?.[0]?.id);
  const [sq, setSq] = useState("");
  const isEdit = !!(initial && initial.id);
  const sMin = toMin(start), eMin = sMin + dur;
  const conflict = (lessons || []).find(l => l.id !== (initial && initial.id) && l.teacherId === tid && l.day === day && toMin(l.time) < eMin && sMin < toMin(l.time) + (l.dur || 50));
  const outOfHours = (open && start < open) || (close && addMin(start, dur) > close);
  return (<Sheet title={title} onClose={onClose}>
    {students && <><label className="dc-label">학생</label>{students.length > 6 && <SearchBox value={sq} onChange={setSq} placeholder="학생 이름 검색" />}<div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14, maxHeight: 132, overflowY: "auto" }}>{students.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>배정된 학생이 없어요.</div> : (() => { const fs = students.filter(s => !sq.trim() || s.name.includes(sq.trim())); return fs.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>검색 결과가 없어요.</div> : fs.map(s => <button key={s.id} className="dc-btn" onClick={() => setSid(s.id)} style={{ padding: "8px 13px", borderRadius: 12, background: sid === s.id ? "#6A4C7A" : "#fff", color: sid === s.id ? "#fff" : "var(--ink)", border: "1px solid var(--line)", fontSize: 13 }}>{s.name}</button>); })()}</div></>}
    <label className="dc-label">요일</label><div style={{ display: "flex", gap: 6, marginBottom: 14 }}>{days.map(d => <button key={d} className="dc-btn" onClick={() => setDay(d)} style={{ flex: 1, padding: "9px 0", borderRadius: 11, background: day === d ? "linear-gradient(140deg,#EE9573,#E07A55)" : "#fff", color: day === d ? "#fff" : "var(--ink)", border: "1px solid var(--line)", fontSize: 13 }}>{d}</button>)}</div>
    <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
      <div style={{ flex: 1 }}><label className="dc-label">시작 시각</label><input type="time" className="dc-input" value={start} min={open} max={close} step="60" onChange={e => setStart(e.target.value)} style={{ marginBottom: 0, appearance: "auto" }} /></div>
      <div style={{ width: 110 }}><label className="dc-label">길이(분)</label><input type="number" className="dc-input" value={dur} min="5" step="5" onChange={e => setDur(Math.max(5, parseInt(e.target.value) || 0))} style={{ marginBottom: 0 }} /></div>
    </div>
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>{LENGTHS.map(L => <button key={L} className="dc-btn" onClick={() => setDur(L)} style={{ padding: "6px 12px", borderRadius: 999, background: dur === L ? "#6A4C7A" : "#fff", color: dur === L ? "#fff" : "var(--ink)", border: "1px solid var(--line)", fontSize: 12 }}>{L}분</button>)}</div>
    <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginBottom: conflict ? 6 : 14 }}>{start} ~ {addMin(start, dur)} ({dur}분){outOfHours ? <span style={{ color: "#C45A48" }}> · 운영시간({open}~{close})을 벗어나요</span> : ""}</div>
    {conflict && <div style={{ fontSize: 12, color: "#C45A48", background: "#FBE0DC", borderRadius: 10, padding: "8px 11px", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}><AlertTriangle size={14} /> 이 강사에게 {fmtRange(conflict.time, conflict.dur)} 수업이 이미 있어요. 그래도 저장할 수 있어요.</div>}
    <Field label="수업명" value={kind} onChange={setKind} /><Field label="강의실" value={room} onChange={setRoom} />
    <label className="dc-label">담당 강사</label><div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>{teachers.map(t => <button key={t.id} className="dc-btn" onClick={() => setTid(t.id)} style={{ padding: "8px 14px", borderRadius: 12, background: tid === t.id ? t.color : "#fff", color: tid === t.id ? "#fff" : "var(--ink)", border: "1px solid var(--line)", fontSize: 13 }}>{t.name}</button>)}</div>
    <PrimaryBtn onClick={() => { if (!tid) return; if (students && !sid) return; onSave({ day, time: start, dur, kind, room, teacherId: tid, att: initial?.att || "upcoming", ...(students ? { studentId: sid } : {}) }); }}><Check size={16} /> {isEdit ? "저장" : "추가"}</PrimaryBtn>
  </Sheet>);
}

/* ============================================================
   4. 채팅
   ============================================================ */
function ChatView({ data, student, me, academy, api }) {
  const [open, setOpen] = useState(null); const [cq, setCq] = useState("");
  const [noticeCompose, setNoticeCompose] = useState(false); const [noticeOpen, setNoticeOpen] = useState(null);
  const [noticeEdit, setNoticeEdit] = useState(null); const [noticeListOpen, setNoticeListOpen] = useState(false);
  const [schedNoticeEdit, setSchedNoticeEdit] = useState(null);
  const [newChatOpen, setNewChatOpen] = useState(false); const [ncq, setNcq] = useState("");
  useEffect(() => { if (open) api.markThreadRead(open.key, me.id); }, [open && open.key]);
  const myBy = me.role === "parent" ? "parent" : me.role === "teacher" ? "teacher" : "director";
  const sName = sid => (data.students.find(s => s.id === sid) || {}).name || "";
  const tById = tid => data.teachers.find(t => t.id === tid) || { name: "강사", color: "#6A4C7A" };
  const tOf = sid => { const st = data.students.find(s => s.id === sid); return data.teachers.find(t => t.id === (st || {}).teacherId) || { name: "강사", color: "#6A4C7A" }; };
  const labelFor = (withRole, sid, tid) => withRole === "parent" ? `${sName(sid)} 학부모` : withRole === "teacher" ? `${(tid ? tById(tid) : tOf(sid)).name} 선생님` : `${academy.directorName} 원장님`;
  const colorFor = (withRole, sid, tid) => withRole === "teacher" ? (tid ? tById(tid) : tOf(sid)).color : withRole === "director" ? "#4D3759" : "#C2548A";
  const unreadCount = (key) => (data.chats[key] || []).filter(m => m.by !== myBy && !(m.readBy || []).includes(me.id)).length;
  const hasMsgs = (key) => (data.chats[key] || []).length > 0;
  const acStudents = data.students.filter(s => s.academyId === me.academyId);
  const acTeachers = data.teachers.filter(t => t.academyId === me.academyId);
  let convs = [], pickList = null;
  if (me.role === "parent") { const kids = data.students.filter(s => (me.studentIds || []).includes(s.id)); const ks = kids.length ? kids : [student]; convs = ks.flatMap(s => [{ key: `${s.id}|tp`, with: "teacher", studentId: s.id }, { key: `${s.id}|pd`, with: "director", studentId: s.id }]); }
  else if (me.role === "teacher") { const myStudents = data.students.filter(s => s.teacherId === me.teacherId); convs = myStudents.map(s => ({ key: `${s.id}|tp`, with: "parent", studentId: s.id })); convs.push({ key: `dt:${me.teacherId}`, with: "director" }); }
  else { pickList = [...acTeachers.map(t => ({ key: `dt:${t.id}`, with: "teacher", teacherId: t.id })), ...acStudents.map(s => ({ key: `${s.id}|pd`, with: "parent", studentId: s.id }))]; convs = pickList.filter(c => hasMsgs(c.key)); }
  const showStudentTag = me.role !== "parent" || (me.studentIds || []).length > 1;
  if (open) { const msgs = data.chats[open.key] || []; const threadSched = (data.scheduled || []).filter(s => s.kind === "msg" && s.key === open.key).sort((a, b) => a.sendAt - b.sendAt); return <Thread title={`${labelFor(open.with, open.studentId, open.teacherId)}${showStudentTag && open.studentId ? ` · ${sName(open.studentId)}` : ""}`} color={colorFor(open.with, open.studentId, open.teacherId)} msgs={msgs} myBy={myBy} myId={me.id} onBack={() => setOpen(null)} onSend={(t) => api.sendMsg(open.key, myBy, t)} onEdit={(i, t) => api.editMsg(open.key, i, t, me.id)} scheduled={threadSched} onSchedule={(t, at) => api.scheduleMsg(open.key, myBy, t, at)} onCancelSched={(id) => api.cancelScheduled(id)} onEditSched={(id, t, at) => api.editScheduled(id, { text: t, sendAt: at })} />; }
  const audOk = (an) => me.role === "admin" || (an.audience === "everyone") || (an.audience === "parents" && me.role === "parent") || (an.audience === "teachers" && me.role === "teacher");
  const notices = (data.announcements || []).filter(a => a.academyId === me.academyId && audOk(a));
  const audLabel = { parents: "학부모", teachers: "강사", everyone: "전체" };
  return (
    <div>
      <ViewTitle icon={<MessageCircle size={15} />} kr="채팅" en="Messages" sub={me.role === "teacher" ? "담당 학생 학부모 · 원장님과 소통하세요" : me.role === "admin" ? "강사 · 학부모와 소통하세요" : "담당 강사 · 원장님과 소통하세요"} />
      <div className="dc-card" style={{ padding: 14, marginBottom: 16, border: "1.5px solid #F4D7C2" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: notices.length ? 12 : 0 }}><div className="dc-section-tt" style={{ flex: 1 }}><Bell size={14} /> 공지사항 {notices.length > 0 && <Tag bg="#FBE0DC" color="#C45A48">{notices.length}</Tag>}</div>{me.role === "admin" && <button className="dc-btn" onClick={() => setNoticeCompose(true)} style={{ background: "linear-gradient(140deg,#EE9573,#E07A55)", color: "#fff", borderRadius: 10, padding: "7px 12px", fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}><Plus size={14} /> 공지 작성</button>}</div>
        {notices.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>등록된 공지가 없어요.</div> : notices.slice(0, 4).map(an => (
          <button key={an.id} className="dc-btn" onClick={() => setNoticeOpen(an)} style={{ width: "100%", textAlign: "left", background: "#FAF3E8", borderRadius: 12, padding: "10px 12px", marginBottom: 7, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>📢</div>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{an.title}</div><div style={{ fontSize: 11, color: "var(--ink-soft)" }}>{an.date} · {audLabel[an.audience] || "전체"} 대상</div></div>
            <ChevronRight size={16} color="var(--ink-soft)" />
          </button>
        ))}
        {notices.length > 4 && <button className="dc-btn" onClick={() => setNoticeListOpen(true)} style={{ width: "100%", textAlign: "center", background: "#F0E7D9", color: "var(--plum)", borderRadius: 10, padding: "8px 0", fontSize: 12, fontWeight: 700, marginTop: 4 }}>공지 전체 보기 ({notices.length}건)</button>}
        {me.role === "admin" && (data.scheduled || []).some(s => s.kind === "notice" && s.announcement && s.announcement.academyId === me.academyId) && <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed var(--line)" }}><div style={{ fontSize: 11.5, color: "var(--plum)", fontWeight: 700, marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}><Clock size={13} /> 예약된 공지</div>{(data.scheduled || []).filter(s => s.kind === "notice" && s.announcement && s.announcement.academyId === me.academyId).sort((a, b) => a.sendAt - b.sendAt).map(s => (<div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "#F8F1E6", borderRadius: 10, padding: "7px 10px", marginBottom: 6 }}><button className="dc-btn" onClick={() => setSchedNoticeEdit(s)} style={{ flex: 1, minWidth: 0, background: "none", textAlign: "left", padding: 0 }}><div style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.announcement.title}</div><div style={{ fontSize: 10.5, color: "var(--ink-soft)" }}>{fmtDay(s.sendAt)} {fmtClock(s.sendAt)} · 눌러서 수정</div></button><button className="dc-btn" onClick={() => api.confirm({ title: "예약 공지를 취소할까요?", message: s.announcement.title, onConfirm: () => api.cancelScheduled(s.id) })} style={{ background: "#FBE0DC", borderRadius: 8, padding: 6, color: "#C45A48" }}><X size={13} /></button></div>))}</div>}
      </div>
      {me.role === "admin" && <button className="dc-btn" onClick={() => { setNcq(""); setNewChatOpen(true); }} style={{ width: "100%", padding: 13, borderRadius: 14, background: "linear-gradient(140deg,#6A4C7A,#4D3759)", color: "#fff", fontSize: 13.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginBottom: 12 }}><Plus size={16} /> 새 채팅 (학부모·강사 찾기)</button>}
      {convs.length > 8 && <SearchBox value={cq} onChange={setCq} placeholder="이름으로 대화 찾기" />}
      {convs.length === 0 && <Empty msg={me.role === "admin" ? "아직 시작한 대화가 없어요. ‘새 채팅’으로 학부모·강사와 대화를 시작하세요." : "아직 대화가 없어요."} />}
      {[...convs].filter(c => !cq.trim() || sName(c.studentId).includes(cq.trim()) || labelFor(c.with, c.studentId, c.teacherId).includes(cq.trim())).sort((a, b) => { const ua = unreadCount(a.key), ub = unreadCount(b.key); return ((ub > 0) - (ua > 0)) || (ub - ua); }).map((c) => { const msgs = data.chats[c.key] || []; const last = msgs[msgs.length - 1]; const uc = unreadCount(c.key); return (<button key={c.key} className="dc-card dc-btn" onClick={() => setOpen(c)} style={{ width: "100%", padding: 15, marginBottom: 11, display: "flex", alignItems: "center", gap: 13, textAlign: "left" }}><div style={{ width: 46, height: 46, borderRadius: 16, background: `linear-gradient(140deg,${colorFor(c.with, c.studentId, c.teacherId)},${colorFor(c.with, c.studentId, c.teacherId)}bb)`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{c.with === "director" ? <Shield size={20} /> : c.with === "teacher" ? <Music2 size={20} /> : <User size={20} />}</div><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 700 }}>{labelFor(c.with, c.studentId, c.teacherId)}{showStudentTag && c.studentId ? <span style={{ fontSize: 11.5, color: "var(--ink-soft)", fontWeight: 400 }}> · {sName(c.studentId)}</span> : ""}</div><div style={{ fontSize: 12, color: uc ? "var(--ink)" : "var(--ink-soft)", fontWeight: uc ? 700 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{last ? `${last.by === myBy ? "나: " : ""}${last.text}` : "대화를 시작해보세요"}</div></div>{uc > 0 ? <span style={{ minWidth: 20, height: 20, padding: "0 6px", borderRadius: 999, background: "var(--coral-deep)", color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{uc}</span> : <ChevronRight size={18} color="var(--ink-soft)" />}</button>); })}
      {noticeCompose && <NoticeCompose onSave={(v) => { const p = { audience: v.audience, title: v.title, text: v.text, academyId: me.academyId, by: `${academy.directorName || "원장"} 원장` }; if (v.sendAt) api.scheduleNotice({ ...p, sendAt: v.sendAt }); else api.addAnnouncement(p); setNoticeCompose(false); }} onClose={() => setNoticeCompose(false)} />}
      {noticeOpen && (<Sheet title="공지사항" onClose={() => setNoticeOpen(null)}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}><Tag bg="#F3E2D3" color="#B5683F">{audLabel[noticeOpen.audience] || "전체"} 대상</Tag><span style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>{noticeOpen.date} {noticeOpen.time}</span></div>
        <div className="dc-serif" style={{ fontSize: 19, fontWeight: 700, marginBottom: 6 }}>{noticeOpen.title}</div>
        <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 14 }}>{noticeOpen.by}</div>
        <div style={{ fontSize: 14, lineHeight: 1.8, color: "#473f52", whiteSpace: "pre-wrap" }}>{noticeOpen.text}{noticeOpen.edited ? <span style={{ fontSize: 11, color: "var(--ink-soft)" }}> (수정됨)</span> : ""}</div>
        {me.role === "admin" && <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button className="dc-btn" onClick={() => { setNoticeEdit(noticeOpen); setNoticeOpen(null); }} style={{ flex: 1, padding: 13, borderRadius: 14, background: "#F0E7D9", color: "var(--plum)", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Pencil size={15} /> 수정</button>
          <button className="dc-btn" onClick={() => { const id = noticeOpen.id; api.confirm({ title: "공지를 삭제할까요?", message: noticeOpen.title, onConfirm: () => api.deleteAnnouncement(id) }); setNoticeOpen(null); }} style={{ flex: 1, padding: 13, borderRadius: 14, background: "#FBE0DC", color: "#C45A48", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Trash2 size={15} /> 삭제</button>
        </div>}
      </Sheet>)}
      {noticeEdit && <NoticeCompose initial={noticeEdit} onSave={(v) => { api.editAnnouncement(noticeEdit.id, v); setNoticeEdit(null); }} onClose={() => setNoticeEdit(null)} />}
      {schedNoticeEdit && <NoticeCompose initial={{ audience: schedNoticeEdit.announcement.audience, title: schedNoticeEdit.announcement.title, text: schedNoticeEdit.announcement.text, sendAt: schedNoticeEdit.sendAt }} onSave={(v) => { api.editScheduled(schedNoticeEdit.id, { audience: v.audience, title: v.title, text: v.text, sendAt: v.sendAt || schedNoticeEdit.sendAt }); setSchedNoticeEdit(null); }} onClose={() => setSchedNoticeEdit(null)} />}
      {noticeListOpen && (<Sheet title={`공지 전체 (${notices.length}건)`} onClose={() => setNoticeListOpen(null)}>
        {notices.length === 0 && <Empty msg="등록된 공지가 없어요." />}
        {notices.map(an => (<button key={an.id} className="dc-btn" onClick={() => { setNoticeListOpen(false); setNoticeOpen(an); }} style={{ width: "100%", textAlign: "left", background: "#FAF3E8", borderRadius: 12, padding: "11px 13px", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>📢</div>
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{an.title}</div><div style={{ fontSize: 11, color: "var(--ink-soft)" }}>{an.date} · {audLabel[an.audience] || "전체"} 대상</div></div>
          <ChevronRight size={16} color="var(--ink-soft)" />
        </button>))}
      </Sheet>)}
      {newChatOpen && (<Sheet title="새 채팅" onClose={() => setNewChatOpen(false)}>
        <SearchBox value={ncq} onChange={setNcq} placeholder="학부모·강사 이름 검색" />
        {(pickList || []).filter(c => { const lbl = labelFor(c.with, c.studentId, c.teacherId); const sn = sName(c.studentId); return !ncq.trim() || lbl.includes(ncq.trim()) || (sn && sn.includes(ncq.trim())); }).map(c => { const active = hasMsgs(c.key); return (
          <button key={c.key} className="dc-btn" onClick={() => { setNewChatOpen(false); setOpen(c); }} style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", marginBottom: 8, borderRadius: 14, background: "#fff", border: "1px solid var(--line)" }}>
            <div style={{ width: 40, height: 40, borderRadius: 13, background: `linear-gradient(140deg,${colorFor(c.with, c.studentId, c.teacherId)},${colorFor(c.with, c.studentId, c.teacherId)}bb)`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{c.with === "teacher" ? <Music2 size={18} /> : <User size={18} />}</div>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13.5, fontWeight: 700 }}>{labelFor(c.with, c.studentId, c.teacherId)}</div><div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>{c.with === "teacher" ? "강사" : "학부모"}{active ? " · 대화중" : ""}</div></div>
            <ChevronRight size={16} color="var(--ink-soft)" />
          </button>); })}
      </Sheet>)}
    </div>
  );
}
function NoticeCompose({ onSave, onClose, initial }) {
  const isSchedEdit = !!(initial && initial.sendAt);
  const [audience, setAud] = useState(initial?.audience || "everyone"); const [title, setTitle] = useState(initial?.title || ""); const [text, setText] = useState(initial?.text || "");
  const [sched, setSched] = useState(false); const [at, setAt] = useState(isSchedEdit ? toLocalInput(new Date(initial.sendAt)) : toLocalInput(new Date(Date.now() + 3600000)));
  const AUDS = [["everyone", "전체"], ["parents", "학부모"], ["teachers", "강사"]];
  const willSched = isSchedEdit ? !!at : (!initial && sched && at);
  return (<Sheet title={isSchedEdit ? "예약 공지 수정" : initial ? "공지 수정" : "공지 작성"} onClose={onClose}>
    <label className="dc-label">받는 대상</label>
    <div style={{ display: "flex", gap: 7, marginBottom: 14 }}>{AUDS.map(([k, l]) => <button key={k} className="dc-btn" onClick={() => setAud(k)} style={{ flex: 1, padding: "10px 0", borderRadius: 12, background: audience === k ? "linear-gradient(140deg,#6A4C7A,#4D3759)" : "#fff", color: audience === k ? "#fff" : "var(--ink)", border: "1px solid var(--line)", fontSize: 13, fontWeight: audience === k ? 700 : 400 }}>{l}</button>)}</div>
    <Field label="제목" value={title} onChange={setTitle} />
    <label className="dc-label">내용</label>
    <textarea className="dc-input" value={text} onChange={e => setText(e.target.value)} placeholder="공지 내용을 입력하세요" style={{ minHeight: 120, resize: "none", marginBottom: 14 }} />
    {!initial && <div style={{ marginBottom: 16 }}><label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, cursor: "pointer" }}><input type="checkbox" checked={sched} onChange={e => setSched(e.target.checked)} style={{ width: 16, height: 16 }} /> <Clock size={15} color="var(--plum)" /> 예약 발송</label>{sched && <input type="datetime-local" value={at} onChange={e => setAt(e.target.value)} style={{ marginTop: 9, width: "100%", border: "1px solid var(--line)", borderRadius: 12, padding: "11px 12px", fontSize: 13.5, fontFamily: "inherit", outline: "none" }} />}</div>}
    {isSchedEdit && <div style={{ marginBottom: 16 }}><label className="dc-label">발송 시각</label><input type="datetime-local" value={at} onChange={e => setAt(e.target.value)} style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 12, padding: "11px 12px", fontSize: 13.5, fontFamily: "inherit", outline: "none" }} /></div>}
    <PrimaryBtn onClick={() => { if (!title.trim() || !text.trim()) return; onSave({ audience, title: title.trim(), text: text.trim(), sendAt: willSched ? new Date(at).getTime() : null }); }}>{isSchedEdit ? <><Clock size={16} /> 예약 수정</> : initial ? <><Pencil size={16} /> 공지 수정</> : willSched ? <><Clock size={16} /> 예약 등록</> : <><Bell size={16} /> 공지 발송</>}</PrimaryBtn>
  </Sheet>);
}
function Thread({ title, color, msgs, myBy, myId, onBack, onSend, onEdit, scheduled = [], onSchedule, onCancelSched, onEditSched }) {
  const [val, setVal] = useState(""); const endRef = useRef(null);
  const [editIdx, setEditIdx] = useState(null); const [editVal, setEditVal] = useState("");
  const [schedOpen, setSchedOpen] = useState(false); const [schedAt, setSchedAt] = useState(toLocalInput(new Date(Date.now() + 3600000)));
  const [schedListOpen, setSchedListOpen] = useState(false);
  const [schedText, setSchedText] = useState(""); const [schedEditId, setSchedEditId] = useState(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);
  const send = () => { const t = val.trim(); if (!t) return; onSend(t); setVal(""); };
  const readByOther = (m) => (m.readBy || []).some(x => x !== myId);
  const startEdit = (i, m) => { setEditIdx(i); setEditVal(m.text); };
  const saveEdit = (i) => { const t = editVal.trim(); if (t && onEdit) onEdit(i, t); setEditIdx(null); setEditVal(""); };
  const doSchedule = () => { const t = schedText.trim(); if (!t || !schedAt) return; const at = new Date(schedAt).getTime(); if (schedEditId) { if (onEditSched) onEditSched(schedEditId, t, at); } else { if (onSchedule) onSchedule(t, at); setVal(""); } setSchedOpen(false); };
  const openNewSched = () => { if (!val.trim()) return; setSchedText(val.trim()); setSchedAt(toLocalInput(new Date(Date.now() + 3600000))); setSchedEditId(null); setSchedOpen(true); };
  const openEditSched = (s) => { setSchedText(s.message.text); setSchedAt(toLocalInput(new Date(s.sendAt))); setSchedEditId(s.id); setSchedListOpen(false); setSchedOpen(true); };
  return (<div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 14, borderBottom: "1px solid var(--line)", flexShrink: 0 }}><button className="dc-btn" onClick={onBack} style={{ background: "none", padding: 4 }}><ChevronLeft size={22} color="var(--plum)" /></button><div style={{ width: 40, height: 40, borderRadius: 14, background: `linear-gradient(140deg,${color},${color}bb)`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><User size={18} /></div><div style={{ flex: 1 }}><div className="dc-serif" style={{ fontSize: 15.5, fontWeight: 700 }}>{title}</div></div></div>
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 11, padding: "14px 2px" }}><div style={{ textAlign: "center", fontSize: 11, color: "var(--ink-soft)" }}>대화 내용은 안전하게 보관됩니다</div>{msgs.map((m, i) => { const mine = m.by === myBy; const editable = mine && !readByOther(m) && !!onEdit; const editing = editIdx === i; const showDay = m.ts && !sameDay(m.ts, (msgs[i - 1] || {}).ts); return (<React.Fragment key={i}>{showDay && <div style={{ textAlign: "center", margin: "2px 0 4px" }}><span style={{ fontSize: 10.5, color: "var(--ink-soft)", background: "#F0E7D9", borderRadius: 999, padding: "3px 12px" }}>{fmtDay(m.ts)}</span></div>}<div style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 7 }}>{!mine && <div style={{ width: 26, height: 26, borderRadius: 9, background: color, color: "#fff", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>{BY_LABEL[m.by][0]}</div>}<div style={{ maxWidth: "82%" }}>{editing ? (<div style={{ display: "flex", gap: 5, alignItems: "center" }}><input value={editVal} autoFocus onChange={e => setEditVal(e.target.value)} onKeyDown={e => { if (e.key === "Enter") saveEdit(i); if (e.key === "Escape") setEditIdx(null); }} style={{ border: "1px solid var(--plum)", borderRadius: 12, padding: "8px 11px", fontSize: 13.5, fontFamily: "inherit", outline: "none", minWidth: 120 }} /><button className="dc-btn" onClick={() => saveEdit(i)} style={{ background: "var(--plum)", color: "#fff", borderRadius: 10, padding: "0 11px", height: 34, fontSize: 12.5 }}>저장</button><button className="dc-btn" onClick={() => setEditIdx(null)} style={{ background: "#EFE6D8", color: "var(--ink-soft)", borderRadius: 10, padding: "0 9px", height: 34, fontSize: 12.5 }}>취소</button></div>) : (<div className={"dc-bubble " + (mine ? "me" : "them")} onClick={editable ? () => startEdit(i, m) : undefined} style={{ cursor: editable ? "pointer" : "default" }}>{m.text}</div>)}{!editing && <div style={{ fontSize: 10, color: "var(--ink-soft)", marginTop: 3, textAlign: mine ? "right" : "left", display: "flex", gap: 4, justifyContent: mine ? "flex-end" : "flex-start", alignItems: "center" }}>{mine && (readByOther(m) ? <span style={{ color: "var(--mint)", display: "inline-flex", alignItems: "center", gap: 2 }}><CheckCheck size={12} /> 읽음</span> : <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}><Check size={12} /> 전송</span>)}{m.edited && <span style={{ opacity: .7 }}>· 수정됨</span>}<span>{m.ts ? fmtClock(m.ts) : m.time}</span>{editable && <button className="dc-btn" onClick={() => startEdit(i, m)} style={{ background: "none", padding: "0 0 0 3px", color: "var(--plum)", display: "inline-flex", alignItems: "center" }}><Pencil size={11} /></button>}</div>}</div></div></React.Fragment>); })}<div ref={endRef} /></div>
    {scheduled.length > 0 && <button className="dc-btn" onClick={() => setSchedListOpen(true)} style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 6, background: "#F3E2D3", color: "var(--plum)", borderRadius: 10, padding: "7px 11px", fontSize: 11.5, fontWeight: 700, marginTop: 8 }}><Clock size={13} /> 예약 메시지 {scheduled.length}건 보기</button>}
    <div style={{ display: "flex", gap: 8, alignItems: "center", paddingTop: 10, flexShrink: 0 }}><input value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} onFocus={() => setTimeout(() => endRef.current?.scrollIntoView({ block: "end" }), 250)} placeholder="메시지를 입력하세요…" style={{ flex: 1, border: "1px solid var(--line)", background: "#fff", borderRadius: 18, padding: "12px 16px", fontSize: 13.5, fontFamily: "inherit", outline: "none" }} />{onSchedule && <button className="dc-btn" onClick={openNewSched} title="예약 전송" style={{ width: 46, height: 46, borderRadius: 16, background: "#F0E7D9", color: "var(--plum)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Clock size={18} /></button>}<button className="dc-btn" onClick={send} style={{ width: 46, height: 46, borderRadius: 16, background: "linear-gradient(140deg,#6A4C7A,#4D3759)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Send size={18} /></button></div>
    {schedOpen && (<Sheet title={schedEditId ? "예약 메시지 수정" : "메시지 예약 전송"} onClose={() => setSchedOpen(false)}>
      <label className="dc-label">보낼 내용</label>
      <textarea className="dc-input" value={schedText} onChange={e => setSchedText(e.target.value)} placeholder="보낼 메시지를 입력하세요" style={{ minHeight: 80, resize: "none", marginBottom: 14 }} />
      <label className="dc-label">보낼 시각</label>
      <input type="datetime-local" value={schedAt} onChange={e => setSchedAt(e.target.value)} style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 12, padding: "11px 12px", fontSize: 13.5, fontFamily: "inherit", outline: "none", marginBottom: 18 }} />
      <PrimaryBtn onClick={doSchedule}><Clock size={16} /> {schedEditId ? "예약 수정" : "예약 등록"}</PrimaryBtn>
    </Sheet>)}
    {schedListOpen && (<Sheet title={`예약 메시지 (${scheduled.length}건)`} onClose={() => setSchedListOpen(false)}>
      {scheduled.length === 0 && <Empty msg="예약된 메시지가 없어요." />}
      {scheduled.map(s => (<div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "#F8F1E6", borderRadius: 12, padding: "10px 12px", marginBottom: 8 }}><button className="dc-btn" onClick={() => openEditSched(s)} style={{ flex: 1, minWidth: 0, background: "none", textAlign: "left", padding: 0 }}><div style={{ fontSize: 13, color: "#473f52", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.message.text}</div><div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginTop: 2 }}>{fmtDay(s.sendAt)} {fmtClock(s.sendAt)} · 눌러서 수정</div></button><button className="dc-btn" onClick={() => onCancelSched && onCancelSched(s.id)} style={{ background: "#FBE0DC", borderRadius: 8, padding: 6, color: "#C45A48" }}><X size={13} /></button></div>))}
    </Sheet>)}
  </div>);
}

/* ============================================================
   5a. 결제
   ============================================================ */
function PaymentView({ data, student, api }) {
  const [done, setDone] = useState(false); const [receipt, setReceipt] = useState(null); const won = n => n.toLocaleString("ko-KR") + "원";
  const mine = data.payments.filter(p => p.studentId === student.id); const pending = mine.find(p => p.status === "pending"); const history = mine.filter(p => p.status === "done");
  const paidThisYear = history.filter(h => (h.month || "").includes(String(new Date().getFullYear())));
  const pay = () => { setDone(true); setTimeout(() => { api.payNow(pending.id); setDone(false); }, 1100); };
  return (
    <div>
      <ViewTitle icon={<CreditCard size={15} />} kr="결제" en="Payment" sub={`${student.name} 수강료 결제 및 내역`} />
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <div className="dc-card" style={{ flex: 1, padding: "13px 0", textAlign: "center" }}><div className="dc-fr" style={{ fontSize: 20, fontWeight: 600, color: pending ? "#E07A55" : "#6FAE93" }}>{pending ? "미납 1건" : "납부 완료"}</div><div style={{ fontSize: 11, color: "var(--ink-soft)" }}>이번 달 상태</div></div>
        <div className="dc-card" style={{ flex: 1, padding: "13px 0", textAlign: "center" }}><div className="dc-fr" style={{ fontSize: 20, fontWeight: 600, color: "var(--plum)" }}>{paidThisYear.length}건</div><div style={{ fontSize: 11, color: "var(--ink-soft)" }}>올해 납부 횟수</div></div>
      </div>
      {pending ? (<div className="dc-card dc-enter" style={{ padding: 18, marginBottom: 16, background: "linear-gradient(150deg,#E07A55,#DBA254)", color: "#fff", border: "none", position: "relative", overflow: "hidden" }}><div style={{ position: "absolute", right: -30, top: -30, width: 130, height: 130, borderRadius: "50%", background: "rgba(255,255,255,.14)" }} /><Tag bg="rgba(255,255,255,.25)" color="#fff">납부 예정</Tag><div className="dc-serif" style={{ fontSize: 16, fontWeight: 700, marginTop: 10 }}>{pending.month}</div><div className="dc-fr" style={{ fontSize: 34, fontWeight: 600, margin: "2px 0 4px" }}>{won(pending.amount)}</div><div style={{ fontSize: 12.5, opacity: .9, display: "flex", alignItems: "center", gap: 5 }}><Clock size={13} /> 납부 기한 {pending.due}</div><div style={{ background: "rgba(255,255,255,.16)", borderRadius: 14, padding: 12, margin: "14px 0", fontSize: 12.5, lineHeight: 1.9 }}>{(pending.items || []).map((it, i) => <div key={i} style={{ opacity: .9 }}>· {it}</div>)}</div><button className="dc-btn" onClick={pay} disabled={done} style={{ width: "100%", padding: 15, borderRadius: 16, background: done ? "rgba(255,255,255,.4)" : "#fff", color: done ? "#fff" : "#E07A55", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>{done ? "처리 중…" : <><CreditCard size={18} /> 결제하기</>}</button></div>) : (<div className="dc-card dc-enter" style={{ padding: 22, marginBottom: 16, textAlign: "center", background: "linear-gradient(150deg,#6FAE93,#3F8267)", color: "#fff", border: "none" }}><div style={{ width: 56, height: 56, borderRadius: 20, background: "rgba(255,255,255,.22)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}><Check size={30} /></div><div className="dc-serif" style={{ fontSize: 17, fontWeight: 700 }}>이번 달 수강료 납부 완료!</div><div style={{ fontSize: 12.5, opacity: .9, marginTop: 4 }}>다음 결제 예정일은 7월 5일이에요.</div></div>)}
      <div className="dc-section-tt" style={{ margin: "4px 4px 12px" }}><Receipt size={14} /> 결제 내역</div>
      {history.length === 0 && <Empty msg="아직 결제 내역이 없어요." />}
      {history.map(h => (<button key={h.id} className="dc-card dc-btn" onClick={() => setReceipt(h)} style={{ width: "100%", padding: 15, marginBottom: 11, display: "flex", alignItems: "center", gap: 13, textAlign: "left" }}><div style={{ width: 42, height: 42, borderRadius: 14, background: "#F0E7D9", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--plum)" }}><Receipt size={19} /></div><div style={{ flex: 1 }}><div style={{ fontSize: 13.5, fontWeight: 700 }}>{h.month}</div><div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>{h.date} · {h.method}</div></div><div style={{ textAlign: "right" }}><div className="dc-fr" style={{ fontSize: 15, fontWeight: 600 }}>{won(h.amount)}</div><Tag bg="#E4F1EA" color="#3F8267">영수증</Tag></div></button>))}

      {receipt && (<Sheet title="영수증" onClose={() => setReceipt(null)}>
        <div style={{ textAlign: "center", marginBottom: 16 }}><div style={{ width: 52, height: 52, borderRadius: 17, background: "#E4F1EA", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}><Check size={26} color="#3F8267" /></div><div className="dc-serif" style={{ fontSize: 22, fontWeight: 700 }}>{won(receipt.amount)}</div><div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 2 }}>{receipt.month}</div></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 11, marginBottom: 16 }}>
          <Row icon={<User size={16} />} label="학생" value={student.name} />
          <Row icon={<Receipt size={16} />} label="결제일" value={receipt.date || "-"} />
          <Row icon={<CreditCard size={16} />} label="결제수단" value={receipt.method || "-"} />
          <Row icon={<KeyRound size={16} />} label="영수증 번호" value={`R-${(receipt.id || "").toUpperCase()}-${String(receipt.amount).slice(0, 4)}`} />
        </div>
        {(receipt.items || []).length > 0 && <><div className="dc-label">결제 항목</div><div style={{ background: "#F8F1E6", borderRadius: 14, padding: "10px 14px", marginBottom: 16, fontSize: 12.5, lineHeight: 2, color: "#544c5c" }}>{receipt.items.map((it, i) => <div key={i}>· {it}</div>)}</div></>}
        {receipt.payNote && <><div className="dc-label">메모</div><div style={{ background: "#F8F1E6", borderRadius: 14, padding: "10px 14px", marginBottom: 16, fontSize: 12.5, color: "#544c5c", lineHeight: 1.6 }}>{receipt.payNote}</div></>}
        <div style={{ fontSize: 11, color: "var(--ink-soft)", textAlign: "center" }}>{data.academies[student.academyId]?.name || ""} · 본 영수증은 결제 확인용입니다.</div>
      </Sheet>)}
    </div>
  );
}

/* ============================================================
   5b. 관리 (원장 / 강사)
   ============================================================ */
function ManageView({ data, me, academy, student, api, setActiveStudent, setTab, onLogout }) {
  const [edit, setEdit] = useState(null); const [copied, setCopied] = useState(false); const [rejectReq, setRejectReq] = useState(null); const [gq, setGq] = useState(""); const [classAdd, setClassAdd] = useState(false); const [classEdit, setClassEdit] = useState(null); const [assignClass, setAssignClass] = useState(null);
  const classList = (data.classes || []).filter(c => c.academyId === academy.id); const [collectOpen, setCollectOpen] = useState(false); const [leadsOpen, setLeadsOpen] = useState(false); const [makeupOpen, setMakeupOpen] = useState(false);
  const [q, setQ] = useState(""); const [filterT, setFilterT] = useState("all"); const [attFilter, setAttFilter] = useState("all"); const [sortBy, setSortBy] = useState("name"); const [limit, setLimit] = useState(20);
  const won = n => n.toLocaleString("ko-KR") + "원";
  const teachers = data.teachers.filter(t => t.academyId === academy.id);
  const students = data.students.filter(s => s.academyId === academy.id);
  if (me.role === "teacher") {
    const all = students.filter(s => s.teacherId === me.teacherId);
    const nq = q.trim();
    const list = nq ? all.filter(s => s.name.includes(nq)) : all;
    const shown = list.slice(0, limit);
    return (
      <div>
        <ViewTitle icon={<GraduationCap size={15} />} kr="담당 학생" en="My Students" sub={`담당 학생 ${all.length}명 · 선택하면 알림장·진도·출결을 관리해요`} />
        {all.length > 6 && <SearchBox value={q} onChange={setQ} placeholder="학생 이름 검색" />}
        {list.length === 0 && <Empty msg="조건에 맞는 학생이 없어요." />}
        {shown.map((s) => { const goals = data.goals.filter(g => g.studentId === s.id); const dn = goals.reduce((a, g) => a + g.items.filter(x => x.done).length, 0); const tot = goals.reduce((a, g) => a + g.items.length, 0); return (<button key={s.id} className="dc-card dc-btn" onClick={() => setActiveStudent(s.id)} style={{ width: "100%", padding: 16, marginBottom: 12, display: "flex", alignItems: "center", gap: 13, textAlign: "left", border: s.id === student?.id ? "2px solid #E07A55" : "1px solid var(--line)" }}><div className="dc-avatar">{s.avatar}</div><div style={{ flex: 1 }}><div style={{ fontSize: 15, fontWeight: 700 }}>{s.name} <span style={{ fontSize: 12, color: "var(--ink-soft)", fontWeight: 400 }}>{s.age}</span></div><div style={{ fontSize: 12, color: "var(--ink-soft)" }}>진도 {tot ? Math.round(dn / tot * 100) : 0}% · {dn}/{tot}곡</div></div>{s.id === student?.id ? <Tag bg="#F3E2D3" color="#B5683F">선택됨</Tag> : <ChevronRight size={18} color="var(--ink-soft)" />}</button>); })}
        {list.length > shown.length && <div style={{ marginBottom: 14 }}><MoreBtn onClick={() => setLimit(l => l + 20)} remaining={list.length - shown.length} /></div>}
        <LogoutCard me={me} academy={academy} onLogout={onLogout} />
      </div>
    );
  }
  const nq = q.trim();
  const junePay = sid => data.payments.find(p => p.studentId === sid && p.month.includes("6월"));
  let filtered = students;
  if (nq) filtered = filtered.filter(s => s.name.includes(nq));
  if (filterT !== "all") filtered = filtered.filter(s => s.teacherId === filterT);
  if (attFilter === "unpaid") filtered = filtered.filter(s => { const p = junePay(s.id); return p && p.status === "pending"; });
  if (sortBy === "name") filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name, "ko"));
  else if (sortBy === "recent") filtered = [...filtered].sort((a, b) => a.days - b.days);
  else if (sortBy === "unpaid") filtered = [...filtered].sort((a, b) => ((junePay(a.id)?.status === "pending") ? 0 : 1) - ((junePay(b.id)?.status === "pending") ? 0 : 1));
  const shownStudents = filtered.slice(0, limit);
  const unpaidList = students.filter(s => { const p = junePay(s.id); return p && p.status === "pending"; });
  const pendingLinks = data.linkRequests.filter(r => r.academyId === academy.id && r.status === "pending");
  if (collectOpen) return <CollectView data={data} academy={academy} students={students} api={api} me={me} onBack={() => setCollectOpen(false)} />;
  if (leadsOpen) return <LeadsView data={data} academy={academy} api={api} onBack={() => setLeadsOpen(false)} />;
  if (makeupOpen) return <MakeupView data={data} academy={academy} students={students} api={api} onBack={() => setMakeupOpen(false)} />;
  return (
    <div>
      <ViewTitle icon={<Settings size={15} />} kr="학원 관리" en="Admin" sub="학원 정보·강사·학생·결제를 모두 관리하세요" />
      {me.role === "admin" && (() => { const unpaidN = students.filter(s => { const p = data.payments.find(p => p.studentId === s.id && p.month === `${new Date().getMonth() + 1}월`); return p && p.status !== "done"; }).length; return (
        <button className="dc-btn dc-enter" onClick={() => setCollectOpen(true)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: 15, borderRadius: 18, background: "linear-gradient(140deg,#6A4C7A,#4D3759)", color: "#fff", marginBottom: 16, textAlign: "left" }}>
          <div style={{ width: 42, height: 42, borderRadius: 13, background: "rgba(255,255,255,.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Receipt size={20} /></div>
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 15, fontWeight: 700 }}>수납 확인 바로가기</div><div style={{ fontSize: 11.5, opacity: .85 }}>현장·이체·지역화폐·온라인 한눈에 이중확인</div></div>
          {unpaidN > 0 ? <span style={{ background: "#fff", color: "#C45A48", fontSize: 12, fontWeight: 700, borderRadius: 999, padding: "4px 11px", flexShrink: 0 }}>미납 {unpaidN}</span> : <span style={{ background: "rgba(255,255,255,.2)", fontSize: 12, fontWeight: 700, borderRadius: 999, padding: "4px 11px", flexShrink: 0 }}>완납 ✓</span>}
          <ChevronRight size={18} style={{ opacity: .8, flexShrink: 0 }} />
        </button>
      ); })()}
      {me.role === "admin" && (() => { const leadN = (data.leads || []).filter(l => l.academyId === academy.id && l.status !== "registered").length; const makeupN = (data.makeups || []).filter(m => m.academyId === academy.id && !m.done).length; return (
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <button className="dc-btn dc-enter" onClick={() => setLeadsOpen(true)} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, padding: "13px 12px", borderRadius: 16, background: "#fff", border: "1px solid var(--line)", textAlign: "left" }}><div style={{ display: "flex", alignItems: "center", gap: 6 }}><UserPlus size={16} color="var(--coral-deep)" /><span style={{ fontSize: 13, fontWeight: 700 }}>문의·체험</span></div><div style={{ fontSize: 11, color: "var(--ink-soft)" }}>대기 {leadN}명</div></button>
          <button className="dc-btn dc-enter" onClick={() => setMakeupOpen(true)} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, padding: "13px 12px", borderRadius: 16, background: "#fff", border: "1px solid var(--line)", textAlign: "left" }}><div style={{ display: "flex", alignItems: "center", gap: 6 }}><RotateCcw size={16} color="var(--plum)" /><span style={{ fontSize: 13, fontWeight: 700 }}>결석·보강</span></div><div style={{ fontSize: 11, color: "var(--ink-soft)" }}>보강대기 {makeupN}건</div></button>
        </div>
      ); })()}
      <SearchBox value={gq} onChange={setGq} placeholder="학생·강사·미납 통합 검색" />
      {gq.trim() && (() => {
        const q = gq.trim();
        const tHit = teachers.filter(t => t.name.includes(q) || (t.subject || "").includes(q));
        const sHit = students.filter(s => s.name.includes(q));
        return (
          <div className="dc-card dc-enter" style={{ padding: 14, marginBottom: 14 }}>
            <div className="dc-section-tt" style={{ marginBottom: 10 }}><Search size={14} /> 검색 결과 <Tag bg="#F0E7D9" color="var(--plum)">{tHit.length + sHit.length}</Tag></div>
            {tHit.length + sHit.length === 0 && <Empty msg="일치하는 학생·강사가 없어요." />}
            {tHit.map(t => (<div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid var(--line)" }}><div style={{ width: 32, height: 32, borderRadius: 10, background: t.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><Music2 size={15} /></div><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13.5, fontWeight: 700 }}>{t.name} 선생님</div><div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>{t.subject} · 학생 {students.filter(s => s.teacherId === t.id).length}명</div></div><button className="dc-btn" onClick={() => setEdit({ type: "teacher", payload: t })} style={{ background: "#F0E7D9", color: "var(--plum)", borderRadius: 9, padding: "6px 10px", fontSize: 12 }}>수정</button></div>))}
            {sHit.map(s => { const p = junePay(s.id); const unpaid = p && p.status === "pending"; return (<div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid var(--line)" }}><div style={{ width: 32, height: 32, borderRadius: 10, background: "#F0E7D9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{s.avatar}</div><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13.5, fontWeight: 700 }}>{s.name} {unpaid ? <Tag bg="#FBE0DC" color="#C45A48">미납</Tag> : <Tag bg="#E4F1EA" color="#3F8267">완납</Tag>}</div><div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>담당 {(teachers.find(t => t.id === s.teacherId) || {}).name || "미배정"} · {unpaid ? `미납 ${(p.amount || 0).toLocaleString("ko-KR")}원` : "수강료 완료"}</div></div><button className="dc-btn" onClick={() => { setActiveStudent(s.id); setTab("schedule"); }} style={{ background: "#6A4C7A", color: "#fff", borderRadius: 9, padding: "6px 10px", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}><CalendarDays size={13} /> 시간표</button></div>); })}
            {sHit.length > 0 && <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 9 }}>학생의 <b>시간표</b> 버튼을 누르면 그 학생으로 바로 이동해요.</div>}
          </div>
        );
      })()}
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>{[["학생", students.length, "#6A4C7A"], ["강사", teachers.length, "#3F7CA8"], ["미납", unpaidList.length, "#E07A55"]].map(([l, n, c]) => (<div key={l} className="dc-card" style={{ flex: 1, padding: "12px 0", textAlign: "center" }}><div className="dc-fr" style={{ fontSize: 24, fontWeight: 600, color: c }}>{n}</div><div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>{l}</div></div>))}</div>
      {pendingLinks.length > 0 && (
        <div className="dc-card dc-enter" style={{ padding: 16, marginBottom: 14, border: "1.5px solid #F4D7C2" }}>
          <div className="dc-section-tt" style={{ marginBottom: 12 }}><UserPlus size={14} /> 자녀 연결 승인 대기 <Tag bg="#FBE0DC" color="#C45A48">{pendingLinks.length}</Tag></div>
          {pendingLinks.map(r => { const stu = data.students.find(s => s.id === r.studentId); return (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: "1px solid var(--line)" }}>
              <div style={{ fontSize: 20 }}>{stu ? stu.avatar : "🧒"}</div>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13.5, fontWeight: 700 }}>{r.parentName} → {stu ? stu.name : "?"}</div><div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>학부모 자녀 연결 요청 · {r.time}</div></div>
              <button className="dc-btn" onClick={() => api.approveLink(r.id)} style={{ background: "#E4F1EA", color: "#3F8267", borderRadius: 10, padding: "7px 11px", fontSize: 12.5, display: "flex", alignItems: "center", gap: 4 }}><Check size={14} /> 승인</button>
              <button className="dc-btn" onClick={() => setRejectReq(r)} style={{ background: "#FBE0DC", color: "#C45A48", borderRadius: 10, padding: "7px 11px", fontSize: 12.5 }}>거절</button>
            </div>
          ); })}
        </div>
      )}
      <div className="dc-card dc-enter" style={{ padding: 16, marginBottom: 14 }}>
        <div className="dc-section-tt" style={{ marginBottom: 12 }}><Building2 size={14} /> 학원 정보</div>
        <InfoRow label="학원명" value={academy.name} onEdit={() => setEdit({ type: "academy" })} />
        <InfoRow label="슬로건" value={academy.tagline} onEdit={() => setEdit({ type: "academy" })} />
        <InfoRow label="원장" value={`${academy.directorName} 원장`} onEdit={() => setEdit({ type: "academy" })} />
        <InfoRow label="운영시간" value={`${academy.open || "13:00"} ~ ${academy.close || "19:00"}`} onEdit={() => setEdit({ type: "academy" })} />
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, padding: 12, borderRadius: 14, background: "linear-gradient(140deg,#F3E2D3,#EAD3E1)" }}><KeyRound size={16} color="var(--plum)" /><div style={{ flex: 1 }}><div style={{ fontSize: 11, color: "var(--ink-soft)" }}>강사·학부모 초대코드</div><div className="dc-fr" style={{ fontSize: 17, fontWeight: 600, color: "var(--plum-deep)", letterSpacing: ".5px" }}>{academy.inviteCode}</div></div><button className="dc-btn" onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }} style={{ background: "#fff", borderRadius: 10, padding: "7px 11px", color: "var(--plum)", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>{copied ? <><Check size={13} /> 복사됨</> : <><Copy size={13} /> 복사</>}</button></div>
        <button className="dc-btn" onClick={() => api.confirm({ title: "베타 데이터를 초기화할까요?", message: "모든 입력 내용이 처음 데모 상태로 되돌아갑니다. 되돌릴 수 없어요.", danger: true, onConfirm: () => api.resetBeta() })} style={{ width: "100%", marginTop: 12, padding: 11, borderRadius: 12, background: "#F8F1E6", color: "var(--ink-soft)", fontSize: 12.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><RotateCcw size={14} /> 베타 데이터 초기화</button>
      </div>
      <div className="dc-card dc-enter" style={{ padding: 16, marginBottom: 14 }}><div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}><div className="dc-section-tt" style={{ flex: 1 }}><Users size={14} /> 강사 관리 ({teachers.length})</div><button className="dc-btn" onClick={() => setEdit({ type: "teacher" })} style={{ background: "#F0E7D9", color: "var(--plum)", borderRadius: 10, padding: "5px 11px", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}><Plus size={14} /> 추가</button></div>{teachers.length === 0 && <Empty msg="강사를 추가하거나, 초대코드로 가입을 받아보세요." />}{teachers.map(t => (<div key={t.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 0", borderBottom: "1px solid var(--line)" }}><div style={{ width: 36, height: 36, borderRadius: 12, background: t.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><Music2 size={16} /></div><div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 700 }}>{t.name} 선생님</div><div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{t.subject} · 학생 {students.filter(s => s.teacherId === t.id).length}명</div></div><button className="dc-btn" onClick={() => setEdit({ type: "teacher", payload: t })} style={{ background: "none", padding: 5 }}><Pencil size={15} color="var(--ink-soft)" /></button><button className="dc-btn" onClick={() => api.confirm({ title: "강사를 삭제할까요?", message: `${t.name} 선생님을 삭제합니다. 이 작업은 되돌릴 수 없어요.`, onConfirm: () => api.deleteTeacher(t.id) })} style={{ background: "none", padding: 5 }}><Trash2 size={15} color="#C9BEAF" /></button></div>))}</div>
      <div className="dc-card dc-enter" style={{ padding: 16, marginBottom: 14 }}><div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}><div className="dc-section-tt" style={{ flex: 1 }}><GraduationCap size={14} /> 반 관리 ({classList.length})</div><button className="dc-btn" onClick={() => setClassAdd(true)} style={{ background: "#F0E7D9", color: "var(--plum)", borderRadius: 10, padding: "5px 11px", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}><Plus size={14} /> 추가</button></div>{classList.length === 0 ? <Empty msg="반을 추가하면 명단표에 열로 나타나요." /> : classList.map(c => (<div key={c.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 0", borderBottom: "1px solid var(--line)" }}><div style={{ width: 14, height: 14, borderRadius: 5, background: c.color, flexShrink: 0 }} /><div style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{c.name} <span style={{ fontSize: 11, color: "var(--ink-soft)", fontWeight: 400 }}>· {c.type === "list" ? "개인" : "반"}</span></div><button className="dc-btn" onClick={() => setAssignClass(c)} style={{ background: "#E4F1EA", color: "#3F8267", borderRadius: 9, padding: "6px 10px", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}><UserPlus size={13} /> 배정</button><button className="dc-btn" onClick={() => setClassEdit(c)} style={{ background: "none", padding: 5 }}><Pencil size={15} color="var(--ink-soft)" /></button><button className="dc-btn" onClick={() => api.confirm({ title: "반을 삭제할까요?", message: `${c.name} · 이 반의 명단도 함께 삭제돼요.`, onConfirm: () => api.deleteClass(c.id) })} style={{ background: "none", padding: 5 }}><Trash2 size={15} color="#C9BEAF" /></button></div>))}</div>
      <div className="dc-card dc-enter" style={{ padding: 16, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}><div className="dc-section-tt" style={{ flex: 1 }}><GraduationCap size={14} /> 학생 관리 ({students.length})</div><button className="dc-btn" onClick={() => setEdit({ type: "student" })} style={{ background: "#F0E7D9", color: "var(--plum)", borderRadius: 10, padding: "5px 11px", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}><Plus size={14} /> 추가</button></div>
        {students.length > 6 && (<><SearchBox value={q} onChange={setQ} placeholder="학생 이름 검색" /><Chips options={[{ v: "all", label: "전체 강사" }, ...teachers.map(t => ({ v: t.id, label: t.name }))]} value={filterT} onChange={setFilterT} /><Chips options={[{ v: "all", label: "전체" }, { v: "unpaid", label: "미납만" }]} value={attFilter} onChange={setAttFilter} /><Chips options={[{ v: "name", label: "이름순" }, { v: "recent", label: "최근등록" }, { v: "unpaid", label: "미납먼저" }]} value={sortBy} onChange={setSortBy} /><div style={{ fontSize: 11.5, color: "var(--ink-soft)", margin: "2px 0 8px" }}>검색 결과 {filtered.length}명</div></>)}
        {filtered.length === 0 && <Empty msg="조건에 맞는 학생이 없어요." />}
        {shownStudents.map(s => (<div key={s.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 0", borderBottom: "1px solid var(--line)" }}><div style={{ width: 36, height: 36, borderRadius: 12, background: "#F0E7D9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{s.avatar}</div><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 700 }}>{s.name} <span style={{ fontSize: 12, color: "var(--ink-soft)", fontWeight: 400 }}>{s.age}</span></div><div style={{ fontSize: 12, color: "var(--ink-soft)" }}>담당: {(teachers.find(t => t.id === s.teacherId) || {}).name || "미배정"} 선생님</div></div><button className="dc-btn" onClick={() => setEdit({ type: "student", payload: s })} style={{ background: "none", padding: 5 }}><Pencil size={15} color="var(--ink-soft)" /></button><button className="dc-btn" onClick={() => api.confirm({ title: "학생을 삭제할까요?", message: `${s.name} 학생을 삭제합니다. 알림장·진도·결제 정보가 함께 사라질 수 있어요.`, onConfirm: () => api.deleteStudent(s.id) })} style={{ background: "none", padding: 5 }}><Trash2 size={15} color="#C9BEAF" /></button></div>))}
        {filtered.length > shownStudents.length && <div style={{ marginTop: 10 }}><MoreBtn onClick={() => setLimit(l => l + 30)} remaining={filtered.length - shownStudents.length} /></div>}
      </div>
      <div className="dc-card dc-enter" style={{ padding: 16, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}><div className="dc-section-tt" style={{ flex: 1 }}><CreditCard size={14} /> 이번 달 수납 현황</div><button className="dc-btn" onClick={() => setCollectOpen(true)} style={{ background: "#EFE7F0", color: "var(--plum)", borderRadius: 10, padding: "6px 11px", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 4, marginRight: 6 }}><Receipt size={13} /> 수납확인</button><button className="dc-btn" onClick={() => setEdit({ type: "charge" })} style={{ background: "linear-gradient(140deg,#6A4C7A,#4D3759)", color: "#fff", borderRadius: 10, padding: "7px 12px", fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}><Plus size={14} /> 수납 입력</button></div>
        {unpaidList.length === 0 ? <Empty msg="미납 학생이 없어요. 모두 완료! 🎉" /> : (<>{unpaidList.slice(0, 12).map(s => { const p = junePay(s.id); return (<div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid var(--line)" }}><div style={{ fontSize: 18 }}>{s.avatar}</div><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13.5, fontWeight: 700 }}>{s.name}</div><div style={{ fontSize: 11, color: "var(--ink-soft)" }}>{p.month} · {won(p.amount)}</div></div><button className="dc-btn" onClick={() => setEdit({ type: "collect", payload: p })} style={{ background: "#E4F1EA", color: "#3F8267", borderRadius: 9, padding: "7px 11px", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}><Check size={13} /> 수납완료</button></div>); })}{unpaidList.length > 12 && <div style={{ fontSize: 12, color: "var(--ink-soft)", textAlign: "center", paddingTop: 10 }}>외 {unpaidList.length - 12}명 미납</div>}</>)}
      </div>
      <LogoutCard me={me} academy={academy} onLogout={onLogout} />
      {edit?.type === "academy" && <EditAcademy academy={academy} onSave={(v) => { api.saveAcademy(academy.id, v); setEdit(null); }} onClose={() => setEdit(null)} />}
      {rejectReq && <RejectReason req={rejectReq} student={data.students.find(s => s.id === rejectReq.studentId)} onReject={(reason) => { api.rejectLink(rejectReq.id, reason); setRejectReq(null); }} onClose={() => setRejectReq(null)} />}
      {edit?.type === "charge" && <ChargeForm students={students} onCharge={(v) => { api.addCharge(v); setEdit(null); }} onPaid={(v) => { api.addPaidRecord(v); setEdit(null); }} onClose={() => setEdit(null)} />}
      {edit?.type === "collect" && <CollectSheet pay={edit.payload} student={students.find(s => s.id === edit.payload.studentId)} onCollect={(method, note) => { api.markPaid(edit.payload.id, method, note); setEdit(null); }} onClose={() => setEdit(null)} />}
      {classAdd && <ClassForm onSave={(name, type) => { api.addClass(academy.id, name, type); setClassAdd(false); }} onClose={() => setClassAdd(false)} />}
      {classEdit && <ClassForm initial={classEdit} onSave={(name, type) => { api.updateClass(classEdit.id, { name, type }); setClassEdit(null); }} onClose={() => setClassEdit(null)} />}
      {assignClass && <AssignClass cls={assignClass} students={students} onAssign={(name, daysSel, time, sid) => { daysSel.forEach(d => api.addRoster({ academyId: academy.id, classId: assignClass.id, day: d, time, name, studentId: sid })); setAssignClass(null); }} onClose={() => setAssignClass(null)} />}
      {edit?.type === "teacher" && <EditTeacher t={edit.payload} onSave={(v) => { edit.payload ? api.updateTeacher(edit.payload.id, v) : api.addTeacher(academy.id, v); setEdit(null); }} onClose={() => setEdit(null)} />}
      {edit?.type === "student" && <EditStudent s={edit.payload} teachers={teachers} onSave={(v) => { edit.payload ? api.updateStudent(edit.payload.id, v) : api.addStudent(academy.id, v); setEdit(null); }} onClose={() => setEdit(null)} />}
    </div>
  );
}
function LogoutCard({ me, academy, onLogout }) { return (<div className="dc-card" style={{ padding: 16, marginTop: 4 }}><div style={{ display: "flex", alignItems: "center", gap: 11 }}><div style={{ width: 40, height: 40, borderRadius: 13, background: "linear-gradient(140deg,#6A4C7A,#4D3759)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><User size={18} /></div><div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 700 }}>{me.name}</div><div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{academy.name} · {me.role === "admin" ? "원장" : "강사"}</div></div><button className="dc-btn" onClick={onLogout} style={{ background: "#FBE0DC", color: "#C45A48", borderRadius: 12, padding: "9px 13px", fontSize: 13, display: "flex", alignItems: "center", gap: 5 }}><LogOut size={15} /> 로그아웃</button></div></div>); }
function InfoRow({ label, value, onEdit }) { return (<div style={{ display: "flex", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--line)" }}><div style={{ fontSize: 12.5, color: "var(--ink-soft)", width: 70 }}>{label}</div><div style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{value}</div>{onEdit && <button className="dc-btn" onClick={onEdit} style={{ background: "none", padding: 4 }}><Pencil size={15} color="var(--plum)" /></button>}</div>); }
const PAY_METHODS = ["현금", "계좌이체", "카드", "지역화폐", "기타"];
function MakeupView({ data, academy, students, api, onBack }) {
  const makeups = (data.makeups || []).filter(m => m.academyId === academy.id);
  const [edit, setEdit] = useState(null); const [adding, setAdding] = useState(false); const [tab, setTab] = useState("pending");
  const pending = makeups.filter(m => !m.done); const done = makeups.filter(m => m.done);
  const shown = tab === "pending" ? pending : done;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}><button className="dc-btn" onClick={onBack} style={{ background: "#F0E7D9", borderRadius: 11, padding: 9 }}><ChevronLeft size={18} color="var(--plum)" /></button><div style={{ flex: 1 }}><div className="dc-serif" style={{ fontSize: 18, fontWeight: 700 }}>결석·보강 관리</div><div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>결석 → 보강 일정 → 완료까지 추적</div></div><button className="dc-btn" onClick={() => setAdding(true)} style={{ background: "linear-gradient(140deg,#EE9573,#E07A55)", color: "#fff", borderRadius: 11, padding: "8px 12px", fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}><Plus size={14} /> 추가</button></div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button className="dc-btn" onClick={() => setTab("pending")} style={{ flex: 1, padding: "9px 0", borderRadius: 11, background: tab === "pending" ? "#6A4C7A" : "#fff", color: tab === "pending" ? "#fff" : "var(--ink)", border: "1px solid var(--line)", fontSize: 13, fontWeight: tab === "pending" ? 700 : 400 }}>보강 대기 {pending.length}</button>
        <button className="dc-btn" onClick={() => setTab("done")} style={{ flex: 1, padding: "9px 0", borderRadius: 11, background: tab === "done" ? "#6A4C7A" : "#fff", color: tab === "done" ? "#fff" : "var(--ink)", border: "1px solid var(--line)", fontSize: 13, fontWeight: tab === "done" ? 700 : 400 }}>완료 {done.length}</button>
      </div>
      {shown.length === 0 ? <Empty msg={tab === "pending" ? "보강 대기 건이 없어요." : "완료된 보강이 없어요."} /> : shown.map(m => (
        <div key={m.id} className="dc-card" style={{ padding: 13, marginBottom: 9 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button className="dc-btn" onClick={() => api.toggleMakeupDone(m.id)} title="보강 완료" style={{ background: "none", padding: 0, flexShrink: 0 }}><div className={"dc-check" + (m.done ? " on" : "")} style={{ width: 21, height: 21 }}>{m.done && <Check size={14} color="#fff" />}</div></button>
            <button className="dc-btn" onClick={() => setEdit(m)} style={{ background: "none", padding: 0, flex: 1, minWidth: 0, textAlign: "left" }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{m.name} <span style={{ fontSize: 11.5, fontWeight: 400, color: "#C45A48" }}>· {m.reason}</span></div>
              <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 2 }}>결석 {m.absentDate}{m.makeupDate ? ` → 보강 ${m.makeupDate}` : " → 보강일 미정"}</div>
            </button>
          </div>
        </div>
      ))}
      {(adding || edit) && <MakeupForm item={edit} students={students} onSave={(v) => { if (edit) api.updateMakeup(edit.id, v); else api.addMakeup({ ...v, academyId: academy.id }); setEdit(null); setAdding(false); }} onAddToRoster={({ name, day, time }) => { const mk = (data.classes || []).find(c => c.academyId === academy.id && c.name === "보강"); api.addRoster({ academyId: academy.id, classId: mk ? mk.id : "c_mk", day, time, name, makeup: true }); api.confirm({ title: "명단에 보강을 넣었어요", message: `${day} ${time} · ${name} (보강)`, confirmText: "확인" }); }} onDelete={edit ? () => { const id = edit.id; api.confirm({ title: "삭제할까요?", message: edit.name, onConfirm: () => api.deleteMakeup(id) }); setEdit(null); } : null} onClose={() => { setEdit(null); setAdding(false); }} />}
    </div>
  );
}
function MakeupForm({ item, students, onSave, onDelete, onAddToRoster, onClose }) {
  const [name, setName] = useState(item?.name || ""); const [sq, setSq] = useState(""); const [absentDate, setAbsent] = useState(item?.absentDate || ""); const [reason, setReason] = useState(item?.reason || ""); const [makeupDate, setMakeup] = useState(item?.makeupDate || ""); const [done, setDone] = useState(!!item?.done);
  const [mkDay, setMkDay] = useState(item?.mkDay || ""); const [mkTime, setMkTime] = useState(item?.mkTime || "");
  const REASONS = ["병결", "여행", "공휴일", "독감", "당일병결", "기타"]; const DAYS = ["월", "화", "수", "목", "금", "토"];
  const fs = sq.trim() ? students.filter(s => s.name.includes(sq.trim())) : [];
  const save = () => name.trim() && onSave({ name: name.trim(), absentDate: absentDate.trim(), reason, makeupDate: makeupDate.trim(), done, mkDay, mkTime: mkTime.trim() });
  return (<Sheet title={item ? "결석·보강 정보" : "결석·보강 추가"} onClose={onClose}>
    <Field label="이름" value={name} onChange={setName} placeholder="학생 이름" />
    {!item && <><SearchBox value={sq} onChange={setSq} placeholder="등록 학생에서 찾기(선택)" />{fs.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 12 }}>{fs.slice(0, 8).map(s => <button key={s.id} className="dc-btn" onClick={() => { setName(s.name); setSq(""); }} style={{ padding: "7px 12px", borderRadius: 11, background: "#fff", border: "1px solid var(--line)", fontSize: 13 }}>{s.name}</button>)}</div>}</>}
    <Field label="결석 날짜" value={absentDate} onChange={setAbsent} placeholder="예) 12/1(월) 또는 1/8~16" />
    <label className="dc-label">사유</label>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 14 }}>{REASONS.map(r => <button key={r} className="dc-btn" onClick={() => setReason(r)} style={{ padding: "8px 13px", borderRadius: 999, background: reason === r ? "#E07A55" : "#fff", color: reason === r ? "#fff" : "var(--ink)", border: "1px solid var(--line)", fontSize: 12.5 }}>{r}</button>)}</div>
    <Field label="보강 메모 / 처리" value={makeupDate} onChange={setMakeup} placeholder="예) 3회 차감, 환불, 한달 휴원" />
    <div style={{ background: "#F6EEFA", borderRadius: 14, padding: 13, marginBottom: 16, border: "1px solid #E4D3EE" }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--plum-deep)", marginBottom: 9 }}>📅 보강 일정 잡기 (명단 반영용)</div>
      <label className="dc-label">요일</label>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>{DAYS.map(d => <button key={d} className="dc-btn" onClick={() => setMkDay(d)} style={{ flex: 1, padding: "8px 0", borderRadius: 10, background: mkDay === d ? "#8E6BB0" : "#fff", color: mkDay === d ? "#fff" : "var(--ink)", border: "1px solid var(--line)", fontSize: 12.5, fontWeight: mkDay === d ? 700 : 400 }}>{d}</button>)}</div>
      <label className="dc-label">시간 (학생 시간표 보고 빈 시간에)</label>
      <input className="dc-input" value={mkTime} onChange={e => setMkTime(e.target.value)} placeholder="예) 5:00, 17:30" style={{ marginBottom: 10 }} />
      {onAddToRoster && <button className="dc-btn" onClick={() => { if (!name.trim() || !mkDay || !mkTime.trim()) return; onAddToRoster({ name: name.trim(), day: mkDay, time: mkTime.trim() }); }} style={{ width: "100%", padding: 11, borderRadius: 12, background: "#8E6BB0", color: "#fff", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Plus size={15} /> 명단에 보강 넣기 (일회성)</button>}
      <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginTop: 7, lineHeight: 1.5 }}>‘보강’ 반의 해당 요일·시간에 일회성으로 추가돼요. 정규 시간표는 바뀌지 않아요.</div>
    </div>
    <button className="dc-btn" onClick={() => setDone(v => !v)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "11px 13px", borderRadius: 13, background: done ? "#E4F1EA" : "#F8F1E6", marginBottom: 18, border: "1px solid var(--line)" }}><div className={"dc-check" + (done ? " on" : "")} style={{ width: 20, height: 20 }}>{done && <Check size={13} color="#fff" />}</div><span style={{ fontSize: 13.5, fontWeight: 700, color: done ? "#3F8267" : "var(--ink)" }}>{done ? "보강 완료" : "보강 대기"}</span></button>
    <div style={{ display: "flex", gap: 8 }}>
      {onDelete && <button className="dc-btn" onClick={onDelete} style={{ flex: 1, padding: 14, borderRadius: 14, background: "#FBE0DC", color: "#C45A48", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Trash2 size={15} /> 삭제</button>}
      <button className="dc-btn" onClick={save} style={{ flex: 2, padding: 14, borderRadius: 14, background: "linear-gradient(140deg,#6A4C7A,#4D3759)", color: "#fff", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Check size={15} /> 저장</button>
    </div>
  </Sheet>);
}
function LeadsView({ data, academy, api, onBack }) {
  const leads = (data.leads || []).filter(l => l.academyId === academy.id);
  const [edit, setEdit] = useState(null); const [adding, setAdding] = useState(false);
  const STATUS = { inquiry: ["문의", "#EFE9E0", "#6B6357"], trial: ["체험예정", "#F3E2D3", "#B5683F"], registered: ["등록완료", "#E4F1EA", "#3F8267"] };
  const order = ["trial", "inquiry", "registered"];
  const sorted = [...leads].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}><button className="dc-btn" onClick={onBack} style={{ background: "#F0E7D9", borderRadius: 11, padding: 9 }}><ChevronLeft size={18} color="var(--plum)" /></button><div style={{ flex: 1 }}><div className="dc-serif" style={{ fontSize: 18, fontWeight: 700 }}>문의·체험 대기</div><div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>신규 문의·체험 학생을 관리해요</div></div><button className="dc-btn" onClick={() => setAdding(true)} style={{ background: "linear-gradient(140deg,#EE9573,#E07A55)", color: "#fff", borderRadius: 11, padding: "8px 12px", fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}><Plus size={14} /> 추가</button></div>
      {sorted.length === 0 ? <Empty msg="문의·체험 대기자가 없어요." /> : sorted.map(l => { const st = STATUS[l.status] || STATUS.inquiry; return (
        <button key={l.id} className="dc-card dc-btn" onClick={() => setEdit(l)} style={{ width: "100%", textAlign: "left", padding: 14, marginBottom: 9, display: "block" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: l.memo ? 6 : 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700 }}>{l.name}</div>
            {l.grade && <span style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>{l.grade}</span>}
            <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, background: st[1], color: st[2], borderRadius: 999, padding: "3px 10px" }}>{st[0]}</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-soft)", display: "flex", flexWrap: "wrap", gap: 10 }}>{l.phone && <span>📞 {l.phone}</span>}{l.trialDate && <span>🎵 체험 {l.trialDate}</span>}</div>
          {l.memo && <div style={{ fontSize: 12, color: "#8A5A2B", marginTop: 6 }}>✎ {l.memo}</div>}
        </button>
      ); })}
      {(adding || edit) && <LeadForm lead={edit} onSave={(v) => { if (edit) api.updateLead(edit.id, v); else api.addLead({ ...v, academyId: academy.id }); setEdit(null); setAdding(false); }} onDelete={edit ? () => { const id = edit.id; api.confirm({ title: "삭제할까요?", message: edit.name, onConfirm: () => api.deleteLead(id) }); setEdit(null); } : null} onClose={() => { setEdit(null); setAdding(false); }} />}
    </div>
  );
}
function LeadForm({ lead, onSave, onDelete, onClose }) {
  const [name, setName] = useState(lead?.name || ""); const [grade, setGrade] = useState(lead?.grade || ""); const [phone, setPhone] = useState(lead?.phone || ""); const [trialDate, setTrial] = useState(lead?.trialDate || ""); const [status, setStatus] = useState(lead?.status || "inquiry"); const [memo, setMemo] = useState(lead?.memo || "");
  const STS = [["inquiry", "문의"], ["trial", "체험예정"], ["registered", "등록완료"]];
  return (<Sheet title={lead ? "문의·체험 정보" : "문의·체험 추가"} onClose={onClose}>
    <Field label="이름" value={name} onChange={setName} placeholder="예) 홍길동" />
    <Field label="학년" value={grade} onChange={setGrade} placeholder="예) 신목초2" />
    <Field label="연락처 (학부모)" value={phone} onChange={setPhone} placeholder="예) 010-0000-0000" />
    <Field label="체험 수업일" value={trialDate} onChange={setTrial} placeholder="예) 1/13(화) 1:50" />
    <label className="dc-label">상태</label>
    <div style={{ display: "flex", gap: 7, marginBottom: 14 }}>{STS.map(([k, l]) => <button key={k} className="dc-btn" onClick={() => setStatus(k)} style={{ flex: 1, padding: "9px 0", borderRadius: 11, background: status === k ? "#6A4C7A" : "#fff", color: status === k ? "#fff" : "var(--ink)", border: "1px solid var(--line)", fontSize: 12.5, fontWeight: status === k ? 700 : 400 }}>{l}</button>)}</div>
    <label className="dc-label">특이사항</label>
    <textarea className="dc-input" value={memo} onChange={e => setMemo(e.target.value)} placeholder="예) 갈산초 오케 합격 · 친구 소개" style={{ minHeight: 64, resize: "none", marginBottom: 18 }} />
    <div style={{ display: "flex", gap: 8 }}>
      {onDelete && <button className="dc-btn" onClick={onDelete} style={{ flex: 1, padding: 14, borderRadius: 14, background: "#FBE0DC", color: "#C45A48", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Trash2 size={15} /> 삭제</button>}
      <button className="dc-btn" onClick={() => name.trim() && onSave({ name: name.trim(), grade: grade.trim(), phone: phone.trim(), trialDate: trialDate.trim(), status, memo: memo.trim() })} style={{ flex: 2, padding: 14, borderRadius: 14, background: "linear-gradient(140deg,#6A4C7A,#4D3759)", color: "#fff", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Check size={15} /> 저장</button>
    </div>
  </Sheet>);
}
function CollectView({ data, academy, students, api, me, onBack }) {
  const canConfirm = me.role === "admin";
  const won = n => (n || 0).toLocaleString("ko-KR") + "원";
  const sids = new Set(students.map(s => s.id));
  const months = Array.from(new Set(data.payments.filter(p => sids.has(p.studentId)).map(p => p.month))).sort().reverse();
  const curMon = `${new Date().getMonth() + 1}월`;
  const [mon, setMon] = useState(months.includes(curMon) ? curMon : (months[0] || curMon));
  const [mf, setMf] = useState("all"); const [collect, setCollect] = useState(null); const [cq, setCq] = useState("");
  const sName = id => (students.find(s => s.id === id) || {}).name || "?";
  const sAva = id => (students.find(s => s.id === id) || {}).avatar || "🎵";
  const rows = students.map(s => ({ s, p: data.payments.find(p => p.studentId === s.id && p.month === mon) })).filter(x => x.p);
  const methodOf = (p) => p.status !== "done" ? null : (!p.manual ? "온라인" : (PAY_METHODS.find(m => (p.method || "").includes(m)) || "기타"));
  const MBADGE = { "온라인": ["#E6EEF7", "#3F7CA8"], "카드": ["#E6EEF7", "#3F7CA8"], "현금": ["#E4F1EA", "#3F8267"], "계좌이체": ["#F0E7D9", "#8A5A2B"], "지역화폐": ["#EFE7F0", "#6A4C7A"], "기타": ["#EFE9E0", "#6B6357"] };
  const paidRows = rows.filter(x => x.p.status === "done");
  const total = rows.length, paid = paidRows.length, unpaid = total - paid, confirmed = rows.filter(x => x.p.confirmed).length;
  const sumByMethod = {}; paidRows.forEach(x => { const m = methodOf(x.p); sumByMethod[m] = (sumByMethod[m] || 0) + (x.p.amount || 0); });
  const paidSum = paidRows.reduce((a, x) => a + (x.p.amount || 0), 0);
  const unpaidRows = rows.filter(x => x.p.status !== "done");
  const unpaidSum = unpaidRows.reduce((a, x) => a + (x.p.amount || 0), 0);
  let shown = rows;
  if (mf === "unpaid") shown = rows.filter(x => x.p.status !== "done");
  else if (mf === "unconfirmed") shown = rows.filter(x => x.p.status === "done" && !x.p.confirmed);
  else if (mf !== "all") shown = rows.filter(x => methodOf(x.p) === mf);
  if (cq.trim()) shown = shown.filter(x => x.s.name.includes(cq.trim()));
  const FILTERS = [["all", "전체"], ["unpaid", "미납"], ["unconfirmed", "미확인"], ["현금", "현금"], ["계좌이체", "계좌이체"], ["지역화폐", "지역화폐"], ["온라인", "온라인"]];
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}><button className="dc-btn" onClick={onBack} style={{ background: "#F0E7D9", borderRadius: 11, padding: 9 }}><ChevronLeft size={18} color="var(--plum)" /></button><div><div className="dc-serif" style={{ fontSize: 18, fontWeight: 700 }}>수납 확인</div><div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>현장·이체·지역화폐까지 한 번에 이중확인</div></div></div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><CalendarDays size={15} color="var(--plum)" /><select className="dc-input" value={mon} onChange={e => setMon(e.target.value)} style={{ flex: 1, marginBottom: 0, appearance: "auto", fontWeight: 700, color: "var(--plum-deep)" }}>{(months.length ? months : [curMon]).map(m => <option key={m} value={m}>{m}</option>)}</select></div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {[["완납", paid, "#3F8267"], ["미납", unpaid, "#C45A48"], ["원장확인", `${confirmed}/${total}`, "#6A4C7A"]].map(([l, n, c]) => <div key={l} className="dc-card" style={{ flex: 1, padding: "11px 0", textAlign: "center" }}><div className="dc-fr" style={{ fontSize: 19, fontWeight: 600, color: c }}>{n}</div><div style={{ fontSize: 11, color: "var(--ink-soft)" }}>{l}</div></div>)}
      </div>
      {Object.keys(sumByMethod).length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>{Object.entries(sumByMethod).map(([m, v]) => <span key={m} style={{ fontSize: 11.5, background: (MBADGE[m] || MBADGE["기타"])[0], color: (MBADGE[m] || MBADGE["기타"])[1], borderRadius: 999, padding: "5px 11px", fontWeight: 700 }}>{m} {won(v)}</span>)}</div>}
      <div className="dc-card" style={{ padding: "12px 14px", marginBottom: 12, display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}><div style={{ fontSize: 11, color: "var(--ink-soft)" }}>수납 완료액</div><div className="dc-fr" style={{ fontSize: 17, fontWeight: 700, color: "#3F8267" }}>{won(paidSum)}</div></div>
        <div style={{ width: 1, background: "var(--line)" }} />
        <div style={{ flex: 1 }}><div style={{ fontSize: 11, color: "var(--ink-soft)" }}>미납액</div><div className="dc-fr" style={{ fontSize: 17, fontWeight: 700, color: "#C45A48" }}>{won(unpaidSum)}</div></div>
      </div>
      {unpaidRows.length > 0 && <button className="dc-btn" onClick={() => api.confirm({ title: `미납 ${unpaidRows.length}명에게 독촉 알림`, message: `${mon} 미납 학부모 ${unpaidRows.length}명에게 수납 안내 알림을 보낼까요?`, onConfirm: () => api.remindUnpaid(unpaidRows.map(x => x.p.id)) })} style={{ width: "100%", padding: 12, borderRadius: 13, background: "#FBE0DC", color: "#C45A48", fontSize: 13.5, fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Bell size={15} /> 미납 {unpaidRows.length}명에게 일괄 독촉 알림</button>}
      <SearchBox value={cq} onChange={setCq} placeholder="학생 이름으로 찾기" />
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, marginBottom: 12 }}>{FILTERS.map(([k, l]) => <button key={k} className="dc-btn" onClick={() => setMf(k)} style={{ flexShrink: 0, padding: "7px 13px", borderRadius: 999, fontSize: 12, fontWeight: mf === k ? 700 : 400, background: mf === k ? "#6A4C7A" : "#fff", color: mf === k ? "#fff" : "var(--ink)", border: "1px solid var(--line)" }}>{l}</button>)}</div>
      {(cq.trim() || mf !== "all") && <div style={{ fontSize: 12, color: "var(--ink-soft)", margin: "0 4px 10px" }}>{shown.length}명 표시 중{cq.trim() ? ` · ‘${cq.trim()}’` : ""}</div>}
      {shown.length === 0 ? <Empty msg="해당 조건의 수납 내역이 없어요." /> : shown.map(({ s, p }) => { const m = methodOf(p); const done = p.status === "done"; return (
        <div key={s.id} className="dc-card" style={{ padding: 13, marginBottom: 9 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 19 }}>{sAva(s.id)}</div>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 700 }}>{s.name}</div><div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>{p.month} · {won(p.amount)}</div></div>
            {done ? <Tag bg="#E4F1EA" color="#3F8267">완납</Tag> : <Tag bg="#FBE0DC" color="#C45A48">미납</Tag>}
            {done && m && <span style={{ fontSize: 11, fontWeight: 700, background: (MBADGE[m] || MBADGE["기타"])[0], color: (MBADGE[m] || MBADGE["기타"])[1], borderRadius: 999, padding: "3px 9px" }}>{m}</span>}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 11 }}>
            {done
              ? <button className="dc-btn" onClick={() => api.reopenPay(p.id)} style={{ flex: 1, padding: 10, borderRadius: 11, background: "#F8F1E6", color: "var(--ink-soft)", fontSize: 12.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}><RotateCcw size={14} /> 미납으로</button>
              : <button className="dc-btn" onClick={() => setCollect(p)} style={{ flex: 1, padding: 10, borderRadius: 11, background: "#E4F1EA", color: "#3F8267", fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}><Check size={14} /> 수납완료</button>}
            <button className="dc-btn" disabled={!canConfirm} onClick={() => canConfirm && api.confirmPay(p.id, !p.confirmed)} title={canConfirm ? "" : "원장만 최종 확인할 수 있어요"} style={{ flex: 1, padding: 10, borderRadius: 11, background: p.confirmed ? "linear-gradient(140deg,#6A4C7A,#4D3759)" : "#fff", color: p.confirmed ? "#fff" : (canConfirm ? "var(--plum)" : "#B6ABBC"), border: "1px solid " + (p.confirmed ? "transparent" : "var(--line)"), fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, opacity: canConfirm || p.confirmed ? 1 : .7 }}>{p.confirmed ? <Check size={14} /> : <Shield size={14} />} 원장확인{p.confirmed ? "✓" : ""}</button>
          </div>
          {p.payNote && <div style={{ fontSize: 11.5, color: "#8A5A2B", background: "#F8F1E6", borderRadius: 9, padding: "7px 10px", marginTop: 9 }}>📝 {p.payNote}</div>}
        </div>
      ); })}
      {collect && <CollectSheet pay={collect} student={students.find(s => s.id === collect.studentId)} onCollect={(method, note) => { api.markPaid(collect.id, method, note); setCollect(null); }} onClose={() => setCollect(null)} />}
    </div>
  );
}
function CollectSheet({ pay, student, onCollect, onClose }) {
  const [method, setMethod] = useState("현금"); const [note, setNote] = useState(pay.payNote || "");
  return (<Sheet title="수납 완료 처리" onClose={onClose}>
    <div style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 12, lineHeight: 1.7 }}><b style={{ color: "var(--ink)" }}>{student ? student.name : ""}</b> · {pay.month}<br /><b style={{ color: "var(--plum)", fontSize: 16 }}>{(pay.amount || 0).toLocaleString("ko-KR")}원</b></div>
    <label className="dc-label">결제수단</label>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 14 }}>{PAY_METHODS.map(m => <button key={m} className="dc-btn" onClick={() => setMethod(m)} style={{ padding: "9px 15px", borderRadius: 12, background: method === m ? "#6A4C7A" : "#fff", color: method === m ? "#fff" : "var(--ink)", border: "1px solid var(--line)", fontSize: 13 }}>{m}</button>)}</div>
    <label className="dc-label">메모 (이체자명·승인번호·지역화폐 등 · 선택)</label>
    <textarea className="dc-input" value={note} onChange={e => setNote(e.target.value)} placeholder="예) 김OO 모 계좌이체, 지역화폐 승인 1234" style={{ minHeight: 56, resize: "none", marginBottom: 18 }} />
    <button className="dc-btn" onClick={() => onCollect(method, note.trim())} style={{ width: "100%", padding: 14, borderRadius: 16, background: "linear-gradient(140deg,#6FAE93,#3F8267)", color: "#fff", fontSize: 14.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}><Check size={16} /> 수납 완료로 기록</button>
  </Sheet>);
}
function ChargeForm({ students, onCharge, onPaid, onClose }) {
  const ITEMS = ["수강료", "교재비", "재료비", "특강비", "기타"];
  const [sid, setSid] = useState(students[0]?.id); const [sq, setSq] = useState("");
  const [item, setItem] = useState("교재비"); const [amount, setAmount] = useState(""); const [paidNow, setPaidNow] = useState(false); const [method, setMethod] = useState("현금"); const [note, setNote] = useState(""); const [book, setBook] = useState("");
  const mon = `${new Date().getMonth() + 1}월`;
  const showBook = item !== "수강료";
  const title = showBook && book.trim() ? `${mon} ${item} (${book.trim()})` : `${mon} ${item}`;
  const fs = students.filter(s => !sq.trim() || s.name.includes(sq.trim()));
  const submit = () => { if (!sid || !amount) return; const base = { studentId: sid, title, amount, items: showBook && book.trim() ? [`${item} · ${book.trim()}`] : [item] }; if (paidNow) onPaid({ ...base, method, note: note.trim() }); else onCharge(base); };
  return (<Sheet title="수납 입력" onClose={onClose}>
    <label className="dc-label">학생</label>
    {students.length > 6 && <SearchBox value={sq} onChange={setSq} placeholder="학생 이름 검색" />}
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14, maxHeight: 120, overflowY: "auto" }}>{fs.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>검색 결과가 없어요.</div> : fs.map(s => <button key={s.id} className="dc-btn" onClick={() => setSid(s.id)} style={{ padding: "8px 13px", borderRadius: 12, background: sid === s.id ? "#6A4C7A" : "#fff", color: sid === s.id ? "#fff" : "var(--ink)", border: "1px solid var(--line)", fontSize: 13 }}>{s.name}</button>)}</div>
    <label className="dc-label">항목</label>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 14 }}>{ITEMS.map(it => <button key={it} className="dc-btn" onClick={() => setItem(it)} style={{ padding: "8px 14px", borderRadius: 999, background: item === it ? "#E07A55" : "#fff", color: item === it ? "#fff" : "var(--ink)", border: "1px solid var(--line)", fontSize: 12.5 }}>{it}</button>)}</div>
    {showBook && <><label className="dc-label">교재명 / 내용 (선택)</label><input className="dc-input" value={book} onChange={e => setBook(e.target.value)} placeholder="예) 체르니30, 바이엘2, CCM코드반주1" style={{ marginBottom: 14 }} /></>}
    <label className="dc-label">금액 (원)</label>
    <input type="number" className="dc-input" value={amount} min="0" step="1000" onChange={e => setAmount(e.target.value)} placeholder="예: 7000" style={{ marginBottom: 14 }} />
    <button className="dc-btn" onClick={() => setPaidNow(v => !v)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "11px 13px", borderRadius: 13, background: paidNow ? "#E4F1EA" : "#F8F1E6", marginBottom: paidNow ? 12 : 18, border: "1px solid var(--line)" }}><div className={"dc-check" + (paidNow ? " on" : "")} style={{ width: 20, height: 20 }}>{paidNow && <Check size={13} color="#fff" />}</div><span style={{ fontSize: 13, fontWeight: 700, color: paidNow ? "#3F8267" : "var(--ink)" }}>바로 수납 완료로 등록 (오프라인 수령)</span></button>
    {paidNow && <div style={{ marginBottom: 18 }}><label className="dc-label">결제수단</label><div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 12 }}>{PAY_METHODS.map(m => <button key={m} className="dc-btn" onClick={() => setMethod(m)} style={{ padding: "8px 14px", borderRadius: 12, background: method === m ? "#6A4C7A" : "#fff", color: method === m ? "#fff" : "var(--ink)", border: "1px solid var(--line)", fontSize: 12.5 }}>{m}</button>)}</div><label className="dc-label">메모 (이체자명·승인번호·지역화폐 등 · 선택)</label><textarea className="dc-input" value={note} onChange={e => setNote(e.target.value)} placeholder="예) 김OO 모 계좌이체, 지역화폐 승인 1234" style={{ minHeight: 52, resize: "none", marginBottom: 0 }} /></div>}
    <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 14 }}>{title} · {amount ? Number(amount).toLocaleString("ko-KR") + "원" : "금액 미입력"} · {paidNow ? `수납완료(${method})` : "청구(미납)"}</div>
    <PrimaryBtn onClick={submit}><Check size={16} /> {paidNow ? "수납 완료 기록" : "청구 등록"}</PrimaryBtn>
  </Sheet>);
}
function RejectReason({ req, student, onReject, onClose }) {
  const [reason, setReason] = useState("");
  const QUICK = ["등록되지 않은 학생", "보호자 정보 불일치", "중복 요청"];
  return (<Sheet title="자녀 연결 거절" onClose={onClose}>
    <div style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 12, lineHeight: 1.6 }}><b style={{ color: "var(--ink)" }}>{req.parentName}</b>님의 <b style={{ color: "var(--ink)" }}>{student ? student.name : "학생"}</b> 연결 요청을 거절합니다. 사유는 학부모에게 알림으로 전달돼요(선택).</div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 12 }}>{QUICK.map(q => <button key={q} className="dc-btn" onClick={() => setReason(q)} style={{ padding: "7px 12px", borderRadius: 999, background: reason === q ? "#6A4C7A" : "#fff", color: reason === q ? "#fff" : "var(--ink)", border: "1px solid var(--line)", fontSize: 12 }}>{q}</button>)}</div>
    <textarea className="dc-input" value={reason} onChange={e => setReason(e.target.value)} placeholder="사유 (선택)" style={{ minHeight: 64, resize: "none", marginBottom: 16 }} />
    <button className="dc-btn" onClick={() => onReject(reason.trim())} style={{ width: "100%", padding: 14, borderRadius: 16, background: "linear-gradient(140deg,#E07A55,#C45A48)", color: "#fff", fontSize: 14.5, fontWeight: 700 }}>거절하기</button>
  </Sheet>);
}
function EditAcademy({ academy, onSave, onClose }) { const [name, setName] = useState(academy.name); const [tagline, setTag] = useState(academy.tagline); const [dn, setDn] = useState(academy.directorName); const [open, setOpen] = useState(academy.open || "13:00"); const [close, setClose] = useState(academy.close || "19:00"); return (<Sheet title="학원 정보 수정" onClose={onClose}><Field label="학원명" value={name} onChange={setName} /><Field label="슬로건" value={tagline} onChange={setTag} /><Field label="원장 이름" value={dn} onChange={setDn} /><label className="dc-label">운영 시간 (시간표에 반영)</label><div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 20 }}><input type="time" className="dc-input" value={open} step="900" onChange={e => setOpen(e.target.value)} style={{ marginBottom: 0, flex: 1, appearance: "auto" }} /><span style={{ color: "var(--ink-soft)" }}>~</span><input type="time" className="dc-input" value={close} step="900" onChange={e => setClose(e.target.value)} style={{ marginBottom: 0, flex: 1, appearance: "auto" }} /></div><PrimaryBtn onClick={() => onSave({ name, tagline, directorName: dn, open, close })}><Check size={16} /> 저장</PrimaryBtn></Sheet>); }
function EditTeacher({ t, onSave, onClose }) { const [name, setName] = useState(t?.name || ""); const [subject, setSub] = useState(t?.subject || "피아노"); const [color, setColor] = useState(t?.color || PALETTE[0]); return (<Sheet title={t ? "강사 정보 수정" : "강사 추가"} onClose={onClose}><Field label="이름" value={name} onChange={setName} placeholder="예) A" /><Field label="담당 과목" value={subject} onChange={setSub} placeholder="예) 피아노" /><label className="dc-label">색상</label><div style={{ display: "flex", gap: 10, marginBottom: 20 }}>{PALETTE.map(c => <button key={c} className="dc-btn" onClick={() => setColor(c)} style={{ width: 34, height: 34, borderRadius: 11, background: c, border: color === c ? "3px solid #2D2833" : "3px solid transparent" }} />)}</div><PrimaryBtn onClick={() => name.trim() && onSave({ name, subject, color })}><Check size={16} /> {t ? "저장" : "추가"}</PrimaryBtn></Sheet>); }
function EditStudent({ s, teachers, onSave, onClose }) { const [name, setName] = useState(s?.name || ""); const [age, setAge] = useState(s?.age || ""); const [teacherId, setTid] = useState(s?.teacherId || teachers[0]?.id || ""); const [avatar, setAv] = useState(s?.avatar || "🎀"); const [pin, setPin] = useState(s?.pin || ""); return (<Sheet title={s ? "학생 정보 수정" : "학생 추가"} onClose={onClose}><Field label="이름" value={name} onChange={setName} placeholder="예) 이*경" /><Field label="나이/반" value={age} onChange={setAge} placeholder="예) 7세" /><label className="dc-label">등·하원 PIN (4자리)</label><input className="dc-input" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" placeholder="비우면 자동 생성" style={{ marginBottom: 16, letterSpacing: 4, fontWeight: 700 }} /><label className="dc-label">프로필</label><div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>{AVATARS.map(a => <button key={a} className="dc-btn" onClick={() => setAv(a)} style={{ fontSize: 20, width: 42, height: 42, borderRadius: 12, background: avatar === a ? "#F3E2D3" : "#fff", border: `2px solid ${avatar === a ? "#E07A55" : "var(--line)"}` }}>{a}</button>)}</div><label className="dc-label">담당 강사</label><div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>{teachers.length === 0 ? <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>먼저 강사를 추가해주세요.</span> : teachers.map(t => <button key={t.id} className="dc-btn" onClick={() => setTid(t.id)} style={{ padding: "8px 14px", borderRadius: 12, background: teacherId === t.id ? t.color : "#fff", color: teacherId === t.id ? "#fff" : "var(--ink)", border: "1px solid var(--line)", fontSize: 13 }}>{t.name}</button>)}</div><PrimaryBtn onClick={() => name.trim() && onSave({ name, age, teacherId, avatar, ...(pin ? { pin } : {}) })}><Check size={16} /> {s ? "저장" : "추가"}</PrimaryBtn></Sheet>); }

/* 다자녀: 자녀 추가 시트 */
function AddChild({ candidates, pending, rejected, onRequest, onReRequest, onClose }) {
  const [sel, setSel] = useState(null); const [done, setDone] = useState(false);
  const pendingIds = new Set(pending.map(p => p.studentId));
  const rejectedIds = new Set((rejected || []).map(p => p.studentId));
  const selectable = candidates.filter(s => !pendingIds.has(s.id) && !rejectedIds.has(s.id));
  return (<Sheet title="자녀 연결 요청" onClose={onClose}>
    <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 12, lineHeight: 1.6 }}>같은 학원에 등록된 자녀를 선택해 연결을 요청하세요. <b style={{ color: "var(--plum)" }}>원장님 승인 후</b> 연결됩니다.</div>
    {done && <div style={{ background: "#E4F1EA", color: "#3F8267", borderRadius: 12, padding: 12, fontSize: 13, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}><Check size={15} /> 요청을 보냈어요. 원장님 승인을 기다려주세요.</div>}
    {pending.length > 0 && <div style={{ marginBottom: 12 }}><div className="dc-label">승인 대기 중</div>{pending.map(p => <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, background: "#FBEFD8", marginBottom: 6 }}><Clock size={15} color="#B5872F" /><span style={{ flex: 1, fontSize: 13.5, fontWeight: 700 }}>{p.studentName}</span><Tag bg="#fff" color="#B5872F">대기</Tag></div>)}</div>}
    {(rejected || []).length > 0 && <div style={{ marginBottom: 12 }}><div className="dc-label">거절된 요청</div>{rejected.map(p => <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, background: "#FBE0DC", marginBottom: 6 }}><X size={15} color="#C45A48" /><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13.5, fontWeight: 700 }}>{p.studentName}</div>{p.reason && <div style={{ fontSize: 11, color: "#C45A48" }}>사유: {p.reason}</div>}</div><button className="dc-btn" onClick={() => { onReRequest(p.id); setDone(true); }} style={{ background: "#fff", color: "#C45A48", borderRadius: 10, padding: "6px 10px", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}><RotateCcw size={13} /> 다시 요청</button></div>)}</div>}
    <div className="dc-label">연결 요청할 자녀</div>
    {selectable.length === 0 ? <Empty msg="요청할 수 있는 다른 학생이 없어요." /> : selectable.map(s => (<button key={s.id} className="dc-btn" onClick={() => setSel(s.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", marginBottom: 8, borderRadius: 14, background: sel === s.id ? "#F3E2D3" : "#fff", border: `1px solid ${sel === s.id ? "#E07A55" : "var(--line)"}` }}><div style={{ fontSize: 22 }}>{s.avatar}</div><div style={{ flex: 1, textAlign: "left" }}><div style={{ fontSize: 14.5, fontWeight: 700 }}>{s.name}</div><div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{s.age}</div></div>{sel === s.id && <Check size={18} color="#E07A55" />}</button>))}
    {selectable.length > 0 && <div style={{ marginTop: 8 }}><PrimaryBtn onClick={() => { if (sel) { onRequest(sel); setSel(null); setDone(true); } }} tone="linear-gradient(140deg,#EE9573,#E07A55)"><PlusCircle size={16} /> 연결 요청 보내기</PrimaryBtn></div>}
  </Sheet>);
}

/* ============================================================
   APP shell + AUTH gate
   ============================================================ */
export default function App() {
  const [data, setData] = useState(SEED);
  const [authId, setAuthId] = useState(() => SESSION.accountId);
  const [activeStudentId, setActiveStudentId] = useState(null);
  const [tab, setTab] = useState("diary");
  const [pickStudent, setPickStudent] = useState(false);
  const [addChild, setAddChild] = useState(false);
  const [pq, setPq] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [confirmState, setConfirmState] = useState(null);
  const lnJSON = useRef(null); const lnReady = useRef(false);
  // 데이터 로드/저장/실시간 동기화 — Supabase 우선, 없으면 Claude 아티팩트 storage, 둘 다 없으면 인메모리(SEED)
  useEffect(() => {
    let alive = true;
    (async () => {
      if (isConfigured) {
        const remote = await loadState();
        if (remote && Object.keys(remote).length) { lnJSON.current = JSON.stringify(remote); if (alive) setData(remote); }
        else { await saveState(SEED); lnJSON.current = JSON.stringify(SEED); }
        lnReady.current = true; return;
      }
      if (typeof window !== "undefined" && window.storage) {
        try { const r = await window.storage.get("ln:data:v1", true); if (r && r.value) { lnJSON.current = r.value; if (alive) setData(JSON.parse(r.value)); lnReady.current = true; return; } } catch (e) { }
        try { const j = JSON.stringify(SEED); await window.storage.set("ln:data:v1", j, true); lnJSON.current = j; } catch (e) { }
      }
      lnReady.current = true;
    })();
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    if (!lnReady.current) return;
    const j = JSON.stringify(data); if (j === lnJSON.current) return; lnJSON.current = j;
    if (isConfigured) { saveState(data); return; }
    if (typeof window !== "undefined" && window.storage) window.storage.set("ln:data:v1", j, true).catch(() => { });
  }, [data]);
  useEffect(() => {
    if (isConfigured) {
      const unsub = subscribeState((remote) => { const j = JSON.stringify(remote); if (j !== lnJSON.current) { lnJSON.current = j; setData(remote); } });
      return unsub;
    }
    if (typeof window === "undefined" || !window.storage) return;
    const t = setInterval(async () => {
      try { const r = await window.storage.get("ln:data:v1", true); if (r && r.value && r.value !== lnJSON.current) { lnJSON.current = r.value; setData(JSON.parse(r.value)); } } catch (e) { }
    }, 4000);
    return () => clearInterval(t);
  }, []);

  const D = (fn) => setData(d => fn(structuredClone(d)));
  const api = {
    confirm: (opts) => setConfirmState(opts),
    resetBeta: () => { lnJSON.current = JSON.stringify(SEED); if (isConfigured) saveState(SEED); else if (typeof window !== "undefined" && window.storage) window.storage.set("ln:data:v1", JSON.stringify(SEED), true).catch(() => { }); setData(structuredClone(SEED)); },
    resetPassword: (email, newPw) => D(d => { const a = d.accounts.find(a => a.email === email); if (a) a.password = newPw; return d; }),
    linkChild: (accId, sid) => D(d => { const a = d.accounts.find(a => a.id === accId); a.studentIds = Array.from(new Set([...(a.studentIds || []), sid])); return d; }),
    requestLink: (accId, sid) => D(d => {
      const a = d.accounts.find(a => a.id === accId); const stu = d.students.find(s => s.id === sid);
      if (!a || !stu) return d;
      if ((a.studentIds || []).includes(sid)) return d;
      if (d.linkRequests.some(r => r.accountId === accId && r.studentId === sid && r.status === "pending")) return d;
      d.linkRequests.unshift({ id: uid("lr"), accountId: accId, studentId: sid, academyId: a.academyId, parentName: a.name, status: "pending", time: hhmm() });
      d.notifications.unshift({ id: uid("n"), academyId: a.academyId, aud: { kind: "admin" }, type: "link", text: `👶 ${a.name}님이 ${stu.name} 자녀 연결을 요청했어요`, time: hhmm(), readBy: [] });
      return d;
    }),
    approveLink: (reqId) => D(d => {
      const r = d.linkRequests.find(r => r.id === reqId); if (!r) return d;
      r.status = "approved";
      const a = d.accounts.find(a => a.id === r.accountId); const stu = d.students.find(s => s.id === r.studentId);
      if (a) a.studentIds = Array.from(new Set([...(a.studentIds || []), r.studentId]));
      d.notifications.unshift({ id: uid("n"), academyId: r.academyId, aud: { kind: "account", accountId: r.accountId }, type: "link", text: `✅ ${stu ? stu.name : ""} 자녀 연결이 승인되었어요`, time: hhmm(), readBy: [] });
      return d;
    }),
    rejectLink: (reqId, reason) => D(d => {
      const r = d.linkRequests.find(r => r.id === reqId); if (!r) return d;
      r.status = "rejected"; r.reason = reason || ""; const stu = d.students.find(s => s.id === r.studentId);
      d.notifications.unshift({ id: uid("n"), academyId: r.academyId, aud: { kind: "account", accountId: r.accountId }, type: "link", text: `❌ ${stu ? stu.name : ""} 자녀 연결 요청이 거절되었어요${reason ? ` · 사유: ${reason}` : ""}`, time: hhmm(), readBy: [] });
      return d;
    }),
    reRequestLink: (reqId) => D(d => {
      const r = d.linkRequests.find(r => r.id === reqId); if (!r) return d;
      r.status = "pending"; r.reason = ""; r.time = hhmm(); const stu = d.students.find(s => s.id === r.studentId); const a = d.accounts.find(a => a.id === r.accountId);
      d.notifications.unshift({ id: uid("n"), academyId: r.academyId, aud: { kind: "admin" }, type: "link", text: `🔁 ${a ? a.name : ""}님이 ${stu ? stu.name : ""} 자녀 연결을 다시 요청했어요`, time: hhmm(), readBy: [] });
      return d;
    }),
    setPref: (accId, type, val) => D(d => { const a = d.accounts.find(a => a.id === accId); if (!a.prefs) a.prefs = {}; a.prefs[type] = val; return d; }),
    addComment: (diaryId, c) => D(d => {
      const dy = d.diary.find(x => x.id === diaryId); if (!dy) return d;
      if (!dy.commentList) dy.commentList = []; dy.commentList.push({ replies: [], ...c });
      const stu = d.students.find(s => s.id === dy.studentId);
      const aud = c.by === "parent" ? { kind: "teacherOf", studentId: dy.studentId } : { kind: "parentOf", studentId: dy.studentId };
      d.notifications.unshift({ id: uid("n"), academyId: stu && stu.academyId, aud, type: "diary", text: `💬 알림장 댓글 · ${c.name}: ${c.text.slice(0, 18)}`, time: hhmm(), readBy: [] });
      return d;
    }),
    editComment: (diaryId, ci, text) => D(d => { const c = d.diary.find(x => x.id === diaryId).commentList[ci]; c.text = text; c.edited = true; return d; }),
    deleteComment: (diaryId, ci) => D(d => { d.diary.find(x => x.id === diaryId).commentList.splice(ci, 1); return d; }),
    addReply: (diaryId, ci, r) => D(d => { const c = d.diary.find(x => x.id === diaryId).commentList[ci]; if (!c.replies) c.replies = []; c.replies.push(r); return d; }),
    editReply: (diaryId, ci, ri, text) => D(d => { const r = d.diary.find(x => x.id === diaryId).commentList[ci].replies[ri]; r.text = text; r.edited = true; return d; }),
    deleteReply: (diaryId, ci, ri) => D(d => { d.diary.find(x => x.id === diaryId).commentList[ci].replies.splice(ri, 1); return d; }),
    saveAcademy: (id, patch) => D(d => { Object.assign(d.academies[id], patch); if (patch.directorName) { const adm = d.accounts.find(a => a.academyId === id && a.role === "admin"); if (adm) adm.name = patch.directorName; } return d; }),
    addTeacher: (acId, t) => D(d => { d.teachers.push({ id: uid("t"), academyId: acId, ...t }); return d; }),
    updateTeacher: (id, patch) => D(d => { Object.assign(d.teachers.find(t => t.id === id), patch); return d; }),
    deleteTeacher: (id) => D(d => { d.teachers = d.teachers.filter(t => t.id !== id); return d; }),
    addStudent: (acId, s) => D(d => { d.students.push({ id: uid("s"), academyId: acId, days: 1, pin: String(Math.floor(1000 + Math.random() * 9000)), ...s }); return d; }),
    addClass: (acId, name, type) => D(d => { if (!d.classes) d.classes = []; const colors = ["#C2548A", "#DBA254", "#3F7CA8", "#6FAE93", "#E07A55", "#6A4C7A"]; d.classes.push({ id: uid("c"), academyId: acId, name, color: colors[d.classes.filter(c => c.academyId === acId).length % colors.length], type: type || "grid" }); return d; }),
    updateClass: (id, patch) => D(d => { Object.assign(d.classes.find(c => c.id === id), patch); return d; }),
    deleteClass: (id) => D(d => { d.classes = d.classes.filter(c => c.id !== id); d.roster = (d.roster || []).filter(r => r.classId !== id); return d; }),
    addRoster: ({ academyId, classId, day, time, name, studentId, makeup }) => D(d => { if (!d.roster) d.roster = []; d.roster.push({ id: uid("r"), academyId, classId, day, time, name, studentId: studentId || null, makeup: !!makeup, present: false, memo: "" }); return d; }),
    updateRoster: (id, patch) => D(d => { Object.assign(d.roster.find(r => r.id === id), patch); return d; }),
    deleteRoster: (id) => D(d => { d.roster = d.roster.filter(r => r.id !== id); return d; }),
    toggleRosterPresent: (id) => D(d => { const r = d.roster.find(r => r.id === id); r.present = !r.present; return d; }),
    toggleRosterDone: (id) => D(d => { const r = d.roster.find(r => r.id === id); r.done = !r.done; return d; }),
    setRosterPresentBulk: (ids, val) => D(d => { (d.roster || []).forEach(r => { if (ids.includes(r.id)) r.present = val; }); return d; }),
    updateStudent: (id, patch) => D(d => { Object.assign(d.students.find(s => s.id === id), patch); return d; }),
    deleteStudent: (id) => D(d => { d.students = d.students.filter(s => s.id !== id); return d; }),
    addDiary: (e) => D(d => { d.diary.unshift(e); const stu = d.students.find(s => s.id === e.studentId); d.notifications.unshift({ id: uid("n"), academyId: stu && stu.academyId, aud: { kind: "parentOf", studentId: e.studentId }, type: "diary", text: `📒 새 알림장 · ${e.title.slice(0, 22)}`, time: hhmm(), readBy: [] }); if (e.authorRole !== "admin") d.notifications.unshift({ id: uid("n"), academyId: stu && stu.academyId, aud: { kind: "admin" }, type: "diary", text: `📒 ${e.authorName || "선생님"} · ${stu ? stu.name : ""} 알림장 · ${e.title.slice(0, 16)}`, time: hhmm(), readBy: [] }); return d; }),
    addReport: (r) => D(d => { if (!d.reports) d.reports = []; const rep = { id: uid("rp"), date: `${new Date().getMonth() + 1}월 ${new Date().getDate()}일`, ...r }; d.reports.unshift(rep); const stu = d.students.find(s => s.id === r.studentId); d.notifications.unshift({ id: uid("n"), academyId: stu && stu.academyId, aud: { kind: "parentOf", studentId: r.studentId }, type: "diary", text: `📝 새 평가서 도착 · ${r.term || ""}`, time: hhmm(), readBy: [] }); return d; }),
    deleteReport: (id) => D(d => { d.reports = (d.reports || []).filter(r => r.id !== id); return d; }),
    addLead: (l) => D(d => { if (!d.leads) d.leads = []; d.leads.unshift({ id: uid("ld"), status: "inquiry", memo: "", ...l }); return d; }),
    updateLead: (id, patch) => D(d => { const l = (d.leads || []).find(l => l.id === id); if (l) Object.assign(l, patch); return d; }),
    deleteLead: (id) => D(d => { d.leads = (d.leads || []).filter(l => l.id !== id); return d; }),
    addMakeup: (m) => D(d => { if (!d.makeups) d.makeups = []; d.makeups.unshift({ id: uid("mk"), done: false, ...m }); return d; }),
    updateMakeup: (id, patch) => D(d => { const m = (d.makeups || []).find(m => m.id === id); if (m) Object.assign(m, patch); return d; }),
    toggleMakeupDone: (id) => D(d => { const m = (d.makeups || []).find(m => m.id === id); if (m) m.done = !m.done; return d; }),
    deleteMakeup: (id) => D(d => { d.makeups = (d.makeups || []).filter(m => m.id !== id); return d; }),
    updateReport: (id, patch) => D(d => { const r = (d.reports || []).find(r => r.id === id); if (r) Object.assign(r, patch); return d; }),
    addAnnouncement: ({ audience, title, text, academyId, by }) => D(d => {
      const an = { id: uid("an"), academyId, by, audience, title, text, date: `${new Date().getMonth() + 1}월 ${new Date().getDate()}일`, time: hhmm() };
      d.announcements.unshift(an);
      const kind = audience === "parents" ? "allParents" : audience === "teachers" ? "allTeachers" : "everyone";
      d.notifications.unshift({ id: uid("n"), academyId, aud: { kind }, type: "notice", refId: an.id, text: `📢 공지 · ${title.slice(0, 24)}`, time: hhmm(), readBy: [] });
      return d;
    }),
    editAnnouncement: (id, { audience, title, text }) => D(d => { const a = d.announcements.find(x => x.id === id); if (a) { a.audience = audience; a.title = (title || "").trim(); a.text = (text || "").trim(); a.edited = true; } return d; }),
    deleteAnnouncement: (id) => D(d => { d.announcements = d.announcements.filter(a => a.id !== id); d.notifications = d.notifications.filter(n => n.refId !== id); return d; }),
    deleteDiary: (id) => D(d => { d.diary = d.diary.filter(x => x.id !== id); return d; }),
    toggleLike: (id) => D(d => { const x = d.diary.find(x => x.id === id); x.liked = !x.liked; x.likes += x.liked ? 1 : -1; return d; }),
    addGoal: (g) => D(d => { d.goals.push(g); return d; }),
    deleteGoal: (id) => D(d => { d.goals = d.goals.filter(g => g.id !== id); return d; }),
    archiveGoal: (id) => D(d => { const g = d.goals.find(g => g.id === id); g.status = "archived"; g.archivedYM = ymKey(); return d; }),
    unarchiveGoal: (id) => D(d => { const g = d.goals.find(g => g.id === id); g.status = "active"; g.archivedYM = null; return d; }),
    addSong: (gid, n) => D(d => { d.goals.find(g => g.id === gid).items.push({ n, done: false }); return d; }),
    toggleSong: (gid, idx) => D(d => { const it = d.goals.find(g => g.id === gid).items[idx]; it.done = !it.done; it.doneYM = it.done ? ymKey() : null; return d; }),
    deleteSong: (gid, idx) => D(d => { d.goals.find(g => g.id === gid).items.splice(idx, 1); return d; }),
    cycleAtt: (id) => D(d => { const l = d.schedule.find(s => s.id === id); l.att = ATT_ORDER[(ATT_ORDER.indexOf(l.att) + 1) % 4]; return d; }),
    checkInKiosk: (id) => D(d => { const l = d.schedule.find(s => s.id === id); if (!l) return d; l.att = "present"; const stu = d.students.find(s => s.id === l.studentId); d.notifications.unshift({ id: uid("n"), academyId: stu && stu.academyId, aud: { kind: "parentOf", studentId: l.studentId }, type: "attend", text: `✅ ${stu ? stu.name : ""} 등원했어요 (${hhmm()})`, time: hhmm(), readBy: [] }); return d; }),
    studentCheckIn: (sid) => D(d => { const stu = d.students.find(s => s.id === sid); if (!stu) return d; const t = hhmm(); stu.inAt = Date.now(); stu.outAt = null; const lt = d.schedule.find(l => l.studentId === sid && l.att === "upcoming"); if (lt) lt.att = "present"; const WD = ["일", "월", "화", "수", "목", "금", "토"][new Date().getDay()]; (d.roster || []).filter(r => r.academyId === stu.academyId && r.day === WD && r.studentId === sid).forEach(r => { r.present = true; r.inTime = t; r.outTime = null; }); d.notifications.unshift({ id: uid("n"), academyId: stu.academyId, aud: { kind: "parentOf", studentId: sid }, type: "attend", text: `✅ ${stu.name} 등원했어요 (${t})`, time: t, readBy: [] }); return d; }),
    studentCheckOut: (sid) => D(d => { const stu = d.students.find(s => s.id === sid); if (!stu) return d; const t = hhmm(); stu.outAt = Date.now(); const WD = ["일", "월", "화", "수", "목", "금", "토"][new Date().getDay()]; (d.roster || []).filter(r => r.academyId === stu.academyId && r.day === WD && r.studentId === sid).forEach(r => { r.outTime = t; }); d.notifications.unshift({ id: uid("n"), academyId: stu.academyId, aud: { kind: "parentOf", studentId: sid }, type: "attend", text: `🏠 ${stu.name} 하원했어요 (${t})`, time: t, readBy: [] }); return d; }),
    addLesson: (l) => D(d => { d.schedule.push(l); return d; }),
    updateLesson: (id, patch) => D(d => { Object.assign(d.schedule.find(s => s.id === id), patch); return d; }),
    deleteLesson: (id) => D(d => { d.schedule = d.schedule.filter(s => s.id !== id); return d; }),
    payNow: (id) => D(d => { const p = d.payments.find(p => p.id === id); p.status = "done"; p.date = `${new Date().getMonth() + 1}월 ${new Date().getDate()}일 결제`; p.method = "신용카드 ****4821"; const stu = d.students.find(s => s.id === p.studentId); d.notifications.unshift({ id: uid("n"), academyId: stu && stu.academyId, aud: { kind: "admin" }, type: "pay", text: `💳 ${stu ? stu.name : ""} 수강료 납부 완료`, time: hhmm(), readBy: [] }); return d; }),
    addCharge: ({ studentId, title, amount, items }) => D(d => { d.payments.unshift({ id: uid("p"), studentId, month: title, amount: Number(amount) || 0, status: "pending", due: `${new Date().getMonth() + 1}월 말까지`, items: items && items.length ? items : [title], manual: true }); const stu = d.students.find(s => s.id === studentId); d.notifications.unshift({ id: uid("n"), academyId: stu && stu.academyId, aud: { kind: "parentOf", studentId }, type: "pay", text: `🧾 새 청구 · ${title} ${(Number(amount) || 0).toLocaleString("ko-KR")}원`, time: hhmm(), readBy: [] }); return d; }),
    addPaidRecord: ({ studentId, title, amount, method, items, note }) => D(d => { d.payments.unshift({ id: uid("p"), studentId, month: title, amount: Number(amount) || 0, status: "done", date: `${new Date().getMonth() + 1}월 ${new Date().getDate()}일 수납`, method, payNote: note || "", items: items && items.length ? items : [title], manual: true }); const stu = d.students.find(s => s.id === studentId); d.notifications.unshift({ id: uid("n"), academyId: stu && stu.academyId, aud: { kind: "parentOf", studentId }, type: "pay", text: `💳 ${title} 수납 완료 (${method})`, time: hhmm(), readBy: [] }); return d; }),
    markPaid: (id, method, note) => D(d => { const p = d.payments.find(p => p.id === id); if (!p) return d; p.status = "done"; p.date = `${new Date().getMonth() + 1}월 ${new Date().getDate()}일 수납`; p.method = method; if (note !== undefined) p.payNote = note; const stu = d.students.find(s => s.id === p.studentId); d.notifications.unshift({ id: uid("n"), academyId: stu && stu.academyId, aud: { kind: "parentOf", studentId: p.studentId }, type: "pay", text: `💳 ${p.month} 수납 완료 (${method})`, time: hhmm(), readBy: [] }); return d; }),
    confirmPay: (id, val) => D(d => { const p = d.payments.find(p => p.id === id); if (p) p.confirmed = val; return d; }),
    remindUnpaid: (ids) => D(d => { (d.payments || []).filter(p => ids.includes(p.id)).forEach(p => { const stu = d.students.find(s => s.id === p.studentId); d.notifications.unshift({ id: uid("n"), academyId: stu && stu.academyId, aud: { kind: "parentOf", studentId: p.studentId }, type: "pay", text: `🔔 ${p.month} 수강료 미납 안내 · ${(p.amount || 0).toLocaleString("ko-KR")}원`, time: hhmm(), readBy: [] }); }); return d; }),
    reopenPay: (id) => D(d => { const p = d.payments.find(p => p.id === id); if (p) { p.status = "pending"; p.confirmed = false; p.method = null; p.date = null; } return d; }),
    sendMsg: (key, by, text) => D(d => {
      if (!d.chats[key]) d.chats[key] = [];
      d.chats[key].push({ by, text, time: hhmm(), ts: Date.now(), readBy: [] });
      let aud = null, academyId = null;
      if (key.startsWith("dt:")) {
        const tid = key.slice(3); const t = d.teachers.find(x => x.id === tid); academyId = t && t.academyId;
        aud = by === "director" ? { kind: "teacher", teacherId: tid } : { kind: "admin" };
      } else {
        const [sid, type] = key.split("|");
        const stu = d.students.find(s => s.id === sid); academyId = stu && stu.academyId;
        if (type === "tp") aud = by === "teacher" ? { kind: "parentOf", studentId: sid } : { kind: "teacherOf", studentId: sid };
        else if (type === "pd") aud = by === "director" ? { kind: "parentOf", studentId: sid } : { kind: "admin" };
        else if (type === "td") aud = by === "director" ? { kind: "teacherOf", studentId: sid } : { kind: "admin" };
      }
      const who = by === "teacher" ? "선생님" : by === "director" ? "원장님" : "학부모";
      d.notifications.unshift({ id: uid("n"), academyId, aud, type: "chat", key, text: `💬 ${who} · ${text.slice(0, 22)}`, time: hhmm(), readBy: [] });
      return d;
    }),
    editMsg: (key, idx, text, myId) => D(d => { const arr = d.chats[key]; const m = arr && arr[idx]; if (m) { const readByOther = (m.readBy || []).some(x => x !== myId); if (!readByOther) { m.text = text; m.edited = true; } } return d; }),
    scheduleMsg: (key, by, text, sendAt) => D(d => {
      if (!d.scheduled) d.scheduled = [];
      const id = uid("sc");
      const message = { by, text, time: hhmmOf(sendAt), ts: sendAt, readBy: [], schedId: id };
      let aud = null, academyId = null;
      if (key.startsWith("dt:")) { const tid = key.slice(3); const t = d.teachers.find(x => x.id === tid); academyId = t && t.academyId; aud = by === "director" ? { kind: "teacher", teacherId: tid } : { kind: "admin" }; }
      else { const [sid, type] = key.split("|"); const stu = d.students.find(x => x.id === sid); academyId = stu && stu.academyId; if (type === "tp") aud = by === "teacher" ? { kind: "parentOf", studentId: sid } : { kind: "teacherOf", studentId: sid }; else if (type === "pd") aud = by === "director" ? { kind: "parentOf", studentId: sid } : { kind: "admin" }; else if (type === "td") aud = by === "director" ? { kind: "teacherOf", studentId: sid } : { kind: "admin" }; }
      const who = by === "teacher" ? "선생님" : by === "director" ? "원장님" : "학부모";
      const notif = { id: uid("n"), academyId, aud, type: "chat", key, text: `💬 ${who} · ${text.slice(0, 22)}`, time: hhmmOf(sendAt), readBy: [] };
      d.scheduled.push({ id, kind: "msg", sendAt, key, message, notif });
      return d;
    }),
    scheduleNotice: ({ audience, title, text, academyId, by, sendAt }) => D(d => {
      if (!d.scheduled) d.scheduled = [];
      const id = uid("sc");
      const announcement = { id: uid("an"), schedId: id, academyId, by, audience, title, text, date: `${new Date(sendAt).getMonth() + 1}월 ${new Date(sendAt).getDate()}일`, time: hhmmOf(sendAt), ts: sendAt };
      const kind = audience === "parents" ? "allParents" : audience === "teachers" ? "allTeachers" : "everyone";
      const notif = { id: uid("n"), academyId, aud: { kind }, type: "notice", refId: announcement.id, text: `📢 공지 · ${title.slice(0, 24)}`, time: hhmmOf(sendAt), readBy: [] };
      d.scheduled.push({ id, kind: "notice", sendAt, announcement, notif });
      return d;
    }),
    cancelScheduled: (id) => D(d => { d.scheduled = (d.scheduled || []).filter(s => s.id !== id); return d; }),
    editScheduled: (id, patch) => D(d => {
      const s = (d.scheduled || []).find(x => x.id === id); if (!s) return d;
      const sendAt = patch.sendAt != null ? patch.sendAt : s.sendAt; s.sendAt = sendAt;
      if (s.kind === "notice") {
        const audience = patch.audience != null ? patch.audience : s.announcement.audience;
        const title = patch.title != null ? patch.title : s.announcement.title;
        const text = patch.text != null ? patch.text : s.announcement.text;
        s.announcement = { ...s.announcement, audience, title, text, date: `${new Date(sendAt).getMonth() + 1}월 ${new Date(sendAt).getDate()}일`, time: hhmmOf(sendAt), ts: sendAt };
        const kind = audience === "parents" ? "allParents" : audience === "teachers" ? "allTeachers" : "everyone";
        s.notif = { ...s.notif, aud: { kind }, text: `📢 공지 · ${title.slice(0, 24)}`, time: hhmmOf(sendAt) };
      } else {
        const text = patch.text != null ? patch.text : s.message.text;
        s.message = { ...s.message, text, time: hhmmOf(sendAt), ts: sendAt };
        const who = s.message.by === "teacher" ? "선생님" : s.message.by === "director" ? "원장님" : "학부모";
        s.notif = { ...s.notif, text: `💬 ${who} · ${text.slice(0, 22)}`, time: hhmmOf(sendAt) };
      }
      return d;
    }),
    flushScheduled: () => D(d => {
      const now = Date.now(); const due = (d.scheduled || []).filter(s => s.sendAt <= now);
      if (!due.length) return d;
      due.forEach(s => {
        if (s.kind === "notice") {
          if (d.announcements.some(a => a.schedId === s.id)) return;
          d.announcements.unshift(s.announcement); d.notifications.unshift(s.notif);
        } else {
          if (!d.chats[s.key]) d.chats[s.key] = [];
          if (d.chats[s.key].some(m => m.schedId === s.id)) return;
          d.chats[s.key].push(s.message); d.notifications.unshift(s.notif);
        }
      });
      d.scheduled = (d.scheduled || []).filter(s => s.sendAt > now);
      return d;
    }),
    markThreadRead: (key, accId) => D(d => { (d.chats[key] || []).forEach(m => { if (!m.readBy) m.readBy = []; if (!m.readBy.includes(accId)) m.readBy.push(accId); }); d.notifications.forEach(n => { if (n.key === key && !n.readBy.includes(accId)) n.readBy.push(accId); }); return d; }),
    markNotifRead: (nid, accId) => D(d => { const n = d.notifications.find(n => n.id === nid); if (n && !n.readBy.includes(accId)) n.readBy.push(accId); return d; }),
    markAllNotifsRead: (ids, accId) => D(d => { d.notifications.forEach(n => { if (ids.includes(n.id) && !n.readBy.includes(accId)) n.readBy.push(accId); }); return d; }),
  };

  useEffect(() => {
    const tick = () => { if ((data.scheduled || []).some(s => s.sendAt <= Date.now())) api.flushScheduled(); };
    tick(); const iv = setInterval(tick, 20000); return () => clearInterval(iv);
  }, [data.scheduled]);

  const handleSignup = (role, f) => {
    let newAuthId = null;
    setData(prev => {
      const d = structuredClone(prev);
      if (role === "admin") {
        const acId = uid("ac"); const code = genCode();
        d.academies[acId] = { id: acId, name: f.academy.trim(), tagline: f.tagline.trim() || "함께 만드는 음악 시간", directorName: f.name.trim(), inviteCode: code, open: "13:00", close: "19:00" };
        const accId = uid("a"); d.accounts.push({ id: accId, role: "admin", name: f.name.trim(), email: f.email, password: f.pw, academyId: acId, verified: true }); newAuthId = accId;
      } else if (role === "teacher") {
        const ac = Object.values(d.academies).find(a => a.inviteCode.toUpperCase() === f.code.trim().toUpperCase());
        const tId = uid("t"); const color = PALETTE[d.teachers.filter(t => t.academyId === ac.id).length % PALETTE.length];
        d.teachers.push({ id: tId, academyId: ac.id, name: f.name.trim(), subject: f.subject || "피아노", color });
        const accId = uid("a"); d.accounts.push({ id: accId, role: "teacher", name: f.name.trim(), email: f.email, password: f.pw, academyId: ac.id, teacherId: tId, verified: true }); newAuthId = accId;
      } else {
        const ac = Object.values(d.academies).find(a => a.inviteCode.toUpperCase() === f.code.trim().toUpperCase());
        const accId = uid("a"); d.accounts.push({ id: accId, role: "parent", name: f.name.trim(), email: f.email, password: f.pw, academyId: ac.id, studentIds: [], verified: true });
        (f.studentIds || []).forEach(sid => { const stu = d.students.find(s => s.id === sid); d.linkRequests.unshift({ id: uid("lr"), accountId: accId, studentId: sid, academyId: ac.id, parentName: f.name.trim(), status: "pending", time: hhmm() }); d.notifications.unshift({ id: uid("n"), academyId: ac.id, aud: { kind: "admin" }, type: "link", text: `👶 ${f.name.trim()}님이 ${stu ? stu.name : ""} 자녀 연결을 요청했어요`, time: hhmm(), readBy: [] }); });
        newAuthId = accId;
      }
      return d;
    });
    if (newAuthId) { setAuthId(newAuthId); setActiveStudentId(null); setTab("diary"); }
    return {};
  };

  const acc = data.accounts.find(a => a.id === authId);
  const doLogin = (id, remember) => { SESSION.accountId = remember ? id : null; if (typeof window !== "undefined" && window.storage) { if (remember) window.storage.set("ln:auth", id, false).catch(() => { }); else window.storage.delete("ln:auth", false).catch(() => { }); } else { if (remember) authStore.set(id); else authStore.clear(); } setAuthId(id); setActiveStudentId(null); setTab("diary"); };
  useEffect(() => {
    if (authId) return;
    if (typeof window !== "undefined" && window.storage) {
      let alive = true;
      (async () => { try { const r = await window.storage.get("ln:auth", false); if (alive && r && r.value) { SESSION.accountId = r.value; setAuthId(r.value); } } catch (e) { } })();
      return () => { alive = false; };
    }
    const id = authStore.get(); if (id) { SESSION.accountId = id; setAuthId(id); }
  }, []);
  if (!acc) return (<div className="dc-root"><style>{STYLES}</style><div className="dc-phone"><AuthScreen data={data} onLogin={doLogin} onSignup={handleSignup} onReset={api.resetPassword} /></div></div>);

  const me = { id: acc.id, role: acc.role, name: acc.name, academyId: acc.academyId, teacherId: acc.teacherId, studentIds: acc.studentIds || [] };
  const academy = data.academies[me.academyId];
  const myStudents = data.students.filter(s => s.academyId === me.academyId && (me.role === "admin" ? true : me.role === "teacher" ? s.teacherId === me.teacherId : me.studentIds.includes(s.id)));
  const student = myStudents.find(s => s.id === activeStudentId) || myStudents[0] || null;
  const canEdit = me.role === "teacher" || me.role === "admin";
  const academyTeachers = data.teachers.filter(t => t.academyId === me.academyId);
  const defaultTeacherId = me.role === "teacher" ? me.teacherId : (student ? student.teacherId : academyTeachers[0]?.id);
  const logout = () => { SESSION.accountId = null; if (typeof window !== "undefined" && window.storage) window.storage.delete("ln:auth", false).catch(() => { }); else authStore.clear(); setAuthId(null); setActiveStudentId(null); setNotifOpen(false); };

  // 알림: 현재 계정이 받을 대상인지 판별
  const notifForMe = (n) => {
    if (n.academyId && n.academyId !== me.academyId) return false;
    const a = n.aud; if (!a) return false;
    if (a.kind === "account") return a.accountId === me.id;
    if (a.kind === "admin") return me.role === "admin";
    if (a.kind === "parentOf") return me.role === "parent" && me.studentIds.includes(a.studentId);
    if (a.kind === "teacherOf") { const stu = data.students.find(s => s.id === a.studentId); return me.role === "teacher" && stu && stu.teacherId === me.teacherId; }
    if (a.kind === "teacher") return me.role === "teacher" && me.teacherId === a.teacherId;
    if (a.kind === "allParents") return me.role === "parent";
    if (a.kind === "allTeachers") return me.role === "teacher";
    if (a.kind === "everyone") return me.role === "parent" || me.role === "teacher";
    return false;
  };
  const prefOn = (type) => (acc.prefs ? acc.prefs[type] !== false : true);
  const myNotifs = data.notifications.filter(n => notifForMe(n) && prefOn(n.type));
  const unread = myNotifs.filter(n => !n.readBy.includes(me.id));

  const fifth = me.role === "parent" ? { k: "pay", label: "결제", icon: CreditCard } : { k: "manage", label: "관리", icon: me.role === "admin" ? Settings : GraduationCap };
  const TABS = [{ k: "diary", label: "알림장", icon: Home }, { k: "progress", label: "진도", icon: TrendingUp }, { k: "schedule", label: "시간표", icon: CalendarDays }, { k: "chat", label: "채팅", icon: MessageCircle }, fifth];
  const showPicker = me.role === "admin" || me.role === "teacher" || me.studentIds.length > 1;
  const childCandidates = data.students.filter(s => s.academyId === me.academyId && !me.studentIds.includes(s.id));
  const noStudent = !student;

  return (
    <div className="dc-root">
      <style>{STYLES}</style>
      <div className="dc-phone">
        <div className="dc-head">
          <div className="dc-staff" /><div className="dc-glow" />
          <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}><Music2 size={17} /><span className="dc-serif" style={{ fontSize: 15, fontWeight: 700 }}>{academy.name}</span></div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}><button className="dc-btn" onClick={() => setNotifOpen(true)} style={{ position: "relative", background: "none", padding: 0, color: "#fff" }}><Bell size={19} />{unread.length > 0 && <span style={{ position: "absolute", top: -6, right: -7, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 999, background: "var(--coral)", boxShadow: "0 0 0 2px var(--plum-deep)", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{unread.length > 9 ? "9+" : unread.length}</span>}</button><button className="dc-btn" onClick={() => setProfileOpen(true)} style={{ background: "rgba(255,255,255,.16)", borderRadius: 11, padding: 7, color: "#fff" }}><User size={16} /></button></div>
          </div>
          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 11, marginTop: 14 }}>
            <div className="dc-avatar">{me.role === "admin" ? "🏫" : me.role === "teacher" ? "🎼" : (student ? student.avatar : "🎀")}</div>
            <div style={{ flex: 1 }}>
              {me.role === "admin" ? (<><div style={{ fontSize: 11.5, opacity: .8 }}>{me.name} 원장님 · 관리자</div><div className="dc-serif" style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.25 }}>{academy.tagline}</div></>)
                : me.role === "teacher" ? (<><div style={{ fontSize: 11.5, opacity: .8 }}>{me.name} 선생님 · 강사</div><div className="dc-serif" style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.25 }}>{student ? `지금 보는 학생: ${student.name}` : "담당 학생이 없어요"}</div></>)
                  : (<><div style={{ fontSize: 11.5, opacity: .8 }}>{me.name}님 · 안녕하세요!{me.studentIds.length > 1 ? ` (자녀 ${me.studentIds.length}명)` : ""}</div><div className="dc-serif" style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.2 }}>{student ? <>{student.name} <span style={{ fontSize: 13, fontWeight: 400, opacity: .85 }}>{student.age}</span></> : "—"}</div></>)}
            </div>
            {showPicker && student && tab !== "chat" && <button className="dc-btn" onClick={() => setPickStudent(true)} style={{ background: "rgba(255,255,255,.16)", borderRadius: 13, padding: "7px 11px", color: "#fff", display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>{me.role === "parent" ? "자녀" : "학생"} <ChevronDown size={14} /></button>}
          </div>
        </div>

        <div className="dc-body" key={authId + tab + (student ? student.id : "none")}>
          {noStudent && tab !== "manage" ? (
            <div style={{ paddingTop: 30 }}>
              {me.role === "parent" && data.linkRequests.some(r => r.accountId === me.id && r.status === "pending") ? (
                <div className="dc-card" style={{ padding: 22, textAlign: "center" }}>
                  <div style={{ width: 56, height: 56, borderRadius: 20, background: "#FBEFD8", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}><Clock size={28} color="#B5872F" /></div>
                  <div className="dc-serif" style={{ fontSize: 17, fontWeight: 700 }}>원장님 승인을 기다리고 있어요</div>
                  <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 6, lineHeight: 1.7 }}>자녀 연결 요청이 접수되었어요.<br />원장님이 승인하면 알림장·진도·결제를 볼 수 있어요.</div>
                  <div style={{ marginTop: 16 }}>{data.linkRequests.filter(r => r.accountId === me.id && r.status === "pending").map(r => { const stu = data.students.find(s => s.id === r.studentId); return <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", padding: "8px 0" }}><span style={{ fontSize: 18 }}>{stu ? stu.avatar : "🧒"}</span><span style={{ fontSize: 13.5, fontWeight: 700 }}>{stu ? stu.name : "?"}</span><Tag bg="#FBEFD8" color="#B5872F">승인 대기</Tag></div>; })}</div>
                </div>
              ) : (<><Empty msg={me.role === "admin" ? "아직 학생이 없어요. '관리' 탭에서 강사와 학생을 추가해 시작하세요!" : me.role === "teacher" ? "아직 배정된 학생이 없어요. 원장님께 문의하세요." : "연결된 자녀가 없어요. 우측 상단 종 옆 프로필에서 자녀 연결을 요청하세요."} />{me.role === "admin" && <PrimaryBtn onClick={() => setTab("manage")} tone="linear-gradient(140deg,#EE9573,#E07A55)"><Settings size={16} /> 학원 관리로 가기</PrimaryBtn>}</>)}
            </div>
          ) : (<>
            {tab === "diary" && <DiaryView data={data} student={student} canEdit={canEdit} defaultTeacherId={defaultTeacherId} me={me} api={api} />}
            {tab === "progress" && <ProgressView data={data} student={student} canEdit={canEdit} api={api} />}
            {tab === "schedule" && <ScheduleView data={data} student={student} canEdit={canEdit} academyTeachers={academyTeachers} me={me} api={api} />}
            {tab === "chat" && <ChatView data={data} student={student} me={me} academy={academy} api={api} />}
            {tab === "pay" && <PaymentView data={data} student={student} api={api} />}
            {tab === "manage" && <ManageView data={data} me={me} academy={academy} student={student} api={api} setActiveStudent={setActiveStudentId} setTab={setTab} onLogout={logout} />}
          </>)}
        </div>

        <div className="dc-nav">{TABS.map(t => { const I = t.icon; const on = tab === t.k; return <button key={t.k} className={"dc-nav-btn" + (on ? " on" : "")} onClick={() => setTab(t.k)}><div className="dc-nav-ico"><I size={20} /></div>{t.label}</button>; })}</div>

        {pickStudent && (<Sheet title={me.role === "parent" ? "자녀 선택" : "학생 선택"} onClose={() => { setPickStudent(false); setPq(""); }}>{myStudents.length > 8 && <SearchBox value={pq} onChange={setPq} placeholder={(me.role === "parent" ? "자녀" : "학생") + " 이름 검색"} />}{myStudents.filter(s => !pq.trim() || s.name.includes(pq.trim())).slice(0, 40).map(s => (<button key={s.id} className="dc-btn" onClick={() => { setActiveStudentId(s.id); setPickStudent(false); setPq(""); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", marginBottom: 8, borderRadius: 14, background: (student && s.id === student.id) ? "#F3E2D3" : "#fff", border: "1px solid var(--line)" }}><div style={{ fontSize: 22 }}>{s.avatar}</div><div style={{ flex: 1, textAlign: "left" }}><div style={{ fontSize: 14.5, fontWeight: 700 }}>{s.name}</div><div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{s.age} · {(data.teachers.find(t => t.id === s.teacherId) || {}).name || "미배정"} 선생님</div></div>{student && s.id === student.id && <Check size={18} color="#E07A55" />}</button>))}{me.role === "parent" && <button className="dc-btn" onClick={() => { setPickStudent(false); setAddChild(true); }} style={{ width: "100%", padding: 13, borderRadius: 14, background: "#F0E7D9", color: "var(--plum)", fontSize: 13.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 4 }}><PlusCircle size={16} /> 다른 자녀 연결하기</button>}</Sheet>)}

        {addChild && <AddChild candidates={childCandidates} pending={data.linkRequests.filter(r => r.accountId === me.id && r.status === "pending").map(r => ({ ...r, studentName: (data.students.find(s => s.id === r.studentId) || {}).name }))} rejected={data.linkRequests.filter(r => r.accountId === me.id && r.status === "rejected").map(r => ({ ...r, studentName: (data.students.find(s => s.id === r.studentId) || {}).name }))} onRequest={(sid) => api.requestLink(authId, sid)} onReRequest={(rid) => api.reRequestLink(rid)} onClose={() => setAddChild(false)} />}

        {confirmState && <ConfirmModal {...confirmState} onClose={() => setConfirmState(null)} />}
        {profileOpen && (
          <Sheet title="내 정보" onClose={() => setProfileOpen(false)}>
            <div style={{ display: "flex", alignItems: "center", gap: 13, padding: 14, borderRadius: 16, background: "linear-gradient(150deg,#6A4C7A,#4D3759)", color: "#fff", marginBottom: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 16, background: "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>{me.role === "admin" ? <Shield size={22} /> : me.role === "teacher" ? <Music2 size={22} /> : <User size={22} />}</div>
              <div style={{ flex: 1 }}><div className="dc-serif" style={{ fontSize: 17, fontWeight: 700 }}>{me.name}</div><div style={{ fontSize: 12, opacity: .85 }}>{academy.name} · {me.role === "admin" ? "원장" : me.role === "teacher" ? "강사" : "학부모"}</div><div style={{ fontSize: 11.5, opacity: .7, marginTop: 2 }}>{acc.email}</div></div>
            </div>

            <div className="dc-section-tt" style={{ marginBottom: 8 }}><Bell size={14} /> 알림 설정</div>
            <div style={{ background: "#FFFDF8", border: "1px solid var(--line)", borderRadius: 16, padding: "4px 14px", marginBottom: 16 }}>
              {[["attend", "등원 알림"], ["notice", "공지사항"], ["diary", "알림장·댓글"], ["chat", "채팅"], ["pay", "결제"], ["link", "자녀 연결"]].map(([t, label]) => { const on = acc.prefs ? acc.prefs[t] !== false : true; return (
                <div key={t} style={{ display: "flex", alignItems: "center", padding: "11px 0", borderBottom: "1px solid var(--line)" }}>
                  <span style={{ flex: 1, fontSize: 13.5 }}>{label}</span>
                  <button className="dc-btn" onClick={() => api.setPref(me.id, t, !on)} style={{ width: 46, height: 26, borderRadius: 999, background: on ? "var(--mint)" : "#D9CFC0", position: "relative", transition: ".2s" }}><span style={{ position: "absolute", top: 3, left: on ? 23 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: ".2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} /></button>
                </div>
              ); })}
            </div>

            {me.role === "parent" && <button className="dc-btn" onClick={() => { setProfileOpen(false); setAddChild(true); }} style={{ width: "100%", padding: 13, borderRadius: 14, background: "#F0E7D9", color: "var(--plum)", fontSize: 13.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 10 }}><PlusCircle size={16} /> 자녀 연결 요청</button>}
            <button className="dc-btn" onClick={logout} style={{ width: "100%", padding: 14, borderRadius: 16, background: "#FBE0DC", color: "#C45A48", fontSize: 14.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}><LogOut size={16} /> 로그아웃</button>
          </Sheet>
        )}

        {notifOpen && (
          <Sheet title="알림" onClose={() => setNotifOpen(false)}>
            {unread.length > 0 && <button className="dc-btn" onClick={() => api.markAllNotifsRead(myNotifs.map(n => n.id), me.id)} style={{ width: "100%", padding: 10, borderRadius: 12, background: "#F0E7D9", color: "var(--plum)", fontSize: 13, marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><CheckCheck size={15} /> 모두 읽음 처리</button>}
            {myNotifs.length === 0 && <Empty msg="새 알림이 없어요." />}
            {myNotifs.map(n => { const isUnread = !n.readBy.includes(me.id); const goTab = n.type === "chat" ? "chat" : n.type === "diary" ? "diary" : n.type === "pay" ? (me.role === "admin" ? "manage" : "pay") : "diary"; const childName = (me.role === "parent" && me.studentIds.length > 1 && n.aud && n.aud.studentId) ? (data.students.find(s => s.id === n.aud.studentId) || {}).name : null; return (
              <button key={n.id} className="dc-btn" onClick={() => { api.markNotifRead(n.id, me.id); setTab(goTab); setNotifOpen(false); }} style={{ width: "100%", display: "flex", alignItems: "flex-start", gap: 11, padding: "12px 12px", marginBottom: 8, borderRadius: 14, background: isUnread ? "#FFF6EC" : "#fff", border: `1px solid ${isUnread ? "#F4D7C2" : "var(--line)"}`, textAlign: "left" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: isUnread ? "var(--coral-deep)" : "transparent", marginTop: 6, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>{childName && <div style={{ display: "inline-block", fontSize: 10.5, fontWeight: 700, color: "var(--plum)", background: "#F3E2D3", borderRadius: 6, padding: "1px 7px", marginBottom: 4 }}>{childName}</div>}<div style={{ fontSize: 13.5, fontWeight: isUnread ? 700 : 400, color: "var(--ink)", lineHeight: 1.5 }}>{n.text}</div><div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 3 }}>{n.time}</div></div>
              </button>
            ); })}
          </Sheet>
        )}
      </div>
    </div>
  );
}
