import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MetricCommentsProps {
  metricId: string;
  organizationId: string;
}

export function MetricComments({ metricId, organizationId }: MetricCommentsProps) {
  const [newComment, setNewComment] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return null;

      const { data } = await supabase
        .from("users")
        .select("id, full_name, email")
        .eq("email", authData.user.email)
        .single();
      
      return data;
    },
  });

  const { data: comments, isLoading } = useQuery({
    queryKey: ["metric-comments", metricId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("metric_comments")
        .select(`
          *,
          users:user_id (
            full_name,
            email
          )
        `)
        .eq("metric_id", metricId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!metricId,
  });

  const addCommentMutation = useMutation({
    mutationFn: async (comment: string) => {
      if (!currentUser) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("metric_comments")
        .insert({
          metric_id: metricId,
          organization_id: organizationId,
          user_id: currentUser.id,
          comment,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metric-comments", metricId] });
      setNewComment("");
      toast({ title: "Comment added" });
    },
    onError: () => {
      toast({ title: "Failed to add comment", variant: "destructive" });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from("metric_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metric-comments", metricId] });
      toast({ title: "Comment deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete comment", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    addCommentMutation.mutate(newComment);
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading comments...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Add Comment Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <Textarea
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="min-h-[80px]"
        />
        <Button
          type="submit"
          disabled={!newComment.trim() || addCommentMutation.isPending}
          className="w-full"
        >
          <Send className="w-4 h-4 mr-2" />
          Post Comment
        </Button>
      </form>

      {/* Comments List */}
      <div className="space-y-3">
        {comments && comments.length > 0 ? (
          comments.map((comment: any) => (
            <div key={comment.id} className="glass rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <UserAvatar 
                    user={{ full_name: comment.users?.full_name, avatar_url: comment.users?.avatar_url }} 
                    size="sm"
                  />
                  <div>
                    <p className="font-medium text-sm">
                      {comment.users?.full_name || comment.users?.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                {currentUser?.id === comment.user_id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteCommentMutation.mutate(comment.id)}
                    disabled={deleteCommentMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <p className="text-sm pl-11">{comment.comment}</p>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No comments yet. Be the first to comment!</p>
          </div>
        )}
      </div>
    </div>
  );
}
