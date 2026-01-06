import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../services/firebase';
import { 
  collection, addDoc, query, orderBy, 
  onSnapshot, serverTimestamp, doc, updateDoc,
  limit, increment 
} from 'firebase/firestore';
import '../styles/ChatRoom.css';

// ฟังก์ชันช่วยจัดรูปแบบเวลา
const formatTime = (timestamp) => {
  if (!timestamp) return "..."; 
  const date = timestamp.toDate(); 
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

function ChatRoom({ chatId, onBack }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatData, setChatData] = useState(null);
  const [friendName, setFriendName] = useState("กำลังโหลดชื่อ...");
  const scrollRef = useRef();
  const myUid = auth.currentUser?.uid;

  // 1. ดึงข้อมูลพื้นฐานของห้องแชท (เพื่อดึงชื่อเพื่อนและเช็คจำนวนข้อความที่ไม่อ่าน)
  useEffect(() => {
    if (!chatId || !myUid) return;
    const chatDocRef = doc(db, "chats", chatId);
  
    const unsubscribe = onSnapshot(chatDocRef, async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setChatData(data);
          const myUnread = data.unreadCount?.[myUid] || 0;
          if (myUnread > 0) {
            try {
              await updateDoc(chatDocRef, {
                [`unreadCount.${myUid}`]: 0
              });
              console.log("รีเซ็ตตัวเลขแจ้งเตือนแล้ว");
            } catch (err) {
              console.error("รีเซ็ตไม่สำเร็จ:", err);
            }
          }
        }
    });

    return () => unsubscribe();
  }, [chatId, myUid]);

  // 2. ดึงข้อความแบบ Real-time (เรียงใหม่สุดอยู่ล่าง)
  useEffect(() => {
    if (!chatId) return;

    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "desc"),
      limit(50) 
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(msgList.reverse()); // กลับลำดับให้เก่าอยู่บน ใหม่เนื้อล่าง
    });

    return () => unsubscribe();
  }, [chatId]);

  // 3. เลื่อนหน้าจอลงไปล่างสุดอัตโนมัติ
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- ส่วนคำนวณตัวแปรสำหรับใช้งานใน UI ---
  
  const participants = chatData?.participants || [];
  const friendId = participants.find(id => id !== myUid);
  // 🟢 2. เพิ่มการคำนวณ readIndex
  const unreadCount = chatData?.unreadCount?.[friendId] || 0;
  const readIndex = messages.length - unreadCount - 1;
    useEffect(() => {
  if (!friendId) return;

  // อ้างอิงไปยัง Document ของเพื่อนในคอลเลกชัน users
  const userDocRef = doc(db, "users", friendId);

  const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
    if (docSnap.exists()) {
      const userData = docSnap.data();
      // สมมติว่าในคอลเลกชัน users เก็บชื่อไว้ในฟิลด์ displayName หรือ name
      setFriendName(userData.displayName || userData.name || "ไม่มีชื่อ");
    } else {
      setFriendName("ไม่พบผู้ใช้");
    }
  });

  return () => unsubscribe();
}, [friendId]); // ทำงานทุกครั้งที่ friendId เปลี่ยน

useEffect(() => {
    if (chatData) {
      console.log("--- ตรวจสอบ displayNames ---");
      console.log("displayNames ทั้งหมดใน DB:", chatData.displayNames);
      console.log("พยายามดึงชื่อของ ID:", friendId);
      console.log("ชื่อที่ได้คือ:", chatData.displayNames?.[friendId]);
      console.log("------------------------");
    }
  }, [chatData, friendId]);

  // 4. ฟังก์ชันส่งข้อความ
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (newMessage.trim() === "" || !chatData || !friendId) return;

    try {
      // เพิ่มข้อความใหม่
      await addDoc(collection(db, "chats", chatId, "messages"), {
        text: newMessage,
        senderId: myUid,
        createdAt: serverTimestamp()
      });

      // อัปเดตห้องแชท: ส่ง lastMessage และเพิ่ม unreadCount ให้เพื่อน
      const chatDocRef = doc(db, "chats", chatId);
      await updateDoc(chatDocRef, {
        lastMessage: newMessage,
        updatedAt: serverTimestamp(),
        [`unreadCount.${friendId}`]: increment(1),
        [`unreadCount.${myUid}`]: 0 // รีเซ็ตของเราเองเมื่อส่ง
      });

      setNewMessage("");
    } catch (error) {
      console.error("ส่งข้อความไม่สำเร็จ:", error);
    }
  };

  // 🛡️ ดักกรณีข้อมูลยังไม่พร้อม
  if (!chatData) {
    return <div className="loading">กำลังโหลดข้อมูล...</div>;
  }

  return (
    <div className="chat-room-container">
      {/* Header แสดงชื่อเพื่อน (ใช้สไตล์เดียวกับหน้า Home) */}
      <div className="home-header">
        <button className="menu-btn" onClick={onBack}>
          ⮜
        </button>
        <h1 className="app-title">
          {friendName}
        </h1>
      </div>

      {/* พื้นที่แสดงข้อความ */}
      <div className="messages-area">
        {messages.map((msg, index) => {
          const isMyMessage = msg.senderId === myUid;
          // คำนวณว่าข้อความที่ index นี้ เพื่อนอ่านหรือยัง
          const isMessageRead = index <= readIndex; 

          return (
            <div key={msg.id} className="message-wrapper">
              <div className={`message-bubble ${isMyMessage ? 'me' : 'friend'}`}>
                <div className="message-text">{msg.text}</div>
        
                <div className="message-time">
                  {formatTime(msg.createdAt)}
          
                  {/* ✅ แสดงเช็คมาคเฉพาะข้อความของเรา */}
                  {isMyMessage && (
                    <div className={`checkmark-container ${isMessageRead ? 'read' : ''}`}>
                      <span className="check-1">✓</span>
                      {isMessageRead && <span className="check-2">✓</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>
            );
        })}
        <div ref={scrollRef} /> 
      </div>

      {/* ส่วนพิมพ์ข้อความ */}
      <form className="chat-input-area" onSubmit={handleSendMessage}>
        <input
          type="text"
          className="large-input"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="พิมพ์ข้อความที่นี่..."
        />
        <button type="submit" className="send-btn-large">💬</button>
      </form>
    </div>
  );
}

export default ChatRoom;