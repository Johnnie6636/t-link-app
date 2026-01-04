import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
// เพิ่ม getDocs, addDoc เข้ามาเพื่อใช้จัดการห้องแชท
import { 
  collection, query, where, onSnapshot, doc, 
  getDoc, getDocs, addDoc, deleteDoc 
} from 'firebase/firestore';
import '../styles/FriendListPage.css';

function FriendListPage({ onBack, onChat }) {
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- 1. ดึงรายชื่อเพื่อน (Real-time) ---
  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, "friends"),
      where("uid", "==", auth.currentUser.uid),
      where("status", "==", "accepted")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const friendPromises = snapshot.docs.map(async (friendDoc) => {
        const friendData = friendDoc.data();
        const userSnap = await getDoc(doc(db, "users", friendData.friendUid));
        return {
          friendDocId: friendDoc.id,
          uid: friendData.friendUid,
          ...userSnap.data()
        };
      });

      const friendList = await Promise.all(friendPromises);
      setFriends(friendList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // --- 2. ฟังก์ชันเริ่มแชท (เช็คห้องเดิม หรือ สร้างใหม่) ---
  const handleStartChat = async () => {
    if (!selectedFriend) return;
    const chatRef = collection(db, "chats");
    const q = query(
    chatRef,
    where(`participants.${auth.currentUser.uid}`, "==", true),
    where(`participants.${selectedFriend.uid}`, "==", true)
  );

  const querySnapshot = await getDocs(q);
  if (querySnapshot.size > 0) {
  // ✅ กรณีที่ 1: เจอห้องเดิม
  // ดึง ID ของห้องแรกที่เจอออกมา
  const existingChatId = querySnapshot.docs[0].id;
  onChat(existingChatId); // ส่ง ID ไปให้ Home.js ทำงานต่อ
} else {
  // 🆕 กรณีที่ 2: ยังไม่เคยคุยกัน (สร้างห้องใหม่)
  const newChatRef = await addDoc(collection(db, "chats"), {
    participants: {
      [auth.currentUser.uid]: true,
      [selectedFriend.uid]: true
    },
    createdAt: new Date(),
    lastMessage: ""
  });
  onChat(newChatRef.id); // ส่ง ID ห้องใหม่ไปให้ Home.js
}
    
    const myUid = auth.currentUser.uid;
    const friendUid = selectedFriend.uid;

    try {
      // ค้นหาห้องแชทที่มีทั้งคู่เป็นสมาชิก (ใช้ Object Participants)
      const q = query(
        collection(db, "chats"),
        where(`participants.${myUid}`, "==", true),
        where(`participants.${friendUid}`, "==", true)
      );

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // กรณีที่ 1: เคยคุยกันแล้ว ให้ใช้ห้องเดิม
        const existingChatId = querySnapshot.docs[0].id;
        onChat(existingChatId);
      } else {
        // กรณีที่ 2: ยังไม่เคยคุยกัน ให้สร้างห้องใหม่
        const newChatRef = await addDoc(collection(db, "chats"), {
          participants: {
            [myUid]: true,
            [friendUid]: true
          },
          createdAt: new Date(),
          lastMessage: "",
          updatedAt: new Date()
        });
        onChat(newChatRef.id);
      }
    } catch (error) {
      console.error("เริ่มแชทไม่สำเร็จ:", error);
      alert("เกิดข้อผิดพลาดในการเปิดห้องแชท");
    }
  };

  // --- 3. ฟังก์ชันลบเพื่อน ---
  const handleDeleteFriend = async (friendDocId) => {
    if (window.confirm("คุณแน่ใจนะว่าจะลบเพื่อนคนนี้ออก? 😢")) {
      try {
        await deleteDoc(doc(db, "friends", friendDocId));
        setSelectedFriend(null);
        alert("ลบเพื่อนเรียบร้อยแล้วจ้า");
      } catch (error) {
        console.error("ลบเพื่อนไม่สำเร็จ:", error);
      }
    }
  };

  if (loading) return <div className="loading">กำลังโหลดรายชื่อเพื่อน...</div>;

  return (
  <div className="friend-page-container">
    {/* ปรับส่วนนี้ให้แสดงเป็นรายการแถวยาว (Telegram Style) */}
    <div className="friend-telegram-list">
      {friends.length > 0 ? (
        friends.map((friend) => (
          <div key={friend.uid} className="telegram-item">
            {/* 1. ส่วนรูปโปรไฟล์และชื่อ */}
            <div className="telegram-info">
              <div className="telegram-avatar">
                {friend.photoURL ? <img src={friend.photoURL} alt="p" /> : friend.displayName?.charAt(0)}
              </div>
              <div className="telegram-text">
                <strong className="telegram-name">{friend.displayName}</strong>
                <span className="telegram-id">ID: {friend.displayId}</span>
              </div>
            </div>

            {/* 2. ส่วนปุ่มกด (ไม่ต้องกดเข้าหน้า Detail แล้ว) */}
            <div className="telegram-actions">
              <button 
                className="telegram-chat-btn" 
                onClick={() => {
                  setSelectedFriend(friend); // ตั้งค่าเพื่อนที่จะคุย
                  handleStartChat(); // เรียกใช้ฟังก์ชันเริ่มแชทที่มีอยู่แล้ว
                }}
              >
                แชท
              </button>
              <button 
                className="telegram-delete-btn" 
                onClick={() => handleDeleteFriend(friend.friendDocId)} //
              >
                ลบ
              </button>
            </div>
          </div>
        ))
      ) : (
        <p className="empty-msg">ยังไม่มีเพื่อนในรายการจ้า 😊</p>
      )}
    </div>
  </div>
);
}

export default FriendListPage;