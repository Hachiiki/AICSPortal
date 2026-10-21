import type { Metadata } from 'next'
import { LegalShell } from '@/components/legal/LegalShell'
import { LEGAL, SESSION_FACTS } from '@/lib/legal/site'

export const metadata: Metadata = {
  title: 'Privacy Policy | AICS Portal',
  description:
    'How AICS Portal collects, uses, stores, and protects your personal data, and how to exercise your data privacy rights.',
}

export default function PrivacyPage() {
  return (
    <LegalShell
      current="/legal/privacy"
      title="Privacy Policy"
      summary="This portal stores your school records so you can sign in and use it: your name, student number, grades, tasks, attendance, and the contact details your branch gave us. We do not sell data, run ads, or add trackers. The only cookie is the one that keeps you signed in, and optional analytics stay off unless you switch them on."
    >
      <p>
        This Privacy Policy explains what personal data the AICS Portal ("the portal",
        "we") processes, why it is processed, who can access it, where it is stored, and
        the choices and rights available to you. It is written to comply with the Data Privacy Act
        of 2012 (Republic Act No. 10173) of the Philippines and its Implementing Rules and
        Regulations. If anything here is unclear, contact the operator directly using the details in
        the last section. Questions are answered, not filtered.
      </p>

      <h2 id="who-we-are">1. Who we are</h2>
      <p>
        The portal is an independent, student-built project operated by {LEGAL.operatorName} (
        {LEGAL.operatorRole}). It is not affiliated with, sponsored by, commissioned by, or
        endorsed by the Asian Institute of Computer Studies (AICS) or any of its offices. The
        personal data described below is processed so the portal can deliver its features to the
        school community; the operator is the personal information controller responsible for it.
      </p>
      <p>
        Accounts are not created through this website. Usernames and initial passwords are issued
        by your branch's administrative staff when they enroll or encode your record into the
        portal database. If you never received credentials, you do not have an account and no
        interactive data about you is collected beyond what is described in the server logs and
        optional analytics sections below.
      </p>

      <h2 id="what-we-collect">2. What personal data we process</h2>
      <p>
        The portal only stores what its features actually need. Each item below maps to a real
        screen or function. There are no hidden profile fields, no advertising identifiers, and no
        third-party tracking pixels anywhere in the code.
      </p>
      <ul>
        <li>
          <strong>Account and credentials:</strong> your username, a scrypt-hashed password (we
          cannot read it, and plaintext is never stored after first login), your role (student,
          faculty, admin), your campus branch, and a revocation counter used to sign out old
          sessions when you change your password.
        </li>
        <li>
          <strong>Identity and enrollment record:</strong> full name, student number, program, year
          level, section, semester, academic year, enrollment status, dean's-lister flag, and
          your branch's name and address as provided by your school.
        </li>
        <li>
          <strong>Contact details (optional and editable by you):</strong> email address, phone
          number, home address, and emergency contact name and number. These appear on your profile
          and digital ID; you can change or blank them anytime in Settings.
        </li>
        <li>
          <strong>Academic data:</strong> per-period subject grades and their release status, GPA,
          tasks you submit together with scores and faculty feedback, and your weekly schedule.
        </li>
        <li>
          <strong>Attendance:</strong> per-date present or absent marks recorded by faculty for the
          sections you belong to.
        </li>
        <li>
          <strong>Photo (optional):</strong> if you upload a profile photo in Settings, it is
          resized in your browser and stored with our media provider (see Section 4) so it can
          appear on your profile and digital ID.
        </li>
        <li>
          <strong>Financial assessment (display only):</strong> tuition assessment, posted
          payments, and balance as encoded by administrative staff, so you can see your own
          standing. The portal never asks for, stores, or transmits card numbers, banking
          credentials, or any payment instrument.
        </li>
        <li>
          <strong>Communications and activity records:</strong> announcements and notifications
          addressed to you and their read state, plus audit entries (who changed a grade, when,
          from what value to what value) that exist to keep the academic record tamper-evident.
        </li>
        <li>
          <strong>Content you submit:</strong> text you write into tasks, announcements, or messages
          is checked against an English and Filipino profanity/moderation filter before it is
          stored; when that filter matches, a short excerpt of the flagged text (up to 240
          characters) is written to a moderation log for operator review.
        </li>
      </ul>
      <p>
        We do not process political opinions, religious beliefs, health data, or other categories
        beyond what is listed. The mock "Face ID" tab shown in development builds never
        photographs or transmits your face. The camera stream stays in your browser and is
        discarded when you leave the screen.
      </p>

      <h2 id="why">3. Why we process it (purposes and basis)</h2>
      <ul>
        <li>
          <strong>To provide the service you ask for:</strong> signing you in, showing your own
          grades, tasks, schedule, and enrollment status, and generating your digital ID and
          enrollment certificate preview. Processing here is necessary to deliver the function you
          are actively using.
        </li>
        <li>
          <strong>Legitimate academic-administration purposes:</strong> faculty encoding grades,
          taking attendance, and posting tasks for their sections; administrators releasing grades
          and posting announcements. These are core, expected functions of a school portal and are
          limited to the roles that need them.
        </li>
        <li>
          <strong>Integrity and security:</strong> audit logs, rate limiting, and moderation
          screening exist to detect and deter misuse. They protect you as much as the portal.
        </li>
        <li>
          <strong>With your consent, where required:</strong> optional analytics (off by default),
          and optional features like your profile photo. You can withdraw these choices at any
          time. See the Cookie Policy for the analytics switch.
        </li>
      </ul>

      <h2 id="where">4. Where your data is stored (service providers)</h2>
      <p>
        The portal runs on infrastructure operated by third-party processors under their own
        security programs. Data is hosted outside the Philippines; by using the portal you
        acknowledge these transfers, which the operator remains accountable for under Section 21 of
        the Data Privacy Act.
      </p>
      <ul>
        <li>
          <strong>Vercel, Inc. (United States):</strong> hosts the website itself and, only if you
          allow analytics, receives cookieless usage events (pages viewed, referrer, device type).
        </li>
        <li>
          <strong>MongoDB Atlas (cloud region selected by the operator):</strong> the database
          holding all records described in Section 2, with access restricted to the operator.
        </li>
        <li>
          <strong>Cloudinary (United States):</strong> stores uploaded profile photos and course
          materials. Deleting a photo from your profile deletes it from the provider as well.
        </li>
      </ul>
      <p>
        These providers do not receive your data for their own purposes and cannot sell it. No
        other third parties receive anything: there are no embedded social widgets, advertising
        networks, chat widgets, or external fonts on any page.
      </p>

      <h2 id="cookies">5. Cookies and analytics</h2>
      <p>
        The portal sets a single cookie, <code>{SESSION_FACTS.cookieName}</code>, which keeps you
        signed in. It is strictly necessary, marked HttpOnly (scripts cannot read it), and expires
        after {SESSION_FACTS.defaultHours} hours, or {SESSION_FACTS.rememberMeDays} days if you
        tick "Remember me". Optional usage analytics are cookieless and load only after
        you click "Allow analytics". Full details, including how to change your choice
        later, are in the <a href="/legal/cookies">Cookie Policy</a>.
      </p>

      <h2 id="access">6. Who inside the portal can see your data</h2>
      <ul>
        <li>
          <strong>You:</strong> your own record. Everyone's data is filtered by branch and
          role on every request. One deployment serves every branch, and no query crosses
          branches.
        </li>
        <li>
          <strong>Faculty:</strong> for students enrolled in the subjects they teach, faculty can
          see the roster with names, student numbers, program, year and section, contact details,
          and GPA: the information a teacher needs to encode grades, take attendance, and message
          their class. They cannot see your address, emergency contacts, or financial assessment.
        </li>
        <li>
          <strong>Administrators:</strong> staff accounts responsible for releasing grades and
          managing records can see the directory across branches, including posted payment records
          for the enrollment module. Passwords are excluded from every administrative view.
        </li>
        <li>
          <strong>The operator:</strong> database access for maintenance, debugging, and acting on
          your requests (for example, a data export or deletion you email in).
        </li>
      </ul>

      <h2 id="retention">7. How long we keep it</h2>
      <ul>
        <li>
          <strong>Session data:</strong> the sign-in cookie lives {SESSION_FACTS.defaultHours} hours
          ({SESSION_FACTS.rememberMeDays} days with "Remember me") and is revoked
          immediately when you change your password or sign out.
        </li>
        <li>
          <strong>Notifications:</strong> automatically deleted {`30`} days after delivery.
        </li>
        <li>
          <strong>Academic records and audit logs:</strong> retained while your account exists,
          because grades, submissions, and their change history are the record the portal exists to
          keep. Closing your school account triggers a deletion request for your personal data.
          Contact the operator (Section 11) to start one sooner.
        </li>
        <li>
          <strong>Moderation and read-state logs:</strong> kept for abuse investigation and then
          pruned with the records they belong to.
        </li>
      </ul>

      <h2 id="rights">8. Your rights</h2>
      <p>
        Under the Data Privacy Act you may access, correct, block, or erase your personal data,
        object to its processing, obtain a copy of it, and be informed of what is held. Here is how
        each one works in practice on this portal:
      </p>
      <ul>
        <li>
          <strong>Access and portability:</strong> Settings → Privacy &amp; Data has a
          "Download my data" button that exports your profile and academic records as a
          machine-readable file, generated on demand with no human in the loop.
        </li>
        <li>
          <strong>Rectification:</strong> contact fields are editable in Settings. Name, program,
          and enrollment facts come from your school record. Ask your branch admin or the
          registrar to correct those at the source, and the portal reflects the fix.
        </li>
        <li>
          <strong>Erasure and deactivation:</strong> email the operator from the address on your
          record (or through your branch admin) and your data will be removed or your account
          deactivated, except grades and audit entries the school still requires, which can be
          anonymized instead of deleted.
        </li>
        <li>
          <strong>Complaints:</strong> you may raise concerns with the operator first (fastest),
          and you always retain the right to complain to the National Privacy Commission.
        </li>
      </ul>

      <h2 id="minors">9. Minors</h2>
      <p>
        The portal serves school students, some of whom may be under eighteen. Accounts are created
        only through branch staff for enrolled students, and the data processed is limited to the
        school-function categories in Section 2. Parents or guardians who want access to, or
        removal of, a minor's data can email the operator; verification is done through the
        branch that enrolled the student before any change is made.
      </p>

      <h2 id="security">10. Security</h2>
      <p>
        No system is perfectly secure, but the portal was built with defense in depth: passwords
        are scrypt-hashed and never logged; sessions are signed, HttpOnly, same-site cookies that
        can be revoked instantly; every API request re-verifies your identity and branch
        server-side (the browser is never trusted); login and write endpoints are rate-limited;
        grade changes are append-only audited; and all inputs are schema-validated before touching
        the database. Reported vulnerabilities are triaged and fixed. See the Terms for how to
        report one responsibly.
      </p>

      <h2 id="contact">11. Contact and changes</h2>
      <p>
        The operator for all privacy matters is {LEGAL.operatorName}. Write to
        {' '}<a href={`mailto:${LEGAL.operatorEmail}?subject=AICS%20Portal%20privacy%20request`}>
          {LEGAL.operatorEmail}
        </a>{' '}
        for exports, corrections, deletions, or questions. Identity is verified against the
        account record before changes are applied.
      </p>
      <p>
        This policy may be updated as features change. The "last updated" date at the
        top always reflects the current version, and material changes are announced on the login
        page. Continued use after an update means the revised policy applies to your use of the
        portal.
      </p>
    </LegalShell>
  )
}
