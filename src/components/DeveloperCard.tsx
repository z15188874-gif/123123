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

export function DeveloperCard() {
  const [isOpen, setIsOpen] = useState(false);
  const [isZoomedOpen, setIsZoomedOpen] = useState(false);

  // Developer Details as requested
  const developerName = "المهندس زياد علي محمد محمد خزيم خاطر (القائد)";
  const profileLabel = "الملف التعريفي للمطوّر";
  const developmentText = "تم تطوير هذا الموقع عن طريق المهندس زياد علي محمد محمد خزيم خاطر (القائد)";
  const bioText =
    "أسعى إلى تصميم وتطوير المواقع الإلكترونية والتطبيقات بأسلوب احترافي يجمع بين الجودة والإبداع وسهولة الاستخدام، مع الحرص على تقديم حلول تقنية بأسعار مناسبة للجميع.";
  const whatsappNumber = "201102161231";
  const displayWhatsapp = "01102161231";
  const developerPhotoUrl = "/assets/aistudio/IMG_20260913_104810_776b20eb.jpg";

  return (
    <>
      {/* Developer Card Widget */}
      <div className="rounded-2xl border bg-card/90 backdrop-blur-sm p-4 shadow-sm transition hover:border-primary/50">
        <div className="flex items-center gap-3">
          {/* Clickable Avatar */}
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
            {/* Clickable Profile Label */}
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="text-xs font-semibold text-gold hover:underline block text-right cursor-pointer"
            >
              {profileLabel}
            </button>

            {/* Clickable Name */}
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="font-display text-sm font-bold text-gold truncate block text-right hover:opacity-90 transition cursor-pointer w-full mt-0.5"
            >
              {developerName}
            </button>
          </div>
        </div>

        {/* Descriptive Phrase */}
        <p className="mt-3 text-xs leading-5 text-muted-foreground text-right border-t pt-2 border-border/60">
          {developmentText}
        </p>
      </div>

      {/* Developer Profile Modal Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-primary text-right">
              {profileLabel}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-right">
              تعرف على مهندس ومنسق النظام
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center text-center my-4">
            {/* Clickable Profile Photo in Modal to Zoom/Enlarge */}
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
            <p className="text-xs text-primary font-medium mt-1">مطوّر وقائد النظام التعليمي</p>

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

      {/* Image Zoom / Enlarge Lightbox Dialog */}
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
