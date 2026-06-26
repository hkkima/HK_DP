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
