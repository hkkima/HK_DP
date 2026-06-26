import { useState } from 'react';
import { useApp } from '../state/AppContext.jsx';
import { redeemGoods } from '../data/store.js';

const STATUS_LABEL = { pending: '대기중', fulfilled: '완료', cancelled: '취소' };

export default function CatalogPage() {
  const { session, goods, myDp, myRedemptions, config } = useApp();
  const [busyId, setBusyId] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const isParticipant = session.role === 'participant';
  const dp = myDp.dp || 0;
  const redeemOff = config?.redeemEnabled === false;

  async function redeem(g) {
    if (!isParticipant) { setErr('교환하려면 참가자로 로그인하세요.'); return; }
    if (!window.confirm(`${g.name} 을(를) ${g.priceDP} DP로 교환할까요?`)) return;
    setErr(''); setMsg(''); setBusyId(g.id);
    try {
      await redeemGoods({ userId: session.userId, pinHash: session.pinHash, goodsId: g.id });
      setMsg(`${g.name} 교환 신청 완료! 운영자 승인 후 지급됩니다.`);
    } catch (e) { setErr(e.message); }
    finally { setBusyId(''); }
  }

  return (
    <div>
      <div className="card">
        <h3>현물 상품 카탈로그</h3>
        {redeemOff && <div className="banner">현재 상품 교환이 일시 중지되었습니다.</div>}
        {isParticipant && <p className="muted">보유 DP: <b className="mono" style={{ color: 'var(--accent2)' }}>{dp.toLocaleString()}</b></p>}
        <div className="grid">
          {goods.filter((g) => g.active !== false).map((g) => {
            const out = (g.stock || 0) <= 0;
            const poor = isParticipant && dp < g.priceDP;
            return (
              <div className="good" key={g.id}>
                <h4>{g.name}</h4>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="price">{g.priceDP} DP</span>
                  <span className="muted">재고 {g.stock ?? 0}</span>
                </div>
                <button className="primary" style={{ marginTop: 10, width: '100%' }}
                  disabled={!isParticipant || redeemOff || out || poor || busyId === g.id}
                  onClick={() => redeem(g)}>
                  {out ? '품절' : poor ? 'DP 부족' : '교환'}
                </button>
              </div>
            );
          })}
          {goods.length === 0 && <p className="muted">등록된 상품이 없습니다.</p>}
        </div>
        {msg && <p style={{ color: 'var(--ok)' }}>{msg}</p>}
        {err && <p className="err">{err}</p>}
      </div>

      {isParticipant && (
        <div className="card">
          <h3>내 교환 내역</h3>
          {myRedemptions.length === 0 ? <p className="muted">아직 교환 내역이 없습니다.</p> : (
            <table>
              <thead><tr><th>상품</th><th>DP</th><th>상태</th></tr></thead>
              <tbody>
                {myRedemptions.map((r) => (
                  <tr key={r.id}>
                    <td>{r.goodsName}</td>
                    <td className="mono">{r.priceDP}</td>
                    <td><span className={`pill ${r.status}`}>{STATUS_LABEL[r.status] || r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
