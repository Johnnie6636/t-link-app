import React, { useState } from 'react';
import { auth, db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { saveUserToFirestore } from '../services/userService';
import '../styles/LoginDark.css';
import logo from '../assets/logos/t-link-logo.png';

function Login() {
  const [phone, setPhone] = useState('');

  const handleAuth = async () => {
    const fakeEmail = `${phone}@mycontact.com`;
    const password = phone;

    try {
      // 1. พยายามล็อกอิน
      const userCredential = await signInWithEmailAndPassword(auth, fakeEmail, password);
  
      // 🔍 เพิ่มขั้นตอน: เช็คว่ามีข้อมูลใน Firestore หรือยัง?
      const userRef = doc(db, "users", userCredential.user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // ถ้าล็อกอินผ่าน แต่ไม่มีข้อมูลใน DB ให้สร้างให้เขาเลย
        await saveUserToFirestore(userCredential.user, phone);
        console.log("บันทึกข้อมูลย้อนหลังสำเร็จ!");
      }
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
      <div className="login-logo-section">
        <img src={logo} alt="T-Link Logo" className="login-logo" />
      </div>
      <h3>เข้าสู่ระบบ T Link</h3>
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