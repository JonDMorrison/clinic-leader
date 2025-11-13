export function SummaryStep() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Review your vision and save when ready. You can always come back to edit.
      </p>
      <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
        <p className="text-sm">
          🎉 <strong>Great work!</strong> Your vision is taking shape. 
          Click Save to lock it in, then move to Traction to set your goals.
        </p>
      </div>
    </div>
  );
}
