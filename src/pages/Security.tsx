import { motion } from "framer-motion";
import { 
  Shield, 
  Lock, 
  Eye, 
  Database, 
  Server, 
  Key, 
  FileCheck, 
  Clock, 
  AlertTriangle,
  CheckCircle2,
  Fingerprint,
  Network,
  HardDrive,
  RefreshCw,
  Mail,
  ShieldCheck,
  Ban,
  Search,
  FileWarning,
  Users,
  Timer
} from "lucide-react";
import { NavPublic } from "@/components/layout/NavPublic";
import { FooterPublic } from "@/components/layout/FooterPublic";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  details?: string[];
}

function FeatureCard({ icon, title, description, details }: FeatureCardProps) {
  return (
    <motion.div variants={fadeInUp}>
      <Card className="h-full bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
              {icon}
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg text-foreground">{title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
              {details && details.length > 0 && (
                <ul className="space-y-1 mt-3">
                  {details.map((detail, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                      {detail}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface SectionProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  className?: string;
}

function Section({ title, subtitle, children, className = "" }: SectionProps) {
  return (
    <motion.section 
      className={`py-16 ${className}`}
      initial="initial"
      whileInView="animate"
      viewport={{ once: true, margin: "-100px" }}
      variants={staggerContainer}
    >
      <div className="container mx-auto px-4">
        <motion.div variants={fadeInUp} className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-3">{title}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">{subtitle}</p>
        </motion.div>
        {children}
      </div>
    </motion.section>
  );
}

export default function Security() {
  return (
    <div className="min-h-screen bg-background">
      <NavPublic />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-accent/10 rounded-full blur-3xl opacity-50" />
        
        <div className="container mx-auto px-4 relative">
          <motion.div 
            className="text-center max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Enterprise-Grade Security</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
              Security at{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                ClinicLeader
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Your clinic's operational data deserves the highest level of protection. 
              We've built security into every layer of our platform.
            </p>
            
            {/* Trust Badges */}
            <div className="flex flex-wrap justify-center gap-4">
              <Badge variant="outline" className="px-4 py-2 text-sm bg-card/50 backdrop-blur-sm">
                <Lock className="w-4 h-4 mr-2" />
                AES-256 Encryption
              </Badge>
              <Badge variant="outline" className="px-4 py-2 text-sm bg-card/50 backdrop-blur-sm">
                <ShieldCheck className="w-4 h-4 mr-2" />
                Zero-PHI Architecture
              </Badge>
              <Badge variant="outline" className="px-4 py-2 text-sm bg-card/50 backdrop-blur-sm">
                <Network className="w-4 h-4 mr-2" />
                Multi-Tenant Isolation
              </Badge>
              <Badge variant="outline" className="px-4 py-2 text-sm bg-card/50 backdrop-blur-sm">
                <Eye className="w-4 h-4 mr-2" />
                Full Audit Trail
              </Badge>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Zero-PHI Section */}
      <Section 
        title="Zero-PHI Data Protection" 
        subtitle="Protected Health Information never enters our system. We block sensitive data at the point of ingestion."
        className="bg-muted/30"
      >
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            icon={<Ban className="w-6 h-6" />}
            title="Hardcoded Blocklists"
            description="Known sensitive field names are permanently blocked from ingestion."
            details={["Patient names", "Social Security Numbers", "Medical record numbers"]}
          />
          <FeatureCard
            icon={<Search className="w-6 h-6" />}
            title="Regex Pattern Detection"
            description="Automatic scanning for patterns that indicate sensitive data."
            details={["Email addresses", "Phone numbers", "SSN patterns"]}
          />
          <FeatureCard
            icon={<FileCheck className="w-6 h-6" />}
            title="Whitelist Enforcement"
            description="Only explicitly approved operational fields are stored in our system."
            details={["Pre-approved field catalog", "Strict validation", "Unknown fields rejected"]}
          />
          <FeatureCard
            icon={<Eye className="w-6 h-6" />}
            title="Value-Level Scanning"
            description="Every data value is inspected for PHI patterns before storage."
            details={["Real-time analysis", "Pattern matching", "Heuristic detection"]}
          />
          <FeatureCard
            icon={<FileWarning className="w-6 h-6" />}
            title="Quarantine Logging"
            description="Blocked fields are logged for audit and review without storing the actual values."
            details={["Field name recorded", "Reason documented", "Values never stored"]}
          />
          <FeatureCard
            icon={<AlertTriangle className="w-6 h-6" />}
            title="Immediate Rejection"
            description="Files containing detected PHI are rejected at the ingestion boundary."
            details={["No partial processing", "Clear error messages", "Audit trail maintained"]}
          />
        </div>
      </Section>

      {/* Cryptographic Account Locking */}
      <Section 
        title="Cryptographic Account Locking" 
        subtitle="Each connector is cryptographically bound to a specific clinic account, preventing any possibility of data mixing."
      >
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <FeatureCard
            icon={<Fingerprint className="w-6 h-6" />}
            title="Account GUID Binding"
            description="Every connector is locked to a unique account identifier from Jane App at first successful delivery."
            details={["Immutable binding", "One-time lock", "Cannot be changed"]}
          />
          <FeatureCard
            icon={<Lock className="w-6 h-6" />}
            title="Cross-Clinic Prevention"
            description="Any file with a mismatched account GUID is immediately rejected."
            details={["Automatic verification", "Zero tolerance policy", "Instant rejection"]}
          />
          <FeatureCard
            icon={<FileCheck className="w-6 h-6" />}
            title="Lock Audit Trail"
            description="All account locking events are permanently recorded for security review."
            details={["Timestamp recorded", "Original GUID stored", "Rejection reason logged"]}
          />
          <FeatureCard
            icon={<Shield className="w-6 h-6" />}
            title="Security Event Logging"
            description="Attempted violations trigger security alerts and are logged for investigation."
            details={["Real-time alerts", "Investigation support", "Pattern analysis"]}
          />
        </div>
      </Section>

      {/* Zero Standing Access */}
      <Section 
        title="Zero Standing Access" 
        subtitle="No one has permanent access to raw data. Every access request requires justification and approval."
        className="bg-muted/30"
      >
        <div className="grid md:grid-cols-3 gap-6">
          <FeatureCard
            icon={<Timer className="w-6 h-6" />}
            title="Just-in-Time Access"
            description="Access is granted only when needed and for the minimum time required."
            details={["Request-based model", "No standing permissions", "Time-limited grants"]}
          />
          <FeatureCard
            icon={<Users className="w-6 h-6" />}
            title="Approval Workflow"
            description="Every access request requires justification and management approval."
            details={["Written justification", "Manager approval", "Purpose validation"]}
          />
          <FeatureCard
            icon={<Eye className="w-6 h-6" />}
            title="Full Access Audit"
            description="Every data access event is logged with user, timestamp, and accessed records."
            details={["User identity", "Accessed resources", "Query details logged"]}
          />
        </div>
      </Section>

      {/* Multi-Tenant Isolation */}
      <Section 
        title="Multi-Tenant Data Isolation" 
        subtitle="Your data is completely isolated from other organizations at every level of our infrastructure."
      >
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FeatureCard
            icon={<HardDrive className="w-6 h-6" />}
            title="Unique S3 Prefixes"
            description="Each organization's files are stored in isolated paths with unique identifiers."
          />
          <FeatureCard
            icon={<Key className="w-6 h-6" />}
            title="Scoped IAM Roles"
            description="Access credentials are scoped to only allow access to your organization's data."
          />
          <FeatureCard
            icon={<Database className="w-6 h-6" />}
            title="Row-Level Security"
            description="Database queries are automatically filtered to your organization's records."
          />
          <FeatureCard
            icon={<Network className="w-6 h-6" />}
            title="No Cross-Tenant Queries"
            description="It's architecturally impossible to query another organization's data."
          />
        </div>
      </Section>

      {/* Encryption */}
      <Section 
        title="Encryption Everywhere" 
        subtitle="Your data is encrypted at rest and in transit using industry-leading standards."
        className="bg-muted/30"
      >
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <FeatureCard
            icon={<HardDrive className="w-6 h-6" />}
            title="Encryption at Rest"
            description="All stored data is encrypted using AES-256, the same standard used by banks and governments."
            details={["AES-256 encryption", "Database encryption", "File storage encryption"]}
          />
          <FeatureCard
            icon={<Network className="w-6 h-6" />}
            title="Encryption in Transit"
            description="All network traffic is encrypted using TLS 1.3, the latest transport security standard."
            details={["TLS 1.3 protocol", "Perfect forward secrecy", "No plaintext transmission"]}
          />
          <FeatureCard
            icon={<Key className="w-6 h-6" />}
            title="Secrets Management"
            description="API keys and credentials are stored in an encrypted vault, never in code or logs."
            details={["Encrypted vault storage", "Runtime injection", "No secrets in logs"]}
          />
        </div>
      </Section>

      {/* Data Lifecycle */}
      <Section 
        title="Data Lifecycle Management" 
        subtitle="We maintain clear retention policies and support your data governance requirements."
      >
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FeatureCard
            icon={<Clock className="w-6 h-6" />}
            title="Staging Data"
            description="Raw ingested data is automatically purged after 90 days."
          />
          <FeatureCard
            icon={<Database className="w-6 h-6" />}
            title="Aggregated Metrics"
            description="Anonymized operational metrics are retained for trend analysis."
          />
          <FeatureCard
            icon={<FileCheck className="w-6 h-6" />}
            title="Audit Logs"
            description="Security and access logs are retained for 2+ years for compliance."
          />
          <FeatureCard
            icon={<RefreshCw className="w-6 h-6" />}
            title="Deletion Requests"
            description="Manual deletion requests are supported with dual-approval workflow."
          />
        </div>
      </Section>

      {/* Audit Trail */}
      <Section 
        title="Comprehensive Audit Trail" 
        subtitle="Every action in the system is logged, providing complete visibility and accountability."
        className="bg-muted/30"
      >
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            icon={<FileCheck className="w-6 h-6" />}
            title="Ingestion Ledger"
            description="Complete record of every file received, processed, or rejected."
          />
          <FeatureCard
            icon={<FileWarning className="w-6 h-6" />}
            title="Rejection Logging"
            description="Detailed logs of why files were rejected, including account mismatches."
          />
          <FeatureCard
            icon={<Ban className="w-6 h-6" />}
            title="Quarantine Records"
            description="Logs of all fields blocked by PHI detection without storing values."
          />
          <FeatureCard
            icon={<Eye className="w-6 h-6" />}
            title="Access Audit"
            description="Who accessed what data, when, and why - fully documented."
          />
          <FeatureCard
            icon={<RefreshCw className="w-6 h-6" />}
            title="Purge Logging"
            description="Records of all data purges, including automated and manual deletions."
          />
          <FeatureCard
            icon={<Users className="w-6 h-6" />}
            title="Admin Activity"
            description="All administrative actions including impersonation are logged."
          />
        </div>
      </Section>

      {/* Incident Response */}
      <Section 
        title="Incident Response" 
        subtitle="We have documented procedures for responding to security incidents quickly and transparently."
      >
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <FeatureCard
            icon={<AlertTriangle className="w-6 h-6" />}
            title="Immediate Response"
            description="Connectors can be immediately disabled to stop any potential data flow during an investigation."
            details={["One-click disable", "Automatic isolation", "No data loss"]}
          />
          <FeatureCard
            icon={<Clock className="w-6 h-6" />}
            title="24-Hour Notification"
            description="We commit to notifying affected parties within 24 hours of confirming any security incident."
            details={["Rapid assessment", "Clear communication", "Regulatory compliance"]}
          />
          <FeatureCard
            icon={<Search className="w-6 h-6" />}
            title="Root Cause Analysis"
            description="Every incident triggers a thorough investigation to identify and address the root cause."
            details={["Detailed investigation", "System improvements", "Prevention measures"]}
          />
          <FeatureCard
            icon={<FileCheck className="w-6 h-6" />}
            title="Post-Incident Reporting"
            description="We provide detailed reports on incidents, impact, and remediation steps taken."
            details={["Timeline documentation", "Impact assessment", "Remediation summary"]}
          />
        </div>
      </Section>

      {/* Contact Section */}
      <section className="py-20 bg-gradient-to-b from-muted/30 to-background">
        <div className="container mx-auto px-4">
          <motion.div 
            className="max-w-2xl mx-auto text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-primary/10 mb-6">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Security Questions?
            </h2>
            <p className="text-muted-foreground mb-6">
              Our security team is available to answer your questions and provide additional documentation upon request.
            </p>
            <a 
              href="mailto:security@clinicleader.com" 
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              <Mail className="w-5 h-5" />
              Contact Security Team
            </a>
            <p className="text-sm text-muted-foreground mt-4">
              We respond to all security inquiries within 24 hours.
            </p>
          </motion.div>
        </div>
      </section>

      <FooterPublic />
    </div>
  );
}
