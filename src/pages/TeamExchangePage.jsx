import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../state/AppContext.jsx';
import { subscribeTeams, subscribeCorpServices, subscribeCorpOrders, redeemCorpService } from '../data/store.js';

// 팀 포인트 교환소 — ★팀 = 주식★ (stocks/{id}.corpBalance 가 팀 금고).
//   개인 DP 교환과 나란히 두는 이유: "교환은 교환소에서" 라는 한 곳으로 모으기 위함.
//   구매는 대표(CEO)만. 팀원은 같은 화면에서 가격표와 주문 현황을 열람한다(투명성 견제).
//   대금은 금고에서 소각되고, 운영자가 납품 완료/거부(거부 시 금고 환불) 처리한다.
const TIER_LABEL = {
  T1: 'T1 · 까미 노동',
  T2: 'T2 · 강사 직접',
  T3: 'T3 · 까미 비전스 계약',
};
const ORDER_LABEL = { pending: '대기중', fulfilled: '완료', rejected: '거부' };

export default function TeamExchangePage() {
  const { session } = useApp();
  const [teams, setTeams] = useState([]);
  const [services, setServices] = useState({});
  const [orders, setOrders] = useState([]);
  const [note, setNote] = useState('');
  const [busyId, setBusyId] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const subs = [subscribeTeams(setTeams), subscribeCorpServices(setServices)];
    return () => subs.forEach((u) => u && u());
  }, []);

  // 대표면 그 팀, 아니면 소속 팀.
  const team = useMemo(() => {
    if (session.role !== 'participant') return null;
    return teams.find((t) => t.ceoUserId === session.userId)
      || teams.find((t) => Array.isArray(t.members) && t.members.includes(session.userId))
      || null;
  }, [teams, session.userId, session.role]);
  const isCeo = !!team && team.ceoUserId === session.userId;

  useEffect(() => {
    if (!team) return undefined;
    return subscribeCorpOrders(team.id, setOrders);
  }, [team?.id]);

  if (session.role !== 'participant') {
    return <div className="card"><p className="muted">팀 교환을 이용하려면 [로그인] 탭에서 참가자로 로그인하세요.</p></div>;
  }
  if (!team) {
    return <div className="card"><p className="muted">소속된 회사가 없습니다. 운영자가 팀에 배정하면 여기에 표시됩니다.</p></div>;
  }

  const treasury = team.corpBalance || 0;

  async function buy(key, svc) {
    if (!isCeo) { setErr('구매는 대표(CEO)만 가능합니다.'); return; }
    if (!window.confirm(`${svc.name} 을(를) ${svc.price.toLocaleString()} 포인트로 구매할까요?\n대금은 팀 금고에서 소각됩니다.`)) return;
    setErr(''); setMsg(''); setBusyId(key);
    try {
      const r = await redeemCorpService({
        stockId: team.id, ceoUserId: session.userId, pinHash: session.pinHash,
        service: key, params: { note },
      });
      setMsg(r.status === 'fulfilled'
        ? `${svc.name} 체결 완료 — ${r.cost.toLocaleString()}P 소각${r.effect ? ' · 뉴스가 게시되었습니다' : ''}`
        : `${svc.name} 접수 완료 — ${r.cost.toLocaleString()}P 소각. 운영자 확인 후 진행됩니다.`);
      setNote('');
    } catch (e) { setErr(e.message); }
    finally { setBusyId(''); }
  }

  return (
    <div>
      <div className="grid" style={{ marginBottom: 14 }}>
        <div className="stat"><div className="lab">회사</div><div className="num" style={{ fontSize: 18 }}>{team.name}</div></div>
        <div className="stat"><div className="lab">팀 금고</div><div className="num mono">{treasury.toLocaleString()} P</div></div>
        <div className="stat"><div className="lab">내 역할</div><div className="num" style={{ fontSize: 18 }}>{isCeo ? '대표(CEO)' : '팀원'}</div></div>
      </div>

      <div className="card">
        <h3>팀 포인트 교환소</h3>
        <p className="muted">
          대금은 <b>팀 금고에서 소각</b>됩니다(팀원 지갑으로 가지 않습니다). 납품이 끝나면 운영자가 완료 처리하고,
          들어드릴 수 없는 주문은 거부되어 <b>금고로 환불</b>됩니다.
        </p>
        {!isCeo && <div className="banner">👀 열람 전용입니다. 구매는 대표(CEO)만 가능합니다.</div>}
        {Object.keys(services).length === 0 && <p className="muted">가격표가 아직 설정되지 않았습니다.</p>}

        {['T1', 'T2', 'T3'].map((tier) => {
          const items = Object.entries(services).filter(([, s]) => s.tier === tier);
          if (!items.length) return null;
          return (
            <div key={tier} style={{ marginTop: 14 }}>
              <h4 style={{ margin: '0 0 8px' }}>{TIER_LABEL[tier] || tier}</h4>
              <div className="grid">
                {items.sort((a, b) => a[1].price - b[1].price).map(([key, s]) => {
                  const poor = treasury < s.price;
                  return (
                    <div className="good" key={key}>
                      <h4>{s.name}</h4>
                      <p className="muted" style={{ minHeight: 34 }}>{s.desc}</p>
                      <p className="mono" style={{ color: 'var(--accent-2)' }}>{s.price.toLocaleString()} P</p>
                      <p className="muted">
                        {s.phase}
                        {s.effect ? ' · 즉시 체결(환불 불가)' : ''}
                      </p>
                      <button className="primary" disabled={!isCeo || poor || busyId === key}
                        onClick={() => buy(key, s)}>
                        {busyId === key ? '처리 중…' : poor ? '금고 부족' : '구매'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {isCeo && (
          <div className="row" style={{ marginTop: 12 }}>
            <label>요청사항</label>
            <input style={{ flex: 1 }} placeholder="주제·마감·참고 링크 등 (선택)"
              value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        )}
        {msg && <p style={{ color: 'var(--positive)' }}>{msg}</p>}
        {err && <p className="err">{err}</p>}
      </div>

      <div className="card">
        <h3>우리 회사 주문 현황</h3>
        {orders.length === 0 && <p className="muted">아직 주문이 없습니다.</p>}
        {orders.length > 0 && (
          <table>
            <thead><tr><th>상품</th><th>금액</th><th>상태</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.serviceName || o.service}</td>
                  <td className="mono">{(o.cost || 0).toLocaleString()}</td>
                  <td>
                    {ORDER_LABEL[o.status] || o.status}
                    {o.status === 'rejected' && o.reason ? ` — ${o.reason}` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
