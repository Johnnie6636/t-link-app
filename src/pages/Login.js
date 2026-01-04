import React, { useState } from 'react';
import { auth } from '../services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { saveUserToFirestore } from '../services/userService';
import '../styles/LoginDark.css';

function Login() {
  const [phone, setPhone] = useState('');

  const handleAuth = async () => {
    const fakeEmail = `${phone}@mycontact.com`;
    const password = phone;

    try {
      // 1. พยายามล็อกอินก่อน
      await signInWithEmailAndPassword(auth, fakeEmail, password);
      console.log("เข้าสู่ระบบสำเร็จ!");
    } catch (error) {
      console.log("Firebase Error Code:", error.code);
      
      // 2. ถ้าไม่พบบัญชี (ทั้งสอง Code นี้) ให้สมัครใหม่ทันที
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        try {
          const newUserCredential = await createUserWithEmailAndPassword(auth, fakeEmail, password);
          await saveUserToFirestore(newUserCredential.user, phone);
          console.log("สมัครสมาชิกใหม่สำเร็จ!");
        } catch (createError) {
          console.error("สมัครสมาชิกไม่สำเร็จ:", createError.code);
        }
      } else {
        console.error("เกิดข้อผิดพลาดอื่น ๆ:", error.code);
      }
    }
  };

  return (
    <div className="login-container">
      <h3>เข้าสู่ระบบ</h3>
      <input 
        type="tel" 
        placeholder="กรอกเบอร์โทรศัพท์ของคุณ" 
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <button onClick={handleAuth}>เริ่มใช้งาน</button>
    </div>
  );
}

export default Login;