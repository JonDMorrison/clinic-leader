import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlaybookCard } from "@/components/playbooks/PlaybookCard";
import { UploadPlaybookModal } from "@/components/playbooks/UploadPlaybookModal";
import { Playbook, PLAYBOOK_CATEGORIES } from "@/types/playbook";
import { Search, Upload, FileText } from "lucide-react";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";

export default function Library() {
  const navigate = useNavigate();
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (userProfile) {
      fetchPlaybooks();
    }
  }, [userProfile, debouncedSearch, categoryFilter]);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setUserProfile(profile);
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    }
  };

  const fetchPlaybooks = async () => {
    if (!userProfile?.team_id) return;

    setLoading(true);
    try {
      let query = supabase
        .from('playbooks')
        .select('*')
        .eq('organization_id', userProfile.team_id)
        .order('updated_at', { ascending: false });

      // Apply search filter
      if (debouncedSearch.trim()) {
        // Use full-text search
        query = query.textSearch('title,description,parsed_text', debouncedSearch.trim(), {
          type: 'websearch',
          config: 'english'
        });
      }

      // Apply category filter
      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPlaybooks(data || []);
    } catch (error: any) {
      console.error('Error fetching playbooks:', error);
      toast.error('Failed to load playbooks');
    } finally {
      setLoading(false);
    }
  };

  const handleView = (id: string) => {
    navigate(`/library/${id}`);
  };

  const handleDownload = async (playbook: Playbook) => {
    if (!playbook.file_url) {
      toast.error('File URL not available');
      return;
    }

    try {
      // Extract the storage path from the public URL
      const urlParts = playbook.file_url.split('/');
      const bucketIndex = urlParts.indexOf('playbooks');
      if (bucketIndex === -1) {
        throw new Error('Invalid file URL');
      }
      const filePath = urlParts.slice(bucketIndex + 1).join('/');

      // Create signed URL (expires in 60 minutes)
      const { data, error } = await supabase.storage
        .from('playbooks')
        .createSignedUrl(filePath, 3600);

      if (error) throw error;

      // Fetch the file bytes and trigger download via blob URL
      const fileRes = await fetch(data.signedUrl);
      if (!fileRes.ok) throw new Error(`Download failed (${fileRes.status})`);
      const blob = await fileRes.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = playbook.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Download started');
    } catch (error: any) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  const handleDelete = async (playbook: Playbook) => {
    if (!confirm('Are you sure you want to delete this playbook? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('playbooks')
        .delete()
        .eq('id', playbook.id);

      if (error) throw error;

      toast.success('Playbook deleted successfully');
      fetchPlaybooks();
    } catch (error) {
      console.error('Error deleting playbook:', error);
      toast.error('Failed to delete playbook');
    }
  };

  const isAdmin = userProfile?.role === 'owner' || userProfile?.role === 'admin';

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold">Playbooks Library</h1>
        {isAdmin && (
          <Button onClick={() => setUploadModalOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Playbook
          </Button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search playbooks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {PLAYBOOK_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : playbooks.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {searchQuery || categoryFilter !== 'all' ? 'No playbooks found' : 'No playbooks yet'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery || categoryFilter !== 'all' 
              ? 'Try adjusting your search or filters' 
              : isAdmin ? 'Upload your first playbook to get started' : 'Playbooks will appear here once uploaded'}
          </p>
          {isAdmin && !searchQuery && categoryFilter === 'all' && (
            <Button onClick={() => setUploadModalOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Upload Playbook
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {playbooks.map((playbook) => (
            <PlaybookCard
              key={playbook.id}
              playbook={playbook}
              onView={handleView}
              onDownload={handleDownload}
              onDelete={handleDelete}
              showDelete={isAdmin}
            />
          ))}
        </div>
      )}

      {isAdmin && (
        <UploadPlaybookModal
          open={uploadModalOpen}
          onOpenChange={setUploadModalOpen}
          onSuccess={fetchPlaybooks}
          organizationId={userProfile?.team_id || ''}
          userId={userProfile?.id || ''}
        />
      )}
    </div>
  );
}
