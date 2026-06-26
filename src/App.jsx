import { useState } from 'react';
import { useApp } from './state/AppContext.jsx';
import ExchangePage from './pages/ExchangePage.jsx';
import CatalogPage from './pages/CatalogPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import LoginPage from './pages/LoginPage.jsx';

export default function App() {
  const { configured, session, myUser, myDp, logout, adminReauthNeeded, loginAdmin } = useApp();
  const [tab, setTab] = useState('exchange');

  async function reauth() {
    try { await loginAdmin(); } catch (e) { window.alert(e.message); }
  }

  const isAdmin = session.role === 'admin';
  const isParticipant = session.role === 'participant';
  const who = isParticipant ? session.name : isAdmin ? `운영자 (${session.email})` : '게스트';

  return (
    <div>
      <header className="top">
        <h1>🎁 DP 교환소</h1>
        <nav className="tabs">
          <button className={tab === 'exchange' ? 'active' : ''} onClick={() => setTab('exchange')}>교환소</button>
          <button className={tab === 'catalog' ? 'active' : ''} onClick={() => setTab('catalog')}>상품</button>
          {isAdmin && <button className={tab === 'admin' ? 'active' : ''} onClick={() => setTab('admin')}>운영자</button>}
          <button className={tab === 'login' ? 'active' : ''} onClick={() => setTab('login')}>
            {session.role === 'guest' ? '로그인' : '계정'}
          </button>
        </nav>
        <div className="spacer" />
        {isParticipant && myUser && <span className="balance mono">{(myUser.balance || 0).toLocaleString()} P</span>}
        {isParticipant && <span className="balance mono" style={{ color: 'var(--accent2)' }}>{(myDp.dp || 0).toLocaleString()} DP</span>}
        <span className="muted">{who}</span>
        {session.role !== 'guest' && <button className="ghost" onClick={logout}>로그아웃</button>}
      </header>

      <div className="wrap">
        {adminReauthNeeded && (
          <div className="banner" style={{ borderColor: 'var(--bad)', color: 'var(--bad)' }}>
            🔑 운영자 구글 인증이 만료됐습니다(지급·승인 등 운영자 동작 불가).
            <button className="primary" style={{ marginLeft: 8 }} onClick={reauth}>Google로 다시 로그인</button>
          </div>
        )}
        {!configured && (
          <div className="banner">
            ⚙️ Firebase 미설정. <code>.env</code>에 <code>VITE_FIREBASE_*</code>(주식판과 같은 프로젝트)를 채우세요.
          </div>
        )}
        {tab === 'exchange' && <ExchangePage />}
        {tab === 'catalog' && <CatalogPage />}
        {tab === 'admin' && isAdmin && <AdminPage />}
        {tab === 'login' && <LoginPage />}
      </div>
    </div>
  );
}
