import { useState } from 'react';
import { useApp } from '../state/AppContext.jsx';

export default function LoginPage() {
  const { session, loginParticipant, loginAdmin, logout } = useApp();
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  if (session.role !== 'guest') {
    return (
      <div className="card">
        <p>현재 <b>{session.name || session.email}</b> 로 로그인되어 있습니다.</p>
        <button className="ghost" onClick={logout}>로그아웃</button>
      </div>
    );
  }

  async function doParticipant(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try { await loginParticipant(name, pin); }
    catch (e2) { setErr(e2.message); }
    finally { setBusy(false); }
  }
  async function doAdmin() {
    setErr('');
    try { await loginAdmin(); } catch (e2) { setErr(e2.message); }
  }

  return (
    <div>
      <div className="card">
        <h3>참가자 로그인</h3>
        <form className="row" onSubmit={doParticipant}>
          <input placeholder="이름" value={name} onChange={(e) => setName(e.target.value)} />
          <input placeholder="PIN" type="password" value={pin} onChange={(e) => setPin(e.target.value)} />
          <button className="primary" type="submit" disabled={busy}>로그인</button>
        </form>
        <p className="muted">주식/베팅판과 같은 이름·PIN으로 로그인하세요(계정·포인트 공유).</p>
      </div>
      <div className="card">
        <h3>운영자 로그인</h3>
        <button className="ghost" onClick={doAdmin}>Google로 로그인</button>
      </div>
      {err && <p className="err">{err}</p>}
    </div>
  );
}
