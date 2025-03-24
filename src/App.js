// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import POUpload from './pages/POUpload';
import POList from './pages/POList';
import Booking from './pages/Booking';
import Layout from './components/Layout';
import './App.css';

function App() {
  // 常に認証済みとして扱う（ログイン機能を無効化）
  const isAuthenticated = () => true;

  // 認証が必要なルートのラッパー（ログインなしで直接アクセス可能に）
  const ProtectedRoute = ({ children }) => {
    return <Layout>{children}</Layout>;
  };

  return (
    <Router>
      <Routes>
        {/* ログインページが削除されたため、/loginへのアクセスをメインページにリダイレクト */}
        <Route path="/login" element={<Navigate to="/" />} />
        
        {/* メインページ */}
        <Route path="/" element={
          <ProtectedRoute>
            <POUpload />
          </ProtectedRoute>
        } />
        
        {/* PO一覧ページ */}
        <Route path="/po/list" element={
          <ProtectedRoute>
            <POList />
          </ProtectedRoute>
        } />
        
        {/* 旧パスでのアクセス対応（後方互換性） */}
        <Route path="/list" element={<Navigate to="/po/list" />} />
        
        {/* ブッキングページ */}
        <Route path="/booking" element={
          <ProtectedRoute>
            <Booking />
          </ProtectedRoute>
        } />
        
        {/* 存在しないパスへのアクセス */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
