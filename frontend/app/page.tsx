"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "motion/react";
import {
  Calendar,
  CheckCircle2,
  Loader2,
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  Link as LinkIcon,
  Github,
  Layout,
  Zap,
  RefreshCw,
  AlertTriangle,
  Target,
  ChevronDown,
  HelpCircle,
} from "lucide-react";
import { Toaster, toast } from "sonner";

const SYNC_STEPS = [
  { id: "login", label: "Truy cập QLDT PTIT" },
  { id: "extract", label: "Lấy dữ liệu lịch học" },
  { id: "connect", label: "Đẩy sự kiện lên Google" },
  { id: "success", label: "Đồng bộ thành công!" },
];

const FAQS = [
  {
    q: "Lịch học có được cập nhật tự động khi bị thay đổi không?",
    a: "Hiện tại, công cụ chỉ đồng bộ dữ liệu tại thời điểm bạn nhấn đồng bộ. Nếu có lịch bù hoặc đổi phòng đột xuất, bạn vui lòng quay lại trang web và nhấn đồng bộ một lần nữa nhé.",
  },
  {
    q: "Mật khẩu QLDT của tôi có bị lưu lại không?",
    a: "Hoàn toàn không ❌. Mật khẩu của bạn chỉ được xử lý tạm thời (in-memory) trong quá trình máy chủ lấy dữ liệu lịch học và sau đó sẽ bị xóa ngay lập tức. Chúng tôi không lưu trữ mật khẩu của bạn vào cơ sở dữ liệu.",
  },
  {
    q: "Công cụ này có an toàn cho tài khoản Google của tôi không?",
    a: "Có ✅. Ứng dụng sử dụng luồng xác thực Google OAuth2. Chúng tôi chỉ yêu cầu quyền xem và thêm sự kiện vào Google Calendar, tuyệt đối không có quyền truy cập vào Gmail hay các dịch vụ cá nhân khác của bạn.",
  },
];

export default function Home() {
  const supabase = createClient();
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "syncing" | "success">("idle");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [openQa, setOpenQa] = useState<number | null>(null);

  const toggleQa = (index: number) => {
    setOpenQa(openQa === index ? null : index);
  };

  const getGoogleAuthUrl = (id: string) => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "136177222814-5v5eki4blrd5jlm8uuoaaag29t8ajs6h.apps.googleusercontent.com";
    const redirectUri =
      process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/auth/google/callback`;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope:
        "openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/calendar.events",
      access_type: "offline",
      state: id,
      prompt: "consent",
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  };

  const handleConnectGoogle = async () => {
    if (!studentId) {
      toast.error("Vui lòng nhập Mã sinh viên trước!");
      return;
    }

    try {
      const { data: user } = await supabase.from("users").select("google_refresh_token").eq("student_id", studentId).single();

      if (user?.google_refresh_token) {
        toast.success("Tài khoản đã liên kết");
      } else {
        window.location.href = getGoogleAuthUrl(studentId);
      }
    } catch {
      window.location.href = getGoogleAuthUrl(studentId);
    }
  };

  const handleSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !password) return;

    try {
      // 1. Kiểm tra Token trong Supabase
      const { data: user } = await supabase.from("users").select("google_refresh_token").eq("student_id", studentId).single();

      if (!user?.google_refresh_token) {
        let countdown = 3;
        const toastId = toast.error(`Vui lòng kết nối Google Calendar trước!`, { duration: 4000 });

        const interval = setInterval(() => {
          if (countdown > 0) {
            toast.error(`Tự động mở sau ${countdown} giây`, { id: toastId, duration: 4000 });
          } else {
            toast.error(`Đang chuyển hướng...`, { id: toastId, duration: 2000 });
          }
          countdown--;
        }, 1000);

        setTimeout(() => {
          clearInterval(interval);
          window.location.href = getGoogleAuthUrl(studentId);
        }, 3000);

        return;
      }

      // Đã có token, bắt đầu quá trình đồng bộ
      setStatus("syncing");
      setCurrentStepIndex(0); // Bước 1: Đăng nhập QLDT

      // 2. Cào dữ liệu từ QLDT
      const scrapeRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/scrape`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: studentId, password: password }),
      });

      if (!scrapeRes.ok) {
        toast.error("Lỗi khi đăng nhập/lấy lịch từ QLDT.");
        setStatus("idle");
        return;
      }

      const scrapeData = await scrapeRes.json();
      setCurrentStepIndex(1); // Bước 2: Lấy dữ liệu
      await new Promise((r) => setTimeout(r, 600)); // Hiệu ứng UI để mượt mà

      setCurrentStepIndex(2); // Bước 3: Đẩy lên Google

      const syncRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/sync-google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: studentId, schedule_data: scrapeData.schedule_data }),
      });

      if (!syncRes.ok) {
        toast.error("Lỗi khi đồng bộ lên Google Calendar.");
        setStatus("idle");
        return;
      }

      setCurrentStepIndex(3); // Bước 4: Thành công
      toast.success("Đồng bộ hoàn tất!");

      await new Promise((r) => setTimeout(r, 600));
      setStatus("success");
    } catch {
      toast.error("Lỗi kết nối server.");
      setStatus("idle");
    }
  };

  const handleReset = () => {
    setStatus("idle");
    setStudentId("");
    setPassword("");
    setCurrentStepIndex(0);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row font-sans text-zinc-900 selection:bg-red-100 selection:text-ptit-red">
      <Toaster position="top-center" />

      {/* LEFT COLUMN - INFO */}
      <div className="w-full lg:w-7/12 xl:w-2/3 h-auto lg:h-screen lg:overflow-y-auto px-6 py-10 lg:px-16 lg:py-16 bg-white relative">
        {/* Background decoration */}
        <div className="absolute top-0 left-0 w-full h-[500px] overflow-hidden -z-10 pointer-events-none opacity-40">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[100%] rounded-full bg-red-50 blur-3xl" />
        </div>

        <div className="max-w-3xl mx-auto space-y-16">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-red-50 text-ptit-red">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-zinc-900 leading-tight">QLDT Calendar Sync</h1>
                <p className="text-sm text-zinc-500">PTIT Schedule tool</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Link
                href="/privacy"
                className="flex items-center space-x-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 bg-zinc-50 hover:bg-zinc-100 px-4 py-2 rounded-full border border-zinc-200 transition-colors"
                title="Google Cloud Console Privacy Policy Requirement"
              >
                <ShieldCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Privacy Policy</span>
              </Link>
              <a
                href="https://github.com/Michael-Dung-IsMe/qldt-calendar-tool"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 bg-zinc-50 hover:bg-zinc-100 px-4 py-2 rounded-full border border-zinc-200 transition-colors"
              >
                <Github className="w-4 h-4" />
                <span className="hidden sm:inline">Star on GitHub</span>
              </a>
            </div>
          </div>

          {/* Hero & Intro */}
          <section className="space-y-6">
            <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-zinc-900 leading-[1.15]">
              Đồng bộ lịch học <span className="text-ptit-red">PTIT</span>
              <br />
              lên Google Calendar trong tích tắc.
            </h2>
            <p className="text-lg text-zinc-600 leading-relaxed max-w-2xl">
              QLDT Calendar Sync là công cụ nguồn mở giúp sinh viên tự động hóa việc chuyển đổi thời khóa biểu từ hệ thống Quản lý Đào tạo sang nền
              tảng quen thuộc Google Calendar một cách an toàn và nhạy bén.
            </p>
          </section>

          {/* Purpose */}
          <section className="space-y-4">
            <div className="flex items-center space-x-2 text-ptit-red mb-4">
              <Target className="w-5 h-5" />
              <h3 className="text-lg font-bold text-zinc-900">Mục đích ra đời</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-100 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm mb-3">
                  <Zap className="w-5 h-5 text-amber-500" />
                </div>
                <h4 className="font-semibold text-zinc-900 mb-1">Tiết kiệm thời gian</h4>
                <p className="text-sm text-zinc-600">Loại bỏ hoàn toàn thao tác nhập liệu thủ công từng môn học vào điện thoại hay máy tính.</p>
              </div>
              <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-100 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm mb-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                </div>
                <h4 className="font-semibold text-zinc-900 mb-1">Tránh sai sót</h4>
                <p className="text-sm text-zinc-600">Hạn chế tối đa việc nhập nhầm ngày giờ, quên lịch học hoặc bỏ lỡ các buổi học bù/đổi phòng.</p>
              </div>
            </div>
          </section>

          {/* Features */}
          <section className="space-y-4">
            <div className="flex items-center space-x-2 text-ptit-red mb-4">
              <Layout className="w-5 h-5" />
              <h3 className="text-lg font-bold text-zinc-900">Tính năng nổi bật</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-start space-x-3 p-4 rounded-xl bg-zinc-50/50 hover:bg-zinc-50 border border-transparent hover:border-zinc-100 transition-colors">
                <ShieldCheck className="w-5 h-5 text-ptit-red mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-medium text-zinc-900">Xác thực an toàn</h4>
                  <p className="text-sm text-zinc-600 mt-1">Sử dụng Supabase và Google OAuth2 để quản lý phiên và cấp quyền một cách bảo mật nhất.</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-4 rounded-xl bg-zinc-50/50 hover:bg-zinc-50 border border-transparent hover:border-zinc-100 transition-colors">
                <RefreshCw className="w-5 h-5 text-ptit-red mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-medium text-zinc-900">Đồng bộ hóa thông minh</h4>
                  <p className="text-sm text-zinc-600 mt-1">
                    Tự động nhận diện lớp học và bỏ qua những sự kiện đã tồn tại, tránh trùng lặp làm rác lịch của bạn.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-4 rounded-xl bg-zinc-50/50 hover:bg-zinc-50 border border-transparent hover:border-zinc-100 transition-colors">
                <Zap className="w-5 h-5 text-ptit-red mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-medium text-zinc-900">Trích xuất đồng bộ siêu tốc</h4>
                  <p className="text-sm text-zinc-600 mt-1">
                    Tự động đăng nhập, cào dữ liệu thời khóa biểu ngầm và đẩy lên mượt mà chỉ trong vài giây.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Q&A */}
          <section className="space-y-4">
            <div className="flex items-center space-x-2 text-ptit-red mb-4">
              <HelpCircle className="w-5 h-5" />
              <h3 className="text-lg font-bold text-zinc-900">Hỏi đáp (Q&A)</h3>
            </div>
            <div className="space-y-3">
              {FAQS.map((faq, index) => (
                <div key={index} className="border border-zinc-200 rounded-2xl overflow-hidden bg-white hover:border-zinc-300 transition-colors">
                  <button
                    onClick={() => toggleQa(index)}
                    className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-zinc-50/50 transition-colors focus:outline-none"
                  >
                    <span className="font-medium text-zinc-900 text-sm md:text-base">{faq.q}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-zinc-400 shrink-0 ml-4 transition-transform duration-300 ease-in-out ${openQa === index ? "rotate-180 text-ptit-red" : ""}`}
                    />
                  </button>
                  <AnimatePresence>
                    {openQa === index && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden bg-zinc-50/30"
                      >
                        <div className="px-5 pb-5 pt-2 text-sm text-zinc-600 leading-relaxed border-t border-zinc-100/50">{faq.a}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </section>

          {/* Disclaimer */}
          <section>
            <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-200/60 shadow-sm">
              <div className="flex items-center space-x-2 text-amber-700 mb-2">
                <AlertTriangle className="w-5 h-5" />
                <h4 className="font-bold">Chú ý quan trọng</h4>
              </div>
              <p className="text-sm text-amber-800/90 leading-relaxed">
                Đây là dự án cá nhân, phi thương mại. Dự án phát triển độc lập và <strong>KHÔNG</strong> có bất kỳ mối liên hệ, hợp tác hay bảo trợ
                nào từ phía nhà trường, đơn vị, hay tổ chức nào.
                <br className="mb-2 block" />
                Mã nguồn được tạo ra với mục đích học tập. Việc sử dụng công cụ để đồng bộ thông tin là do nhận thức và quyết định của người dùng.
              </p>
            </div>
          </section>

          {/* Footer info text */}
          <div className="pt-8 pb-4 text-center lg:text-left text-xs text-zinc-400 border-t border-zinc-100">
            Made by Micheal-Dung-IsMe. © {new Date().getFullYear()} QLDT Calendar Sync.
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN - FORM */}
      <div className="w-full lg:w-5/12 xl:w-1/3 bg-[#fdfdfd] lg:border-l lg:border-zinc-200 relative flex flex-col justify-center min-h-[600px] lg:h-screen lg:sticky lg:top-0">
        {/* Subtle right column background elements */}
        <div className="absolute top-0 right-0 w-full h-full overflow-hidden -z-10 pointer-events-none opacity-50">
          <div className="absolute bottom-[10%] right-[-10%] w-[80%] h-[30%] rounded-full bg-blue-50 blur-3xl" />
        </div>

        <div className="p-6 sm:p-10 lg:p-12 w-full max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
            className="bg-white rounded-[2rem] shadow-[0_8px_40px_rgb(0,0,0,0.06)] border border-zinc-200/50 overflow-hidden"
          >
            <div className="p-8">
              {/* Header */}
              <div className="text-center mb-8">
                <h2 className="text-xl font-bold tracking-tight text-zinc-900 mb-2">Bắt đầu ngay</h2>
                <p className="text-sm text-zinc-500 leading-relaxed">Nhập thông tin QLDT của bạn bên dưới.</p>
              </div>

              <AnimatePresence mode="wait">
                {status === "idle" && (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    onSubmit={handleSync}
                    className="space-y-5"
                  >
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-1.5 ml-1">Mã sinh viên</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <User className="h-5 w-5 text-zinc-400" />
                          </div>
                          <input
                            type="text"
                            value={studentId}
                            onChange={(e) => setStudentId(e.target.value)}
                            className="block w-full pl-11 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-ptit-red transition-all duration-200"
                            placeholder="VD: B20DCCN001"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-1.5 ml-1">Mật khẩu QLDT</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Lock className="h-5 w-5 text-zinc-400" />
                          </div>
                          <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="block w-full pl-11 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-ptit-red transition-all duration-200"
                            placeholder="••••••••"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      <button
                        type="submit"
                        disabled={!studentId || !password}
                        className="w-full flex items-center justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-ptit-red hover:bg-[#aa112f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ptit-red disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.98]"
                      >
                        Đồng bộ lịch
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={handleConnectGoogle}
                        className="w-full flex items-center justify-center py-3.5 px-4 border border-zinc-200 rounded-xl bg-white shadow-sm text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-200 transition-all duration-200 active:scale-[0.98]"
                      >
                        <LinkIcon className="mr-2 w-4 h-4 text-zinc-400" />
                        <span className="flex flex-col items-center">
                          <span>Kết nối Google Calendar</span>
                          <span className="text-[10px] text-zinc-400 font-normal leading-tight mt-0.5">(nếu bạn sử dụng lần đầu)</span>
                        </span>
                      </button>
                    </div>
                  </motion.form>
                )}

                {status === "syncing" && (
                  <motion.div
                    key="syncing"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="py-4"
                  >
                    <div className="space-y-6">
                      {SYNC_STEPS.map((step, index) => {
                        const isCompleted = index < currentStepIndex;
                        const isCurrent = index === currentStepIndex;
                        const isPending = index > currentStepIndex;

                        return (
                          <motion.div
                            key={step.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{
                              opacity: isPending ? 0.4 : 1,
                              x: 0,
                              scale: isCurrent ? 1.02 : 1,
                            }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                            className="flex items-center space-x-4"
                          >
                            <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                              {isCompleted ? (
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-emerald-500">
                                  <CheckCircle2 className="w-6 h-6" />
                                </motion.div>
                              ) : isCurrent ? (
                                <Loader2 className="w-6 h-6 text-ptit-red animate-spin" />
                              ) : (
                                <div className="w-3 h-3 rounded-full bg-zinc-200" />
                              )}
                            </div>
                            <span className={`text-sm font-medium ${isCurrent ? "text-zinc-900" : isCompleted ? "text-zinc-700" : "text-zinc-400"}`}>
                              {step.label}
                            </span>
                          </motion.div>
                        );
                      })}
                    </div>

                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.8 }}
                      className="mt-6 text-center text-xs text-zinc-400 leading-relaxed"
                    >
                      Quá trình có thể diễn ra lâu hơn dự kiến, đợi một chút nhé ⚡
                    </motion.p>
                  </motion.div>
                )}

                {status === "success" && (
                  <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                      className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-50 text-emerald-500 mb-6"
                    >
                      <CheckCircle2 className="w-10 h-10" />
                    </motion.div>

                    <h3 className="text-xl font-semibold text-zinc-900 mb-2">Hoàn tất đồng bộ!</h3>
                    <p className="text-zinc-500 text-sm mb-8">Lịch học của bạn đã được thêm vào Google Calendar thành công.</p>

                    <div className="space-y-3">
                      <a
                        href="https://calendar.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900 transition-all duration-200 active:scale-[0.98]"
                      >
                        Mở Google Calendar
                      </a>
                      <button
                        onClick={handleReset}
                        className="w-full flex items-center justify-center py-3.5 px-4 border border-zinc-200 rounded-xl text-sm font-medium text-zinc-700 bg-white hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-200 transition-all duration-200"
                      >
                        Đồng bộ tài khoản khác
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Form Footer */}
            <div className="bg-zinc-50/80 px-8 py-4 border-t border-zinc-100">
              <div className="flex items-center justify-center text-xs text-zinc-500">
                <ShieldCheck className="w-4 h-4 mr-1.5 text-emerald-500" />
                <span>Dữ liệu của bạn được xóa sau phiên làm việc.</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
