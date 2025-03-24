// src/components/Layout.js
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // ブッキングページへの遷移
  const navigateToBooking = () => {
    navigate('/booking');
  };
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-blue-700 text-white">
        <div className="flex">
          <div className="w-64 p-4 bg-blue-700">
            <h1 className="text-xl font-bold">DigiTradeX</h1>
          </div>
          <div className="flex">
            <Link 
              to="/" 
              className={`px-6 py-4 ${location.pathname === '/' ? 'bg-blue-100 text-gray-800' : ''}`}
            >
              PO読取
            </Link>
            <Link 
              to="/po/list" 
              className={`px-6 py-4 ${location.pathname === '/po/list' || location.pathname === '/list' ? 'bg-blue-100 text-gray-800' : ''}`}
            >
              一覧
            </Link>
            <div 
              className={`px-6 py-4 cursor-pointer ${location.pathname === '/booking' ? 'bg-blue-100 text-gray-800' : ''}`}
              onClick={navigateToBooking}
            >
              ブッキング
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-grow p-6">
        {children}
      </main>

      {/* フッター */}
      <footer className="bg-blue-700 text-white p-4 flex justify-between">
        <div>
          <button className="mr-4">こんな時は？</button>
          <button>お問い合わせ</button>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
