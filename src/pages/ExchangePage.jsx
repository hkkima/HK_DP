import { useState, useMemo } from 'react';
import { useApp } from '../state/AppContext.jsx';
import { convertToDP } from '../data/store.js';
import { marginal, rangeCost, maxBuyable, DP_DEFAULTS } from '../domain/dpcurve.js';
import { seoulWeekKey } from '../util/week.js';

export default function ExchangePage() {
  const { session, myUser, myDp, config } = useApp();
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const R0 = Number.isFinite(config?.R0) ? config.R0 : DP_DEFAULTS.R0;
  const k = Number.isFinite(config?.k) ? config.k : DP_DEFAULTS.k;
  const exp = Number.isFinite(config?.exp) ? config.exp : DP_DEFAULTS.exp;

  // 이번 주 매수 개수(주 바뀌면 0으로 표시)
  const weekCount = (myDp.weekKey === seoulWeekKey()) ? (myDp.weekCount || 0) : 0;
  const balance = myUser?.balance || 0;

  const nextPrice = marginal(weekCount, R0, k, exp);
  const cost = rangeCost(weekCount, qty, R0, k, exp);
  const affordable = maxBuyable(weekCount, balance, R0, k, exp);
  const ladder = useMemo(
    () => Array.from({ length: 5 }, (_, i) => ({ n: weekCount + i + 1, price: marginal(weekCount + i, R0, k, exp) })),
    [weekCount, R0, k, exp],
  );

  if (session.role !== 'participant') {
    return <div className="card"><p className="muted">교환소를 이용하려면 [로그인] 탭에서 참가자로 로그인하세요.</p></div>;
  }

  const convertOff = config?.convertEnabled === false;

  async function buy() {
    setErr(''); setMsg(''); setBusy(true);
    try {
      const r = await convertToDP({ userId: session.userId, pinHash: session.pinHash, qty });
      setMsg(`+${r.qty} DP 교환 완료 (−${r.cost.toLocaleString()}P)`);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <div className="grid" style={{ marginBottom: 14 }}>
        <div className="stat"><div className="lab">내 포인트</div><div className="num mono">{balance.toLocaleString()} P</div></div>
        <div className="stat"><div className="lab">내 DP</div><div className="num mono" style={{ color: 'var(--accent-2)' }}>{(myDp.dp || 0).toLocaleString()}</div></div>
        <div className="stat"><div className="lab">이번 주 매수</div><div className="num mono">{weekCount} 개</div></div>
        <div className="stat"><div className="lab">다음 1개 가격</div><div className="num mono">{nextPrice.toLocaleString()} P</div></div>
      </div>

      <div className="card">
        <h3>포인트 → DP 교환</h3>
        {convertOff && <div className="banner">현재 교환이 일시 중지되었습니다.</div>}
        <p className="muted">개당 가격은 이번 주 매수할수록 가팔라지고(2차곡선), 매주 초기화됩니다. 매도(DP→포인트)는 지원하지 않습니다.</p>
        <div className="row">
          <label>수량</label>
          <input type="number" min="1" value={qty} style={{ width: 90 }}
            onChange={(e) => setQty(Math.max(1, Math.floor(Number(e.target.value) || 1)))} />
          <span className="muted">예상 비용</span>
          <b className="mono">{cost.toLocaleString()} P</b>
          <button className="primary" disabled={busy || convertOff || cost > balance || qty < 1} onClick={buy}>교환</button>
        </div>
        <p className="muted" style={{ marginTop: 8 }}>
          지금 잔액으로 이번 주 최대 <b>{affordable}</b>개까지 가능. {cost > balance && <span className="err">포인트가 부족합니다.</span>}
        </p>
        {msg && <p style={{ color: 'var(--positive)' }}>{msg}</p>}
        {err && <p className="err">{err}</p>}
      </div>

      <div className="card">
        <h3>이번 주 개당 가격</h3>
        <table>
          <thead><tr><th>몇 번째</th><th>개당 가격</th></tr></thead>
          <tbody>
            {ladder.map((r) => (
              <tr key={r.n}><td>{r.n}번째</td><td className="mono">{r.price.toLocaleString()} P</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
