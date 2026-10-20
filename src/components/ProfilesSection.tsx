import { useState } from "react";
import { MessageCircle, User, ZoomIn } from "lucide-react";
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
    <div className="grid gap-4 md:grid-cols-2">
      <DeveloperCard />
      <TeacherCard />
    </div>
  );
}

export function DeveloperCard() {
  const [isOpen, setIsOpen] = useState(false);
  const [isZoomedOpen, setIsZoomedOpen] = useState(false);

  const developerName = "المهندس زياد علي محمد محمد خزيم خاطر (القائد)";
  const profileLabel = "الملف التعريفي للمطوّر";
  const profession = "مصمم ومطوّر الموقع";
  const developmentText = "تم تطوير هذا الموقع عن طريق المهندس زياد علي محمد محمد خزيم خاطر (القائد)";
  const bioText =
    "أسعى إلى تصميم وتطوير المواقع الإلكترونية والتطبيقات بأسلوب احترافي يجمع بين الجودة والإبداع وسهولة الاستخدام، مع الحرص على تقديم حلول تقنية بأسعار مناسبة للجميع.";
  const whatsappNumber = "201102161231";
  const displayWhatsapp = "01102161231";
  const developerPhotoUrl = "/assets/aistudio/IMG_20260913_104810_776b20eb.jpg";

  return (
    <>
      <div className="rounded-2xl border bg-card/90 backdrop-blur-sm p-4 shadow-sm transition hover:border-primary/50 flex flex-col justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="relative size-12 shrink-0 overflow-hidden rounded-full border-2 border-gold/60 bg-card transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gold cursor-pointer group"
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

          <div className="flex-1 min-w-0 bg-gradient-navy p-3 rounded-xl shadow-sm text-navy-foreground">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="text-xs font-semibold text-gold hover:underline block text-right cursor-pointer"
            >
              {profileLabel}
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="font-display text-sm font-bold text-gold truncate block text-right hover:opacity-90 transition cursor-pointer w-full mt-0.5"
            >
              {developerName}
            </button>
          </div>
        </div>

        <p className="mt-3 text-xs leading-5 text-muted-foreground text-right border-t pt-2 border-border/65">
          {developmentText}
        </p>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-primary text-right">
              {profileLabel}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-right">
              {profession}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center text-center my-4">
            <div
              onClick={() => setIsZoomedOpen(true)}
              className="relative size-32 overflow-hidden rounded-full border-4 border-primary/30 shadow-xl bg-primary/10 mb-4 cursor-pointer group transition hover:scale-105"
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
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <ZoomIn className="size-8" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-2">اضغط على الصورة لتكبيرها وعرضها بحجم كامل</p>

            <h3 className="text-lg font-bold text-foreground">{developerName}</h3>
            <p className="text-xs text-primary font-medium mt-1">{profession}</p>

            <p className="mt-4 text-sm leading-relaxed text-muted-foreground bg-secondary/50 p-4 rounded-xl border border-border/60">
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
              className="w-full sm:w-auto"
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
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsZoomedOpen(false)}
            >
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
  const introText = "مدرّس أول مادتي التاريخ والجغرافيا، يسعى لتقديم المحتوى التعليمي بأسلوب واضح ومتميز.";
  const bioText =
    "الأستاذ سعيد مطر، مدرّس أول مادتي التاريخ والجغرافيا، يسعى إلى تقديم المحتوى التعليمي بأسلوب واضح ومنظّم يساعد الطلاب على فهم المعلومات واستيعابها، ويهدف إلى تسهيل دراسة التاريخ والجغرافيا من خلال منصة تعليمية منظّمة وسهلة الاستخدام.";
  const teacherPhotoUrl = "/assets/aistudio/IMG_0677_cb50d715.jpeg";

  return (
    <>
      <div className="rounded-2xl border bg-card/90 backdrop-blur-sm p-4 shadow-sm transition hover:border-primary/50 flex flex-col justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="relative size-12 shrink-0 overflow-hidden rounded-full border-2 border-gold/60 bg-card transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gold cursor-pointer group"
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

          <div className="flex-1 min-w-0 bg-gradient-navy p-3 rounded-xl shadow-sm text-navy-foreground">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="text-xs font-semibold text-gold hover:underline block text-right cursor-pointer"
            >
              {profileLabel}
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="font-display text-sm font-bold text-gold truncate block text-right hover:opacity-90 transition cursor-pointer w-full mt-0.5"
            >
              {teacherName}
            </button>
          </div>
        </div>

        <p className="mt-3 text-xs leading-5 text-muted-foreground text-right border-t pt-2 border-border/65">
          {introText}
        </p>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-primary text-right">
              {profileLabel}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-right">
              {profession}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center text-center my-4">
            <div
              onClick={() => setIsZoomedOpen(true)}
              className="relative size-32 overflow-hidden rounded-full border-4 border-primary/30 shadow-xl bg-primary/10 mb-4 cursor-pointer group transition hover:scale-105"
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
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <ZoomIn className="size-8" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-2">اضغط على الصورة لتكبيرها وعرضها بحجم كامل</p>

            <h3 className="text-lg font-bold text-foreground">{teacherName}</h3>
            <p className="text-xs text-primary font-medium mt-1">{profession}</p>

            <p className="mt-4 text-sm leading-relaxed text-muted-foreground bg-secondary/50 p-4 rounded-xl border border-border/60">
              {bioText}
            </p>
          </div>

          <div className="flex justify-end mt-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="w-full sm:w-auto"
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
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsZoomedOpen(false)}
            >
              إغلاق العرض
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
