export const SYSTEM_HANDBOOK = {
  title: "ClinicLeader System Training Guide",
  version: "1.0",
  lastUpdated: "2025-10-23",
  sections: [
    {
      id: "getting-started",
      title: "Getting Started",
      order: 1,
      content: [
        {
          heading: "Welcome to ClinicLeader",
          body: `This system helps your clinic run the Entrepreneurial Operating System (EOS) framework. Whether you're managing patients, tracking performance, or running meetings, this guide will help you master the platform.

**What is EOS?**
EOS is a complete system for helping organizations clarify their vision, gain traction, and achieve health. Our platform brings EOS principles to healthcare clinics.

**Your Dashboard**
Your home dashboard shows key metrics, recent activity, and weekly highlights. It's your command center for staying on top of your responsibilities.`
        },
        {
          heading: "First Login Checklist",
          body: `☑️ Complete your profile (Settings > User Profile)
☑️ Review your team structure (People page)
☑️ Familiarize yourself with your role's features
☑️ Join your first L10 meeting
☑️ Read this handbook!`
        },
        {
          heading: "Navigation Overview",
          body: `**Home** - Your dashboard with key metrics
**Scorecard** - Track weekly KPIs (Key Performance Indicators)
**Rocks** - Quarterly priorities and goals
**Issues** - Problems that need solving (IDS process)
**L10** - Weekly leadership meetings
**Docs** - Policies, procedures, and training materials
**Recalls** - Patient recall management (clinical staff)
**People** - Team structure and accountability
**Reports** - Performance summaries and analytics`
        }
      ]
    },
    {
      id: "role-front-desk",
      title: "Front Desk Staff Guide",
      order: 2,
      roles: ["staff"],
      content: [
        {
          heading: "Your Daily Workflow",
          body: `As front desk staff, you'll primarily use:

**1. Recalls Page** - Your main tool for patient outreach
- Review open recalls each morning
- Update status as you contact patients
- Add notes about conversations
- Track completion metrics

**2. Issues Page** - Report problems you encounter
- Click "New Issue" to report a problem
- Provide context and priority
- Management will review and assign

**3. Docs Page** - Reference SOPs and policies
- Employee manual
- Front desk procedures
- Patient communication scripts`
        },
        {
          heading: "Managing Recalls",
          body: `**Daily Recall Process:**
1. Open the Recalls page each morning
2. Filter by "Due Today" or "Past Due"
3. Call patients using clinic scripts
4. Update recall status:
   - Scheduled: Patient booked appointment
   - Contacted: Left message, send again
   - Declined: Patient not interested
   - Invalid: Wrong number/moved

**Best Practices:**
- Make calls during morning hours (9-11am)
- Document every contact attempt
- Be friendly and patient-focused
- Never skip past due recalls`
        },
        {
          heading: "Creating Issues",
          body: `When something goes wrong or needs attention:

**Good Issue Examples:**
- "Phone system dropped 3 calls this morning"
- "Low on patient forms - need reorder"
- "Schedule double-booked for Dr. Smith"

**What to Include:**
- Clear title describing the problem
- Context: When did it happen? Who's affected?
- Priority: Is it urgent or can it wait?

**What NOT to Report:**
- Personal complaints (talk to manager)
- Routine tasks (use your checklist)
- Already-known issues (check the board first)`
        }
      ]
    },
    {
      id: "role-provider",
      title: "Provider Guide",
      order: 3,
      roles: ["staff", "manager"],
      content: [
        {
          heading: "Provider Responsibilities",
          body: `As a healthcare provider, you'll focus on:

**Scorecard** - Review your clinical metrics weekly
- Patient volume
- Treatment acceptance rates
- Production per visit
- No-show percentages

**L10 Meetings** - Participate in weekly team meetings
- Report on your scorecard numbers
- Raise clinical issues
- Provide input on rocks (priorities)

**People** - Understand team accountability
- Review your seat on the org chart
- Know your key responsibilities
- Stay aligned on core values`
        },
        {
          heading: "Understanding Your Scorecard",
          body: `**What are KPIs?**
Key Performance Indicators are the 5-15 most important numbers that track your clinic's health. As a provider, you own several:

**Your KPIs Might Include:**
- New patients seen per week
- Treatment plans presented
- Treatment plans accepted
- Production amount
- Collection percentage

**Weekly Review:**
Every Monday, check your numbers from last week. If any are off-track (red), be prepared to discuss in the L10 meeting.

**Target vs. Actual:**
Green = Met or exceeded target
Red = Below target (needs attention)`
        },
        {
          heading: "Participating in L10 Meetings",
          body: `**Meeting Structure (90 minutes):**
1. Segue (5 min) - Good news sharing
2. Scorecard Review (5 min) - Quick number check
3. Rock Review (5 min) - Quarterly priority updates
4. Customer/Employee Headlines (5 min) - Quick updates
5. To-Do List (5 min) - Review action items
6. IDS (60 min) - Solve most important issues
7. Conclude (5 min) - Recap and rate meeting

**Your Role:**
- Report your scorecard numbers honestly
- Add issues to the list when they arise
- Participate actively in IDS discussions
- Complete your to-dos by next week`
        }
      ]
    },
    {
      id: "role-manager",
      title: "Manager Guide",
      order: 4,
      roles: ["manager"],
      content: [
        {
          heading: "Manager Responsibilities",
          body: `As a manager, you're responsible for:

**Scorecard Management**
- Adding and editing KPIs
- Assigning owners to metrics
- Entering weekly data
- Analyzing trends

**Rock Management**
- Setting quarterly priorities
- Assigning rock owners
- Tracking progress
- Ensuring completion

**Issue Management**
- Reviewing new issues
- Prioritizing problems
- Facilitating IDS discussions
- Converting issues to action items

**L10 Facilitation**
- Running weekly meetings
- Managing the agenda
- Keeping discussions on track
- Following up on to-dos`
        },
        {
          heading: "Building Your Scorecard",
          body: `**Step 1: Identify Key Numbers**
Choose 5-15 metrics that predict success:
- Patient volume indicators
- Financial metrics
- Quality measures
- Operational efficiency

**Step 2: Set Realistic Targets**
- Based on historical data
- Challenging but achievable
- Reviewed quarterly

**Step 3: Assign Clear Owners**
- One person owns each metric
- They're responsible for the number
- They report weekly in L10

**Step 4: Review Weekly**
- Update every Monday
- Identify trends (3+ weeks off track)
- Discuss reds in L10 meeting`
        },
        {
          heading: "Setting Effective Rocks",
          body: `**What is a Rock?**
A rock is a 90-day priority. It's the most important thing you must accomplish this quarter.

**Good Rock Characteristics (SMART):**
- **S**pecific: Clear and well-defined
- **M**easurable: You know when it's done
- **A**ttainable: Challenging but possible
- **R**elevant: Moves the company forward
- **T**ime-bound: Due in 90 days

**Examples:**
✅ "Implement new patient scheduling system by Dec 31"
✅ "Hire and onboard 2 hygienists by Q1 end"
❌ "Improve patient satisfaction" (too vague)
❌ "Try to increase revenue" (not measurable)

**Quarterly Rock Process:**
1. Leadership identifies 3-7 company rocks
2. Each person gets 1-3 individual rocks
3. Weekly check-ins in L10 (on track/off track)
4. End-of-quarter review and celebration`
        },
        {
          heading: "Mastering IDS (Identify, Discuss, Solve)",
          body: `**The IDS Process:**
IDS is how you solve issues in L10 meetings. It's the most valuable 60 minutes of your week.

**Step 1: IDENTIFY**
- What is the real issue?
- Often the stated problem isn't the root cause
- Dig deeper: "What's really going on?"

**Step 2: DISCUSS**
- Everyone shares their perspective
- No judgment, just facts and opinions
- Facilitator keeps discussion focused
- Goal: Get all relevant info on the table

**Step 3: SOLVE**
- Agree on a solution
- Create specific action items (to-dos)
- Assign owners and due dates
- Move on to next issue

**IDS Best Practices:**
- Tackle issues in priority order
- Don't jump to solutions too quickly
- Get to root cause before solving
- Create action items, not just ideas
- One issue at a time (no multitasking)`
        }
      ]
    },
    {
      id: "role-director",
      title: "Director/Owner Guide",
      order: 5,
      roles: ["director", "owner"],
      content: [
        {
          heading: "Director Responsibilities",
          body: `As a director or owner, you set the vision:

**Strategic Planning**
- Define company vision and goals
- Set quarterly rocks
- Review organizational health
- Make key hiring/firing decisions

**System Administration**
- Manage user accounts and permissions
- Configure branding and settings
- Import data and connect integrations
- Review AI usage and analytics

**Leadership Development**
- Coach managers on EOS processes
- Ensure L10 meetings run effectively
- Hold team accountable to rocks
- Celebrate wins and address challenges

**Financial Oversight**
- Review reports and analytics
- Monitor key financial metrics
- Approve major expenditures
- Plan for growth`
        },
        {
          heading: "AI Assistant Features",
          body: `**AI Copilot**
Your AI assistant can help with:
- Generating meeting agendas
- Creating insights from data
- Suggesting improvements
- Answering questions about your clinic

**AI Settings**
Configure AI behavior:
- Enable/disable features
- Set usage limits
- Review AI logs
- Provide feedback on AI suggestions

**AI Log**
Track all AI interactions:
- What questions were asked
- What recommendations were made
- System performance
- Usage trends

**Best Practices:**
- Review AI suggestions before implementing
- Provide feedback to improve accuracy
- Monitor usage to stay within budget
- Train staff on AI capabilities`
        },
        {
          heading: "Reports and Analytics",
          body: `**Weekly Reports**
Automated summaries include:
- Scorecard performance
- Rock progress
- Issues resolved
- Key highlights

**Custom Reports**
Generate reports for:
- Board meetings
- Quarterly reviews
- Department performance
- Financial analysis

**Using Reports:**
1. Review report before L10 meeting
2. Identify trends and patterns
3. Prepare questions for team
4. Share insights with leadership
5. Archive for historical reference

**Export Options:**
- PDF for printing/sharing
- CSV for data analysis
- Email scheduled reports`
        }
      ]
    },
    {
      id: "feature-recalls",
      title: "Recalls Management Deep Dive",
      order: 6,
      content: [
        {
          heading: "Understanding Recalls",
          body: `**What are Recalls?**
Recalls are patients who need to return for continuing care. Effective recall management ensures patients stay on track with their health.

**Recall Types:**
- Hygiene cleanings (6-month)
- Perio maintenance (3-4 month)
- Treatment follow-ups
- Incomplete treatment plans

**Why Recalls Matter:**
- Patient health outcomes
- Practice revenue (30-40% typically)
- Patient retention
- Practice growth`
        },
        {
          heading: "Recall Workflow",
          body: `**Step 1: Import or Create**
Recalls enter the system via:
- Data imports from practice management
- Manual creation by staff
- Automatic rules from appointments

**Step 2: Prioritize**
View recalls by:
- Due date (past due, today, upcoming)
- Recall type
- Patient status

**Step 3: Contact**
- Call using clinic scripts
- Text message campaigns
- Email reminders

**Step 4: Update Status**
- Scheduled: Patient booked
- Contacted: Message left
- Declined: Not interested
- Invalid: Bad contact info

**Step 5: Track Metrics**
Monitor:
- Recall rate (% scheduled)
- Contact attempts
- Revenue from recalls
- Backlog size`
        },
        {
          heading: "Recall Best Practices",
          body: `**Daily Habits:**
- Review past due recalls first thing
- Make calls between 9am-11am and 2pm-4pm
- Document every contact attempt
- Update status immediately

**Scripts and Templates:**
- Use approved communication scripts
- Personalize messages when possible
- Include value proposition
- Make scheduling easy

**Handling Objections:**
- "I'm too busy" → Offer evening/weekend times
- "Too expensive" → Discuss payment plans
- "I feel fine" → Educate on preventive care
- "I'll call back" → Schedule callback date

**Measuring Success:**
- Target: 80%+ recall rate
- Track monthly trends
- Celebrate team wins
- Address declining performance`
        }
      ]
    },
    {
      id: "feature-scorecard",
      title: "Scorecard Deep Dive",
      order: 7,
      content: [
        {
          heading: "Building a Predictive Scorecard",
          body: `**Philosophy:**
Your scorecard should predict success, not just report history. Choose metrics that are:
- **Measurable** - Objective numbers, not opinions
- **Actionable** - You can influence the outcome
- **Predictive** - Leading indicators of success
- **Simple** - Easy to track and understand

**Common Mistakes:**
❌ Too many metrics (>15)
❌ Lagging indicators only (revenue, profit)
❌ Metrics no one owns
❌ Targets that never change
❌ Numbers tracked inconsistently`
        },
        {
          heading: "Sample Clinic Scorecard",
          body: `**Patient Volume (Weekly)**
- New patients scheduled
- New patients seen
- Active patients
- Patient no-show rate

**Clinical Metrics (Weekly)**
- Production per provider
- Collection percentage
- Treatment acceptance rate
- Same-day treatment rate

**Operational Metrics (Weekly)**
- Staff utilization rate
- Schedule fill rate
- Average wait time
- Patient satisfaction score

**Financial Metrics (Weekly)**
- Hygiene production
- Doctor production
- Accounts receivable days
- Overhead percentage`
        },
        {
          heading: "Using Your Scorecard",
          body: `**Weekly Review Process:**
1. Update all numbers by Monday morning
2. Review in L10 meeting (5 minutes)
3. Identify reds (off-track metrics)
4. Drop down to Issues list for discussion
5. Don't solve in scorecard review!

**Identifying Trends:**
- **One red** = Blip, watch it
- **Two reds in a row** = Potential issue
- **Three+ reds** = Definitely an issue, drop down to IDS

**Taking Action:**
When metrics go red:
1. Identify as an issue
2. Prioritize for IDS discussion
3. Get to root cause
4. Create action items
5. Track to-dos until resolved

**Quarterly Review:**
Every 90 days:
- Evaluate if metrics are still relevant
- Adjust targets based on performance
- Add new metrics if needed
- Remove metrics that aren't valuable`
        }
      ]
    },
    {
      id: "feature-rocks",
      title: "Rocks Deep Dive",
      order: 8,
      content: [
        {
          heading: "The 90-Day World",
          body: `**Why 90 Days?**
Rocks are quarterly priorities because:
- Long enough to accomplish something significant
- Short enough to maintain urgency
- Matches business planning cycles
- Creates predictable rhythm

**Company vs. Individual Rocks:**
- **Company Rocks** (3-7): Big priorities for the organization
- **Individual Rocks** (1-3): Personal priorities that support company rocks

**The Rock Process:**
1. **Quarter Planning** (Week before Q starts)
   - Review last quarter's rocks
   - Identify next quarter's priorities
   - Assign owners
   - Set clear success criteria

2. **Weekly Check-In** (L10 meetings)
   - On track or off track? (No yellow!)
   - Discuss major obstacles
   - Create to-dos to support progress

3. **Quarter End** (Last week of Q)
   - Mark complete or incomplete
   - Celebrate successes
   - Learn from failures
   - Roll forward if needed`
        },
        {
          heading: "Writing Great Rocks",
          body: `**The SMART Framework:**

**Specific:**
❌ "Improve patient experience"
✅ "Implement new check-in kiosk at front desk"

**Measurable:**
❌ "Get better at scheduling"
✅ "Achieve 90% schedule fill rate for next quarter"

**Attainable:**
❌ "Triple production" (probably impossible)
✅ "Increase production by 15% through treatment acceptance coaching"

**Relevant:**
❌ "Learn Spanish" (nice but not business-critical)
✅ "Hire bilingual front desk staff to serve Spanish-speaking patients"

**Time-Bound:**
✅ All rocks are due end of quarter (90 days)

**Additional Tips:**
- Start with a verb (Implement, Hire, Achieve, Complete)
- Include success criteria
- Avoid tasks (those are to-dos)
- One rock shouldn't depend on another
- Be honest about "on track" vs "off track"`
        },
        {
          heading: "Common Rock Challenges",
          body: `**"I have too many rocks"**
Solution: Choose only 1-3 personal rocks. If everything is a priority, nothing is.

**"My rock depends on someone else"**
Solution: Break it down. What part can you own? Make that your rock.

**"I'm off track"**
Solution: Drop to Issues list in L10. Discuss what's blocking you. Get help.

**"My rock is done early"**
Solution: Great! Complete it and celebrate. Don't add a new one mid-quarter.

**"My rock is impossible to finish"**
Solution: Mark off-track. Learn why. Was it too big? Poor planning? Outside factors?

**"My rock rolled 2 quarters in a row"**
Solution: It's not really a priority. Drop it or finally commit resources.

**Leadership Tips:**
- Model good rock behavior
- Hold people accountable weekly
- Celebrate completions publicly
- Don't accept "yellow" (on/off only)
- Average 80%+ completion is healthy`
        }
      ]
    },
    {
      id: "feature-l10",
      title: "L10 Meetings Deep Dive",
      order: 9,
      content: [
        {
          heading: "The L10 Framework",
          body: `**What is a Level 10 Meeting?**
A weekly 90-minute meeting designed to keep leadership teams aligned, solve important issues, and drive the business forward. Called "Level 10" because the goal is to rate every meeting a 10 out of 10.

**Meeting Prerequisites:**
- Same day, same time every week
- Same attendees (leadership team)
- All participants on time
- No phones/distractions
- Pre-work completed (scorecard updated)

**Meeting Rules:**
- Start on time, end on time
- One conversation at a time
- No tangents or rabbit holes
- Disagree and commit
- What's said in the room stays in the room`
        },
        {
          heading: "The L10 Agenda (90 Minutes)",
          body: `**1. Segue (5 min)**
- Good news: personal and professional
- Builds rapport and energy
- Everyone shares briefly
- No discussion, just sharing

**2. Scorecard Review (5 min)**
- Quick review of all metrics
- Red/green only (no yellow)
- Note trends (3+ reds)
- Drop issues to Issues List
- NO SOLVING HERE!

**3. Rock Review (5 min)**
- Each person reports on/off track
- No explanations needed if on track
- If off track, drop to Issues
- Update rock status
- Move forward

**4. Customer/Employee Headlines (5 min)**
- Client feedback
- Employee updates
- Market news
- Quick FYI items
- Drop issues to list if needed

**5. To-Do List Review (5 min)**
- Review last week's action items
- Done or not done (no yellow)
- Accountability check
- Drop to Issues if cascading
- Archive completed items

**6. IDS - Issue Solving (60 min)**
- THE MOST IMPORTANT HOUR
- Tackle top 1-3 issues
- Use IDS process for each
- Create new to-dos
- Get to root cause

**7. Conclude (5 min)**
- Recap to-dos and owners
- Confirm next week's meeting
- Cascade messages to teams
- Rate the meeting (goal: 10)
- Identify meeting improvements`
        },
        {
          heading: "Facilitating Great L10s",
          body: `**Role of the Facilitator:**
- Keep meeting on time
- Prevent tangents
- Ensure everyone participates
- Protect the process
- Keep energy high

**Time Management:**
- Use a timer
- Give 1-minute warnings
- Cut discussions that belong in IDS
- Speed up if ahead, slow down if behind
- End on time no matter what

**Handling Challenges:**

**Someone dominates discussion:**
→ "Thanks John. Mary, what's your perspective?"

**Discussion goes off-track:**
→ "That's important. Let's add it to Issues and stay focused on [current topic]."

**Someone is consistently late:**
→ "We start on time. Let's discuss this as an issue."

**Team wants to solve in Scorecard/Rock Review:**
→ "Great catch. Let's add this to Issues and solve it properly."

**Meetings feel routine/boring:**
→ Rate the meeting. Ask what would make it better.

**Tips for Success:**
- Prepare the agenda beforehand
- Update scorecard before meeting
- Review rocks before meeting
- Come with your issues ready
- Participate actively in IDS
- Complete your to-dos
- Be honest and direct
- Check ego at the door`
        }
      ]
    },
    {
      id: "best-practices",
      title: "Best Practices & Tips",
      order: 10,
      content: [
        {
          heading: "Weekly EOS Rhythm",
          body: `**Monday Morning:**
- [ ] Update scorecard numbers
- [ ] Review your rocks (on/off track)
- [ ] Check to-dos from last week
- [ ] Prepare for L10 meeting

**During L10 (90 minutes):**
- [ ] Participate actively
- [ ] Raise issues as they come up
- [ ] Volunteer for to-dos
- [ ] Take notes on decisions

**After L10:**
- [ ] Cascade key messages to your team
- [ ] Start working on your to-dos
- [ ] Update any affected systems
- [ ] Schedule follow-ups

**Rest of Week:**
- [ ] Make progress on rocks
- [ ] Complete to-dos
- [ ] Track issues as they arise
- [ ] Update recalls daily
- [ ] Monitor scorecard metrics

**Friday:**
- [ ] Finish any pending to-dos
- [ ] Note issues for next L10
- [ ] Review week's progress
- [ ] Plan next week's priorities`
        },
        {
          heading: "Data Quality Tips",
          body: `**Scorecard Data:**
- Update same day/time each week
- Use consistent data sources
- Double-check calculations
- Document data collection methods
- Archive source documents

**Rock Updates:**
- Be honest: on or off track only
- Update status weekly
- Add notes about major milestones
- Communicate blockers early
- Celebrate when complete

**Issue Documentation:**
- Clear, specific titles
- Include relevant context
- Set realistic priority
- Update status as it progresses
- Close when truly solved

**Recall Management:**
- Update status after every contact
- Add detailed notes
- Track appointment scheduling
- Document patient preferences
- Keep contact info current`
        },
        {
          heading: "Communication Best Practices",
          body: `**During Meetings:**
- One person speaks at a time
- Listen to understand, not to respond
- Ask questions for clarity
- Disagree respectfully
- Commit to decisions

**Cascading Information:**
- Share decisions with your team promptly
- Explain the "why" behind changes
- Answer questions honestly
- Get team buy-in
- Follow through consistently

**Giving Feedback:**
- Be specific and timely
- Focus on behavior, not personality
- Offer solutions, not just criticism
- Follow up on improvements
- Recognize positive changes

**Managing Conflict:**
- Address issues quickly
- Have direct conversations
- Focus on the issue, not the person
- Seek win-win solutions
- Don't let issues fester`
        }
      ]
    },
    {
      id: "troubleshooting",
      title: "Troubleshooting & FAQ",
      order: 11,
      content: [
        {
          heading: "Common Issues & Solutions",
          body: `**"I can't see all the features"**
→ Your role may have limited access. Speak with your admin about your permissions.

**"Scorecard numbers aren't saving"**
→ Check your internet connection. Refresh and try again. Contact support if persists.

**"I forgot to complete my to-dos"**
→ Be honest in the next L10. Explain what blocked you. Recommit or reassign.

**"Our L10 meetings run over time"**
→ Focus on IDS time management. Solve top 1-3 issues only. Table the rest.

**"My rock is consistently off track"**
→ Discuss in IDS. Is it too big? Wrong priority? Need help? Be honest.

**"I can't import my data"**
→ Check file format matches template. Review error messages. Contact support with details.

**"Recalls aren't showing up"**
→ Verify import completed. Check date filters. Confirm source data is correct.

**"AI features aren't working"**
→ Check if AI is enabled in settings. Verify usage limits haven't been reached.`
        },
        {
          heading: "Frequently Asked Questions",
          body: `**Q: How often should we update the scorecard?**
A: Weekly, preferably Monday morning before your L10 meeting.

**Q: Can we have more than one rock per person?**
A: Yes, but 1-3 is ideal. More than 3 means nothing is truly a priority.

**Q: What if we can't solve an issue in IDS?**
A: Create a to-do to research further. Bring it back next week with more info.

**Q: Do we have to use every feature?**
A: No. Start with the basics (Scorecard, Rocks, Issues, L10). Add features as needed.

**Q: Can staff members see everything?**
A: No. Permissions are role-based. Staff typically see Recalls, Issues, Docs, and their own data.

**Q: How do we handle confidential issues in L10?**
A: Have a separate executive session or discuss offline. Don't compromise privacy.

**Q: What if someone misses the L10 meeting?**
A: Meeting goes on without them. They catch up via notes. Make attendance non-negotiable.

**Q: Can we change our rocks mid-quarter?**
A: Discouraged. Commit for 90 days. If circumstances truly change, discuss as a team.`
        },
        {
          heading: "Getting Help",
          body: `**In-App Support:**
- Help menu (? icon in top right)
- Tooltips and guides throughout
- This training handbook
- Sample data and templates

**Training Resources:**
- Weekly office hours (ask your admin)
- Video tutorials (coming soon)
- EOS resources at eosworldwide.com
- Traction book by Gino Wickman

**Technical Support:**
- Report issues via Issues page
- Email support (ask your admin)
- Check system status page
- Review documentation updates

**EOS Coaching:**
Consider hiring an EOS Implementer if:
- Leadership team needs external facilitation
- You're new to EOS and want guidance
- You're stuck implementing the system
- You want to accelerate results

**Remember:**
The system is a tool. Success comes from discipline, honesty, and teamwork. Commit to the process for 90 days before judging results.`
        }
      ]
    },
    {
      id: "glossary",
      title: "EOS Glossary",
      order: 12,
      content: [
        {
          heading: "Key Terms",
          body: `**Accountability Chart** - Organizational chart showing seats (roles) and who fills them

**Cascading Messages** - Sharing key decisions with your team after meetings

**Core Values** - 3-7 fundamental beliefs that define your culture

**EOS** - Entrepreneurial Operating System; complete business system

**IDS** - Identify, Discuss, Solve; problem-solving methodology

**Issues List** - Running list of problems, ideas, and opportunities

**KPI** - Key Performance Indicator; measurable number predicting success

**L10** - Level 10 Meeting; weekly 90-minute leadership meeting

**LMA** - Leadership Team Meeting Pulse; meeting rating system

**People Analyzer** - Tool for rating people on core values (+ / +/- / -)

**Quarterly Conversation** - One-on-one check-in between manager and direct report

**Rock** - 90-day priority or goal

**Scorecard** - Weekly dashboard of 5-15 most important numbers

**Seat** - A role or position in the organization

**The Right Person** - Someone who fits your core values (+ on People Analyzer)

**The Right Seat** - A role that fits someone's strengths (GWC)

**To-Do** - 7-day action item with single owner

**Traction** - Executing on your vision; getting what you want from business

**V/TO** - Vision/Traction Organizer; 2-page strategic plan

**Vision** - Where the company is going and how it will get there`
        },
        {
          heading: "System-Specific Terms",
          body: `**Recall** - Patient who needs to schedule continuing care appointment

**Recall Rate** - Percentage of recalls successfully scheduled

**Patient Hash** - Anonymous identifier protecting patient privacy (HIPAA)

**Import Mapping** - Connection between external data and system KPIs

**Default Batch** - Pre-configured set of KPIs or Rocks to quick-start

**Tracked KPI** - Clinical metric available for scorecard assignment

**AI Copilot** - AI assistant for generating insights and suggestions

**Simple Mode** - Streamlined interface showing only essential features

**Quick Actions** - Common tasks accessible from home dashboard

**Role Visibility** - Feature access based on user role/permissions`
        }
      ]
    }
  ]
};
