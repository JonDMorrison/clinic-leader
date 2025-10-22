import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FileText } from "lucide-react";

const Docs = () => {
  const documents = [
    { title: "EOS Implementation Guide", category: "Process", updatedAt: "Jan 15, 2025" },
    { title: "Clinic SOPs", category: "Operations", updatedAt: "Jan 10, 2025" },
    { title: "Team Accountability Chart", category: "Organization", updatedAt: "Jan 5, 2025" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Documents</h1>
        <p className="text-muted-foreground">Process documentation and resources</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {documents.map((doc) => (
              <div
                key={doc.title}
                className="flex items-start gap-4 p-4 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <FileText className="w-5 h-5 text-brand mt-1" />
                <div className="flex-1">
                  <h4 className="font-medium text-foreground">{doc.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    {doc.category} • Updated {doc.updatedAt}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Docs;
