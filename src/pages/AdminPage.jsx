import { useState } from 'react';
import { useApp } from '../state/AppContext.jsx';
import { grantDP, upsertGoods, fulfillRedemption, setDpParams } from '../data/store.js';
import { DP_DEFAULTS } from '../domain/dpcurve.js';

function useBusy() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const run = async (fn, ok) => {
    setErr(''); setMsg(''); setBusy(true);
    try { const r = await fn(); setMsg(ok ? ok(r) : '완료'); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };
  return { busy, err, msg, run };
}

function GrantSection({ users, allDp }) {
  const { busy, err, msg, run } = useBusy();
  const [mode, setMode] = useState('all');
  const [userId, setUserId] = useState('');
  const [amount, setAmount] = useState(1);
  const [memo, setMemo] = useState('');
  const dpById = Object.fromEntries(allDp.map((a) => [a.id, a.dp || 0]));

  function submit() {
    const ids = mode === 'all' ? users.map((u) => u.id) : [userId].filter(Boolean);
    if (!ids.length) return;
    run(() => grantDP({ userIds: ids, amount: Math.floor(Number(amount)), memo }),
      (r) => `${r.count}명에게 ${r.amount > 0 ? '+' : ''}${r.amount} DP 지급`);
  }

  return (
    <div className="card">
      <h3>① 이벤트 DP 지급</h3>
      <div className="row">
        <select value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="all">전체</option>
          <option value="one">개별</option>
        </select>
        {mode === 'one' && (
          <select value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">학생 선택</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name} (DP {dpById[u.id] || 0})</option>)}
          </select>
        )}
        <input type="number" value={amount} style={{ width: 90 }} onChange={(e) => setAmount(e.target.value)} />
        <input placeholder="메모(예: 추석)" value={memo} onChange={(e) => setMemo(e.target.value)} />
        <button className="primary" disabled={busy} onClick={submit}>지급</button>
      </div>
      <p className="muted">음수면 회수. 전체 지급은 모든 계정에 적용됩니다.</p>
      {msg && <p style={{ color: 'var(--positive)' }}>{msg}</p>}
      {err && <p className="err">{err}</p>}
    </div>
  );
}

function GoodsRow({ g }) {
  const { busy, err, msg, run } = useBusy();
  const [priceDP, setPriceDP] = useState(g.priceDP);
  const [stock, setStock] = useState(g.stock ?? 0);
  const [active, setActive] = useState(g.active !== false);
  return (
    <tr>
      <td>{g.name}</td>
      <td><input type="number" value={priceDP} style={{ width: 70 }} onChange={(e) => setPriceDP(e.target.value)} /></td>
      <td><input type="number" value={stock} style={{ width: 70 }} onChange={(e) => setStock(e.target.value)} /></td>
      <td><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /></td>
      <td>
        <button className="ghost" disabled={busy}
          onClick={() => run(() => upsertGoods({ id: g.id, priceDP: Number(priceDP), stock: Number(stock), active }), () => '저장됨')}>저장</button>
        {msg && <span style={{ color: 'var(--positive)', marginLeft: 6 }}>{msg}</span>}
        {err && <span className="err" style={{ marginLeft: 6 }}>{err}</span>}
      </td>
    </tr>
  );
}

function GoodsSection({ goods }) {
  const { busy, err, msg, run } = useBusy();
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [priceDP, setPriceDP] = useState(10);
  const [stock, setStock] = useState(10);
  return (
    <div className="card">
      <h3>② 상품 관리</h3>
      <table>
        <thead><tr><th>상품</th><th>DP</th><th>재고</th><th>노출</th><th></th></tr></thead>
        <tbody>{goods.map((g) => <GoodsRow key={g.id} g={g} />)}</tbody>
      </table>
      <h4 style={{ marginTop: 14 }}>새 상품 추가</h4>
      <div className="row">
        <input placeholder="id(영문)" value={id} onChange={(e) => setId(e.target.value)} style={{ width: 100 }} />
        <input placeholder="이름" value={name} onChange={(e) => setName(e.target.value)} />
        <input type="number" value={priceDP} style={{ width: 70 }} onChange={(e) => setPriceDP(e.target.value)} />
        <input type="number" value={stock} style={{ width: 70 }} onChange={(e) => setStock(e.target.value)} />
        <button className="primary" disabled={busy || !id || !name}
          onClick={() => run(() => upsertGoods({ id, name, priceDP: Number(priceDP), stock: Number(stock), active: true }), () => '추가됨')}>추가</button>
      </div>
      {msg && <p style={{ color: 'var(--positive)' }}>{msg}</p>}
      {err && <p className="err">{err}</p>}
    </div>
  );
}

function RedemptionsSection({ redemptions }) {
  const { busy, err, run } = useBusy();
  const pending = redemptions.filter((r) => r.status === 'pending');
  return (
    <div className="card">
      <h3>③ 교환 승인 <span className="muted">대기 {pending.length}건</span></h3>
      {pending.length === 0 ? <p className="muted">대기중인 교환이 없습니다.</p> : (
        <table>
          <thead><tr><th>학생</th><th>상품</th><th>DP</th><th></th></tr></thead>
          <tbody>
            {pending.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td><td>{r.goodsName}</td><td className="mono">{r.priceDP}</td>
                <td>
                  <button className="primary" disabled={busy} onClick={() => run(() => fulfillRedemption(r.id, 'fulfilled'))}>지급완료</button>{' '}
                  <button className="ghost" disabled={busy} onClick={() => run(() => fulfillRedemption(r.id, 'cancelled'))}>취소(복구)</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {err && <p className="err">{err}</p>}
    </div>
  );
}

function ParamsSection({ config }) {
  const { busy, err, msg, run } = useBusy();
  const c = config || {};
  const [R0, setR0] = useState(c.R0 ?? DP_DEFAULTS.R0);
  const [k, setK] = useState(c.k ?? DP_DEFAULTS.k);
  const [exp, setExp] = useState(c.exp ?? DP_DEFAULTS.exp);
  const [convertEnabled, setConvert] = useState(c.convertEnabled !== false);
  const [redeemEnabled, setRedeem] = useState(c.redeemEnabled !== false);
  return (
    <div className="card">
      <h3>④ 교환소 파라미터</h3>
      <div className="row">
        <label>R0</label><input type="number" value={R0} style={{ width: 90 }} onChange={(e) => setR0(e.target.value)} />
        <label>k</label><input type="number" value={k} style={{ width: 90 }} onChange={(e) => setK(e.target.value)} />
        <label>지수</label><input type="number" value={exp} style={{ width: 60 }} onChange={(e) => setExp(e.target.value)} />
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <label><input type="checkbox" checked={convertEnabled} onChange={(e) => setConvert(e.target.checked)} /> 포인트→DP 허용</label>
        <label><input type="checkbox" checked={redeemEnabled} onChange={(e) => setRedeem(e.target.checked)} /> 상품 교환 허용</label>
        <button className="primary" disabled={busy}
          onClick={() => run(() => setDpParams({ R0: Number(R0), k: Number(k), exp: Number(exp), convertEnabled, redeemEnabled }), () => '저장됨')}>저장</button>
      </div>
      <p className="muted">확정값: R0=10,000 · k=1,000 · 지수=2(2차곡선). 곡선은 매주 초기화.</p>
      {msg && <p style={{ color: 'var(--positive)' }}>{msg}</p>}
      {err && <p className="err">{err}</p>}
    </div>
  );
}

export default function AdminPage() {
  const { users, goods, allDp, allRedemptions, config } = useApp();
  const totalDpOut = allRedemptions.filter((r) => r.status !== 'cancelled').reduce((a, r) => a + (r.priceDP || 0), 0);
  return (
    <div>
      <div className="card">
        <h3>예산 모니터</h3>
        <div className="grid">
          <div className="stat"><div className="lab">총 보유 DP(합)</div><div className="num mono">{allDp.reduce((a, d) => a + (d.dp || 0), 0).toLocaleString()}</div></div>
          <div className="stat"><div className="lab">교환된 DP(누적)</div><div className="num mono">{totalDpOut.toLocaleString()}</div></div>
          <div className="stat"><div className="lab">대기 교환</div><div className="num mono">{allRedemptions.filter((r) => r.status === 'pending').length}</div></div>
        </div>
      </div>
      <GrantSection users={users} allDp={allDp} />
      <GoodsSection goods={goods} />
      <RedemptionsSection redemptions={allRedemptions} />
      <ParamsSection config={config} />
    </div>
  );
}
