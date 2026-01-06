import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { 
  collection, query, where, onSnapshot, doc, 
  getDoc, getDocs, addDoc, deleteDoc, serverTimestamp 
} from 'firebase/firestore';
import '../styles/FriendListPage.css';

function FriendListPage({ onBack, onChat }) {
  const [friends, setFriends] = useState([]);
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

  // --- 2. ฟังก์ชันเริ่มแชท (ระบบ Array + เตรียม Unread Count) ---
  const handleStartChat = async (friend) => {
    if (!friend || !auth.currentUser) return;
    
    const myUid = auth.currentUser.uid;
    const friendUid = friend.uid;

    try {
      const chatRef = collection(db, "chats");
      
      // ค้นหาห้องแชทที่มี UID ของเราอยู่ใน Array participants
      const q = query(
        chatRef,
        where("participants", "array-contains", myUid)
      );

      const querySnapshot = await getDocs(q);
      
      // ค้นหาว่าในรายการห้องที่มีเรา มีห้องไหนที่มีเพื่อนคนนี้อยู่ด้วยหรือไม่
      let existingChatId = null;
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.participants && data.participants.includes(friendUid)) {
          existingChatId = doc.id;
        }
      });

      if (existingChatId) {
        // ✅ กรณีที่ 1: เจอห้องเดิม -> นำเข้าห้องแชทเลย
        onChat(existingChatId);
      } else {
        // 🆕 กรณีที่ 2: สร้างห้องใหม่ (ใช้ Array และโครงสร้าง unreadCount)
        const newChatRef = await addDoc(collection(db, "chats"), {
          participants: [myUid, friendUid],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastMessage: "",
          unreadCount: {
            [myUid]: 0,
            [friendUid]: 0
          }
        });
        onChat(newChatRef.id);
      }
    } catch (error) {
      console.error("เริ่มแชทไม่สำเร็จ:", error);
      alert("ไม่สามารถเปิดห้องแชทได้ กรุณาลองใหม่");
    }
  };

  // --- 3. ฟังก์ชันลบเพื่อน ---
  const handleDeleteFriend = async (friendDocId) => {
    if (window.confirm("คุณแน่ใจนะว่าจะลบเพื่อนคนนี้ออก?")) {
      try {
        await deleteDoc(doc(db, "friends", friendDocId));
        alert("ลบเพื่อนเรียบร้อยแล้ว");
      } catch (error) {
        console.error("ลบเพื่อนไม่สำเร็จ:", error);
      }
    }
  };

  if (loading) return <div className="loading">กำลังโหลดรายชื่อเพื่อน...</div>;

  return (
    <div className="friend-page-container">
      <div className="friend-telegram-list">
        {friends.length > 0 ? (
          friends.map((friend) => (
            <div key={friend.uid} className="telegram-item">
              <div className="telegram-info">
                <div className="telegram-avatar">
                  {friend.photoURL ? (
                    <img src={friend.photoURL} alt="profile" />
                  ) : (
                    friend.displayName?.charAt(0) || "?"
                  )}
                </div>
                <div className="telegram-text">
                  <strong className="telegram-name">{friend.displayName || "ผู้ใช้ใหม่"}</strong>
                  <span className="telegram-id">ID: {friend.displayId || friend.phone}</span>
                </div>
              </div>

              <div className="telegram-actions">
                <button 
                  className="telegram-chat-btn" 
                  onClick={() => handleStartChat(friend)}
                >
                  แชท
                </button>
                <button 
                  className="telegram-delete-btn" 
                  onClick={() => handleDeleteFriend(friend.friendDocId)}
                >
                  ลบ
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="empty-msg">ยังไม่มีรายชื่อเพื่อนในรายการ 😊</p>
        )}
      </div>
    </div>
  );
}

export default FriendListPage;