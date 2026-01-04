import React, { useState } from 'react';
import { db, auth } from '../services/firebase'; // นำเข้าทั้ง db และ auth
import { collection, query, where, getDocs } from 'firebase/firestore'; // นำเข้าอุปกรณ์ค้นหา
import '../styles/SearchBar.css';

function SearchBar({ onSearchResult }) {
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    // 1. ตรวจสอบว่าได้พิมพ์อะไรลงไปหรือยัง
    if (!searchInput.trim()) return;

    setLoading(true);
    try {
      // 2. สร้างคำสั่งค้นหา: ไปที่ 'users' หาคนที่มี 'displayId' ตรงกับที่พิมพ์
      const q = query(collection(db, "users"), where("displayId", "==", searchInput));
      
      // 3. เริ่มรันการค้นหา
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // 4. ถ้าเจอข้อมูล ให้หยิบข้อมูลคนแรกออกมา
        const foundUser = querySnapshot.docs[0].data();
        
        // 5. ตรวจสอบว่าเป็นตัวเองหรือไม่ เพื่อป้องกันการคุยกับตัวเอง
        if (foundUser.uid === auth.currentUser?.uid) {
          onSearchResult({ isMe: true });
        } else {
          onSearchResult(foundUser); // ส่งข้อมูลเพื่อนไปที่หน้า Home
        }
      } else {
        // 6. ถ้าไม่เจอ ให้บอกหน้า Home ว่าหาไม่เจอ
        onSearchResult({ notFound: true });
      }
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการค้นหา:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className="search-bar"> {/* ใช้ Class นี้เพื่อคุมความกว้างไม่ให้ล้น */}
    <input 
      type="text" 
      placeholder="พิมพ์ ID เพื่อค้นหาเพื่อน..." 
      value={searchInput}
      onChange={(e) => setSearchInput(e.target.value)}
      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
    />
    <button onClick={handleSearch} disabled={loading} className="search-submit-btn">
      {loading ? '...' : '🔍︎'} {/* ใช้ไอคอนแว่นขยายเพื่อประหยัดพื้นที่ */}
    </button>
  </div>
);
}

export default SearchBar;