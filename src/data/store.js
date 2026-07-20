// Firestore 데이터 계층 (DP 교환소). 읽기 구독 + 함수 래퍼.
//   쓰기(교환·지급)는 전부 Cloud Functions(callable) 경유 — 주식판과 같은 프로젝트.
import {
  doc, collection, getDoc, getDocs, onSnapshot, query, where, orderBy,
} from 'firebase/firestore';
import { getFirebase, callable } from './firebase.js';

const db = () => getFirebase().db;

// ── 구독 ────────────────────────────────────────────────
export function subscribeUsers(cb) {
  return onSnapshot(collection(db(), 'users'), (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}
export function subscribeGoods(cb) {
  return onSnapshot(collection(db(), 'dpGoods'), (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.sort || 0) - (b.sort || 0))));
}
export function subscribeDpConfig(cb) {
  return onSnapshot(doc(db(), 'meta', 'dpExchange'), (snap) => cb(snap.exists() ? snap.data() : null));
}
export function subscribeDpAccount(userId, cb) {
  return onSnapshot(doc(db(), 'dpAccounts', userId),
    (snap) => cb(snap.exists() ? { id: snap.id, ...snap.data() } : { id: userId, dp: 0, weekCount: 0 }),
    () => cb({ id: userId, dp: 0, weekCount: 0 }));
}
export function subscribeAllDpAccounts(cb) {
  return onSnapshot(collection(db(), 'dpAccounts'), (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}
export function subscribeMyRedemptions(userId, cb) {
  return onSnapshot(query(collection(db(), 'dpRedemptions'), where('userId', '==', userId)),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.ts?.seconds || 0) - (a.ts?.seconds || 0))),
    () => cb([]));
}
export function subscribeAllRedemptions(cb) {
  return onSnapshot(query(collection(db(), 'dpRedemptions'), orderBy('ts', 'desc')),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    () => cb([]));
}

// ── 팀 교환(팀 포인트) — ★팀 = 주식★ ────────────────────
//   팀 금고는 stocks/{id}.corpBalance, 가격표는 meta/corpServices, 주문은 corpOrders.
//   전부 공개 읽기(rules). 구매는 redeemCorpService 콜러블(CEO + PIN 검증).
export function subscribeTeams(cb) {
  return onSnapshot(collection(db(), 'stocks'), (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), () => cb([]));
}
export function subscribeCorpServices(cb) {
  return onSnapshot(doc(db(), 'meta', 'corpServices'),
    (snap) => cb(snap.exists() ? (snap.data().services || {}) : {}), () => cb({}));
}
// where + orderBy 복합은 색인을 요구하므로 where 만 쓰고 정렬은 클라에서.
export function subscribeCorpOrders(stockId, cb) {
  return onSnapshot(query(collection(db(), 'corpOrders'), where('stockId', '==', stockId)),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.ts?.seconds || 0) - (a.ts?.seconds || 0)).slice(0, 20)),
    () => cb([]));
}
export async function redeemCorpService({ stockId, ceoUserId, pinHash, service, params }) {
  return (await callable('redeemCorpService')({ stockId, ceoUserId, pinHash, service, params })).data;
}

// ── 계정(주식·베팅판과 공유) ─────────────────────────────
export async function getUser(userId) {
  const snap = await getDoc(doc(db(), 'users', userId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
export async function getUserByName(name) {
  const q = query(collection(db(), 'users'), where('name', '==', String(name).trim()));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

// ── 함수 래퍼(Cloud Functions) ──────────────────────────
export async function convertToDP({ userId, pinHash, qty }) {
  return (await callable('convertToDP')({ userId, pinHash, qty })).data;
}
export async function redeemGoods({ userId, pinHash, goodsId }) {
  return (await callable('redeemGoods')({ userId, pinHash, goodsId })).data;
}
export async function grantDP({ userIds, amount, memo }) {
  return (await callable('grantDP')({ userIds, amount, memo })).data;
}
export async function upsertGoods(payload) {
  return (await callable('upsertGoods')(payload)).data;
}
export async function fulfillRedemption(id, status) {
  return (await callable('fulfillRedemption')({ id, status })).data;
}
export async function setDpParams(payload) {
  return (await callable('setDpParams')(payload)).data;
}
