import React, { useState, useEffect } from 'react';
import { auth } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Login from './pages/Login';
import Home from './pages/Home';
import WalletPage from './pages/WalletPage'; // 1. นำเข้าหน้ากระเป๋าเงิน

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // 2. เพิ่ม State สำหรับควบคุมการเปลี่ยนหน้า (เริ่มต้นที่หน้า home)
  const [currentPage, setCurrentPage] = useState('home');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <p>กำลังโหลด...</p>;

  // กรณีที่ยังไม่ได้ล็อกอิน ให้ไปหน้า Login
  if (!user) return <Login />;

  // 3. เงื่อนไขการสลับหน้าจอตามค่าใน currentPage
  return (
  <div className="App">
    {user ? <Home /> : <Login />}
  </div>
);
}

export default App;