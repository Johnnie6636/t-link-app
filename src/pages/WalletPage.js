import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import '../styles/WalletPage.css';

function WalletPage({ onBack }) {
  const [walletData, setWalletData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // ดึงข้อมูลจากคอลเลกชัน wallets แบบ Real-time
    const unsubscribe = onSnapshot(doc(db, "wallets", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setWalletData(docSnap.data());
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <div className="loading">กำลังเปิดสมุดบัญชี... 📖</div>;

  return (
  <div className="wallet-page-container">
    <div className="passbook-card">
      <div className="passbook-header">
        <div className="bank-logo">MY WALLET</div>
        <div className="passbook-type">SAVINGS & CREDIT</div>
      </div>

      <div className="passbook-body">
        <div className="info-row">
          <span className="label">ชื่อบัญชี:</span>
          <span className="value">{walletData?.accountName || "ไม่ระบุ"}</span>
        </div>
        <div className="info-row">
          <span className="label">เลขที่บัญชี:</span>
          <span className="value account-num">{walletData?.accountNumber || "กำลังตรวจสอบ..."}</span>
        </div>
        
        <div className="info-row credit-row">
          <span className="label">คะแนนเครดิต:</span>
          <span className="value credit-value">⭐⭐ {walletData?.creditScore || "100"} แต้ม</span>
        </div>
      </div>

      <div className="passbook-footer">
        <p className="balance-label">ยอดเงินคงเหลือสุทธิ</p>
        <h2 className="balance-value">
          ฿ {walletData?.balance?.toLocaleString() || "0"}
        </h2>
      </div>
    </div>
    
    <p className="update-hint">อัปเดตล่าสุด: {walletData?.updatedAt?.toDate().toLocaleString('th-TH')}</p>
  </div>
);
}

export default WalletPage;