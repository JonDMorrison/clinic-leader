-- Insert HIPAA Compliance Policy document
INSERT INTO public.docs (
  title,
  kind,
  body,
  status,
  requires_ack,
  version,
  owner_id
)
VALUES (
  'HIPAA Compliance Policy',
  'Policy',
  '# HIPAA Compliance Policy

**Organization:** Northwest Injury Clinics  
**Effective Date:** October 23, 2025  
**Version:** 1.0  
**Approved by:** Compliance Committee – Northwest Injury Clinics  
**Reviewed On:** October 23, 2025  
**Next Review Due:** October 23, 2026

## 1. Purpose

This policy ensures that Northwest Injury Clinics (NWIC) complies with the Health Insurance Portability and Accountability Act of 1996 (HIPAA), including the Privacy Rule, Security Rule, and Breach Notification Rule, as amended by the HITECH Act.

NWIC is committed to safeguarding the confidentiality, integrity, and availability of all Protected Health Information (PHI) and Electronic Protected Health Information (ePHI) it creates, receives, maintains, or transmits.

## 2. Scope

This policy applies to all NWIC workforce members, including employees, contractors, temporary staff, and business associates who handle PHI or ePHI. It covers all physical and electronic systems, devices, and media used to store or transmit PHI.

## 3. Roles and Responsibilities

**Privacy Officer:** Oversees HIPAA Privacy Rule compliance, manages patient rights requests, and maintains documentation.

**Security Officer:** Implements technical and administrative safeguards, conducts risk assessments, and leads incident response efforts.

**Workforce Members:** Complete HIPAA training annually and immediately report suspected breaches or unauthorized disclosures.

**Business Associates:** Must execute a Business Associate Agreement (BAA) with NWIC and comply with equivalent HIPAA standards.

## 4. Definitions

**PHI (Protected Health Information):** Individually identifiable health information in any form (oral, paper, electronic).

**ePHI (Electronic PHI):** PHI created, stored, transmitted, or received electronically.

**Minimum Necessary:** The principle that only the minimum amount of PHI necessary to accomplish a task is used or disclosed.

**Business Associate:** Any vendor or individual performing functions or services on behalf of NWIC involving PHI.

## 5. Privacy Rule Compliance

- NWIC provides a Notice of Privacy Practices (NPP) to all patients, explaining how PHI may be used and patients'' rights.
- PHI is only used or disclosed for treatment, payment, or healthcare operations unless authorized or permitted by law.
- Patients have the right to access, amend, and request an accounting of disclosures of their PHI.
- Sanctions will be applied to workforce members who fail to comply with privacy requirements.
- All privacy documentation is retained for at least six (6) years.

## 6. Security Rule Compliance

### Administrative Safeguards

- Conduct ongoing risk assessments to identify and mitigate potential threats to PHI.
- Maintain a security management process, including sanctions for non-compliance.
- Assign a Security Officer responsible for ensuring compliance with all technical safeguards.
- Train staff annually on security awareness and device protection.
- Maintain data backup and disaster recovery plans.

### Physical Safeguards

- Restrict facility access to authorized personnel only.
- Secure workstations and mobile devices when unattended.
- Dispose of paper and electronic media containing PHI securely (shredding or secure wiping).

### Technical Safeguards

- Require unique user IDs and multi-factor authentication.
- Encrypt ePHI in transit and at rest (AES-256 or equivalent).
- Automatically log off inactive sessions.
- Maintain audit logs and monitor system access.

## 7. Breach Notification Policy

If a breach of unsecured PHI occurs, NWIC will:

- Notify affected individuals within 60 days of discovery.
- Notify the U.S. Department of Health and Human Services (HHS) if 500 or more individuals are affected.
- Notify local media if required by law.
- Document and mitigate all breaches and implement corrective action.

## 8. Business Associate Agreements (BAAs)

- All vendors or partners who handle PHI must sign a BAA outlining their HIPAA responsibilities.
- NWIC will review and update BAAs regularly to ensure continued compliance.
- Vendor risk assessments will be conducted annually.

## 9. Minimum Necessary & De-Identification

- Staff must access only the minimum necessary PHI to perform their job duties.
- Whenever possible, NWIC will de-identify PHI for analysis or reporting to reduce compliance exposure.

## 10. Workforce Training & Compliance Monitoring

- All workforce members receive HIPAA Privacy and Security training at hire and annually thereafter.
- The Compliance Committee monitors adherence through access audits, risk assessments, and periodic reviews.
- Training and compliance records are retained for at least six (6) years.

## 11. Incident Response & Sanctions

- All suspected incidents involving PHI must be reported immediately to the Privacy or Security Officer.
- The Security Officer will investigate, document, and remediate incidents.
- Sanctions for violations include retraining, suspension, or termination, depending on severity.

## 12. Data Retention & Disposal

- HIPAA-related documentation, including policies, training logs, and access records, will be retained for at least six (6) years.
- PHI/ePHI will be disposed of securely through shredding, pulping, or certified digital deletion.

## 13. Continuous Improvement & Auditing

- NWIC will conduct periodic internal audits of system access, policy compliance, and vendor safeguards.
- This policy will be reviewed annually or after any significant change in regulation, technology, or operations.
- Updates will be approved by the Compliance Committee and communicated to all staff.

## 14. Encryption, Access Control & Vendor Management

- All PHI stored or transmitted electronically must be encrypted (AES-256 or higher).
- Role-based access controls ensure PHI is accessible only to authorized users.
- Vendors handling PHI must demonstrate HIPAA compliance or sign a compliant BAA.

## 15. Policy Review & Approval

This policy is reviewed annually by the NWIC Compliance Committee.

All workforce members must read and acknowledge this policy as part of their HIPAA training.',
  'approved',
  true,
  1,
  '7d9cb4eb-5f16-4153-b279-41bc0d70a66a'
);