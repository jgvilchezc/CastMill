import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for Expandcast — how we collect, use, and protect your data.",
};

const EFFECTIVE_DATE = "April 6, 2026";

const TOC = [
  { id: "what-we-collect", label: "What We Collect" },
  { id: "how-we-use", label: "How We Use It" },
  { id: "third-parties", label: "Third-Party Services" },
  { id: "cookies", label: "Cookies" },
  { id: "data-retention", label: "Data Retention" },
  { id: "your-rights", label: "Your Rights" },
  { id: "security", label: "Security" },
  { id: "changes", label: "Changes" },
  { id: "contact", label: "Contact" },
];

export default function PrivacyPage() {
  return (
    <>
      <div className="mb-10">
        <p className="font-mono text-xs uppercase tracking-widest text-primary mb-2">
          Effective: {EFFECTIVE_DATE}
        </p>
        <h1>Privacy Policy</h1>
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
        This Privacy Policy explains how <strong>Expandcast</strong>{" "}
        (&quot;we,&quot; &quot;us&quot;), operated at{" "}
        <a href="https://expandcast.com">expandcast.com</a>, collects, uses,
        and protects your information. By using the Service, you consent to the
        practices described below.
      </p>

      <h2 id="what-we-collect">1. What We Collect</h2>
      <ul>
        <li>
          <strong>Account info:</strong> Email, name, and OAuth profile data
          when you sign in (e.g., via Google, Instagram, TikTok).
        </li>
        <li>
          <strong>Uploaded content:</strong> Audio/video files and metadata
          (titles, descriptions) you provide.
        </li>
        <li>
          <strong>Generated content:</strong> AI outputs (blog posts, threads,
          thumbnails, etc.) stored in your account.
        </li>
        <li>
          <strong>Usage data:</strong> Pages visited, features used, browser
          type, device info, IP address.
        </li>
        <li>
          <strong>Payment info:</strong> Processed by Stripe. We do not store
          your card details — we only receive transaction IDs, plan type, and
          billing status.
        </li>
      </ul>

      <h2 id="how-we-use">2. How We Use It</h2>
      <p>We use your information to:</p>
      <ul>
        <li>Operate and provide the Service (transcription, AI generation, storage).</li>
        <li>Process payments and manage subscriptions.</li>
        <li>Send transactional emails (verification, receipts, subscription reminders).</li>
        <li>Improve the Service using aggregated, anonymized data.</li>
        <li>Detect fraud, abuse, and security issues.</li>
        <li>Comply with legal obligations.</li>
      </ul>

      <h2 id="third-parties">3. Third-Party Services</h2>
      <p>
        We share data with the following providers, each under their own privacy
        policies:
      </p>

      <div className="not-prose overflow-x-auto my-6">
        <table className="w-full text-sm border border-border">
          <thead>
            <tr className="bg-muted/30 text-left">
              <th className="px-4 py-3 font-mono text-xs uppercase tracking-widest text-muted-foreground border-b border-border">
                Provider
              </th>
              <th className="px-4 py-3 font-mono text-xs uppercase tracking-widest text-muted-foreground border-b border-border">
                Purpose
              </th>
              <th className="px-4 py-3 font-mono text-xs uppercase tracking-widest text-muted-foreground border-b border-border">
                Data Shared
              </th>
            </tr>
          </thead>
          <tbody>
            {[
              {
                provider: "Supabase",
                purpose: "Auth, database, file storage",
                data: "Account info, uploads, generated content",
              },
              {
                provider: "Groq",
                purpose: "Audio/video transcription",
                data: "Uploaded audio/video files (processed in transit, not retained)",
              },
              {
                provider: "OpenRouter",
                purpose: "AI text generation",
                data: "Transcripts and prompts",
              },
              {
                provider: "Hugging Face",
                purpose: "AI image generation (thumbnails)",
                data: "Text prompts",
              },
              {
                provider: "Stripe",
                purpose: "Payment processing",
                data: "Email, billing info, transaction data",
              },
              {
                provider: "Vercel",
                purpose: "Hosting & CDN",
                data: "Standard HTTP request data (IP, headers)",
              },
            ].map(({ provider, purpose, data }) => (
              <tr
                key={provider}
                className="border-b border-border/50 hover:bg-muted/20 transition-colors"
              >
                <td className="px-4 py-3 font-medium text-foreground">
                  {provider}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{purpose}</td>
                <td className="px-4 py-3 text-muted-foreground">{data}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 id="cookies">4. Cookies</h2>
      <ul>
        <li>
          <strong>Essential:</strong> Authentication and session management.
          Required.
        </li>
        <li>
          <strong>Preferences:</strong> Theme settings (dark/light mode).
        </li>
        <li>
          <strong>Analytics:</strong> Usage patterns to help us improve the
          Service.
        </li>
      </ul>
      <p>
        You can manage cookies via your browser settings. Disabling essential
        cookies may prevent the Service from working.
      </p>

      <h2 id="data-retention">5. Data Retention</h2>
      <ul>
        <li>
          <strong>Account data:</strong> Kept while your account is active.
          Deleted within 30 days of account closure.
        </li>
        <li>
          <strong>Uploaded &amp; generated content:</strong> You can delete
          individual episodes anytime. All content is removed when your account
          is closed.
        </li>
        <li>
          <strong>Usage logs:</strong> Kept up to 12 months, then anonymized or
          deleted.
        </li>
        <li>
          <strong>Payment records:</strong> Retained as required by tax/financial
          regulations.
        </li>
      </ul>

      <h2 id="your-rights">6. Your Rights</h2>
      <p>Depending on your jurisdiction, you may:</p>
      <ul>
        <li>
          <strong>Access</strong> a copy of your personal data.
        </li>
        <li>
          <strong>Correct</strong> inaccurate data.
        </li>
        <li>
          <strong>Delete</strong> your data (subject to legal requirements).
        </li>
        <li>
          <strong>Export</strong> your data in a portable format.
        </li>
        <li>
          <strong>Object</strong> to certain processing, including marketing.
        </li>
      </ul>
      <p>
        To exercise any right, email{" "}
        <a href="mailto:contact@expandcast.com">contact@expandcast.com</a>. We
        respond within 30 days.
      </p>
      <p>
        The Service is not intended for anyone under 16. If we learn we&apos;ve
        collected data from a child under 16, we will delete it promptly.
      </p>

      <h2 id="security">7. Security</h2>
      <p>
        We use encryption in transit (TLS), encryption at rest, access controls,
        and regular security reviews. No system is 100% secure, but we take
        reasonable measures to protect your data.
      </p>
      <p>
        Your data may be processed in countries other than your own (including
        the United States) where our providers operate. We rely on appropriate
        safeguards for international transfers where required.
      </p>

      <h2 id="changes">8. Changes</h2>
      <p>
        We may update this policy. Material changes will be communicated via
        email or in-app notice, and the effective date above will be updated.
      </p>

      <h2 id="contact">9. Contact</h2>
      <p>
        Questions about your privacy? Reach us at{" "}
        <a href="mailto:contact@expandcast.com">contact@expandcast.com</a>.
      </p>
    </>
  );
}
