import { useState } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface GWCAssessmentFormProps {
  userId: string;
  assessedBy: string;
  assessmentType: "manager" | "self" | "peer";
  existingAssessment?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormData {
  gets_it_rating: "+" | "±" | "-" | null;
  gets_it_notes: string;
  wants_it_rating: "+" | "±" | "-" | null;
  wants_it_notes: string;
  capacity_rating: "+" | "±" | "-" | null;
  capacity_notes: string;
  overall_notes: string;
  action_items: string;
}

export function GWCAssessmentForm({
  userId,
  assessedBy,
  assessmentType,
  existingAssessment,
  onSuccess,
  onCancel,
}: GWCAssessmentFormProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: existingAssessment || {
      gets_it_rating: null,
      gets_it_notes: "",
      wants_it_rating: null,
      wants_it_notes: "",
      capacity_rating: null,
      capacity_notes: "",
      overall_notes: "",
      action_items: "",
    },
  });

  const getsItRating = watch("gets_it_rating");
  const wantsItRating = watch("wants_it_rating");
  const capacityRating = watch("capacity_rating");

  const getCurrentQuarter = () => {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3) + 1;
    return `Q${quarter} ${now.getFullYear()}`;
  };

  const getNextReviewDate = () => {
    const now = new Date();
    const nextReview = new Date(now);
    nextReview.setDate(nextReview.getDate() + 90);
    return nextReview.toISOString().split('T')[0];
  };

  const onSubmit = async (data: FormData) => {
    setIsSaving(true);
    try {
      const assessmentData = {
        user_id: userId,
        assessed_by: assessedBy,
        assessment_type: assessmentType,
        quarter: getCurrentQuarter(),
        ...data,
        next_review_date: getNextReviewDate(),
        status: "completed" as const,
      };

      if (existingAssessment?.id) {
        const { error } = await supabase
          .from("gwc_assessments")
          .update(assessmentData)
          .eq("id", existingAssessment.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("gwc_assessments")
          .insert(assessmentData);

        if (error) throw error;
      }

      toast({
        title: "Assessment saved",
        description: "GWC assessment has been saved successfully.",
      });
      onSuccess();
    } catch (error) {
      console.error("Error saving assessment:", error);
      toast({
        title: "Error",
        description: "Failed to save assessment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const saveDraft = async () => {
    setIsSaving(true);
    try {
      const data = watch();
      const draftData = {
        user_id: userId,
        assessed_by: assessedBy,
        assessment_type: assessmentType,
        quarter: getCurrentQuarter(),
        ...data,
        status: "draft" as const,
      };

      if (existingAssessment?.id) {
        const { error } = await supabase
          .from("gwc_assessments")
          .update(draftData)
          .eq("id", existingAssessment.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("gwc_assessments")
          .insert(draftData);

        if (error) throw error;
      }

      toast({
        title: "Draft saved",
        description: "Assessment draft has been saved.",
      });
      onSuccess();
    } catch (error) {
      console.error("Error saving draft:", error);
      toast({
        title: "Error",
        description: "Failed to save draft. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const RatingSelector = ({ 
    value, 
    onChange, 
    name 
  }: { 
    value: string | null; 
    onChange: (val: any) => void;
    name: string;
  }) => (
    <RadioGroup value={value || ""} onValueChange={onChange}>
      <div className="flex gap-6">
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="+" id={`${name}-plus`} />
          <Label htmlFor={`${name}-plus`} className="cursor-pointer font-medium text-green-600">
            + (Strength)
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="±" id={`${name}-plusminus`} />
          <Label htmlFor={`${name}-plusminus`} className="cursor-pointer font-medium text-amber-600">
            ± (Growing)
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="-" id={`${name}-minus`} />
          <Label htmlFor={`${name}-minus`} className="cursor-pointer font-medium text-red-600">
            - (Issue)
          </Label>
        </div>
      </div>
    </RadioGroup>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gets It</CardTitle>
          <CardDescription>
            Does this person deeply understand their role, the organization's vision, and how their work fits into the bigger picture?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-3 block">Rating</Label>
            <RatingSelector
              value={getsItRating}
              onChange={(val) => setValue("gets_it_rating", val as any)}
              name="gets_it"
            />
          </div>
          <div>
            <Label htmlFor="gets_it_notes">Notes & Examples</Label>
            <Textarea
              id="gets_it_notes"
              {...register("gets_it_notes")}
              placeholder="Provide specific examples demonstrating their understanding..."
              className="mt-2 min-h-[100px]"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Wants It</CardTitle>
          <CardDescription>
            Is this person passionate about their role? Do they have the desire, energy, and drive to excel?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-3 block">Rating</Label>
            <RatingSelector
              value={wantsItRating}
              onChange={(val) => setValue("wants_it_rating", val as any)}
              name="wants_it"
            />
          </div>
          <div>
            <Label htmlFor="wants_it_notes">Notes & Examples</Label>
            <Textarea
              id="wants_it_notes"
              {...register("wants_it_notes")}
              placeholder="Describe their enthusiasm, initiative, and commitment..."
              className="mt-2 min-h-[100px]"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Capacity to Do It</CardTitle>
          <CardDescription>
            Does this person have the time, capability, and resources to consistently execute at a high level?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-3 block">Rating</Label>
            <RatingSelector
              value={capacityRating}
              onChange={(val) => setValue("capacity_rating", val as any)}
              name="capacity"
            />
          </div>
          <div>
            <Label htmlFor="capacity_notes">Notes & Examples</Label>
            <Textarea
              id="capacity_notes"
              {...register("capacity_notes")}
              placeholder="Document their performance, workload, and ability to deliver..."
              className="mt-2 min-h-[100px]"
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Overall Assessment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="overall_notes">Overall Notes</Label>
            <Textarea
              id="overall_notes"
              {...register("overall_notes")}
              placeholder="Summary of the conversation and key takeaways..."
              className="mt-2 min-h-[100px]"
            />
          </div>
          <div>
            <Label htmlFor="action_items">Action Items</Label>
            <Textarea
              id="action_items"
              {...register("action_items")}
              placeholder="Specific commitments and next steps..."
              className="mt-2 min-h-[100px]"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="button" variant="secondary" onClick={saveDraft} disabled={isSaving}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save Draft
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Complete Assessment
        </Button>
      </div>
    </form>
  );
}
