import { db } from "./firebase";
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc,
  serverTimestamp
} from "firebase/firestore";

// 1. ฟังก์ชันสุ่มตัวเลข 6 หลัก
const generateRandomId = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// 2. ฟังก์ชันตรวจสอบว่า ID ซ้ำหรือไม่
const isIdUnique = async (id) => {
  const q = query(collection(db, "users"), where("displayId", "==", id));
  const querySnapshot = await getDocs(q);
  return querySnapshot.empty;
};

// 3. ฟังก์ชันสร้างกระเป๋าเงินเริ่มต้น (อัปเดตเพิ่ม creditScore) ✨
export const createInitialWallet = async (uid, userData) => {
  try {
    const walletRef = doc(db, "wallets", uid);
    await setDoc(walletRef, {
      uid: uid,
      displayName: userData.displayName,
      displayId: userData.displayId,
      phoneNumber: userData.phoneNumber,
      balance: 0,                 
      creditScore: 100,            // เพิ่มคะแนนเริ่มต้นเป็น 100 คะแนน 📈
      bankName: "ยังไม่ได้ระบุ",      
      accountName: userData.displayName,
      accountNumber: userData.phoneNumber, 
      updatedAt: serverTimestamp()
    });
    console.log("สร้างกระเป๋าเงินพร้อมระบบเครดิตสำเร็จ!");
  } catch (error) {
    console.error("Error creating wallet:", error);
  }
};

// 4. ฟังก์ชันบันทึกผู้ใช้ และเรียกใช้การสร้างกระเป๋าเงิน
export const saveUserToFirestore = async (user, phoneNumber) => {
  if (!user) return;

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    let newDisplayId = generateRandomId();
    while (!(await isIdUnique(newDisplayId))) {
      newDisplayId = generateRandomId();
    }

    const userData = {
      uid: user.uid,
      phoneNumber: phoneNumber,
      displayId: newDisplayId,
      displayName: `User_${newDisplayId}`,
      photoURL: "",
      createdAt: new Date()
    };

    try {
      // บันทึกข้อมูลผู้ใช้
      await setDoc(userRef, userData);
      
      // สร้างกระเป๋าเงินให้ทันทีหลังสมัครสำเร็จ 💰
      await createInitialWallet(user.uid, userData);
      
      console.log("ลงทะเบียนและสร้างกระเป๋าเงินสำเร็จ!");
    } catch (error) {
      console.error("Error saving user and wallet:", error);
    }
  }
};

// ฟังก์ชันค้นหาและอัปเดตอื่นๆ คงเดิม...
export const searchUserById = async (searchId) => {
  const q = query(collection(db, "users"), where("displayId", "==", searchId));
  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty ? querySnapshot.docs[0].data() : null;
};

export const updateUserDisplayId = async (uid, newId) => {
  const unique = await isIdUnique(newId);
  if (!unique) return { success: false, message: "ID นี้มีผู้อื่นใช้งานแล้ว" };

  try {
    const userRef = doc(db, "users", uid);
    const newName = `User_${newId}`;
    await updateDoc(userRef, {
      displayId: newId,
      displayName: newName
    });
    // อัปเดตชื่อในกระเป๋าเงินด้วยเพื่อให้ข้อมูลตรงกัน
    const walletRef = doc(db, "wallets", uid);
    await updateDoc(walletRef, { 
      displayName: newName,
      accountName: newName 
    });
    return { success: true };
  } catch (error) {
    return { success: false, message: "เกิดข้อผิดพลาดในการอัปเดต" };
  }
};

