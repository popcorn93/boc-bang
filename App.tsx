
import React, { useState, useEffect, useCallback } from 'react';
import { AudioUpload } from './components/AudioUpload';
import { TranscriptionDisplay } from './components/TranscriptionDisplay';
import { StructuredDisplay } from './components/StructuredDisplay';
import { HistoryPanel } from './components/HistoryPanel';
import { Modal } from './components/Modal';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { UserMenu } from './components/UserMenu';
import { BpointsModal } from './components/BpointsModal';
import { AdminDashboard } from './components/AdminDashboard';
import { transcribeAudio as geminiTranscribeAudio, structureTranscript as geminiStructureTranscript } from './services/geminiService';
import { fileToBase64, getMimeType, getAudioDuration } from './services/audioService';
import { createGoogleDoc, getGoogleDocUrl } from './services/googleDocsService';
import { htmlToPlainText, sanitizeStructuredHtml } from './services/htmlService';
import { createPaymentRequest } from './services/paymentService';
import type { TranscriptionRecord, ModalContent, UserProfile } from './types';
import { SUPPORTED_AUDIO_TYPES, MAX_FILE_SIZE_MB } from './constants';
import { 
  auth, 
  db, 
  googleLoginProvider,
  googleDocsProvider,
  GoogleAuthProvider,
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut, 
  onAuthStateChanged, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot, 
  orderBy
} from './firebase';

type AuthView = 'login' | 'register';
type AppView = 'upload' | 'editor' | 'history' | 'admin';
const GOOGLE_REDIRECT_PENDING_KEY = 'boc-bang-google-redirect-pending';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [authView, setAuthView] = useState<AuthView>('login');
  const [appView, setAppView] = useState<AppView>('upload');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [base64Audio, setBase64Audio] = useState<string | null>(null);
  const [audioMimeType, setAudioMimeType] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [structuredTranscript, setStructuredTranscript] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false); 
  const [isStructuring, setIsStructuring] = useState<boolean>(false);
  const [history, setHistory] = useState<TranscriptionRecord[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalContent, setModalContent] = useState<ModalContent>({ title: '', message: '' });
  const [currentFileNameForDisplay, setCurrentFileNameForDisplay] = useState<string>('');
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState<string | undefined>(undefined);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [isSavingToGoogleDocs, setIsSavingToGoogleDocs] = useState<boolean>(false);
  const [isGoogleLoginLoading, setIsGoogleLoginLoading] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isBpointsModalOpen, setIsBpointsModalOpen] = useState<boolean>(false);
  const [currentAudioDuration, setCurrentAudioDuration] = useState<number>(0);
  const isAdminUser = !!userProfile?.isAdmin || currentUser?.email === 'hoangnm9x@gmail.com';
  const mobileViewTitle: Record<AppView, string> = {
    upload: 'Bóc Băng',
    editor: currentFileNameForDisplay || 'Biên tập',
    history: 'Lịch sử',
    admin: 'Quản trị',
  };

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        window.sessionStorage.removeItem(GOOGLE_REDIRECT_PENDING_KEY);
        setIsGoogleLoginLoading(false);
        setIsLoggedIn(true);
        setCurrentUser(user);
        
        // Setup real-time listener for user profile
        const userRef = doc(db, 'users', user.uid);
        
        unsubscribeProfile = onSnapshot(userRef, async (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
          } else {
            // Create profile if it doesn't exist
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              bpoints: 10,
              totalTranscriptions: 0,
              isAdmin: false
            };
            await setDoc(userRef, newProfile);
            // The next snapshot will trigger setUserProfile
          }
        });
      } else {
        setIsLoggedIn(false);
        setCurrentUser(null);
        setUserProfile(null);
        setHistory([]);
        if (unsubscribeProfile) unsubscribeProfile();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  useEffect(() => {
    if (isLoggedIn && currentUser) {
      const q = query(
        collection(db, 'transcriptions'),
        where('userId', '==', currentUser.uid),
        orderBy('date', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const historyData = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
          date: doc.data().date?.toDate?.()?.toISOString() || new Date().toISOString()
        })) as TranscriptionRecord[];
        setHistory(historyData);
      }, (error) => {
        console.error("Firestore error:", error);
        // If index is missing, it will log a link to create it
      });

      return () => unsubscribe();
    }
  }, [isLoggedIn, currentUser]);

  // Cleanup
  useEffect(() => {
    return () => {
      // Any cleanup if needed
    };
  }, []);

  const openModal = useCallback((title: string, message: string | React.ReactNode) => {
    setModalContent({ title, message });
    setIsModalOpen(true);
  }, []);

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const getGoogleAuthErrorMessage = (error: any) => {
    const code = error?.code || '';
    if (code.includes('unauthorized-domain')) {
      return 'Tên miền hiện tại chưa được thêm vào Firebase Authentication > Authorized domains.';
    }
    if (code.includes('popup-blocked') || code.includes('popup-closed-by-user')) {
      return 'Trình duyệt đã chặn hoặc đóng cửa sổ đăng nhập Google. Vui lòng thử lại.';
    }
    if (code.includes('operation-not-allowed')) {
      return 'Google Sign-In chưa được bật trong Firebase Authentication.';
    }
    if (code.includes('cancelled-popup-request')) {
      return 'Yêu cầu đăng nhập Google trước đó đã bị hủy. Vui lòng thử lại.';
    }
    return 'Không thể đăng nhập bằng Google. Vui lòng thử lại.';
  };

  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        const hadPendingRedirect = window.sessionStorage.getItem(GOOGLE_REDIRECT_PENDING_KEY) === '1';
        window.sessionStorage.removeItem(GOOGLE_REDIRECT_PENDING_KEY);
        setIsGoogleLoginLoading(false);
        if (!result) {
          if (!auth.currentUser && hadPendingRedirect) {
            openModal(
              "Đăng Nhập Google Chưa Hoàn Tất",
              "Google đã trả về ứng dụng nhưng Firebase chưa khôi phục được phiên đăng nhập. Vui lòng thử lại; nếu vẫn gặp lỗi, cần cấu hình Firebase Authentication cho domain boc-bang.onrender.com."
            );
          }
          return;
        }
        const credential = GoogleAuthProvider.credentialFromResult(result);
        setGoogleAccessToken(credential?.accessToken || null);
      })
      .catch((error) => {
        window.sessionStorage.removeItem(GOOGLE_REDIRECT_PENDING_KEY);
        setIsGoogleLoginLoading(false);
        console.error("Google redirect login error:", error);
        openModal("Đăng Nhập Thất Bại", getGoogleAuthErrorMessage(error));
      });
  }, [openModal]);

  const handleFileSelect = async (file: File) => {
    if (!SUPPORTED_AUDIO_TYPES.includes(file.type)) {
      openModal('Loại Tệp Không Hỗ Trợ', `Vui lòng tải lên loại tệp âm thanh được hỗ trợ: ${SUPPORTED_AUDIO_TYPES.map(t => t.split('/')[1]).join(', ')}.`);
      return;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      openModal('Tệp Quá Lớn', `Kích thước tệp vượt quá ${MAX_FILE_SIZE_MB}MB. Vui lòng tải lên tệp nhỏ hơn.`);
      return;
    }

    setCurrentFile(file);
    setCurrentFileNameForDisplay(file.name); 
    setTranscript(''); 
    setStructuredTranscript(null);
    setCurrentLanguage(undefined);
    setActiveRecordId(null); 
    setIsLoading(true); 

    try {
      const [b64, duration] = await Promise.all([
        fileToBase64(file),
        getAudioDuration(file)
      ]);
      setBase64Audio(b64);
      setAudioMimeType(getMimeType(file.name) || file.type); 
      setCurrentAudioDuration(duration);
    } catch (error) {
      console.error("Lỗi xử lý tệp:", error);
      openModal('Lỗi Xử Lý Tệp', 'Không thể xử lý tệp âm thanh. Vui lòng thử lại.');
      setCurrentFile(null);
      setBase64Audio(null);
      setAudioMimeType(null);
      setCurrentFileNameForDisplay('');
    } finally {
      setIsLoading(false); 
    }
  };

  const handleTranscribe = async () => {
    if (!base64Audio || !audioMimeType || !currentFile) {
      openModal('Không có Âm Thanh', 'Vui lòng tải lên tệp âm thanh trước.');
      return;
    }

    const durationMinutes = Math.ceil(currentAudioDuration / 60);
    const cost = durationMinutes;
    const isUnlimited = userProfile?.isUnlimited;

    if (!isUnlimited && (!userProfile || userProfile.bpoints < cost)) {
      openModal('Số Dư Bpoint Không Đủ', (
        <div className="space-y-4">
          <p>Bản ghi này dài khoảng {durationMinutes} phút và cần <strong>{cost} Bpoint</strong> để thực hiện.</p>
          <p>Số dư hiện tại của bạn: <strong>{userProfile?.bpoints || 0} Bpoint</strong>.</p>
          <button 
            onClick={() => {
              closeModal();
              setIsBpointsModalOpen(true);
            }}
            className="w-full bg-primary text-white py-2 rounded-lg font-bold"
          >
            Nạp thêm Bpoint ngay
          </button>
        </div>
      ));
      return;
    }

    setIsLoading(true);
    setTranscript('');
    setStructuredTranscript(null);
    setCurrentLanguage(undefined);
    setAppView('editor');
    try {
      const result = await geminiTranscribeAudio(base64Audio, audioMimeType, currentFile.name, durationMinutes);
      setTranscript(result.transcript);
      setCurrentLanguage(result.language);
      if (result.record) {
        setActiveRecordId(result.record.id);
      }
      openModal('Gỡ Băng Thành Công', `Đã gỡ băng âm thanh "${currentFile.name}". ${isUnlimited ? 'Gói không giới hạn.' : `Đã trừ ${result.bpointsConsumed ?? cost} Bpoint.`}`);
    } catch (error) {
      console.error('Lỗi gỡ băng:', error);
      const errorMessage = error instanceof Error ? error.message : 'Đã xảy ra lỗi.';
      openModal('Gỡ Băng Thất Bại', errorMessage);
      setActiveRecordId(null);
      setAppView('upload');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStructureTranscript = async () => {
    if (!transcript) {
      openModal('Không có Bản Ghi', 'Không có bản ghi gốc để cấu trúc.');
      return;
    }
    setIsStructuring(true);
    setStructuredTranscript(null); 
    try {
      const structuredText = sanitizeStructuredHtml(await geminiStructureTranscript(transcript, activeRecordId || undefined));
      setStructuredTranscript(structuredText);
      openModal('Cấu Trúc Thành Công', 'Văn bản đã được AI cấu trúc lại.');
    } catch (error) {
      console.error('Lỗi cấu trúc AI:', error);
      const errorMessage = error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định.';
      openModal('Cấu Trúc Thất Bại', errorMessage);
    } finally {
      setIsStructuring(false);
    }
  };

  const handleViewHistoryItem = (recordId: string) => {
    const record = history.find(item => item.id === recordId);
    if (record) {
      setTranscript(record.transcript);
      setStructuredTranscript(record.structuredTranscript || null);
      setCurrentFileNameForDisplay(record.fileName);
      setCurrentLanguage(record.language);
      setActiveRecordId(record.id);
      setCurrentFile(null); 
      setBase64Audio(null); 
      setAudioMimeType(null);

      setAppView('editor'); // Switch to editor view when viewing history
      openModal('Đã Tải Lịch Sử', `Hiển thị bản ghi cho "${record.fileName}".`);
    }
  };

  const handleDeleteHistoryItem = async (recordId: string) => {
    const recordBeingDeleted = history.find(item => item.id === recordId);
    
    try {
      await deleteDoc(doc(db, 'transcriptions', recordId));
      
      if (activeRecordId === recordId) { 
          setTranscript(''); 
          setStructuredTranscript(null);
          setCurrentFileNameForDisplay('');
          setCurrentLanguage(undefined);
          setActiveRecordId(null);
          setCurrentFile(null);
          setBase64Audio(null);
          setAppView('upload');
      }
      openModal('Lịch Sử Được Cập Nhật', `Đã xóa bản ghi "${recordBeingDeleted?.fileName || 'đã chọn'}".`);
    } catch (error) {
      console.error("Error deleting document:", error);
      openModal('Lỗi Xóa Bản Ghi', 'Không thể xóa bản ghi khỏi hệ thống.');
    }
  };

  const handleSaveOriginalToGoogleDocs = async () => {
    if (!transcript || !currentFileNameForDisplay) {
      openModal('Không có Bản Ghi', 'Không có bản ghi để lưu.');
      return;
    }
    await handleSaveToGoogleDocs(transcript, currentFileNameForDisplay.replace(/\.[^/.]+$/, "") + '_original');
  };
  
  const handleSaveStructuredToGoogleDocs = async () => {
    if (!structuredTranscript || !currentFileNameForDisplay) {
      openModal('Không có dữ liệu', 'Không có văn bản đã cấu trúc để lưu.');
      return;
    }
    await handleSaveToGoogleDocs(structuredTranscript, currentFileNameForDisplay.replace(/\.[^/.]+$/, "") + '_structured');
  };

  const handleSaveToGoogleDocs = async (content: string, title: string) => {
    setIsSavingToGoogleDocs(true);
    try {
      let token = googleAccessToken;
      
      // If no token or potentially expired, try to get a new one
      if (!token) {
        const result = await signInWithPopup(auth, googleDocsProvider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        token = credential?.accessToken || null;
        setGoogleAccessToken(token);
      }

      if (!token) {
        throw new Error('Không thể lấy quyền truy cập Google.');
      }

      const docResponse = await createGoogleDoc(token, title, content);
      const docUrl = getGoogleDocUrl(docResponse.documentId);

      openModal('Lưu Thành Công', (
        <div className="flex flex-col gap-4">
          <p>Bản ghi đã được lưu vào Google Docs với tên: <strong>{title}</strong></p>
          <a 
            href={docUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-white font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
          >
            <span className="material-symbols-outlined">open_in_new</span>
            Mở Google Doc
          </a>
        </div>
      ));
    } catch (error: any) {
      console.error("Lỗi lưu Google Doc:", error);
      // If it's a permission error, clear token so next try triggers re-auth
      if (error.message?.includes('401') || error.message?.includes('auth')) {
        setGoogleAccessToken(null);
      }
      openModal('Lỗi Lưu Trữ', `Không thể lưu vào Google Docs: ${error.message}`);
    } finally {
      setIsSavingToGoogleDocs(false);
    }
  };

  const handleCopyOriginalToClipboard = () => {
    if (!transcript) {
      openModal('Không có Bản Ghi', 'Không có bản ghi để sao chép.');
      return;
    }
    navigator.clipboard.writeText(transcript)
      .then(() => openModal('Đã Sao Chép', 'Đã sao chép bản ghi gốc thành công!'))
      .catch(err => {
        console.error('Sao chép thất bại:', err);
        openModal('Sao Chép Thất Bại', 'Không thể sao chép bản ghi. Vui lòng thử lại.');
      });
  };

  const handleCopyStructuredToClipboard = () => {
    if (!structuredTranscript) {
      openModal('Không có dữ liệu', 'Không có văn bản đã cấu trúc để sao chép.');
      return;
    }
    const plainText = htmlToPlainText(structuredTranscript);
    navigator.clipboard.writeText(plainText)
      .then(() => openModal('Đã Sao Chép', 'Đã sao chép văn bản đã cấu trúc!'))
      .catch(err => {
        console.error('Sao chép thất bại:', err);
        openModal('Sao Chép Thất Bại', 'Không thể sao chép.');
      });
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoginLoading(true);
    try {
      const result = await signInWithPopup(auth, googleLoginProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      setGoogleAccessToken(credential?.accessToken || null);
    } catch (error) {
      console.error("Google login error:", error);
      const code = (error as any)?.code || '';
      if (code.includes('popup-blocked') || code.includes('popup-closed-by-user') || code.includes('cancelled-popup-request')) {
        window.sessionStorage.setItem(GOOGLE_REDIRECT_PENDING_KEY, '1');
        await signInWithRedirect(auth, googleLoginProvider);
        return;
      }
      const message = getGoogleAuthErrorMessage(error);
      openModal("Đăng Nhập Thất Bại", message);
      setIsGoogleLoginLoading(false);
      throw new Error(message);
    }
  };

  const handleEmailLogin = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setGoogleAccessToken(null);
    } catch (error: any) {
      const code = error?.code || '';
      if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
        throw new Error('Email hoặc mật khẩu không đúng.');
      }
      if (code.includes('invalid-email')) {
        throw new Error('Địa chỉ email không hợp lệ.');
      }
      if (code.includes('operation-not-allowed')) {
        throw new Error('Đăng nhập email/mật khẩu chưa được bật trong Firebase Authentication.');
      }
      throw new Error('Không thể đăng nhập. Vui lòng thử lại.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsLoggedIn(false);
      setCurrentUser(null);
      setHistory([]); 
      setTranscript('');
      setStructuredTranscript(null);
      setCurrentFile(null);
      setAppView('upload');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleRegister = async (email: string, password: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      await signOut(auth);
    } catch (error: any) {
      const code = error?.code || '';
      if (code.includes('email-already-in-use')) {
        throw new Error('Email này đã được đăng ký.');
      }
      if (code.includes('weak-password')) {
        throw new Error('Mật khẩu cần mạnh hơn, tối thiểu 6 ký tự.');
      }
      if (code.includes('invalid-email')) {
        throw new Error('Địa chỉ email không hợp lệ.');
      }
      if (code.includes('operation-not-allowed')) {
        throw new Error('Đăng ký email/mật khẩu chưa được bật trong Firebase Authentication.');
      }
      throw new Error('Không thể tạo tài khoản. Vui lòng thử lại.');
    }
    openModal("Đăng Ký Thành Công", "Tài khoản của bạn đã được tạo. Vui lòng đăng nhập để tiếp tục.");
    setAuthView('login');
  };

  const handleViewProfile = () => {
    openModal("Thông Tin Tài Khoản", (
      <div className="space-y-4">
        <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
            <img className="size-full object-cover" src="https://picsum.photos/seed/user/100/100" alt="User" />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{currentUser?.displayName || 'Thành viên'}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{currentUser?.email}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-primary/10">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Số dư Bpoint</p>
            <p className="text-xl font-black text-primary flex items-center gap-1">
              <span className="material-symbols-outlined fill-icon text-yellow-500">token</span>
              {userProfile?.isUnlimited || (userProfile?.bpoints || 0) > 100000 ? 'Không giới hạn' : (userProfile?.bpoints || 0)}
            </p>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-primary/10">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Đã gỡ băng</p>
            <p className="text-xl font-black text-slate-700 dark:text-slate-200">{userProfile?.totalTranscriptions || 0}</p>
          </div>
        </div>

        <button 
          onClick={() => {
            closeModal();
            setIsBpointsModalOpen(true);
          }}
          className="w-full h-11 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined">add_circle</span>
          Nạp thêm Bpoint
        </button>

        <p className="text-[10px] text-center text-gray-400">UID: {currentUser?.uid}</p>
      </div>
    ));
  };

  const handleSupport = () => {
    openModal("Hỗ Trợ & Góp Ý", (
      <div className="space-y-4">
        <p className="text-slate-600 leading-relaxed">
          Mọi góp ý, thắc mắc, vui lòng liên hệ:
        </p>
        <div className="flex items-center gap-2 p-4 bg-primary/5 rounded-xl border border-primary/10">
          <span className="material-symbols-outlined text-primary">mail</span>
          <a 
            href="mailto:hoangnm2.ho@vietcombank.com.vn" 
            className="text-primary font-bold hover:underline"
          >
            hoangnm2.ho@vietcombank.com.vn
          </a>
        </div>
        <p className="text-xs text-slate-400 italic">
          Chúng tôi luôn trân trọng mọi ý kiến đóng góp của bạn để cải thiện dịch vụ tốt hơn.
        </p>
      </div>
    ));
  };

  const handlePaymentSubmitted = async (packageId: string) => {
    const paymentRequest = await createPaymentRequest(packageId);
    if (!paymentRequest.checkoutUrl) {
      throw new Error('Không nhận được liên kết thanh toán payOS.');
    }
    window.location.href = paymentRequest.checkoutUrl;
  };

  if (!isLoggedIn) {
    if (authView === 'login') {
        return (
          <Login
            onEmailLogin={handleEmailLogin}
            onGoogleLogin={handleGoogleLogin}
            onSwitchToRegister={() => setAuthView('register')}
            isGoogleLoginLoading={isGoogleLoginLoading}
          />
        );
    }
    if (authView === 'register') {
        return <Register onRegister={handleRegister} onSwitchToLogin={() => setAuthView('login')} />;
    }
  }
  
  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 border-r border-primary/10 bg-white dark:bg-background-dark flex-col justify-between p-4 shrink-0">
        <div className="flex flex-col gap-8">
          {/* Logo Section */}
          <div className="flex items-center gap-3 px-2">
            <div className="bg-primary rounded-lg p-1.5 flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-2xl">graphic_eq</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-primary text-lg font-bold leading-tight">Bóc Băng</h1>
              <p className="text-primary/60 text-xs font-medium">AI Transcription</p>
            </div>
          </div>
          {/* Navigation */}
          <nav className="flex flex-col gap-1">
            <button 
              onClick={() => setAppView('upload')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${appView === 'upload' ? 'bg-primary text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-primary/5'}`}
            >
              <span className={`material-symbols-outlined ${appView === 'upload' ? 'fill-icon' : ''}`}>add_box</span>
              <span className="text-sm font-semibold">Mới</span>
            </button>
            <button 
              onClick={() => setAppView('history')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${appView === 'history' ? 'bg-primary text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-primary/5'}`}
            >
              <span className={`material-symbols-outlined ${appView === 'history' ? 'fill-icon' : ''}`}>history</span>
              <span className="text-sm font-medium">Lịch sử</span>
            </button>
            {isAdminUser && (
              <button 
                onClick={() => setAppView('admin')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${appView === 'admin' ? 'bg-primary text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-primary/5'}`}
              >
                <span className={`material-symbols-outlined ${appView === 'admin' ? 'fill-icon' : ''}`}>admin_panel_settings</span>
                <span className="text-sm font-medium">Quản trị</span>
              </button>
            )}
            <button 
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-primary/5 transition-all"
            >
              <span className="material-symbols-outlined">library_music</span>
              <span className="text-sm font-medium">Thư viện</span>
            </button>
          </nav>
          {/* Settings & Support */}
          <div className="flex flex-col gap-1">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Hệ thống</p>
            <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-primary/5 transition-all">
              <span className="material-symbols-outlined">settings_suggest</span>
              <span className="text-sm font-medium">Cài đặt</span>
            </button>
            <button 
              onClick={handleSupport}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-primary/5 transition-all"
            >
              <span className="material-symbols-outlined">contact_support</span>
              <span className="text-sm font-medium">Hỗ trợ</span>
            </button>
          </div>
        </div>
        
        <div className="flex flex-col gap-4">
          {currentUser && (
            <UserMenu 
              user={currentUser.displayName || currentUser.email || 'User'} 
              bpoints={userProfile?.bpoints || 0}
              onLogout={handleLogout} 
              onViewProfile={handleViewProfile} 
              onAddCredits={() => setIsBpointsModalOpen(true)}
            />
          )}
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-primary/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {appView !== 'upload' && (
              <button 
                onClick={() => setAppView('upload')}
                className="flex items-center justify-center p-2 rounded-lg hover:bg-primary/10 text-primary"
              >
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold text-primary">{mobileViewTitle[appView]}</h1>
              {appView === 'upload' && (
                <p className="text-[11px] font-semibold text-primary/60">AI Transcription</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsBpointsModalOpen(true)}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 text-primary"
              aria-label="Nạp Bpoint"
            >
              <span className="material-symbols-outlined text-[18px] fill-icon text-yellow-500">token</span>
              <span className="text-xs font-black">{userProfile?.isUnlimited ? '∞' : (userProfile?.bpoints || 0)}</span>
            </button>
            <button 
              onClick={handleViewProfile}
              className="size-8 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden border border-primary/10"
            >
              <img className="size-full object-cover" src="https://picsum.photos/seed/user/100/100" alt="User" referrerPolicy="no-referrer" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark scroll-smooth flex flex-col pt-[60px] lg:pt-0 pb-24 lg:pb-0">
        {/* Desktop Header (Only in Editor) */}
        {appView === 'editor' && (
          <header className="hidden lg:flex sticky top-0 z-50 items-center justify-between border-b border-primary/10 bg-white/80 dark:bg-background-dark/80 px-6 py-3 backdrop-blur-md lg:px-20">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
                <span className="material-symbols-outlined">graphic_eq</span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-primary">Bóc Băng</h1>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={handleSaveOriginalToGoogleDocs}
                disabled={isSavingToGoogleDocs}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-primary/90 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[20px]">description</span>
                <span>{isSavingToGoogleDocs ? 'Đang lưu...' : 'Lưu Google Doc'}</span>
              </button>
            </div>
          </header>
        )}

        <div className={`${appView === 'admin' ? 'max-w-6xl' : 'max-w-5xl'} mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-10 w-full flex-grow`}>
          {appView === 'upload' && (
            <AudioUpload 
              onFileSelect={handleFileSelect} 
              onTranscribe={handleTranscribe}
              isLoading={isLoading || isStructuring}
              currentFile={currentFile}
              hasAudioToTranscribe={!!base64Audio && !!currentFile}
            />
          )}

          {appView === 'editor' && (
            <div className="flex flex-col gap-4 lg:gap-6">
              {/* Desktop Breadcrumbs */}
              <div className="hidden lg:flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <button onClick={() => setAppView('upload')} className="flex items-center gap-1 hover:text-primary">
                    <span className="material-symbols-outlined text-sm">home</span>
                    Trang chủ
                  </button>
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  <span className="text-primary font-medium flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">edit_note</span>
                    Biên tập văn bản
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <h2 className="text-2xl font-bold lg:text-3xl flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-3xl">audio_file</span>
                    {currentFileNameForDisplay || 'Bản ghi mới'}
                  </h2>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleCopyOriginalToClipboard}
                      className="flex items-center gap-2 rounded-lg border border-primary/20 bg-white px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/5"
                    >
                      <span className="material-symbols-outlined text-[20px]">content_copy</span>
                      <span>Sao chép</span>
                    </button>
                    <button 
                      onClick={handleStructureTranscript}
                      disabled={isStructuring}
                      className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:scale-[1.02] disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[20px] fill-icon">auto_awesome</span>
                      <span>{isStructuring ? 'Đang tối ưu...' : 'Tối ưu bằng AI'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <TranscriptionDisplay
                transcript={transcript}
                onSaveToGoogleDocs={handleSaveOriginalToGoogleDocs}
                onCopyToClipboard={handleCopyOriginalToClipboard}
                isTranscriptionLoading={isLoading}
                fileName={currentFileNameForDisplay}
                onStructureTranscript={handleStructureTranscript}
                isStructuring={isStructuring}
                isSavingToGoogleDocs={isSavingToGoogleDocs}
              />

              {structuredTranscript && (
                <div className="mt-8">
                   <StructuredDisplay 
                    structuredTranscript={structuredTranscript}
                    onSaveToGoogleDocs={handleSaveStructuredToGoogleDocs}
                    onCopyToClipboard={handleCopyStructuredToClipboard}
                    isSavingToGoogleDocs={isSavingToGoogleDocs}
                  />
                </div>
              )}
            </div>
          )}

          {appView === 'history' && (
            <HistoryPanel
              history={history}
              onViewTranscript={handleViewHistoryItem}
              onDeleteTranscript={handleDeleteHistoryItem}
              onUploadNew={() => setAppView('upload')}
            />
          )}

          {appView === 'admin' && isAdminUser && (
            <AdminDashboard onClose={() => setAppView('upload')} />
          )}
        </div>

        {/* Desktop Footer */}
        <footer className="hidden lg:block mt-auto border-t border-primary/10 bg-white py-6 dark:bg-background-dark">
          <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
            <p className="text-sm text-slate-500 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">copyright</span>
              2026 Bóc Băng. Phát triển bởi Ngô Minh.
            </p>
            <div className="flex gap-6">
              <button className="text-sm text-slate-500 hover:text-primary flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">gavel</span>
                Điều khoản
              </button>
              <button className="text-sm text-slate-500 hover:text-primary flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">shield</span>
                Bảo mật
              </button>
              <button 
                onClick={handleSupport}
                className="text-sm text-slate-500 hover:text-primary flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">mail</span>
                Liên hệ
              </button>
            </div>
          </div>
        </footer>
      </main>

      {/* Mobile Bottom Action Bar (Only in Editor) */}
      {appView === 'editor' && (
        <footer className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-background-dark border-t border-primary/10 px-4 py-4 pb-8 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] z-50">
          <div className="flex gap-3">
            <button 
              onClick={handleCopyOriginalToClipboard}
              className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl bg-primary/10 text-primary font-bold hover:bg-primary/20 transition-colors"
            >
              <span className="material-symbols-outlined">content_copy</span>
              <span>Sao chép</span>
            </button>
            <button 
              onClick={handleStructureTranscript}
              disabled={isStructuring}
              className="flex-[2] flex items-center justify-center gap-2 h-12 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50"
            >
              <span className="material-symbols-outlined">auto_fix_high</span>
              <span>{isStructuring ? 'Đang tối ưu...' : 'Tối ưu AI'}</span>
            </button>
          </div>
        </footer>
      )}

      {/* Mobile Bottom Navigation (Only in Upload/History) */}
      {appView !== 'editor' && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-background-dark border-t border-primary/10 grid auto-cols-fr grid-flow-col items-center gap-1 px-2 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] z-50">
          <button 
            onClick={() => setAppView('upload')}
            className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl ${appView === 'upload' ? 'bg-primary/10 text-primary' : 'text-slate-400'}`}
          >
            <span className={`material-symbols-outlined ${appView === 'upload' ? 'fill-icon' : ''}`}>add_circle</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">Mới</span>
          </button>
          <button 
            onClick={() => setAppView('history')}
            className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl ${appView === 'history' ? 'bg-primary/10 text-primary' : 'text-slate-400'}`}
          >
            <span className={`material-symbols-outlined ${appView === 'history' ? 'fill-icon' : ''}`}>history</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">Lịch sử</span>
          </button>
          {isAdminUser && (
            <button 
              onClick={() => setAppView('admin')}
              className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl ${appView === 'admin' ? 'bg-primary/10 text-primary' : 'text-slate-400'}`}
            >
              <span className={`material-symbols-outlined ${appView === 'admin' ? 'fill-icon' : ''}`}>admin_panel_settings</span>
              <span className="text-[10px] font-bold uppercase tracking-wider">Quản trị</span>
            </button>
          )}
          <button className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-slate-400">
            <span className="material-symbols-outlined">library_music</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">Thư viện</span>
          </button>
        </nav>
      )}

      <Modal isOpen={isModalOpen} onClose={closeModal} title={modalContent.title}>
        {typeof modalContent.message === 'string' ? <p className="text-gray-700">{modalContent.message}</p> : modalContent.message}
      </Modal>

      {isBpointsModalOpen && (
        <BpointsModal 
          onClose={() => setIsBpointsModalOpen(false)}
          onPaymentSubmitted={handlePaymentSubmitted}
        />
      )}
    </div>
  );
};

export default App;
