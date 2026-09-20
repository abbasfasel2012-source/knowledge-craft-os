import { useState } from "react";
import { MessageCircle, ThumbsUp, Send, Loader2 } from "lucide-react";
import { useSession } from "@/lib/session";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

interface Comment {
  id: string;
  author: string;
  avatar?: string;
  content: string;
  timestamp: string;
  likes: number;
  likedByMe?: boolean;
}

interface CourseCommentsProps {
  courseId?: string;
  comments?: Comment[];
  onComment?: (content: string) => void | Promise<void>;
  onLike?: (commentId: string) => Promise<boolean>;
}

export function CourseComments({
  courseId: _courseId,
  comments = [],
  onComment,
  onLike,
}: CourseCommentsProps) {
  const { user } = useSession();
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [likingId, setLikingId] = useState<string | null>(null);
  // Track optimistic like state: commentId → liked status
  const [likeState, setLikeState] = useState<Record<string, boolean>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    if (!user) { toast.error("سجّل الدخول للتعليق"); return; }
    setIsSubmitting(true);
    try {
      await onComment?.(newComment.trim());
      setNewComment("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر إرسال التعليق");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleLike = async (commentId: string) => {
    if (!user) { toast.error("سجّل الدخول للتفاعل"); return; }
    if (likingId) return; // منع النقر المزدوج
    setLikingId(commentId);
    // تحديث فوري (optimistic)
    const prev = likeState[commentId] ?? false;
    setLikeState((s) => ({ ...s, [commentId]: !prev }));
    try {
      if (onLike) {
        const persisted = await onLike(commentId);
        setLikeState((s) => ({ ...s, [commentId]: persisted }));
      }
    } catch (err) {
      // استرجاع الحالة السابقة عند الخطأ
      setLikeState((s) => ({ ...s, [commentId]: prev }));
      toast.error(err instanceof Error ? err.message : "تعذّر حفظ الإعجاب");
    } finally {
      setLikingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-gold" />
        <h3 className="font-bold">المجتمع والنقاشات</h3>
        <span className="rounded-full bg-gold/10 px-2 py-0.5 text-xs font-semibold text-gold">
          {comments.length}
        </span>
      </div>

      {user ? (
        <form
          onSubmit={handleSubmit}
          className="space-y-2 rounded-xl border border-border bg-card p-3"
        >
          <div className="flex gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.avatar_url} />
              <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="شارك تعليقك أو سؤالك..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              disabled={isSubmitting}
            />
            <button
              type="submit"
              disabled={isSubmitting || !newComment.trim()}
              className="rounded-lg gold-gradient p-2 text-gold-foreground disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </form>
      ) : (
        <p className="text-center text-xs text-muted-foreground">
          سجّل الدخول للمشاركة في النقاش
        </p>
      )}

      <div className="space-y-3">
        {comments.map((comment) => {
          const liked = likeState[comment.id] ?? comment.likedByMe ?? false;
          const displayLikes = comment.likes + (
            (likeState[comment.id] !== undefined && likeState[comment.id] !== (comment.likedByMe ?? false))
              ? (likeState[comment.id] ? 1 : -1)
              : 0
          );
          return (
            <div key={comment.id} className="space-y-2 rounded-xl border border-border bg-card p-3">
              <div className="flex items-start gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={comment.avatar} />
                  <AvatarFallback>{comment.author.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{comment.author}</p>
                    <span className="text-xs text-muted-foreground">{comment.timestamp}</span>
                  </div>
                  <p className="mt-1 text-sm">{comment.content}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void toggleLike(comment.id)}
                disabled={likingId === comment.id}
                className={`flex items-center gap-1 text-xs font-semibold transition-colors ${
                  liked ? "text-gold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {likingId === comment.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <ThumbsUp className={`h-3 w-3 ${liked ? "fill-gold" : ""}`} />
                )}
                {Math.max(0, displayLikes)}
              </button>
            </div>
          );
        })}
      </div>

      {comments.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-background/50 p-6 text-center text-sm text-muted-foreground">
          لا توجد تعليقات حتى الآن. كن أول من يعلّق!
        </div>
      )}
    </div>
  );
}
