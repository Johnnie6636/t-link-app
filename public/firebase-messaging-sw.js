// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js');

const urlParams = new URLSearchParams(location.search);

const firebaseConfig = {
  apiKey: urlParams.get("apiKey"),
  authDomain: urlParams.get("authDomain"),
  projectId: urlParams.get("projectId"),
  storageBucket: urlParams.get("storageBucket"),
  messagingSenderId: urlParams.get("messagingSenderId"),
  appId: urlParams.get("appId"),
};
แก
if (firebaseConfig.apiKey) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

// ฟังก์ชันดักจับข้อความเมื่อแอปทำงานอยู่เบื้องหลัง
    messaging.onBackgroundMessage((payload) => {
        console.log('ได้รับข้อความขณะอยู่เบื้องหลัง:', payload);
        const notificationTitle = payload.notification.title;
        const notificationOptions = {
            body: payload.notification.body,
            icon: '/logo192.png' // ใส่ Path รูปไอคอนแอปของคุณ
        };
        self.registration.showNotification(notificationTitle, notificationOptions);
    });
}