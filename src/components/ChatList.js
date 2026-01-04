import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { collection, query, where, onSnapshot, orderBy, doc, getDoc } from 'firebase/firestore';
import '../styles/ChatList.css';

function ChatList({ onChatClick }) {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    // 1. ค้นหาห้องแชทที่ "เรา" มีส่วนร่วมอยู่
    const q = query(
      collection(db, "chats"),
      where(`participants.${auth.currentUser.uid}`, "==", true),
      orderBy("updatedAt", "desc") // เรียงตามแชทล่าสุด
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const chatPromises = snapshot.docs.map(async (chatDoc) => {
        //สร้าง state ใหม่ chatData เพื่อเก็บรายละเอียดห้องแชท (เช่น ใครอยู่ในห้องบ้าง)
        const chatData = chatDoc.data();
        // 2. หา UID ของ "เพื่อน" (คนที่ไม่ใช่เรา)
        const participantIds = Object.keys(chatData.participants);
        const friendId = participantIds.find(id => id !== auth.currentUser.uid);

        // 3. ดึงข้อมูลชื่อและรูปเพื่อนจากคอลเลกชัน 'users'
        const friendSnap = await getDoc(doc(db, "users", friendId));
        const friendData = friendSnap.exists() ? friendSnap.data() : { displayName: "เพื่อน" };

        return {
          id: chatDoc.id,
          friendName: friendData.displayName,
          friendPhoto: friendData.photoURL,
          lastMessage: chatData.lastMessage || "เริ่มคุยกันเลย! 😊",
          ...chatData
        };
      });

      const chatList = await Promise.all(chatPromises);
      setChats(chatList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth.currentUser]);

  if (loading) return <p style={{ padding: '20px' }}>กำลังโหลดรายการแชท...</p>;

  return (
    <div className="chat-list-container">
      {chats.length > 0 ? (
        chats.map((chat) => (
          <div key={chat.id} className="chat-item" onClick={() => onChatClick(chat.id)}>
            <div className="chat-avatar">
              {chat.friendPhoto ? <img src={chat.friendPhoto} alt="p" /> : chat.friendName.charAt(0)}
            </div>
            <div className="chat-info">
              <div className="chat-name">{chat.friendName}</div>
              <div className="chat-last-msg">{chat.lastMessage}</div>
            </div>
          </div>
        ))
      ) : (
        <p className="empty-msg">ยังไม่มีรายการแชท เริ่มหาเพื่อนกันเลย! 😊</p>
      )}
    </div>
  );
}

export default ChatList;