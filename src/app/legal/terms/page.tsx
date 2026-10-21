import type { Metadata } from 'next'
import { LegalShell } from '@/components/legal/LegalShell'
import { LEGAL } from '@/lib/legal/site'

export const metadata: Metadata = {
  title: 'Terms & Conditions | AICS Portal',
  description:
    'The rules for using AICS Portal: accounts, acceptable use, content ownership, disclaimers, and limitations of liability.',
}

export default function TermsPage() {
  return (
    <LegalShell
      current="/legal/terms"
      title="Terms & Conditions"
      summary="Sign in only with the account your branch issued to you, keep your password private, and use the portal for school purposes. The portal is an unofficial, independent project provided as-is. Generated IDs and certificates are not official school documents, and your grades are official only once the school releases them through its own processes."
    >
      <p>
        These Terms &amp; Conditions ("Terms") govern your use of the AICS Portal
        ("the portal"). By signing in or otherwise using the portal you agree to them.
        If you do not agree, do not use the portal. Nothing on it requires this agreement to be
        accepted anywhere except at the point of use. These Terms are governed by the laws of the{' '}
        {LEGAL.jurisdiction}.
      </p>

      <h2 id="service">1. What the service is (and is not)</h2>
      <p>
        The portal is a student, faculty, and administrator web system for viewing grades, tasks,
        schedules, attendance, announcements, and enrollment information. It is an independent,
        student-built project provided free of charge. It is <strong>not</strong> an official
        system of the Asian Institute of Computer Studies: the school has not sponsored,
        commissioned, or endorsed it, and no school office operates it. Nothing the portal
        displays, including grades, balances, certificates, and ID previews, is an official
        school issuance until the school or its registrar says so.
      </p>
      <p>
        The portal is offered "as is" and "as available." Features may be
        added, changed, suspended, or removed; the service may be down for maintenance or lose
        data despite backups; and there is no uptime commitment. Announcements posted in the
        portal are informational and do not replace official school channels.
      </p>

      <h2 id="accounts">2. Accounts and eligibility</h2>
      <ul>
        <li>
          Accounts are issued by branch administrative staff to enrolled students, faculty, and
          administrators. There is no public sign-up, and accounts cannot be transferred or shared.
        </li>
        <li>
          You are responsible for keeping your password secret. Sign out on shared computers; your
          session expires automatically after 8 hours (7 days with "Remember me"), and
          changing your password revokes every other session.
        </li>
        <li>
          Password resets go through your branch admin or the registrar's office. There is
          no self-service reset by design.
        </li>
        <li>
          The "demo login" and mock Face ID tab appear only in development builds and
          never function in production.
        </li>
      </ul>

      <h2 id="acceptable-use">3. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>access or attempt to access another person's account, records, or session;</li>
        <li>
          probe, scan, or attack the service, or circumvent its rate limits, role checks, or branch
          separation;
        </li>
        <li>
          tamper with grades, attendance, payments, or any record, or use the portal to misrepresent
          your academic standing to anyone;
        </li>
        <li>
          post profane, abusive, or unlawful content. Submissions are screened by an automated
          moderation filter, and flagged content is logged for review;
        </li>
        <li>use the portal for any purpose other than the school functions it provides; or</li>
        <li>scrape, mass-export, or redistribute other people's data.</li>
      </ul>
      <p>
        Violations can lead to suspension of access, revocation of sessions, and referral to your
        branch or to authorities where the law requires it (including the Cybercrime Prevention
        Act, Republic Act No. 10175, for unauthorized access and interference).
      </p>

      <h2 id="content">4. Your content and submissions</h2>
      <p>
        You keep ownership of anything you write or upload (task answers, photos, materials).
        Submitting it grants the portal the limited license it needs to store it and show it to the
        people the feature intends: your tasks and scores to you and your faculty, your photo on
        your own profile and ID, your posted materials to students of your subject. That license
        ends when the content is deleted. Do not upload content you do not have the right to
        share, and do not include third parties' personal data without their consent.
      </p>

      <h2 id="documents">5. Digital ID and Certificate of Enrollment</h2>
      <p>
        The digital ID card and the Certificate of Enrollment (COE) preview are{' '}
        <strong>system-generated conveniences</strong>. They are clearly marked as unofficial, carry
        no registrar signature or seal, and are not identity documents, school-issued IDs, or valid
        certificates for legal, employment, or benefit purposes. Official documents are issued only
        by the school through the registrar. Presenting a portal-generated document as an official
        school issuance is prohibited and may constitute forgery or misrepresentation under
        Philippine law.
      </p>

      <h2 id="ip">6. Intellectual property</h2>
      <p>
        The name "Asian Institute of Computer Studies," the school logo, and related
        marks belong to their owner and are used here only to identify the community the portal
        serves, without claim of affiliation or endorsement. The portal's source code and
        design are &copy; {LEGAL.operatorName}, all rights reserved. Icons are Lucide (ISC
        license), UI primitives are shadcn/ui (MIT), and fonts are self-hosted Google Fonts under
        the SIL Open Font License. If you are the owner of any mark or asset used here and object
        to its use, contact the operator and it will be removed promptly.
      </p>

      <h2 id="accuracy">7. Accuracy and availability of academic data</h2>
      <p>
        Grades shown to students are the periods faculty submitted and administrators released
        within the portal. The portal's record is a copy, not the source of truth: for
        official standings, transcripts, and disputes, the school's registrar and your branch
        remain authoritative. Fees and balances shown are assessments encoded by staff and may
        change without notice; receipts and official totals come from the school cashier.
      </p>

      <h2 id="liability">8. Disclaimers and limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, the operator is not liable for indirect,
        incidental, special, or consequential damages, lost data, lost profits, or academic or
        administrative consequences arising from use of the portal, including decisions made in
        reliance on portal-displayed information. The operator's total liability for any
        claim relating to the portal is limited to the amount you paid for the portal, which is
        zero. Nothing here limits liability that cannot be limited by law, including for gross
        negligence or willful misconduct in handling personal data.
      </p>

      <h2 id="changes">8a. Changes and termination</h2>
      <p>
        These Terms may be updated; the "last updated" date reflects the current
        version, and continued use after changes means you accept them. Your access can be limited
        or ended if you break these Terms, if your school account closes, or if the project itself
        is discontinued. Sections that by their nature survive (intellectual property,
        disclaimers, governing law) remain in effect afterward.
      </p>

      <h2 id="contact">9. Contact</h2>
      <p>
        Questions, reports of security vulnerabilities (please report privately and responsibly),
        and legal notices go to {LEGAL.operatorName}:{' '}
        <a href={`mailto:${LEGAL.operatorEmail}?subject=AICS%20Portal%20terms%20matter`}>
          {LEGAL.operatorEmail}
        </a>
        .
      </p>
    </LegalShell>
  )
}
