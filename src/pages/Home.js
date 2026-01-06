import React, { useState, useEffect } from 'react';
import { auth, db } from '../services/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import Sidebar from '../components/Sidebar';
import SearchBar from '../components/SearchBar';
import ChatList from '../components/ChatList';
import SearchResultModal from '../components/SearchResultModal';
import FriendListPage from './FriendListPage'; 
import ChatRoom from '../components/ChatRoom'; 
import '../styles/Home.css';
import WalletPage from './WalletPage';

// รับ props 'onNavigate' มาจาก App.js เพื่อใช้เปลี่ยนหน้าหลัก
function Home() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [userData, setUserData] = useState(null);
  const [currentView, setCurrentView] = useState('chats');
  const [selectedChatId, setSelectedChatId] = useState(null);

useEffect(() => {
  const unsubscribeAuth = auth.onAuthStateChanged((user) => {
    if (user) {
      // เปลี่ยนจาก getDoc เป็น onSnapshot เพื่อเฝ้าดูการเปลี่ยนแปลงของ Document นี้
      const userRef = doc(db, "users", user.uid);
      
      const unsubscribeSnapshot = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          setUserData(docSnap.data());
          console.log("Sidebar: ข้อมูลอัปเดตแบบ Real-time แล้ว!");
        }
      });

      // คืนค่าฟังก์ชันเพื่อหยุดติดตาม snapshot เมื่อ user logout หรือ component ถูกทำลาย
      return () => unsubscribeSnapshot();
    } else {
      setUserData(null);
    }
  });

  return () => unsubscribeAuth();
}, []);

  // ฟังก์ชันจัดการการคลิกเมนูใน Sidebar
  const handleNavigate = (page) => {
    setSidebarOpen(false); // ปิด Sidebar ก่อน
    setCurrentView(page);
  };

  const handleStartChatting = (chatId) => {
    setSelectedChatId(chatId);
    setCurrentView('chatting');
  };

  return (
    <div className="home-container">
        {isSidebarOpen && (
            <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>
        )}
        {currentView !== 'chatting' && (
        <header className="home-header">
            {/* เช็คว่าถ้าเป็นหน้าอื่นที่ไม่ใช่หน้าแชทหลัก ให้แสดงปุ่มย้อนกลับ ⬅ */}
            {currentView !== 'chats' ? (
            <button className="menu-btn" onClick={() => setCurrentView('chats')}>
              ⮜
            </button>
            ) : (
            /* ถ้าอยู่หน้าแชทหลัก ให้แสดงปุ่มแฮมเบอร์เกอร์ ☰ ตามเดิม */
            <button className="menu-btn" onClick={() => setSidebarOpen(true)}>
              ☰
            </button>
            )}
            <h1 className="app-title">
            {currentView === 'wallet' ? 'T-wallet' : 
            currentView === 'friends' ? 'รายชื่อเพื่อน' : 'T-Link'}
            </h1>
        </header>
        )}

        <Sidebar 
            isOpen={isSidebarOpen} 
            user={userData}
            onNavigate={(page) => {
            setCurrentView(page);
            setSidebarOpen(false);
            }} 
        />

        <main className="content-area">
            {currentView === 'wallet' ? (
            // เมื่ออยู่ในหน้า wallet ให้ส่งฟังก์ชันกลับไปที่ chats
            <WalletPage onBack={() => setCurrentView('chats')} />
            ) : currentView === 'friends' ? (
            <FriendListPage 
            onBack={() => setCurrentView('chats')} 
            onChat={handleStartChatting} 
            />
            ) : currentView === 'chatting' ? (
            <ChatRoom 
            chatId={selectedChatId} 
            onBack={() => setCurrentView('chats')} 
            />
            ) : (
            <>
            <SearchBar onSearchResult={setSearchResult} />
            <div className="list-section">
            <h2 className="section-title">รายการแชทล่าสุด</h2>
            <ChatList onChatClick={handleStartChatting} />
            </div>
            </>
            )}
        </main>

        {searchResult && (
            <SearchResultModal 
            result={searchResult} 
            onClose={() => setSearchResult(null)} 
            onChat={handleStartChatting}
            />
        )}
    </div>
  );
}

export default Home;