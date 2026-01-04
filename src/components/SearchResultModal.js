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

    // ถ้ายังไม่เคยเป็นเพื่อนกัน (Snapshot ว่าง) ถึงจะทำการเพิ่มใหม่
    if (friendSnapshot.empty) {
      await addDoc(collection(db, "friends"), {
        uid: myUid,
        friendUid: friendUid,
        status: 'accepted',
        createdAt: serverTimestamp()
      });
    }

    // --- 2. เช็ค/สร้างห้องแชท (ส่วนเดิมที่ทำงานถูกต้องแล้ว) ---
    const chatRef = collection(db, "chats");
    const q = query(
      chatRef,
      where(`participants.${myUid}`, "==", true),
      where(`participants.${friendUid}`, "==", true)
    );

    const querySnapshot = await getDocs(q);
    let chatId;

    if (!querySnapshot.empty) {
      chatId = querySnapshot.docs[0].id;
    } else {
      const newChatRef = await addDoc(collection(db, "chats"), {
        participants: { [myUid]: true, [friendUid]: true },
        lastMessage: "",
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      });
      chatId = newChatRef.id;
    }

    onClose();
    if (onChat) onChat(chatId);

  } catch (error) {
    console.error("เกิดข้อผิดพลาด:", error);
  }
};

  if (!result) return null;

  // 1. กรณีค้นหา ID ตัวเอง
  if (result.isMe) {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="icon-badge">😊</div>
          <h2>นี่คือรหัสของคุณเองจ้า</h2>
          <p>ลองขอรหัส 6 หลักจากเพื่อนมาพิมพ์ใหม่นะ</p>
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
          {/* เปลี่ยนจาก alert เป็นเรียกใช้ฟังก์ชัน handleStartChat */}
          <button className="chat-btn" onClick={handleStartChat}>
            เริ่มคุยกันเลย 💬
          </button>
          <button className="cancel-btn" onClick={onClose}>ไว้ทีหลัง</button>
        </div>
      </div>
    </div>
  );
}

export default SearchResultModal;