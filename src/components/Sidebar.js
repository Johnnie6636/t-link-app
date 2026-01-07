import React, { useState, useEffect, useRef } from 'react';
import '../styles/Sidebar.css';
import { db, auth } from '../services/firebase';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../services/firebase';

function Sidebar({ isOpen, user, onNavigate, handleToggleNotification }) {
    const [userData, setUserData] = useState(user || {});
    const [tempName, setTempName] = useState(user?.displayName || "");
    const [isEditing, setIsEditing] = useState(false);
    const fileInputRef = useRef(null);
    const handleProfileClick = () => {
    fileInputRef.current.click(); // เมื่อคลิกที่รูป ให้ไปสั่งให้ input ไฟล์ทำงาน
    };
    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        // ตรวจสอบเบื้องต้นว่ามีไฟล์ถูกเลือกจริงไหม
        if (!file || !user?.uid) return;
        // 🛡️ ขั้นตอนการตรวจสอบประเภทไฟล์
        if (!file.type.startsWith('image/')) {
            alert("กรุณาเลือกไฟล์ที่เป็นรูปภาพเท่านั้นนะครับ! 📸");
            return; // หยุดการทำงานทันทีถ้าไม่ใช่รูปภาพ
        }
        
        try {
            // 1. สร้างการอ้างอิงไปยังตำแหน่งที่จะเก็บไฟล์ (Storage Reference)
            const storageRef = ref(storage, `avatars/${user.uid}`);
            // Step 2: อัปโหลดไฟล์ขึ้นไป
            await uploadBytes(storageRef, file);
            // Step 3: ดึงลิงก์ URL ของรูปภาพกลับมา
            const photoURL = await getDownloadURL(storageRef);
            // Step 4: อัปเดตที่อยู่รูปภาพใหม่ลงใน Firestore
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, { photoURL: photoURL });
            setUserData(prev => ({ ...prev, photoURL: photoURL }));
            alert("เปลี่ยนรูปโปรไฟล์สำเร็จ!");
        } catch (error) {
            console.error("เกิดข้อผิดพลาดในการอัปโหลด:", error);
            alert("ไม่สามารถอัปโหลดรูปภาพได้ กรุณาลองใหม่");
        }
    };

  // เมื่อข้อมูล user เปลี่ยน ให้เซตชื่อในช่องพิมพ์ตาม
  useEffect(() => {
    if (!user?.uid) return;
    // 1. กำหนดจุดอ้างอิง (ที่เราคุยกันเมื่อกี้)
    const userRef = doc(db, "users", user.uid);
    // 2. เริ่ม "ฟัง" ข้อมูล
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            setUserData(data);
            if (!isEditing) setTempName(data.displayName || "");
        }
    });
    // 3. คืนค่าฟังก์ชันเพื่อ "หยุดฟัง" เมื่อปิด Sidebar
    return () => unsubscribe();
  }, [user?.uid, isEditing]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("ออกจากระบบไม่สำเร็จ:", error);
    }
  };

  const handleUpdateName = async () => {
    if (!tempName.trim() || !user?.uid) return;
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { displayName: tempName });
      alert("อัปเดตชื่อสำเร็จ!");
    } catch (error) {
      console.error("Update name failed:", error);
    }
  };

  const handleSaveClick = async () => {
  await handleUpdateName(); // เรียกฟังก์ชันอัปเดต Firebase เดิมของเรา
  setIsEditing(false);      // ปิดโหมดแก้ไข
    };

  return (
    <div className={`side-menu ${isOpen ? 'open' : ''}`}>
      {userData && (
        <div className="sidebar-header">
          <div className="header-left-group">
            <div className="profile-circle-container">
              <div className="profile-circle" onClick={handleProfileClick}>
                {userData && userData.photoURL ? (
                  <img src={userData.photoURL} alt="profile" />
                ) : (
                  <span className="profile-initial">
                      {userData?.displayName?.charAt(0) || 'U'}
                  </span>
                )}
                <div className="camera-overlay">
                  <span>📸</span>
                </div>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
                accept="image/*"
              />
            </div>

            <div className="user-info">
              {isEditing ? (
                /* โหมดแก้ไข: ชื่อและปุ่มเซฟอยู่ต่อกัน */
                <div className="edit-name-container">
                  <input
                    className="sidebar-name-input"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    autoFocus
                  />
                  <button onClick={handleSaveClick} className="save-name-btn">💾</button>
                </div>
              ) : (
                /* โหมดปกติ: ชื่อและปุ่มเฟืองอยู่ต่อกัน */
                <div className="display-name-container">
                  <span className="user-name">{userData?.displayName || 'User'}</span>
                  <button 
                    className="edit-icon-btn" 
                    onClick={() => setIsEditing(true)}
                  >
                    ⚙️
                  </button>
                </div>
              )}
              <p className="user-id">ID: {userData.displayId || user?.uid?.slice(0, 6)}</p>
              <p className="user-phone">{userData.phoneNumber || userData.phone || 'ไม่ระบุ'}</p>
            </div>
          </div>
          {/* เอา header-right-group เดิมออก เพราะปุ่มย้ายเข้าไปรวมกับชื่อแล้ว */}
        </div>
      )}

      <ul className="menu-list">
        <li onClick={() => onNavigate('wallet')}>
          <span>💳</span> กระเป๋าเงินของคุณ
        </li>
        <li onClick={() => onNavigate('friends')}>
          <span>👥</span> รายชื่อเพื่อนของคุณ
        </li>
        
        {/* ✅ เพิ่มรายการเมนูใหม่สำหรับเปิดการแจ้งเตือน */}
        <li className="menu-item-with-toggle">
          <div className="menu-item-content">
            <span>🔔</span> เปิดการแจ้งเตือน
          </div>
          {/* สร้างสวิตช์ Toggle */}
          <label className="switch">
            <input 
              type="checkbox" 
              checked={!!userData?.fcmToken} // ถ้ามี token จะถือว่าเปิด (true)
              onChange={(e) => handleToggleNotification(e.target.checked)} // ส่งค่า true/false กลับไป
            />
            <span className="slider round"></span>
          </label>
        </li>

        <li onClick={() => onNavigate('settings')}>
          <span>⚙️</span> ตั้งค่า
        </li>
        <li className="logout-item" onClick={handleLogout}>
          <span>⍈</span> ออกจากระบบ
        </li>
      </ul>
    </div>
  );
}

export default Sidebar;