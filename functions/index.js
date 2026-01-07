const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

// ฟังก์ชันดักจับข้อความใหม่ใน Subcollection
exports.sendChatNotification = functions.firestore
    .document("chats/{chatId}/messages/{messageId}")
    .onCreate(async (snapshot, context) => {
      const newMessage = snapshot.data();
      const chatId = context.params.chatId;
      const senderId = newMessage.senderId;
      // 1. ดึงข้อมูลของห้องแชท (Chat Document) เพื่อไปเอารายชื่อ participants
      const chatDoc = await admin.firestore()
          .collection("chats")
          .doc(chatId)
          .get();
      const participants = chatDoc.data().participants;
      // 2. หา ID ของผู้รับ โดยเลือกคนใน participants ที่ "ไม่ใช่" senderId
      const receiverId = participants.find((id) => id !== senderId);
      if (receiverId) {
        // 3. ไปดึงข้อมูล User ของผู้รับเพื่อเอา fcmToken
        const userDoc = await admin.firestore()
            .collection("users")
            .doc(receiverId)
            .get();
        const receiverData = userDoc.data();
        const token = receiverData?.fcmToken;
        const senderDisplayName = newMessage.senderName || "เพื่อนของคุณ";
        const notificationTitle = `ข้อความใหม่จาก ${senderDisplayName}`;
        if (token) {
          // 4. สร้าง Payload สำหรับการแจ้งเตือ
          const payload = {
            notification: {
              title: notificationTitle,
              body: newMessage.text,
              clickAction: "FLUTTER_NOTIFICATION_CLICK", // หรือ URL ของหน้าแชท
            },
          };
          // 5. สั่งส่งการแจ้งเตือน
          await admin.messaging().sendToDevice(token, payload);
          console.log(`ส่งการแจ้งเตือนให้ ${receiverId} สำเร็จ! 🚀`);
        } else {
          console.log("ผู้รับไม่ได้เปิดการแจ้งเตือนไว้ (ไม่มี Token) 🔕");
        }
      }

      return null;
    });
