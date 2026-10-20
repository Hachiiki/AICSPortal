import type { Metadata } from 'next'
import { LegalShell } from '@/components/legal/LegalShell'
import { LEGAL } from '@/lib/legal/site'

export const metadata: Metadata = {
  title: 'Refund Policy | AICS Portal',
  description:
    'AICS Portal charges nothing and collects no payments — how school fees and refunds actually work.',
}

export default function RefundPage() {
  return (
    <LegalShell
      current="/legal/refund"
      title="Refund Policy"
      summary="The portal is free: it charges nothing and collects no payments, so there is nothing to refund here. School fees shown on the enrollment screen are paid to the school cashier, and refund requests for those go through your branch and the registrar's office."
    >
      <p>
        This page exists to be explicit about money rather than to bury a technicality: the AICS
        Portal does not sell anything. There are no subscriptions, no paid tiers, no in-app
        purchases, no advertising, and no payment forms of any kind. Because no payment is ever
        collected through the portal, no refund of a portal charge is ever owed or possible.
      </p>

      <h2 id="fees">1. School fees you see in the portal</h2>
      <p>
        The enrollment screen displays tuition assessments, posted payments, and balances that
        branch staff have encoded, so you can check your own standing. These figures are
        informational copies of the school&rsquo;s records — the school, not the portal, decides
        what you owe. All actual payments happen through the school&rsquo;s official cashier or
        collection channels. The portal never asks for, sees, or stores card numbers, bank details,
        or receipts&rsquo; payment credentials; a payment note may reference an official receipt
        number, which is display text only.
      </p>

      <h2 id="refunds">2. Requesting a refund of school fees</h2>
      <p>
        Refunds, adjustments, and disputes about tuition or other school charges are handled
        exclusively by the school under its own policies and applicable Philippine consumer and
        education regulations. To pursue one:
      </p>
      <ul>
        <li>contact your branch&rsquo;s cashier or business office with your official receipts; and</li>
        <li>
          escalate to the registrar&rsquo;s office if the dispute concerns assessment amounts,
          enrollment withdrawal, or the refund timeline.
        </li>
      </ul>
      <p>
        The portal&rsquo;s operator cannot reverse, guarantee, or expedite any school-side refund,
        and no balance displayed in the portal binds the school.
      </p>

      <h2 id="changes">3. If this ever changes</h2>
      <p>
        If the portal ever introduces an optional paid feature, this policy will be updated with
        pricing, cancellation, and refund terms before any payment can be made — the payment page
        itself would carry those terms, and nothing would be charged without an explicit action
        from you. For anything else, the <a href="/legal/terms">Terms &amp; Conditions</a> and{' '}
        <a href="/legal/privacy">Privacy Policy</a> apply. Questions can be sent to{' '}
        <a href={`mailto:${LEGAL.operatorEmail}?subject=AICS%20Portal%20refund%20question`}>
          {LEGAL.operatorEmail}
        </a>
        .
      </p>
    </LegalShell>
  )
}
