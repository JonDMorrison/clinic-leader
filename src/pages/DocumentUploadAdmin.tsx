import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Upload, CheckCircle, AlertTriangle } from "lucide-react";

const NW_CLINICS_ORG_ID = "11111111-1111-1111-1111-111111111111";

interface DocumentToUpload {
  filename: string;
  title: string;
  category: string;
  parsedText: string;
  filePath: string;
}

const documentsToUpload: DocumentToUpload[] = [
  {
    filename: "Authorization_Form_for_Family_Members-SP.docx",
    title: "Authorization Form for Family Members (Spanish)",
    category: "Forms",
    parsedText: `FORMULARIO DE AUTORIZACIÓN DEL PACIENTE - Autorización para divulgar información a los miembros de la familia

Muchos de nuestros pacientes permiten que los miembros de la familia, como su cónyuge, pareja, padres o hijos, llamen y soliciten registros médicos, citas programadas, procedimientos e información financiera. Según los requisitos de H.I.P.A.A., no se nos permite dar esta información a nadie sin el consentimiento del paciente.

Este formulario autoriza a Northwest Injury Clinics a divulgar registros médicos y cualquier información solicitada a personas específicas designadas por el paciente. También incluye autorizaciones para dejar mensajes detallados sobre citas, tratamiento médico y información financiera.`,
    filePath: "user-uploads://Authorization_Form_for_Family_Members-SP.docx"
  },
  {
    filename: "Credit_Card_Authorization_Agreement_Updated-NWIC_1.pdf",
    title: "Credit Card Authorization Agreement",
    category: "Forms",
    parsedText: `Credit Card Authorization Agreement - Northwest Injury Clinics

This agreement authorizes Northwest Injury Clinics to keep a patient's credit card on file for the purpose of paying any unpaid insurance balances. 

Payment Options:
- Option 1: Credit/debit card charged at time of service for the amount in treatment estimate
- Option 2: Credit/debit card charged automatically after insurance claim processing for patient responsibility amount on EOB

The authorization remains in effect for one year from the date signed. Credit card information is entered into a secure payment portal and not stored in paper format.`,
    filePath: "user-uploads://Credit_Card_Authorization_Agreement_Updated-NWIC_1.pdf"
  },
  {
    filename: "DOCTOR_LIEN_NWIC.pdf",
    title: "Doctor's Lien Agreement",
    category: "Legal",
    parsedText: `DOCTOR'S LIEN - Northwest Injury Clinics

This lien authorizes and directs the patient's attorney and/or insurance carrier to pay directly to Northwest Injury Clinics any sums due for services rendered. The patient gives a lien on their case against any proceeds from settlement, judgment, or verdict.

Key Terms:
- Patient authorizes release of records to attorney/insurance carrier
- Payment to be withheld from settlement/judgment to clear account
- Patient remains directly and fully responsible for all bills
- Lien continues even if attorney is substituted
- Patient waives Statute of Limitations regarding clinic's right to recover
- Agreement cannot be rescinded

The attorney/insurance carrier must sign to acknowledge and agree to observe all terms.`,
    filePath: "user-uploads://DOCTOR_LIEN_NWIC.pdf"
  },
  {
    filename: "Initial_MVC_History_Form_basic_1.pdf",
    title: "Initial Motor Vehicle Collision History Form",
    category: "Intake",
    parsedText: `Initial Motor Vehicle Collision History Form - Northwest Injury Clinics

Comprehensive intake form for motor vehicle collision patients including:

General Information:
- Patient demographics (name, DOB, age, gender)
- Date of injury and examination
- Current work status and employment type
- Days missed from work

Past Medical History:
- Temporary/chronic health conditions
- Surgeries, fractures, serious illnesses (with dates and residuals)
- Prior work injuries and MVCs
- Gastrointestinal and genitourinary issues
- Family health history

Accident Details:
- Patient position (driver/passenger)
- Vehicle information and road conditions
- Collision type and impact details
- Seatbelt/headrest usage
- Airbag deployment
- Body position during crash
- Awareness and bracing

The form includes detailed injury assessment sections for head/neck, upper extremities, torso, lower extremities, and neurological symptoms. It tracks pain levels, functional limitations, and treatment history.`,
    filePath: "user-uploads://Initial_MVC_History_Form_basic_1.pdf"
  }
];

const DocumentUploadAdmin = () => {
  const [uploadStatus, setUploadStatus] = useState<Record<string, "pending" | "uploading" | "success" | "error">>({});
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Initialize status
    const status: Record<string, "pending"> = {};
    documentsToUpload.forEach(doc => {
      status[doc.filename] = "pending";
    });
    setUploadStatus(status);
  }, []);

  const uploadDocument = async (doc: DocumentToUpload) => {
    try {
      setUploadStatus(prev => ({ ...prev, [doc.filename]: "uploading" }));

      // Read the file from user-uploads
      const fileResponse = await fetch(doc.filePath);
      const fileBlob = await fileResponse.blob();

      // Upload to storage
      const storagePath = `${NW_CLINICS_ORG_ID}/${doc.filename}`;
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from("documents")
        .upload(storagePath, fileBlob, {
          contentType: fileBlob.type,
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("documents")
        .getPublicUrl(storagePath);

      // Create doc record
      const { error: docError } = await supabase
        .from("docs")
        .insert({
          title: doc.title,
          kind: "SOP" as const,
          status: "published" as const,
          file_url: urlData.publicUrl,
          filename: doc.filename,
          file_type: doc.filename.endsWith('.pdf') ? 'pdf' : 'docx',
          parsed_text: doc.parsedText,
          requires_ack: false,
          organization_id: NW_CLINICS_ORG_ID,
        } as any);

      if (docError) throw docError;

      setUploadStatus(prev => ({ ...prev, [doc.filename]: "success" }));
      return true;
    } catch (error) {
      console.error(`Error uploading ${doc.filename}:`, error);
      setUploadStatus(prev => ({ ...prev, [doc.filename]: "error" }));
      return false;
    }
  };

  const handleUploadAll = async () => {
    setIsUploading(true);
    
    let successCount = 0;
    for (const doc of documentsToUpload) {
      const success = await uploadDocument(doc);
      if (success) successCount++;
    }

    setIsUploading(false);
    
    if (successCount === documentsToUpload.length) {
      toast({
        title: "Upload Complete",
        description: `Successfully uploaded all ${successCount} documents to NW Injury Clinics.`,
      });
    } else {
      toast({
        title: "Upload Partially Complete",
        description: `Uploaded ${successCount} of ${documentsToUpload.length} documents.`,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Document Upload - NW Injury Clinics</h1>
        <p className="text-muted-foreground">Upload and configure documents for Northwest Injury Clinics</p>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Documents Ready for Upload</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {documentsToUpload.map((doc) => (
            <div
              key={doc.filename}
              className="flex items-center justify-between p-4 rounded-lg border"
            >
              <div className="flex-1">
                <p className="font-medium">{doc.title}</p>
                <p className="text-sm text-muted-foreground">
                  {doc.filename} • Category: {doc.category}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {uploadStatus[doc.filename] === "pending" && (
                  <span className="text-sm text-muted-foreground">Pending</span>
                )}
                {uploadStatus[doc.filename] === "uploading" && (
                  <span className="text-sm text-blue-500">Uploading...</span>
                )}
                {uploadStatus[doc.filename] === "success" && (
                  <CheckCircle className="w-5 h-5 text-success" />
                )}
                {uploadStatus[doc.filename] === "error" && (
                  <AlertTriangle className="w-5 h-5 text-danger" />
                )}
              </div>
            </div>
          ))}

          <Button
            onClick={handleUploadAll}
            disabled={isUploading}
            className="w-full"
          >
            <Upload className="w-4 h-4 mr-2" />
            {isUploading ? "Uploading..." : "Upload All Documents"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentUploadAdmin;
