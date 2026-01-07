import React, { useState, useEffect } from 'react';
import { auth, db } from '../services/firebase';
import { getMessaging, getToken } from 'firebase/messaging';
import { updateDoc, doc, onSnapshot } from 'firebase/firestore';
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

  const handleToggleNotification = async (isEnabling) => {
  try {
    if (isEnabling) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted'){
        const messaging = getMessaging();
        const token = await getToken(messaging, { 
        vapidKey: 'BLMBCU_XOehgDIGSxNxQNrYojXg3SkJyrF9fW_5l7N2KHOUQDBba37onehTkmUarvWCYtr3CsYNoE9CBK26xw-E' 
        });
        if (token) {
          const userRef = doc(db, "users", auth.currentUser.uid);
          await updateDoc(userRef, { fcmToken: token });
          console.log("เปิดการแจ้งเตือนสำเร็จ 🔔");
        }
      } else {
        alert('กรุณาอนุญาตการแจ้งเตือนในตั้งค่าเบราว์เซอร์ครับ');
      }
      // TODO: ดึง Token และบันทึกลง Firestore
    } else {
      // --- ส่วนของการ "ปิด" ---
      const userRef = doc(db, "users", auth.currentUser.uid);
      // ใช้ deleteField() หรือตั้งเป็น null เพื่อหยุดการส่งแจ้งเตือนจากหลังบ้าน
      await updateDoc(userRef, { fcmToken: null });
      console.log("ปิดการแจ้งเตือนแล้ว 🔕");
    }
  } catch (error) {
    console.error('เกิดข้อผิดพลาด:', error);
  }
};

useEffect(() => {
  const unsubscribeAuth = auth.onAuthStateChanged((user) => {
    if (user) {
      // 1. ดึงค่าจาก .env เตรียมไว้
      const fcmConfig = {
        apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
        projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
        messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.REACT_APP_FIREBASE_APP_ID,
      };
      // 2. สร้าง URL พร้อม Query Parameters
      const swUrl = `/firebase-messaging-sw.js?${new URLSearchParams(fcmConfig).toString()}`;
      
      // เปลี่ยนจาก getDoc เป็น onSnapshot เพื่อเฝ้าดูการเปลี่ยนแปลงของ Document นี้
      const userRef = doc(db, "users", user.uid);
      // 3. สั่งลงทะเบียน Service Worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register(swUrl)
        .then((registration) => {
          console.log('Service Worker ลงทะเบียนสำเร็จ:', registration.scope);
        })
        .catch((err) => {
          console.error('ลงทะเบียน Service Worker ล้มเหลว:', err);
        });
      }
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
            {currentView === 'wallet' ? 'T-Link' : 
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
            handleToggleNotification={handleToggleNotification} // ✅ ส่ง props ใหม่ไป 
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