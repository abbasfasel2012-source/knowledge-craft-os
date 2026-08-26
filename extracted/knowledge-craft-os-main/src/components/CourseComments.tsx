import { useState } from "react";
import { MessageCircle, ThumbsUp, Send } from "lucide-react";
import { useSession } from "@/lib/session";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface Comment {
  id: string;
  author: string;
  avatar?: string;
  content: string;
  timestamp: string;
  likes: number;
  replies?: Comment[];
}

interface CourseCommentsProps {
  courseId: string;
  comments?: Comment[];
  onComment?: (content: string) => void;
}

export function CourseComments({ courseId: _courseId, comments = [], onComment }: CourseCommentsProps) {
  const { user } = useSession();
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    setIsSubmitting(true);
    try {
      if (onComment) {
        onComment(newComment);
      }
      setNewComment("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleLike = (commentId: string) => {
    const newLiked = new Set(likedComments);
    if (newLiked.has(commentId)) {
      newLiked.delete(commentId);
    } else {
      newLiked.add(commentId);
    }
    setLikedComments(newLiked);
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

      {/* Comment Form */}
      {user && (
        <form onSubmit={handleSubmit} className="space-y-2 rounded-xl border border-border bg-card p-3">
          <div className="flex gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.avatar_url} />
              <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="شارك تعليقك..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              disabled={isSubmitting || !newComment.trim()}
              className="rounded-lg gold-gradient p-2 text-gold-foreground disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      )}

      {/* Comments List */}
      <div className="space-y-3">
        {comments.map((comment) => (
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
                <p className="mt-1 text-sm text-foreground">{comment.content}</p>
              </div>
            </div>
            <button
              onClick={() => toggleLike(comment.id)}
              className={`flex items-center gap-1 text-xs font-semibold transition-colors ${
                likedComments.has(comment.id)
                  ? "text-gold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ThumbsUp className="h-3 w-3" />
              {comment.likes + (likedComments.has(comment.id) ? 1 : 0)}
            </button>
          </div>
        ))}
      </div>

      {comments.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-background/50 p-6 text-center text-sm text-muted-foreground">
          لا توجد تعليقات حتى الآن. كن أول من يعلّق!
        </div>
      )}
    </div>
  );
}
