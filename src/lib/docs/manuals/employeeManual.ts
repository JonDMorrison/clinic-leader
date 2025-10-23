export interface ManualSection {
  heading: string;
  summary: string;
  items: Array<{
    title: string;
    body: string;
  }>;
}

export interface EmployeeManual {
  title: string;
  slug: string;
  tags: string[];
  sections: ManualSection[];
}

export const EMPLOYEE_MANUAL: EmployeeManual = {
  title: "Employee Manual",
  slug: "employee-manual",
  tags: ["SOP", "HR", "Training", "Front Desk", "L&I", "Operations"],
  sections: [
    {
      heading: "1. Phone & Appointment Protocols",
      summary: "Covers call etiquette, scheduling standards, and recall systems.",
      items: [
        { 
          title: "Answering Phone Calls", 
          body: "Always greet, confirm name, relation to patient, and DOB. If cancelling, ask to reschedule and set a task." 
        },
        { 
          title: "Appointments", 
          body: "Schedule 2–3x/week, 2–3 weeks out. Never let a patient leave unscheduled. Confirm late arrivals within 10 min. Walk-ins always welcome." 
        },
        { 
          title: "Color Coding", 
          body: "Use correct appointment type/language for color consistency. RED = New Patients, BLUE = Follow-ups, PURPLE = Massage, etc." 
        },
        { 
          title: "Recalls & Tasks", 
          body: "Set recalls for all active patients. Review daily. Use 'Staff Follow Up' for pending items (no patient reminder)." 
        }
      ]
    },
    {
      heading: "2. Scheduling & Claims",
      summary: "Guidelines for scheduling under L&I, Self-insured, or MVA claims.",
      items: [
        { 
          title: "Scheduling Questions", 
          body: "Ask about injury type, claim #, employer, DOI, and if attorney involved. Verify claim status before scheduling." 
        },
        { 
          title: "Older or Out-of-State Claims", 
          body: "Verify open status; contact attorney/claim manager before scheduling. Use discretion for older claims." 
        },
        { 
          title: "Insurance Rules", 
          body: "Blue Cross, Cigna, Premera, Lifewise = in-network. Aetna, Kaiser, UHC = out. Medicare primary unless patient employed." 
        },
        { 
          title: "Auto Closures", 
          body: "Call claim manager to remove closure if patient is still in treatment. Never cancel scheduled visits until resolved." 
        }
      ]
    },
    {
      heading: "3. Billing, Liens & Cash",
      summary: "Procedures for collecting, verifying, and documenting payments.",
      items: [
        { 
          title: "Cash Needs Attorney", 
          body: "Flag any MVA with missing PIP info or unsigned lien. Notify provider immediately." 
        },
        { 
          title: "Liens", 
          body: "Get signed lien, fax to attorney, and scan to chart. Only legal guardian signs if patient <16." 
        },
        { 
          title: "Balances", 
          body: "Collect $25–$50 copay. If patient refuses, alert billing. Document every interaction." 
        },
        { 
          title: "Availity Checks", 
          body: "Verify benefits online, print form, scan to chart, and record copay/visits remaining." 
        }
      ]
    },
    {
      heading: "4. Front Desk & Daily Operations",
      summary: "Covers prep, open/close routines, and professionalism.",
      items: [
        { 
          title: "Opening Duties", 
          body: "Disarm alarm, turn on lights, check voicemails, log into all systems (AdvMD, ZingIt, Teams, etc.)." 
        },
        { 
          title: "Closing Duties", 
          body: "Cross-check sign-ins, clean lobby, sanitize, lock up, arm alarm, print trial balance and receipts." 
        },
        { 
          title: "Prepping Patients", 
          body: "Print next day's schedule, confirm intakes, highlight balances, prep claims for follow-up." 
        },
        { 
          title: "Professionalism", 
          body: "Dress appropriately, no food at front desk, phones away, handle patient interactions professionally." 
        }
      ]
    },
    {
      heading: "5. Authorizations, Referrals & Imaging",
      summary: "Procedures for approvals and documentation.",
      items: [
        { 
          title: "Authorizations", 
          body: "Always request and attach recent chart notes. CM has final approval. Track massage/chiro visit counts." 
        },
        { 
          title: "Referrals", 
          body: "Outbound: attach cover, demo, auth, chart notes, imaging. Inbound: use AdvMD referral entry for visit tracking." 
        },
        { 
          title: "Imaging", 
          body: "L&I and self-insured need no pre-auth for X-rays. MRI/CT require Qualis/Comagine requests." 
        },
        { 
          title: "Comagine", 
          body: "Attach supporting documentation. Record reference # and body part for tracking." 
        }
      ]
    },
    {
      heading: "6. Claims & Documentation",
      summary: "Guidelines for handling notes, faxes, and legal docs.",
      items: [
        { 
          title: "Notes", 
          body: "Document every patient interaction. Include who, what, and why. Never edit others' notes." 
        },
        { 
          title: "Faxing", 
          body: "Use AdvMD fax for automatic cover letters. Include claim #, patient name, and provider." 
        },
        { 
          title: "Chart Files", 
          body: "Scan and label clearly (IME Report, MRI, PT Note, etc.). Use EHR for provider-critical items only." 
        }
      ]
    },
    {
      heading: "7. L&I & Time-Loss",
      summary: "Procedures for reopening claims and following up.",
      items: [
        { 
          title: "Reopening", 
          body: "Collect closure reason/date, previous providers, fax reopening app with APF + chart notes." 
        },
        { 
          title: "LNI Hotline", 
          body: "Use 360-902-5799 or PHL@LNI.WA.GOV to check claim status. Follow up on undetermined claims ASAP." 
        },
        { 
          title: "Job Analysis & IME", 
          body: "Track completion, send chat to lead, notify patient of IME schedule and copy letter." 
        }
      ]
    },
    {
      heading: "8. Miscellaneous Policies",
      summary: "Covers emergencies, cleaning, supplies, and chain of command.",
      items: [
        { 
          title: "Cleaning", 
          body: "Sanitize daily; stock paper towels, wipes, coffee supplies. Notify office manager of shortages." 
        },
        { 
          title: "Supplies", 
          body: "Email office manager weekly for restocks (K-cups, pens, etc.)." 
        },
        { 
          title: "Chain of Command", 
          body: "Report issues to lead → office manager. Maintain professional tone." 
        }
      ]
    }
  ]
};

export function searchManual(query: string): Array<{
  section: string;
  title: string;
  body: string;
  relevance: number;
}> {
  const results: Array<{ section: string; title: string; body: string; relevance: number }> = [];
  const searchTerms = query.toLowerCase().split(/\s+/);

  EMPLOYEE_MANUAL.sections.forEach((section) => {
    section.items.forEach((item) => {
      let relevance = 0;
      const searchText = `${section.heading} ${item.title} ${item.body}`.toLowerCase();

      searchTerms.forEach((term) => {
        if (searchText.includes(term)) {
          relevance += 1;
          // Boost relevance for title matches
          if (item.title.toLowerCase().includes(term)) {
            relevance += 2;
          }
          // Boost for section heading matches
          if (section.heading.toLowerCase().includes(term)) {
            relevance += 1.5;
          }
        }
      });

      if (relevance > 0) {
        results.push({
          section: section.heading,
          title: item.title,
          body: item.body,
          relevance
        });
      }
    });
  });

  return results.sort((a, b) => b.relevance - a.relevance);
}
