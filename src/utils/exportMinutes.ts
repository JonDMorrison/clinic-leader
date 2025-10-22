import jsPDF from "jspdf";

interface MeetingData {
  meetingDate: string;
  teamName: string;
  kpiSnapshot: any[];
  rockCheck: any[];
  headlines: string[];
  decisions: string[];
  todos: any[];
  issues: any[];
}

export const exportMeetingMinutes = (data: MeetingData) => {
  const doc = new jsPDF();
  let yPos = 20;
  const lineHeight = 7;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;

  // Helper to add new page if needed
  const checkPageBreak = (additionalSpace: number = 10) => {
    if (yPos + additionalSpace > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
    }
  };

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Level 10 Meeting Minutes", margin, yPos);
  yPos += lineHeight * 2;

  // Meeting info
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Team: ${data.teamName}`, margin, yPos);
  yPos += lineHeight;
  doc.text(`Date: ${new Date(data.meetingDate).toLocaleDateString()}`, margin, yPos);
  yPos += lineHeight * 2;

  // Scorecard Snapshot
  checkPageBreak(30);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Scorecard Snapshot", margin, yPos);
  yPos += lineHeight * 1.5;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  data.kpiSnapshot.forEach((kpi: any) => {
    checkPageBreak();
    const status = kpi.on_track ? "✓" : "✗";
    doc.text(`${status} ${kpi.name}: ${kpi.actual} (Target: ${kpi.target})`, margin + 5, yPos);
    yPos += lineHeight;
  });
  yPos += lineHeight;

  // Rock Review
  checkPageBreak(30);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Rock Review", margin, yPos);
  yPos += lineHeight * 1.5;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  data.rockCheck.forEach((rock: any) => {
    checkPageBreak();
    doc.text(`• ${rock.title} - ${rock.status} (${rock.confidence}% confident)`, margin + 5, yPos);
    yPos += lineHeight;
  });
  yPos += lineHeight;

  // Headlines
  if (data.headlines.length > 0) {
    checkPageBreak(30);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Headlines", margin, yPos);
    yPos += lineHeight * 1.5;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    data.headlines.forEach((headline: string) => {
      checkPageBreak();
      const lines = doc.splitTextToSize(headline, 170);
      lines.forEach((line: string) => {
        checkPageBreak();
        doc.text(`• ${line}`, margin + 5, yPos);
        yPos += lineHeight;
      });
    });
    yPos += lineHeight;
  }

  // Decisions
  if (data.decisions.length > 0) {
    checkPageBreak(30);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Key Decisions", margin, yPos);
    yPos += lineHeight * 1.5;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    data.decisions.forEach((decision: string) => {
      checkPageBreak();
      const lines = doc.splitTextToSize(decision, 170);
      lines.forEach((line: string) => {
        checkPageBreak();
        doc.text(`• ${line}`, margin + 5, yPos);
        yPos += lineHeight;
      });
    });
    yPos += lineHeight;
  }

  // Action Items (Todos)
  if (data.todos.length > 0) {
    checkPageBreak(30);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Action Items", margin, yPos);
    yPos += lineHeight * 1.5;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    data.todos.forEach((todo: any) => {
      checkPageBreak();
      const owner = todo.owner || "Unassigned";
      const dueDate = todo.due_date ? ` (Due: ${new Date(todo.due_date).toLocaleDateString()})` : "";
      doc.text(`• ${todo.title} - ${owner}${dueDate}`, margin + 5, yPos);
      yPos += lineHeight;
    });
    yPos += lineHeight;
  }

  // Open Issues
  if (data.issues.length > 0) {
    checkPageBreak(30);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Open Issues", margin, yPos);
    yPos += lineHeight * 1.5;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    data.issues.forEach((issue: any, index: number) => {
      checkPageBreak();
      doc.text(`${index + 1}. ${issue.title} (Priority: ${issue.priority})`, margin + 5, yPos);
      yPos += lineHeight;
    });
  }

  // Save
  const fileName = `L10-Minutes-${new Date(data.meetingDate).toISOString().split("T")[0]}.pdf`;
  doc.save(fileName);
};
