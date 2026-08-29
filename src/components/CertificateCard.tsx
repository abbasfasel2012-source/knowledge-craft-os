import { Award, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CertificateCardProps {
  title: string;
  courseName: string;
  userName: string;
  issueDate: string;
  certificateId: string;
  onDownload?: () => void;
  onShare?: () => void;
}

export function CertificateCard({
  title,
  courseName,
  userName,
  issueDate,
  certificateId,
  onDownload,
  onShare,
}: CertificateCardProps) {
  return (
    <div className="space-y-3 rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/5 to-transparent p-6">
      <div className="flex items-start justify-between">
        <div className="flex gap-3">
          <div className="rounded-lg gold-gradient p-2 text-gold-foreground">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-gold">{title}</h3>
            <p className="text-xs text-muted-foreground">{courseName}</p>
          </div>
        </div>
      </div>

      <div className="space-y-1 text-xs text-muted-foreground">
        <p>
          الاسم: <span className="font-semibold text-foreground">{userName}</span>
        </p>
        <p>
          تاريخ الإصدار: <span className="font-semibold text-foreground">{issueDate}</span>
        </p>
        <p>
          معرّف الشهادة: <span className="font-mono text-[10px]">{certificateId}</span>
        </p>
      </div>

      <div className="flex gap-2 pt-2">
        <Button size="sm" variant="outline" onClick={onDownload} className="flex-1 text-xs">
          <Download className="h-3 w-3" />
          تحميل
        </Button>
        <Button size="sm" variant="outline" onClick={onShare} className="flex-1 text-xs">
          <Share2 className="h-3 w-3" />
          مشاركة
        </Button>
      </div>
    </div>
  );
}
