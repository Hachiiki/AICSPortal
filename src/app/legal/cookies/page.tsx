import type { Metadata } from 'next'
import { LegalShell } from '@/components/legal/LegalShell'
import { SESSION_FACTS } from '@/lib/legal/site'

export const metadata: Metadata = {
  title: 'Cookie Policy | AICS Portal',
  description:
    'Every cookie and storage key AICS Portal uses, what each one does, and how to change your analytics choice.',
}

export default function CookiesPage() {
  return (
    <LegalShell
      current="/legal/cookies"
      title="Cookie Policy"
      summary="One cookie keeps you signed in; nothing else is set. Analytics beacons are cookieless and stay off until you allow them. You can revisit the choice anytime with the Cookie settings link on this page or the sign-in screen."
    >
      <p>
        This policy lists every cookie and browser-storage key the AICS Portal uses, what it does,
        and how to control it. Philippine law does not mandate a cookie banner, and this portal
        runs no advertising or cross-site tracking that would strictly require one. But because
        optional analytics send usage events outside the country, we take the conservative route:
        a consent banner with analytics off until you opt in. The banner is a choice, not a
        formality. "Essential only" leaves the portal fully functional.
      </p>

      <h2 id="inventory">1. What we set</h2>
      <table>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Type</th>
            <th scope="col">Purpose</th>
            <th scope="col">Lifetime</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>{SESSION_FACTS.cookieName}</code>
            </td>
            <td>Cookie · strictly necessary</td>
            <td>
              Keeps you signed in. Holds a signed session token only, not your password or
              personal details. Marked HttpOnly (page scripts cannot read it) and SameSite=Lax;
              sent only over HTTPS in production.
            </td>
            <td>
              {SESSION_FACTS.defaultHours} hours, or {SESSION_FACTS.rememberMeDays} days with
              "Remember me"; deleted immediately on sign-out or password change
            </td>
          </tr>
          <tr>
            <td>
              <code>aics_cookie_consent</code>
            </td>
            <td>localStorage key (not a cookie)</td>
            <td>Remembers your banner choice so it is not re-asked on every visit.</td>
            <td>Until you change it (Cookie settings)</td>
          </tr>
          <tr>
            <td>
              <code>aics_tasks_handoff</code>, <code>aics_academics_focus</code>
            </td>
            <td>sessionStorage keys</td>
            <td>
              Carry a subject code between two screens during a single tab session (for example,
              "compose a task for this subject"). Contain no personal data.
            </td>
            <td>Until the tab closes</td>
          </tr>
        </tbody>
      </table>
      <p>
        That is the complete list. There are no session-independent advertising cookies, no social
        network widgets, and no third-party scripts embedded in any page.
      </p>

      <h2 id="analytics">2. Optional analytics (off until you allow them)</h2>
      <p>
        The portal loads Vercel Web Analytics and Vercel Speed Insights only after you click
        "Allow analytics". These tools are cookieless: they set no cookies and
        assign no persistent advertising identifiers. Each page view and performance sample sends
        the page path, referrer, country, and browser/device type to Vercel in the United States,
        where it is aggregated. It is not linked to your account, your name, or your academic
        record, and the portal adds nothing to it. Choosing "Essential only" keeps every
        beacon unloaded.
      </p>

      <h2 id="control">3. Changing your choice</h2>
      <ul>
        <li>
          Use the <strong>Cookie settings</strong> link on this page, the sign-in screen, or
          Settings → Privacy &amp; Data. The banner reappears, beacons stop loading immediately,
          and any already-injected analytics script tags are stripped from the page (the next
          page load is clean either way).
        </li>
        <li>
          You can also clear site data in your browser (usually under site settings or the padlock
          icon), which removes the consent record and the session cookie. You will simply be
          signed out and asked again.
        </li>
        <li>
          Blocking third-party requests or using tracking protection does not break the portal;
          the sign-in cookie is first-party.
        </li>
      </ul>

      <h2 id="more">4. Where to read more</h2>
      <p>
        What the sign-in cookie means for your personal data is covered in the{' '}
        <a href="/legal/privacy">Privacy Policy</a>, and the rules for using the portal are in the{' '}
        <a href="/legal/terms">Terms &amp; Conditions</a>. Vercel's own privacy practices are
        described in their privacy policy at vercel.com.
      </p>
    </LegalShell>
  )
}
