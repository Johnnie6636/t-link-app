import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../services/firebase';
import { 
  collection, addDoc, query, orderBy, 
  onSnapshot, serverTimestamp, doc, updateDoc,
  limit, increment 
} from 'firebase/firestore';
import '../styles/ChatRoom.css';

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
  const [replyingTo, setReplyingTo] = useState(null);

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
            await updateDoc(chatDocRef, { [`unreadCount.${myUid}`]: 0 });
          } catch (err) {
            console.error("รีเซ็ตไม่สำเร็จ:", err);
          }
        }
      }
    });
    return () => unsubscribe();
  }, [chatId, myUid]);

  useEffect(() => {
    if (!chatId) return;
    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "desc"),
      limit(50) 
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgList.reverse());
    });
    return () => unsubscribe();
  }, [chatId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const participants = chatData?.participants || [];
  const friendId = participants.find(id => id !== myUid);
  const unreadCount = chatData?.unreadCount?.[friendId] || 0;
  const readIndex = messages.length - unreadCount - 1;

  useEffect(() => {
    if (!friendId) return;
    const userDocRef = doc(db, "users", friendId);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        setFriendName(userData.displayName || userData.name || "ไม่มีชื่อ");
      }
    });
    return () => unsubscribe();
  }, [friendId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (newMessage.trim() === "" || !chatData || !friendId) return;

    try {
      const messageData = {
        text: newMessage,
        senderId: myUid,
        createdAt: serverTimestamp(),
      };

      if (replyingTo) {
        messageData.replyToId = replyingTo.id;
        messageData.replyToText = replyingTo.text;
        messageData.replyToName = replyingTo.senderName;
      }

      await addDoc(collection(db, "chats", chatId, "messages"), messageData);

      const chatDocRef = doc(db, "chats", chatId);
      await updateDoc(chatDocRef, {
        lastMessage: newMessage,
        updatedAt: serverTimestamp(),
        [`unreadCount.${friendId}`]: increment(1),
        [`unreadCount.${myUid}`]: 0 
      });

      setNewMessage("");
      setReplyingTo(null);
    } catch (error) {
      console.error("ส่งไม่สำเร็จ:", error);
    }
  };

  return (
    <div className="chat-room-container">
      <div className="home-header">
        <button className="menu-btn" onClick={onBack}>⮜</button>
        <h1 className="app-title">{friendName}</h1>
      </div>

      <div className="messages-area">
        {messages.map((msg, index) => {
          const isMyMessage = msg.senderId === myUid;
          const isMessageRead = index <= readIndex; 
          return (
            <div key={msg.id} className="message-wrapper">
              <div 
                className={`message-bubble ${isMyMessage ? 'me' : 'friend'}`}
                onClick={() => setReplyingTo({
                  id: msg.id,
                  text: msg.text,
                  senderName: isMyMessage ? "คุณ" : friendName
                })}
              >
                {msg.replyToText && (
                  <div className="reply-preview-in-bubble">
                    <small>ตอบกลับ: {msg.replyToName}</small>
                    <div className="text-truncate">{msg.replyToText}</div>
                  </div>
                )}
              <div className="message-content-wrapper">
                <div className="message-text">{msg.text}</div>
                <div className="message-time">
                  {formatTime(msg.createdAt)}
                  {isMyMessage && (
                    <div className={`checkmark-container ${isMessageRead ? 'read' : ''}`}>
                      <span className="check-1">✓</span>
                      {isMessageRead && <span className="check-2">✓</span>}
                    </div>
                  )}
                </div>
              </div>
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} /> 
      </div>

      {/* ✅ ส่วน Reply Bar: อยู่เหนือช่องพิมพ์พอดี */}
      {replyingTo && (
        <div className="reply-bar">
          <div className="reply-content">
            <span>ตอบกลับคุณ {replyingTo.senderName}</span>
            <p>{replyingTo.text}</p>
          </div>
          <button type="button" className="close-reply-btn" onClick={() => setReplyingTo(null)}>✕</button>
        </div>
      )}

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