import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service for Expandcast — the AI-powered content repurposing platform for podcasters and creators.",
};

const EFFECTIVE_DATE = "April 6, 2026";

const TOC = [
  { id: "acceptance", label: "Acceptance of Terms" },
  { id: "eligibility", label: "Eligibility & Accounts" },
  { id: "service", label: "Service Description" },
  { id: "user-content", label: "User Content & IP" },
  { id: "ai-content", label: "AI-Generated Content" },
  { id: "acceptable-use", label: "Acceptable Use" },
  { id: "subscriptions", label: "Subscriptions & Billing" },
  { id: "disclaimers", label: "Disclaimers & Liability" },
  { id: "termination", label: "Termination" },
  { id: "general", label: "General" },
  { id: "contact", label: "Contact" },
];

export default function TermsPage() {
  return (
    <>
      <div className="mb-10">
        <p className="font-mono text-xs uppercase tracking-widest text-primary mb-2">
          Effective: {EFFECTIVE_DATE}
        </p>
        <h1>Terms of Service</h1>
      </div>

      <nav className="not-prose mb-12 border border-border p-6 bg-muted/30">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">
          Table of Contents
        </p>
        <ol className="columns-1 sm:columns-2 gap-x-8 list-decimal list-inside space-y-1 text-sm font-mono">
          {TOC.map(({ id, label }) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                {label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <p>
        Welcome to <strong>Expandcast</strong> (&quot;we,&quot; &quot;us,&quot;
        or &quot;our&quot;), accessible at{" "}
        <a href="https://expandcast.com">expandcast.com</a>. These Terms of
        Service (&quot;Terms&quot;) govern your use of our platform and all
        related services (the &quot;Service&quot;). By using the Service you
        agree to these Terms and our <a href="/privacy">Privacy Policy</a>. If
        you do not agree, do not use the Service.
      </p>

      <h2 id="acceptance">1. Acceptance of Terms</h2>
      <p>
        By creating an account or using the Service, you confirm you have read
        and agree to these Terms and our <a href="/privacy">Privacy Policy</a>.
        We may update these Terms at any time; continued use after changes
        constitutes acceptance.
      </p>

      <h2 id="eligibility">2. Eligibility &amp; Accounts</h2>
      <p>
        You must be at least 16 years old to use the Service. You are
        responsible for keeping your account credentials secure and for all
        activity under your account. Notify us immediately at{" "}
        <a href="mailto:contact@expandcast.com">contact@expandcast.com</a> if
        you suspect unauthorized access.
      </p>

      <h2 id="service">3. Service Description</h2>
      <p>
        Expandcast is an AI-powered content repurposing platform. You upload
        audio or video; we transcribe it and generate derivative content (blog
        posts, social threads, newsletters, YouTube descriptions, thumbnails,
        clips, etc.) using AI models. The Service relies on third-party
        providers for transcription, generation, payments, and hosting — see
        our <a href="/privacy">Privacy Policy</a> for details.
      </p>

      <h2 id="user-content">4. User Content &amp; Intellectual Property</h2>
      <ul>
        <li>
          <strong>Ownership:</strong> You retain all rights to content you
          upload. We do not claim ownership of your original material.
        </li>
        <li>
          <strong>License to Us:</strong> By uploading content, you grant us a
          worldwide, non-exclusive, royalty-free license to use, store, and
          process it solely to operate the Service.
        </li>
        <li>
          <strong>Your Responsibility:</strong> You warrant that you own or have
          rights to everything you upload and that it does not infringe
          third-party rights.
        </li>
      </ul>

      <h2 id="ai-content">5. AI-Generated Content</h2>
      <ul>
        <li>
          <strong>Ownership:</strong> You own the AI-generated output created
          from your content. You may use, modify, and publish it freely.
        </li>
        <li>
          <strong>No Accuracy Guarantee:</strong> AI output may contain errors.
          You are responsible for reviewing it before publishing.
        </li>
        <li>
          <strong>No Exclusivity:</strong> Similar output may be generated for
          other users.
        </li>
        <li>
          <strong>Not Professional Advice:</strong> AI output is not legal,
          medical, financial, or any other form of professional advice.
        </li>
      </ul>

      <h2 id="acceptable-use">6. Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Upload content you don&apos;t have the right to use.</li>
        <li>
          Generate illegal, defamatory, harassing, or discriminatory content.
        </li>
        <li>Reverse-engineer the Service or its underlying AI models.</li>
        <li>
          Use bots or scrapers beyond normal usage, or circumvent usage limits.
        </li>
        <li>Resell or sublicense access to the Service.</li>
        <li>Generate spam, phishing, or misleading content.</li>
      </ul>

      <h2 id="subscriptions">7. Subscriptions &amp; Billing</h2>
      <p>
        Expandcast offers Free, Starter, and Pro plans. Paid plans are billed
        monthly or annually through <strong>Stripe</strong>. By subscribing, you
        authorize recurring charges to your payment method.
      </p>
      <ul>
        <li>
          <strong>Upgrades</strong> take effect immediately (prorated).{" "}
          <strong>Downgrades</strong> apply at the end of the billing cycle.
        </li>
        <li>
          Subscriptions renew automatically. You&apos;ll receive a reminder 14
          days before renewal.
        </li>
        <li>
          <strong>14-day money-back guarantee</strong> on initial purchase —
          contact us for a full refund, no questions asked. Outside this window,
          no partial refunds are provided.
        </li>
        <li>
          You may cancel anytime in your account settings. Access continues
          until the end of your billing period.
        </li>
        <li>
          We may change prices with 30 days&apos; notice.
        </li>
      </ul>

      <h2 id="disclaimers">8. Disclaimers &amp; Liability</h2>
      <p>
        THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY
        KIND. WE DO NOT GUARANTEE THAT THE SERVICE WILL BE UNINTERRUPTED,
        ERROR-FREE, OR THAT AI OUTPUT WILL BE ACCURATE OR SUITABLE FOR ANY
        PURPOSE.
      </p>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, EXPANDCAST SHALL NOT BE LIABLE
        FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES.
        OUR TOTAL LIABILITY SHALL NOT EXCEED THE GREATER OF (A) WHAT YOU PAID
        US IN THE 12 MONTHS BEFORE THE CLAIM, OR (B) USD $100.
      </p>
      <p>
        You agree to indemnify Expandcast against claims arising from your use
        of the Service, your content, or your violation of these Terms.
      </p>

      <h2 id="termination">9. Termination</h2>
      <p>
        We may suspend or terminate your account at any time. Upon termination,
        your access ceases immediately and your data may be deleted after 30
        days. Sections that by nature should survive (disclaimers, liability,
        governing law) will survive termination.
      </p>

      <h2 id="general">10. General</h2>
      <ul>
        <li>
          <strong>Governing Law:</strong> These Terms are governed by the laws
          of the jurisdiction where the operator of Expandcast resides.
        </li>
        <li>
          <strong>Changes:</strong> We may modify these Terms at any time.
          Material changes will be communicated via email or in-app notice.
        </li>
        <li>
          <strong>Third-Party Trademarks:</strong> YouTube, Google, Twitter/X,
          LinkedIn, Instagram, TikTok, Stripe, and other product names
          mentioned in the Service are trademarks of their respective owners.
          Their use does not imply endorsement or affiliation.
        </li>
      </ul>

      <h2 id="contact">11. Contact</h2>
      <p>
        Questions about these Terms? Reach us at{" "}
        <a href="mailto:contact@expandcast.com">contact@expandcast.com</a>.
      </p>
    </>
  );
}
