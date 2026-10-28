import { useState } from "react";
import { ExternalLink, Facebook, MessageCircle, ZoomIn } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function ProfilesSection() {
  return (
    <div className="space-y-3">
      <div className="grid gap-4 md:grid-cols-2">
        <DeveloperCard />
        <TeacherCard />
      </div>
      <ZqCodeCard />
    </div>
  );
}

export function DeveloperCard() {
  const [isOpen, setIsOpen] = useState(false);
  const [isZoomedOpen, setIsZoomedOpen] = useState(false);

  const developerName = "المهندس زياد علي محمد محمد خزيم خاطر (القائد)";
  const profileLabel = "الملف التعريفي للمطوّر";
  const profession = "مصمم ومطوّر الموقع";
  const developmentText =
    "تم تطوير هذا الموقع عن طريق المهندس زياد علي محمد محمد خزيم خاطر (القائد)";
  const bioText =
    "أسعى إلى تصميم وتطوير المواقع الإلكترونية والتطبيقات بأسلوب احترافي يجمع بين الجودة والإبداع وسهولة الاستخدام، مع الحرص على تقديم حلول تقنية بأسعار مناسبة للجميع.";
  const whatsappNumber = "201102161231";
  const displayWhatsapp = "01102161231";
  const developerPhotoUrl = "/assets/aistudio/IMG_20260913_104810_776b20eb.jpg";

  return (
    <>
      <div className="rounded-2xl border-2 border-gold/40 bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-950/95 backdrop-blur-md p-3 sm:p-4 shadow-xl transition-all duration-300 hover:border-gold hover:shadow-2xl flex flex-col justify-between">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="relative size-10 sm:size-12 shrink-0 overflow-hidden rounded-full border-2 border-gold/60 bg-slate-900 transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gold cursor-pointer group"
            title={profileLabel}
          >
            <img
              src={developerPhotoUrl}
              alt={developerName}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = "none";
              }}
            />
          </button>

          <div className="flex-1 min-w-0 bg-slate-900/95 border border-gold/40 p-2.5 sm:p-3 rounded-xl shadow-sm text-slate-100">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="text-[11px] sm:text-xs font-semibold text-gold hover:underline block text-right cursor-pointer"
            >
              {profileLabel}
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="font-display text-xs sm:text-sm font-bold text-gold truncate block text-right hover:opacity-90 transition cursor-pointer w-full mt-0.5"
            >
              {developerName}
            </button>
          </div>
        </div>

        <p className="mt-2.5 text-[11px] sm:text-xs leading-4 sm:leading-5 text-slate-300 text-right border-t pt-2 border-gold/20">
          {developmentText}
        </p>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          className="sm:max-w-md text-right bg-slate-950 border border-gold/40 text-slate-100"
          dir="rtl"
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gold text-right">
              {profileLabel}
            </DialogTitle>
            <DialogDescription className="text-slate-300 text-right">
              {profession}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center text-center my-4">
            <div
              onClick={() => setIsZoomedOpen(true)}
              className="relative size-32 overflow-hidden rounded-full border-4 border-gold/40 shadow-xl bg-slate-900 mb-4 cursor-pointer group transition hover:scale-105"
              title="اضغط لتكبير الصورة"
            >
              <img
                src={developerPhotoUrl}
                alt={developerName}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = "none";
                }}
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <ZoomIn className="size-8" />
              </div>
            </div>
            <p className="text-xs text-slate-300 mb-2">اضغط على الصورة لتكبيرها وعرضها بحجم كامل</p>

            <h3 className="text-lg font-bold text-slate-100">{developerName}</h3>
            <p className="text-xs text-gold font-medium mt-1">{profession}</p>

            <p className="mt-4 text-sm leading-relaxed text-slate-200 bg-slate-900/90 p-4 rounded-xl border border-gold/30 text-right">
              {bioText}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <Button
              asChild
              className="w-full bg-whatsapp hover:bg-whatsapp/90 text-white font-medium flex items-center justify-center gap-2"
            >
              <a
                href={`https://wa.me/${whatsappNumber}?text=مرحباً%20المهندس%20زياد،%20أريد%20التواصل%20بخصوص%20المنصة.`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="size-4" />
                تواصل عبر واتساب ({displayWhatsapp})
              </a>
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="w-full sm:w-auto border-gold/40 text-slate-200 hover:bg-slate-900"
            >
              إغلاق
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isZoomedOpen} onOpenChange={setIsZoomedOpen}>
        <DialogContent className="max-w-3xl bg-black/95 border-none p-2 text-center" dir="rtl">
          <div className="relative flex items-center justify-center min-h-[70vh]">
            <img
              src={developerPhotoUrl}
              alt={developerName}
              className="max-h-[85vh] max-w-full object-contain rounded-lg shadow-2xl"
            />
          </div>
          <div className="p-2 flex justify-between items-center text-white">
            <span className="text-sm font-semibold">{developerName}</span>
            <Button variant="secondary" size="sm" onClick={() => setIsZoomedOpen(false)}>
              إغلاق العرض
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function TeacherCard() {
  const [isOpen, setIsOpen] = useState(false);
  const [isZoomedOpen, setIsZoomedOpen] = useState(false);

  const teacherName = "الأستاذ سعيد سيد عبد الفتاح مطر";
  const profileLabel = "الملف التعريفي للمعلم";
  const profession = "مدرّس أول مادتي التاريخ والجغرافيا";
  const introText =
    "مدرّس أول مادتي التاريخ والجغرافيا، يسعى لتقديم المحتوى التعليمي بأسلوب واضح ومتميز.";
  const bioText =
    "الأستاذ سعيد مطر، مدرّس أول مادتي التاريخ والجغرافيا، يسعى إلى تقديم المحتوى التعليمي بأسلوب واضح ومنظّم يساعد الطلاب على فهم المعلومات واستيعابها، ويهدف إلى تسهيل دراسة التاريخ والجغرافيا من خلال منصة تعليمية منظّمة وسهلة الاستخدام.";
  const teacherPhotoUrl = "/assets/aistudio/IMG_0677_cb50d715.jpeg";

  return (
    <>
      <div className="rounded-2xl border-2 border-gold/40 bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-950/95 backdrop-blur-md p-3 sm:p-4 shadow-xl transition-all duration-300 hover:border-gold hover:shadow-2xl flex flex-col justify-between">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="relative size-10 sm:size-12 shrink-0 overflow-hidden rounded-full border-2 border-gold/60 bg-slate-900 transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gold cursor-pointer group"
            title={profileLabel}
          >
            <img
              src={teacherPhotoUrl}
              alt={teacherName}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = "none";
              }}
            />
          </button>

          <div className="flex-1 min-w-0 bg-slate-900/95 border border-gold/40 p-2.5 sm:p-3 rounded-xl shadow-sm text-slate-100">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="text-[11px] sm:text-xs font-semibold text-gold hover:underline block text-right cursor-pointer"
            >
              {profileLabel}
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="font-display text-xs sm:text-sm font-bold text-gold truncate block text-right hover:opacity-90 transition cursor-pointer w-full mt-0.5"
            >
              {teacherName}
            </button>
          </div>
        </div>

        <p className="mt-2.5 text-[11px] sm:text-xs leading-4 sm:leading-5 text-slate-300 text-right border-t pt-2 border-gold/20">
          {introText}
        </p>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          className="sm:max-w-md text-right bg-slate-950 border border-gold/40 text-slate-100"
          dir="rtl"
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gold text-right">
              {profileLabel}
            </DialogTitle>
            <DialogDescription className="text-slate-300 text-right">
              {profession}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center text-center my-4">
            <div
              onClick={() => setIsZoomedOpen(true)}
              className="relative size-32 overflow-hidden rounded-full border-4 border-gold/40 shadow-xl bg-slate-900 mb-4 cursor-pointer group transition hover:scale-105"
              title="اضغط لتكبير الصورة"
            >
              <img
                src={teacherPhotoUrl}
                alt={teacherName}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = "none";
                }}
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <ZoomIn className="size-8" />
              </div>
            </div>
            <p className="text-xs text-slate-300 mb-2">اضغط على الصورة لتكبيرها وعرضها بحجم كامل</p>

            <h3 className="text-lg font-bold text-slate-100">{teacherName}</h3>
            <p className="text-xs text-gold font-medium mt-1">{profession}</p>

            <p className="mt-4 text-sm leading-relaxed text-slate-200 bg-slate-900/90 p-4 rounded-xl border border-gold/30 text-right">
              {bioText}
            </p>
          </div>

          <div className="flex justify-end mt-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="w-full sm:w-auto border-gold/40 text-slate-200 hover:bg-slate-900"
            >
              إغلاق
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isZoomedOpen} onOpenChange={setIsZoomedOpen}>
        <DialogContent className="max-w-3xl bg-black/95 border-none p-2 text-center" dir="rtl">
          <div className="relative flex items-center justify-center min-h-[70vh]">
            <img
              src={teacherPhotoUrl}
              alt={teacherName}
              className="max-h-[85vh] max-w-full object-contain rounded-lg shadow-2xl"
            />
          </div>
          <div className="p-2 flex justify-between items-center text-white">
            <span className="text-sm font-semibold">{teacherName}</span>
            <Button variant="secondary" size="sm" onClick={() => setIsZoomedOpen(false)}>
              إغلاق العرض
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ZqCodeCard() {
  const [isOpen, setIsOpen] = useState(false);
  const [isZoomedOpen, setIsZoomedOpen] = useState(false);

  const officeName = "مكتب ZQ Code للحلول البرمجية";
  const designerText = "تم تصميم هذه المنصة بواسطة مكتب ZQ Code";
  const facebookUrl = "https://www.facebook.com/share/1JGekk2QQa/";
  const logoUrl = "/assets/aistudio/IMG-20261026-WA0062_89b0890e.jpg";
  const supervisor = "م. زياد علي محمد خاطر";
  const whatsappNumber = "201102161231";
  const displayWhatsapp = "01102161231";

  return (
    <>
      <div className="w-full max-w-full overflow-hidden rounded-xl border border-cyan-500/30 bg-gradient-to-r from-slate-950/95 via-slate-900/90 to-slate-950/95 backdrop-blur-md p-2.5 sm:p-3 shadow-md transition-all duration-300 hover:border-cyan-400/60 hover:shadow-cyan-950/20 box-border">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 w-full">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="relative size-8 sm:size-9 shrink-0 overflow-hidden rounded-lg border border-cyan-400/60 bg-black transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-cyan-400 cursor-pointer shadow group"
              title="مكتب ZQ Code"
            >
              <img
                src={logoUrl}
                alt="شعار مكتب ZQ Code"
                className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = "none";
                }}
              />
            </button>

            <div className="min-w-0 flex-1 text-right">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-cyan-400">مكتب ZQ Code</span>
                <span className="text-slate-500 text-[10px]">•</span>
                <span className="text-[10px] text-slate-400">{supervisor}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="font-display text-xs sm:text-[13px] font-bold text-slate-100 hover:text-cyan-300 transition text-right truncate block w-full mt-0.5 cursor-pointer"
                title={designerText}
              >
                {designerText}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 justify-between md:justify-end border-t md:border-t-0 pt-2 md:pt-0 border-slate-800/80 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="text-[11px] text-slate-300 hover:text-cyan-300 transition px-2 py-1 rounded-lg hover:bg-slate-800/60 font-medium cursor-pointer shrink-0"
            >
              تفاصيل المكتب
            </button>

            <a
              href={facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1877F2]/20 hover:bg-[#1877F2]/35 text-[#1877F2] hover:text-[#38bdf8] border border-[#1877F2]/40 px-2.5 py-1 text-xs font-bold transition hover:scale-105 shadow-sm shrink-0"
              title="صفحة مكتب ZQ Code على فيسبوك"
            >
              <Facebook className="size-3.5 fill-current shrink-0" />
              <span className="shrink-0">فيسبوك</span>
              <ExternalLink className="size-3 opacity-70 shrink-0" />
            </a>
          </div>
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          className="sm:max-w-md text-right bg-slate-950 border border-cyan-500/40 text-slate-100"
          dir="rtl"
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-cyan-400 text-right flex items-center justify-between">
              <span>{officeName}</span>
              <span className="text-xs font-normal text-slate-400">{supervisor}</span>
            </DialogTitle>
            <DialogDescription className="text-slate-300 text-right text-xs">
              تصميم وتطوير المنصات التعليمية والمواقع والتطبيقات البرمجية
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center text-center my-3">
            <div
              onClick={() => setIsZoomedOpen(true)}
              className="relative size-28 overflow-hidden rounded-2xl border-2 border-cyan-400/50 shadow-xl bg-black mb-3 cursor-pointer group transition hover:scale-105"
              title="اضغط لتكبير الشعار"
            >
              <img
                src={logoUrl}
                alt="شعار مكتب ZQ Code"
                className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <ZoomIn className="size-7 text-cyan-300" />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mb-2">
              اضغط على الشعار لتكبيره وعرضه بدقة عالية
            </p>

            <h3 className="text-base font-bold text-slate-100">مكتب ZQ Code للبرمجيات</h3>
            <p className="text-xs text-cyan-400 font-medium mt-0.5">إشراف وتطوير: {supervisor}</p>

            <p className="mt-3 text-xs leading-relaxed text-slate-200 bg-slate-900/90 p-3.5 rounded-xl border border-cyan-500/30 text-right w-full">
              {designerText}. نسعد بتقديم خدمات تصميم وتطوير المنصات التعليمية، والمواقع
              الإلكترونية، وتطبيقات الويب المخصصة بأحدث التقنيات وأعلى معايير الجودة والأداء.
            </p>
          </div>

          <div className="flex flex-col gap-2 mt-1">
            <Button
              asChild
              className="w-full bg-[#1877F2] hover:bg-[#1877F2]/90 text-white font-bold flex items-center justify-center gap-2"
            >
              <a href={facebookUrl} target="_blank" rel="noopener noreferrer">
                <Facebook className="size-4 fill-current" />
                زيارة صفحة مكتب ZQ Code على فيسبوك
                <ExternalLink className="size-3.5" />
              </a>
            </Button>
            <div className="flex gap-2">
              <Button
                asChild
                className="flex-1 bg-whatsapp hover:bg-whatsapp/90 text-white font-medium flex items-center justify-center gap-1.5 text-xs"
              >
                <a
                  href={`https://wa.me/${whatsappNumber}?text=مرحباً%20مكتب%20ZQ%20Code،%20أود%20التواصل%20بخصوص%20تطوير%20منصة%20أو%20موقع.`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="size-3.5" />
                  واتساب ({displayWhatsapp})
                </a>
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="border-slate-800 text-slate-300 hover:bg-slate-900 text-xs"
              >
                إغلاق
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isZoomedOpen} onOpenChange={setIsZoomedOpen}>
        <DialogContent className="max-w-3xl bg-black/95 border-none p-2 text-center" dir="rtl">
          <div className="relative flex items-center justify-center min-h-[70vh]">
            <img
              src={logoUrl}
              alt="شعار مكتب ZQ Code"
              className="max-h-[85vh] max-w-full object-contain rounded-lg shadow-2xl"
            />
          </div>
          <div className="p-2 flex justify-between items-center text-white">
            <span className="text-sm font-semibold">مكتب ZQ Code - {supervisor}</span>
            <Button variant="secondary" size="sm" onClick={() => setIsZoomedOpen(false)}>
              إغلاق العرض
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
