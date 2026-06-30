import express from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { PayOS } from "@payos/node";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import firebaseConfig from "./firebase-applet-config.json";

const loadLocalEnv = () => {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    return;
  }

  const envFile = fs.readFileSync(envPath, "utf8");
  envFile.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
};

loadLocalEnv();

interface AuthenticatedRequest extends express.Request {
  user?: {
    uid: string;
    email?: string;
  };
}

const BPOINT_PACKAGES = new Map([
  ["p10", { points: 10, bonusPercent: 0, price: 3000 }],
  ["p20", { points: 20, bonusPercent: 0, price: 6000 }],
  ["p50", { points: 50, bonusPercent: 5, price: 15000 }],
  ["p100", { points: 100, bonusPercent: 10, price: 30000 }],
  ["p200", { points: 200, bonusPercent: 15, price: 60000 }],
  ["p500", { points: 500, bonusPercent: 15, price: 150000 }],
]);

const getPackageTotalPoints = (packageId: string) => {
  const pkg = BPOINT_PACKAGES.get(packageId);
  if (!pkg) {
    throw new Error("Gói nạp không hợp lệ.");
  }

  return {
    ...pkg,
    totalPoints: Math.floor(pkg.points * (1 + pkg.bonusPercent / 100)),
  };
};

const getAdminApp = () => {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    return initializeApp({
      credential: cert(JSON.parse(serviceAccountJson)),
      projectId: firebaseConfig.projectId,
    });
  }

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (serviceAccountPath) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
    return initializeApp({
      credential: cert(serviceAccount),
      projectId: firebaseConfig.projectId,
    });
  }

  return initializeApp({
    credential: applicationDefault(),
    projectId: firebaseConfig.projectId,
  });
};

const getAdminDb = () => getFirestore(getAdminApp(), firebaseConfig.firestoreDatabaseId);
const getAdminAuth = () => getAuth(getAdminApp());

const getPublicBaseUrl = (req: express.Request) => {
  const configuredUrl = process.env.PUBLIC_APP_URL || process.env.RENDER_EXTERNAL_URL;
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  const proto = String(req.headers["x-forwarded-proto"] || req.protocol || "http").split(",")[0].trim();
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
  return `${proto}://${host}`.replace(/\/$/, "");
};

const createPayOSClient = () => {
  const clientId = process.env.PAYOS_CLIENT_ID;
  const apiKey = process.env.PAYOS_API_KEY;
  const checksumKey = process.env.PAYOS_CHECKSUM_KEY;

  if (!clientId || !apiKey || !checksumKey) {
    throw new Error("Thanh toán tự động yêu cầu cấu hình PAYOS_CLIENT_ID, PAYOS_API_KEY và PAYOS_CHECKSUM_KEY.");
  }

  return new PayOS({
    clientId,
    apiKey,
    checksumKey,
  });
};

const getBearerToken = (req: express.Request) => {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  return scheme === "Bearer" ? token : null;
};

const requireAuth = async (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: "Vui lòng đăng nhập để tiếp tục." });
    }

    const decoded = await getAdminAuth().verifyIdToken(token);
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
    };
    next();
  } catch (error) {
    console.error("Firebase auth verification failed:", error);
    return res.status(401).json({ error: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn." });
  }
};

const isAdminUser = async (uid: string, email?: string) => {
  if (email === "hoangnm9x@gmail.com") {
    return true;
  }

  const userSnap = await getAdminDb().collection("users").doc(uid).get();
  return userSnap.exists && userSnap.data()?.isAdmin === true;
};

const requireAdmin = async (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: "Vui lòng đăng nhập để tiếp tục." });
  }

  if (!(await isAdminUser(req.user.uid, req.user.email))) {
    return res.status(403).json({ error: "Bạn không có quyền quản trị." });
  }

  next();
};

const getGeminiApiKey = () => process.env.GEMINI_API_KEY || process.env.API_KEY;

const createGeminiClient = () => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("Tính năng AI yêu cầu Khóa API Gemini trên Máy chủ. Vui lòng thiết lập biến môi trường GEMINI_API_KEY.");
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

const getCostFromDuration = (durationMinutes: unknown) => {
  const parsed = Number(durationMinutes);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 24 * 60) {
    throw new Error("Thời lượng âm thanh không hợp lệ.");
  }
  return Math.ceil(parsed);
};

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  app.use(express.json({ limit: "150mb" }));
  app.use(express.urlencoded({ limit: "150mb", extended: true }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.post("/api/transcribe", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { base64Audio, mimeType, fileName, durationMinutes } = req.body;
      if (!req.user) {
        return res.status(401).json({ error: "Vui lòng đăng nhập để tiếp tục." });
      }
      if (!base64Audio || !mimeType || !fileName) {
        return res.status(400).json({ error: "Thiếu dữ liệu âm thanh hoặc tên tệp." });
      }

      const cost = getCostFromDuration(durationMinutes);
      const db = getAdminDb();
      const userRef = db.collection("users").doc(req.user.uid);
      const userSnap = await userRef.get();
      const userProfile = userSnap.data();
      const isUnlimited = userProfile?.isUnlimited === true;

      if (!userSnap.exists) {
        return res.status(403).json({ error: "Không tìm thấy hồ sơ người dùng." });
      }
      if (!isUnlimited && Number(userProfile?.bpoints || 0) < cost) {
        return res.status(402).json({ error: `Số dư Bpoint không đủ. Cần ${cost} Bpoint.` });
      }

      const ai = createGeminiClient();

      const audioPart = {
        inlineData: {
          mimeType: mimeType,
          data: base64Audio,
        },
      };

      const textPart = {
        text: `Hãy phiên âm đoạn âm thanh sau đây. Ngôn ngữ nói chính có thể là Tiếng Việt hoặc Tiếng Anh. 
Vui lòng xác định và sử dụng ngôn ngữ chính xác để phiên âm. 
Vui lòng chia bản ghi thành các đoạn ngắn (khoảng 30-60 giây) và gắn nhãn thời gian bắt đầu cho mỗi đoạn theo định dạng [MM:SS].
Ví dụ: 
[00:00] Nội dung đoạn 1...
[00:45] Nội dung đoạn 2...

Nếu phát hiện nhiều người nói riêng biệt, vui lòng gắn nhãn lời nói của họ một cách rõ ràng (ví dụ: '[00:00] Người nói 1: [lời nói]'). 
Vui lòng cho biết ngôn ngữ được phát hiện ở đầu phản hồi của bạn, ví dụ: 'Ngôn ngữ phát hiện: [Tiếng Việt/Tiếng Anh]'. Cung cấp bản ghi đầy đủ sau chỉ dẫn ngôn ngữ này.
Tuyệt đối không đưa ra bất kỳ lời bình luận, giải thích hay nội dung nào khác ngoài phần ngôn ngữ phát hiện và nội dung phiên âm có gắn timestamp.`,
      };

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: { parts: [audioPart, textPart] },
        config: {
          safetySettings: [
            {
              category: HarmCategory.HARM_CATEGORY_HARASSMENT,
              threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
            {
              category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
              threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
            {
              category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
              threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
            {
              category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
              threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
          ],
        },
      });

      let rawText = response.text;
      if (!rawText) {
        return res.status(500).json({ error: "Không nhận được bản ghi từ API. Âm thanh có thể bị trống hoặc không rõ ràng." });
      }

      let detectedLanguage = "Không xác định";
      const langRegex = /Ngôn ngữ phát hiện: (Tiếng Việt|Tiếng Anh|English|Vietnamese)/i;
      const langMatch = rawText.match(langRegex);

      if (langMatch && langMatch[1]) {
        const lang = langMatch[1].toLowerCase();
        if (lang === "tiếng việt" || lang === "vietnamese") {
          detectedLanguage = "Tiếng Việt";
        } else if (lang === "tiếng anh" || lang === "english") {
          detectedLanguage = "Tiếng Anh";
        } else {
          detectedLanguage = langMatch[1]; 
        }
        rawText = rawText.replace(langRegex, '').trim(); 
      } else {
        const hasLatinChars = rawText.match(/\p{Script=Latin}/u);
        const hasVietnameseChars = rawText.match(/[\u00C0-\u017F\u1E00-\u1EFF]/u);

        if (hasVietnameseChars) {
          detectedLanguage = "Tiếng Việt";
        } else if (hasLatinChars) {
          detectedLanguage = "Tiếng Anh";
        }
      }

      const recordRef = db.collection("transcriptions").doc();
      const record = {
        id: recordRef.id,
        userId: req.user.uid,
        fileName,
        date: FieldValue.serverTimestamp(),
        transcript: rawText,
        language: detectedLanguage,
        structuredTranscript: null,
        durationMinutes: cost,
        bpointsConsumed: isUnlimited ? 0 : cost,
      };

      await db.runTransaction(async (transaction) => {
        const freshUserSnap = await transaction.get(userRef);
        const freshProfile = freshUserSnap.data();
        const freshIsUnlimited = freshProfile?.isUnlimited === true;
        const currentBpoints = Number(freshProfile?.bpoints || 0);

        if (!freshUserSnap.exists) {
          throw new Error("Không tìm thấy hồ sơ người dùng.");
        }
        if (!freshIsUnlimited && currentBpoints < cost) {
          throw new Error(`Số dư Bpoint không đủ. Cần ${cost} Bpoint.`);
        }

        transaction.set(recordRef, record);
        transaction.update(userRef, {
          bpoints: freshIsUnlimited ? currentBpoints : currentBpoints - cost,
          totalTranscriptions: Number(freshProfile?.totalTranscriptions || 0) + 1,
        });
      });

      return res.json({
        record: {
          ...record,
          date: new Date().toISOString(),
        },
        transcript: rawText,
        language: detectedLanguage,
        durationMinutes: cost,
        bpointsConsumed: isUnlimited ? 0 : cost,
      });

    } catch (error: any) {
      console.error("Lỗi gỡ băng âm thanh với Gemini:", error);
      let errorMessage = error?.message || "Đã xảy ra lỗi khi phiên âm.";
      return res.status(500).json({ error: errorMessage });
    }
  });

  // API Route for Structure Text
  app.post("/api/structure", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { transcript, recordId } = req.body;
      if (!req.user) {
        return res.status(401).json({ error: "Vui lòng đăng nhập để tiếp tục." });
      }
      if (!transcript) {
        return res.status(400).json({ error: "Missing transcript parameter." });
      }

      const ai = createGeminiClient();

      const prompt = `Bạn là một chuyên gia biên tập cho các văn bản giao tiếp nội bộ. Nhiệm vụ của bạn là nhận một bản ghi âm thanh thô và chuyển đổi nó thành một tài liệu có cấu trúc rõ ràng, chuyên nghiệp, sẵn sàng để sử dụng trong các bài phát biểu, cuộc họp, hoặc email nội bộ.

YÊU CẦU:
1.  **Phân tích và Tách ý:** Đọc toàn bộ văn bản để hiểu nội dung. Xác định các ý chính, các luận điểm, hoặc các chủ đề riêng biệt.
2.  **Tạo Đoạn văn:** Dựa trên các ý đã tách, ngắt văn bản thành các đoạn văn logic. Mỗi đoạn nên tập trung vào một chủ đề hoặc một ý tưởng duy nhất. Sử dụng các dòng trống để phân tách các đoạn.
3.  **Dọn dẹp & Giữ Tự nhiên:** Loại bỏ các từ lặp, ngập ngừng (như "ờm", "à", "uhm"). Sửa các lỗi ngữ pháp hoặc chính tả nhỏ. Tuy nhiên, **giữ lại văn phong và giọng điệu tự nhiên của người nói**. Không viết lại câu chữ một cách quá trang trọng hay "chính trị hóa" văn bản.
4.  **Giữ Nguyên Nhãn người nói:** Nếu có các nhãn như 'Người nói 1:', hãy giữ nguyên chúng ở đầu mỗi câu nói tương ứng.

OUTPUT: Chỉ trả về văn bản đã được định dạng hoàn chỉnh bằng HTML (sử dụng các thẻ <p>, <br> nếu cần). KHÔNG sử dụng thẻ <b> hay <strong> để in đậm. KHÔNG thêm bất kỳ lời giải thích, lời mở đầu, hay ghi chú nào khác.

Bản ghi thô cần xử lý:
\`\`\`
${transcript}
\`\`\`
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          safetySettings: [
            {
              category: HarmCategory.HARM_CATEGORY_HARASSMENT,
              threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
            {
              category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
              threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
            {
              category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
              threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
            {
              category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
              threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
          ],
          temperature: 0.5,
        }
      });

      const structuredText = response.text;
      if (!structuredText) {
        return res.status(500).json({ error: "Không nhận được phản hồi cấu trúc từ API." });
      }

      let cleanText = structuredText.trim();
      const fenceRegex = /^```(html)?\s*\n?(.*?)\n?\s*```$/s;
      const match = cleanText.match(fenceRegex);
      if (match && match[2]) {
        cleanText = match[2].trim();
      }

      if (recordId) {
        const db = getAdminDb();
        const recordRef = db.collection("transcriptions").doc(recordId);
        await db.runTransaction(async (transaction) => {
          const recordSnap = await transaction.get(recordRef);
          if (!recordSnap.exists) {
            throw new Error("Không tìm thấy bản ghi.");
          }

          const record = recordSnap.data();
          if (record?.userId !== req.user?.uid && !(await isAdminUser(req.user!.uid, req.user!.email))) {
            throw new Error("Bạn không có quyền cập nhật bản ghi này.");
          }

          transaction.update(recordRef, {
            structuredTranscript: cleanText,
            date: FieldValue.serverTimestamp(),
          });
        });
      }

      return res.json({ structuredTranscript: cleanText });

    } catch (error: any) {
      console.error("Lỗi cấu trúc bản ghi với Gemini:", error);
      let errorMessage = error?.message || "Đã xảy ra lỗi khi định cấu trúc văn bản.";
      return res.status(500).json({ error: errorMessage });
    }
  });

  app.post("/api/payment-requests", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { packageId } = req.body;
      if (!req.user) {
        return res.status(401).json({ error: "Vui lòng đăng nhập để tiếp tục." });
      }

      const selectedPackage = getPackageTotalPoints(String(packageId || ""));
      const db = getAdminDb();
      const payos = createPayOSClient();
      const orderCode = Date.now();
      const requestRef = db.collection("paymentRequests").doc(String(orderCode));
      const baseUrl = getPublicBaseUrl(req);
      const description = `BB${orderCode.toString().slice(-7)}`;

      const paymentLink = await payos.paymentRequests.create({
        orderCode,
        amount: selectedPackage.price,
        description,
        returnUrl: `${baseUrl}/?payment=success&orderCode=${orderCode}`,
        cancelUrl: `${baseUrl}/?payment=cancel&orderCode=${orderCode}`,
        buyerEmail: req.user.email || undefined,
        items: [
          {
            name: `${selectedPackage.totalPoints} Bpoint`,
            quantity: 1,
            price: selectedPackage.price,
          },
        ],
        expiredAt: Math.floor(Date.now() / 1000) + 30 * 60,
      });

      const paymentRequest = {
        id: requestRef.id,
        userId: req.user.uid,
        email: req.user.email || "",
        points: selectedPackage.totalPoints,
        price: selectedPackage.price,
        packageId: String(packageId || ""),
        provider: "payos",
        transferNote: description,
        payosOrderCode: orderCode,
        payosPaymentLinkId: paymentLink.paymentLinkId,
        checkoutUrl: paymentLink.checkoutUrl,
        qrCode: paymentLink.qrCode,
        status: "pending",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      await requestRef.set(paymentRequest);
      return res.json({
        paymentRequest: {
          ...paymentRequest,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      console.error("Lỗi tạo yêu cầu nạp Bpoint:", error);
      return res.status(500).json({ error: error?.message || "Không thể tạo yêu cầu nạp Bpoint." });
    }
  });

  app.get("/api/payments/payos-webhook", (_req, res) => {
    return res.json({ success: true });
  });

  app.post("/api/payments/payos-webhook", async (req, res) => {
    try {
      if (!req.body?.data || !req.body?.signature) {
        return res.json({ success: true });
      }

      const db = getAdminDb();
      const rawOrderCode = Number(req.body?.data?.orderCode);
      if (Number.isFinite(rawOrderCode)) {
        const requestSnap = await db.collection("paymentRequests").doc(String(rawOrderCode)).get();
        if (!requestSnap.exists) {
          return res.json({ success: true });
        }
      }

      const payos = createPayOSClient();
      const webhookData = await payos.webhooks.verify(req.body);
      const orderCode = Number(webhookData.orderCode);
      const amount = Number(webhookData.amount);
      const requestRef = db.collection("paymentRequests").doc(String(orderCode));

      if (orderCode === 123 && webhookData.description === "VQRIO123") {
        return res.json({ success: true });
      }

      await db.runTransaction(async (transaction) => {
        const requestSnap = await transaction.get(requestRef);
        if (!requestSnap.exists) {
          console.warn(`Bỏ qua webhook payOS không khớp đơn nội bộ: ${orderCode}`);
          return;
        }

        const paymentRequest = requestSnap.data();
        if (paymentRequest?.provider !== "payos") {
          throw new Error("Đơn thanh toán không thuộc payOS.");
        }
        if (Number(paymentRequest?.price) !== amount) {
          transaction.update(requestRef, {
            status: "rejected",
            rejectedBy: "payos",
            rejectedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            rejectionReason: `Số tiền payOS không khớp: ${amount}`,
            payosWebhookData: webhookData,
          });
          return;
        }
        if (paymentRequest?.payosPaymentLinkId && paymentRequest.payosPaymentLinkId !== webhookData.paymentLinkId) {
          transaction.update(requestRef, {
            status: "rejected",
            rejectedBy: "payos",
            rejectedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            rejectionReason: "Mã paymentLinkId không khớp.",
            payosWebhookData: webhookData,
          });
          return;
        }
        if (paymentRequest?.status === "approved") {
          transaction.update(requestRef, {
            updatedAt: FieldValue.serverTimestamp(),
            payosWebhookData: webhookData,
          });
          return;
        }
        if (paymentRequest?.status !== "pending") {
          throw new Error("Đơn thanh toán đã được xử lý.");
        }
        if (webhookData.code !== "00") {
          transaction.update(requestRef, {
            status: "rejected",
            rejectedBy: "payos",
            rejectedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            rejectionReason: webhookData.desc || "payOS báo giao dịch không thành công.",
            payosWebhookData: webhookData,
          });
          return;
        }

        const userRef = db.collection("users").doc(paymentRequest.userId);
        transaction.update(userRef, {
          bpoints: FieldValue.increment(Number(paymentRequest.points || 0)),
        });
        transaction.update(requestRef, {
          status: "approved",
          approvedBy: "payos",
          approvedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          payosReference: webhookData.reference,
          payosTransactionDateTime: webhookData.transactionDateTime,
          payosWebhookData: webhookData,
        });
      });

      return res.json({ success: true });
    } catch (error: any) {
      console.error("Lỗi xử lý webhook payOS:", error);
      return res.status(400).json({ success: false, error: error?.message || "Webhook payOS không hợp lệ." });
    }
  });

  app.post("/api/admin/payment-requests/:id/approve", requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const db = getAdminDb();
      const requestId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const requestRef = db.collection("paymentRequests").doc(requestId);

      await db.runTransaction(async (transaction) => {
        const requestSnap = await transaction.get(requestRef);
        if (!requestSnap.exists) {
          throw new Error("Không tìm thấy yêu cầu nạp.");
        }

        const paymentRequest = requestSnap.data();
        if (paymentRequest?.status !== "pending") {
          throw new Error("Yêu cầu này đã được xử lý.");
        }

        const userRef = db.collection("users").doc(paymentRequest.userId);
        transaction.update(userRef, {
          bpoints: FieldValue.increment(Number(paymentRequest.points || 0)),
        });
        transaction.update(requestRef, {
          status: "approved",
          approvedBy: req.user?.uid,
          approvedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      });

      return res.json({ ok: true });
    } catch (error: any) {
      console.error("Lỗi duyệt yêu cầu nạp Bpoint:", error);
      return res.status(500).json({ error: error?.message || "Không thể duyệt yêu cầu nạp." });
    }
  });

  app.post("/api/admin/payment-requests/:id/reject", requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const db = getAdminDb();
      const requestId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const requestRef = db.collection("paymentRequests").doc(requestId);

      await db.runTransaction(async (transaction) => {
        const requestSnap = await transaction.get(requestRef);
        if (!requestSnap.exists) {
          throw new Error("Không tìm thấy yêu cầu nạp.");
        }

        const paymentRequest = requestSnap.data();
        if (paymentRequest?.status !== "pending") {
          throw new Error("Yêu cầu này đã được xử lý.");
        }

        transaction.update(requestRef, {
          status: "rejected",
          rejectedBy: req.user?.uid,
          rejectedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          rejectionReason: String(req.body?.reason || ""),
        });
      });

      return res.json({ ok: true });
    } catch (error: any) {
      console.error("Lỗi từ chối yêu cầu nạp Bpoint:", error);
      return res.status(500).json({ error: error?.message || "Không thể từ chối yêu cầu nạp." });
    }
  });

  // Serve static assets or fallback to SPA index.html
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
