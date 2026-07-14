import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { isConfigured, ensureAnonAuth, signInWithGoogle, isAdminEmail, watchAuth } from '../data/firebase.js';
import {
  subscribeUsers, subscribeGoods, subscribeDpConfig, subscribeDpAccount,
  subscribeAllDpAccounts, subscribeMyRedemptions, subscribeAllRedemptions,
  getUser, getUserByName,
} from '../data/store.js';
import { nameToUserId, verifyPin } from '@hk/shared';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);
const SESSION_KEY = 'hkdp.session';

export function AppProvider({ children }) {
  const configured = isConfigured();
  const [users, setUsers] = useState([]);
  const [goods, setGoods] = useState([]);
  const [config, setConfig] = useState(null);
  const [myDp, setMyDp] = useState({ dp: 0, weekCount: 0 });
  const [myRedemptions, setMyRedemptions] = useState([]);
  const [allDp, setAllDp] = useState([]);          // 운영자만
  const [allRedemptions, setAllRedemptions] = useState([]); // 운영자만
  const [fbUser, setFbUser] = useState(undefined);
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)) || { role: 'guest' }; }
    catch { return { role: 'guest' }; }
  });

  useEffect(() => {
    if (!configured) return undefined;
    return watchAuth(setFbUser);
  }, [configured]);

  // 공통 구독(작은 데이터). 참가자는 익명 인증 확보(함수 호출용).
  useEffect(() => {
    if (!configured) return undefined;
    if (session.role !== 'admin') ensureAnonAuth();
    const unsubs = [subscribeUsers(setUsers), subscribeGoods(setGoods), subscribeDpConfig(setConfig)];
    if (session.role === 'participant' && session.userId) {
      unsubs.push(subscribeDpAccount(session.userId, setMyDp));
      unsubs.push(subscribeMyRedemptions(session.userId, setMyRedemptions));
    } else { setMyDp({ dp: 0, weekCount: 0 }); setMyRedemptions([]); }
    if (session.role === 'admin') {
      unsubs.push(subscribeAllDpAccounts(setAllDp));
      unsubs.push(subscribeAllRedemptions(setAllRedemptions));
    } else { setAllDp([]); setAllRedemptions([]); }
    return () => unsubs.forEach((u) => u && u());
  }, [configured, session.role, session.userId]);

  const persist = useCallback((s) => {
    setSession(s);
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  }, []);

  const loginParticipant = useCallback(async (name, pin) => {
    if (!configured) throw new Error('Firebase 설정이 필요합니다 (.env).');
    const user = (await getUserByName(name)) || (await getUser(nameToUserId(name)));
    if (!user) throw new Error('등록되지 않은 참가자입니다. 주식/베팅판 계정으로 로그인하세요.');
    if (!verifyPin(pin, user.pinHash)) throw new Error('PIN이 일치하지 않습니다.');
    await ensureAnonAuth();
    persist({ role: 'participant', userId: user.id, name: user.name, pinHash: user.pinHash });
  }, [configured, persist]);

  const loginAdmin = useCallback(async () => {
    if (!configured) throw new Error('Firebase 설정이 필요합니다 (.env).');
    const u = await signInWithGoogle();
    if (!isAdminEmail(u.email)) throw new Error(`운영자 권한이 없는 계정입니다: ${u.email}`);
    persist({ role: 'admin', email: u.email });
  }, [configured, persist]);

  const logout = useCallback(() => persist({ role: 'guest' }), [persist]);

  const myUser = useMemo(
    () => (session.role === 'participant' ? users.find((u) => u.id === session.userId) : null),
    [users, session],
  );
  const adminReauthNeeded = configured && session.role === 'admin' && fbUser === null;

  const value = {
    configured, users, goods, config, myDp, myRedemptions, allDp, allRedemptions,
    session, myUser, adminReauthNeeded,
    loginParticipant, loginAdmin, logout,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
