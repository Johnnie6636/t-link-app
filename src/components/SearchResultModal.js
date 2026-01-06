import React from 'react';
import { db, auth } from '../services/firebase'; 
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import '../styles/SearchResultModal.css';

function SearchResultModal({ result, onClose, onChat }) {
    
  // ฟังก์ชันหลักเมื่อกดปุ่ม "เริ่มคุยกันเลย"
  const handleStartChat = async () => {
    const myUid = auth.currentUser.uid;
    const friendUid = result.uid;

    try {
      // --- 1. เช็คก่อนว่าเคยเพิ่มเพื่อนคนนี้ไปหรือยัง เพื่อป้องกันรายชื่อซ้ำ ---
      const friendQuery = query(
        collection(db, "friends"),
        where("uid", "==", myUid),
        where("friendUid", "==", friendUid)
      );
      const friendSnapshot = await getDocs(friendQuery);

      if (friendSnapshot.empty) {
        await addDoc(collection(db, "friends"), {
          uid: myUid,
          friendUid: friendUid,
          status: 'accepted',
          createdAt: serverTimestamp()
        });
      }

      // --- 2. เช็ค/สร้างห้องแชท (ปรับปรุงเป็นระบบ Array) ---
      const chatRef = collection(db, "chats");
      
      // ค้นหาห้องแชทที่มี "เรา" เป็นหนึ่งในผู้ร่วมแชท
      const q = query(
        chatRef,
        where("participants", "array-contains", myUid)
      );

      const chatSnapshot = await getDocs(q);
      let existingChatId = null;

      // ตรวจสอบว่าในห้องแชทที่เราอยู่ มีห้องไหนที่มี friendUid อยู่ด้วยไหม
      chatSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.participants.includes(friendUid)) {
          existingChatId = doc.id;
        }
      });

      if (existingChatId) {
        // ถ้ามีห้องแชทอยู่แล้ว ให้เปิดห้องเดิม
        onChat(existingChatId);
        onClose();
      } else {
        // ถ้ายังไม่มี ให้สร้างห้องใหม่โดยบันทึก participants เป็น Array [myUid, friendUid]
        const newChat = await addDoc(chatRef, {
          participants: [myUid, friendUid],
          lastMessage: "",
          updatedAt: serverTimestamp(),
          unreadCount: 0
        });
        onChat(newChat.id);
        onClose();
      }

    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการเริ่มแแชท:", error);
      alert("ไม่สามารถเริ่มแชทได้ในขณะนี้");
    }
  };

  // --- ส่วนการแสดงผล (UI) ---

  // 1. กรณีเป็นตัวเอง
  if (result.isMe) {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="icon-badge">✨</div>
          <h2>นี่คือคุณเอง!</h2>
          <p>ลองเอา ID ให้เพื่อนมาพิมพ์ใหม่นะ</p>
          <button className="close-btn" onClick={onClose}>ตกลง</button>
        </div>
      </div>
    );
  }

  // 2. กรณีไม่พบข้อมูลเพื่อน
  if (result.notFound) {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="icon-badge">🧸</div>
          <h2>หาเพื่อนไม่เจอจ้ะ</h2>
          <p>ลองตรวจสอบตัวเลข ID อีกครั้งนะว่าถูกไหม</p>
          <button className="close-btn" onClick={onClose}>ลองใหม่</button>
        </div>
      </div>
    );
  }

  // 3. กรณีพบเพื่อนใหม่! ✨
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2 className="modal-title">พบเพื่อนใหม่!</h2>
        <div className="profile-section">
          <div className="profile-circle">
            {result.photoURL ? <img src={result.photoURL} alt="profile" /> : result.displayName?.charAt(0)}
          </div>
          <h3 className="user-name-s">{result.displayName}</h3>
          <p className="user-id-s">รหัสเพื่อน: {result.displayId}</p>
        </div>
        
        <div className="button-group">
          <button className="start-chat-btn" onClick={handleStartChat}>เริ่มคุยกันเลย</button>
          <button className="cancel-btn" onClick={onClose}>ไว้ก่อนนะ</button>
        </div>
      </div>
    </div>
  );
}

export default SearchResultModal;