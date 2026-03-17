"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Key, CalendarClock, DatabaseZap, UserCog, Github, Languages } from "lucide-react";

type Lang = "en" | "vi";

const TRANSLATIONS = {
  en: {
    back: "Back to Home",
    title: "Privacy Policy",
    lastUpdated: "Last updated: March 17, 2026",
    intro: (
      <>
        Thank you for using <strong>QLDT Calendar Sync</strong>. Protecting your personal data is our top priority. This policy explains how we
        collect, use, and protect your information when you use our tool to seamlessly sync your academic schedule from the PTIT QLDT system to
        your Google Calendar.
      </>
    ),
    sec1Title: "1. Information We Collect",
    sec1Items: [
      <span key="1"><strong>Student ID & Password:</strong> Required to authenticate with the QLDT system and extract your course schedule.</span>,
      <span key="2"><strong>Google Calendar Data:</strong> We request OAuth2 access to your Google Calendar to view existing schedule events and create/update new ones.</span>,
      <span key="3"><strong>Google Profile Info:</strong> Basic profile access is requested solely to identify your connected Google account.</span>
    ],
    sec2Title: "2. How We Use Your Information",
    sec2Items: [
      <span key="1"><strong>Strictly No Password Storage:</strong> Your Student ID and Password are used <em>strictly once</em> (in-memory) during the execution flow to scrape your schedule. <strong>We absolutely DO NOT store your password</strong> in any database or persistent storage. It is automatically destroyed seconds after the data extraction is complete.</span>,
      <span key="2"><strong>Google Calendar Scope:</strong> Permissions are strictly limited to two backend actions: (1) Checking if a class event already exists to prevent duplicates, and (2) Creating new events for your schedule. We do not read, modify, or delete your other personal events.</span>,
      <span key="3"><strong>Authentication Tokens:</strong> After granting permission, your OAuth Refresh Token is securely stored in an encrypted Supabase database. This allows future automated background syncs without requiring you to re-authenticate manually.</span>
    ],
    sec3Title: "3. Your Control",
    sec3Content: "You maintain full control over your data. You can disconnect your Google Calendar at any time by visiting your Google Account Security settings and revoking access to our application. Once revoked, the app will no longer be able to sync events.",
    sec4Title: "4. Data Sharing",
    sec4Content: "This is an open-source, non-profit tool. We DO NOT sell, trade, or share your personal information with any third parties. Data flows directly between your client, our server, and Google's API.",
    sec5Title: "5. Contact & Disclaimer",
    sec5Content: "QLDT Calendar Sync is an independent student project and is not officially affiliated with the Posts and Telecommunications Institute of Technology (PTIT).",
    githubBtn: "View Source or Open an Issue on GitHub"
  },
  vi: {
    back: "Về trang chủ",
    title: "Chính sách bảo mật",
    lastUpdated: "Cập nhật lần cuối: 17/03/2026",
    intro: (
      <>
        Cảm ơn bạn đã sử dụng <strong>QLDT Calendar Sync</strong>. Việc bảo vệ dữ liệu cá nhân của bạn là ưu tiên hàng đầu của chúng tôi.
        Chính sách bảo mật này giải thích cách chúng tôi thu thập, sử dụng và bảo vệ thông tin của bạn khi bạn sử dụng công cụ của chúng tôi để đồng bộ
        lịch học từ hệ thống QLDT PTIT sang Google Calendar của bạn.
      </>
    ),
    sec1Title: "1. Thông tin chúng tôi thu thập",
    sec1Items: [
      <span key="1"><strong>Mã SV & Mật khẩu:</strong> Bắt buộc, dùng để xác thực với hệ thống QLDT và trích xuất lịch học của bạn.</span>,
      <span key="2"><strong>Dữ liệu Google Calendar:</strong> Chúng tôi yêu cầu quyền truy cập OAuth2 vào Google Calendar để xem các sự kiện hiện có và tạo/cập nhật sự kiện mới.</span>,
      <span key="3"><strong>Thông tin hồ sơ Google:</strong> Quyền truy cập hồ sơ cơ bản chỉ được yêu cầu để nhận dạng tài khoản Google được kết nối của bạn.</span>
    ],
    sec2Title: "2. Cách chúng tôi sử dụng thông tin",
    sec2Items: [
      <span key="1"><strong>Tuyệt đối không lưu trữ mật khẩu:</strong> Mã SV và Mật khẩu của bạn được sử dụng <em>duy nhất một lần</em> (trong bộ nhớ) trong quá trình thực thi để thu thập lịch trình của bạn. <strong>Chúng tôi tuyệt đối KHÔNG lưu trữ mật khẩu của bạn</strong> trên bất kỳ cơ sở dữ liệu hay bộ nhớ lưu trữ nào. Mật khẩu tự động bị xóa vài giây sau khi quá trình trích xuất dữ liệu hoàn tất.</span>,
      <span key="2"><strong>Phạm vi Google Calendar:</strong> Quyền hạn được giới hạn nghiêm ngặt ở hai hành động: (1) Kiểm tra xem một sự kiện lớp học đã tồn tại hay chưa để tránh trùng lặp và (2) Tạo sự kiện mới cho lịch học của bạn. Chúng tôi không đọc, sửa đổi hoặc xóa các sự kiện cá nhân khác của bạn.</span>,
      <span key="3"><strong>Token Xác thực:</strong> Sau khi cấp quyền, Refresh Token OAuth của bạn được lưu trữ an toàn trong cơ sở dữ liệu Supabase được mã hóa. Điều này cho phép đồng bộ tự động mà không yêu cầu bạn phải xác thực lại theo cách thủ công mỗi lần.</span>
    ],
    sec3Title: "3. Quyền kiểm soát",
    sec3Content: "Bạn làm chủ dữ liệu của mình. Bạn có thể ngắt kết nối Google Calendar bất cứ lúc nào bằng cách truy cập Cài đặt bảo mật Tài khoản Google của mình và thu hồi quyền truy cập đối với ứng dụng của chúng tôi. Sau khi thu hồi, ứng dụng sẽ không còn khả năng đồng bộ lịch học nữa.",
    sec4Title: "4. Chia sẻ dữ liệu",
    sec4Content: "Đây là một công cụ nguồn mở, phi lợi nhuận. Chúng tôi KHÔNG BÁN, trao đổi hoặc chia sẻ thông tin cá nhân của bạn với bất kỳ bên thứ ba nào. Dữ liệu truyền trực tiếp giữa máy bạn, máy chủ của chúng tôi và API của Google.",
    sec5Title: "5. Liên hệ & Khước từ trách nhiệm",
    sec5Content: "QLDT Calendar Sync là dự án sinh viên độc lập và không có liên kết chính thức với Học viện Công nghệ Bưu chính Viễn thông (PTIT).",
    githubBtn: "Xem mã nguồn hoặc báo lỗi trên GitHub"
  }
};

export default function PrivacyPolicy() {
  const [lang, setLang] = useState<Lang>("en");
  const t = TRANSLATIONS[lang];

  return (
    <div className="min-h-screen bg-zinc-50 py-12 px-4 sm:px-6 lg:px-8 selection:bg-red-100 selection:text-ptit-red">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="inline-flex items-center text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t.back}
          </Link>

          <button
            onClick={() => setLang(lang === "en" ? "vi" : "en")}
            className="inline-flex items-center space-x-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 bg-white hover:bg-zinc-50 px-4 py-2 rounded-full border border-zinc-200 transition-colors shadow-sm"
          >
            <Languages className="w-4 h-4" />
            <span>{lang === "en" ? "Tiếng Việt" : "English"}</span>
          </button>
        </div>

        <div className="bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-zinc-200 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10 border-b border-zinc-100 pb-8">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-red-50 text-ptit-red rounded-2xl">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{t.title}</h1>
                <p className="text-sm text-zinc-500 mt-1">{t.lastUpdated}</p>
              </div>
            </div>
          </div>

          <div className="text-zinc-600 leading-relaxed space-y-6">
            <p className="text-lg">
              {t.intro}
            </p>

            <div className="space-y-8 mt-8">
              {/* Section 1 */}
              <section className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100">
                <div className="flex items-center space-x-3 mb-4">
                  <DatabaseZap className="w-6 h-6 text-zinc-700" />
                  <h2 className="text-xl font-bold text-zinc-900">{t.sec1Title}</h2>
                </div>
                <ul className="space-y-3 ml-9 list-disc text-zinc-600">
                  {t.sec1Items.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </section>

              {/* Section 2 */}
              <section className="bg-red-50/50 p-6 rounded-2xl border border-red-100">
                <div className="flex items-center space-x-3 mb-4">
                  <Key className="w-6 h-6 text-ptit-red" />
                  <h2 className="text-xl font-bold text-zinc-900">{t.sec2Title}</h2>
                </div>
                <div className="space-y-4 ml-2 max-w-none text-zinc-600">
                  {t.sec2Items.map((item, idx) => (
                    <p key={idx}>{item}</p>
                  ))}
                </div>
              </section>

              {/* Section 3 & 4 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <section className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100">
                  <div className="flex items-center space-x-3 mb-4">
                    <UserCog className="w-6 h-6 text-zinc-700" />
                    <h2 className="text-xl font-bold text-zinc-900">{t.sec3Title}</h2>
                  </div>
                  <p className="text-zinc-600">
                    {t.sec3Content}
                  </p>
                </section>

                <section className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100">
                  <div className="flex items-center space-x-3 mb-4">
                    <CalendarClock className="w-6 h-6 text-zinc-700" />
                    <h2 className="text-xl font-bold text-zinc-900">{t.sec4Title}</h2>
                  </div>
                  <p className="text-zinc-600">
                    {t.sec4Content}
                  </p>
                </section>
              </div>

              {/* Section 5 */}
              <section className="pt-6 border-t border-zinc-100">
                <h2 className="text-xl font-bold text-zinc-900 mb-3">{t.sec5Title}</h2>
                <p className="text-zinc-600 mb-4">
                  {t.sec5Content}
                </p>
                <a
                  href="https://github.com/Michael-Dung-IsMe/qldt-calendar-tool"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  <Github className="w-4 h-4 mr-2" />
                  {t.githubBtn}
                </a>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
