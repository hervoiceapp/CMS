import Link from "next/link";
import Logo from "@/components/ui/logo";

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="inline-flex items-center gap-2">
            <Logo className="h-8 w-8" />
            <span className="font-semibold">Speak up Mama</span>
          </Link>
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
            CMS Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Effective date: 2026-08-11</p>

        <div className="prose prose-sm dark:prose-invert mt-8 max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold">1. Who we are</h2>
            <p>
              Speak up Mama (the &quot;App&quot;) is a maternal mental-health companion for mothers and
              families. This Privacy Policy explains what personal data we collect, why we collect
              it, and how you can control it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">2. Data we collect</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>Account data</strong> — your name, email address, phone number, date of
                birth, gender, and preferred language.
              </li>
              <li>
                <strong>Profile &amp; content</strong> — information you add to your profile,
                community posts, and friend requests.
              </li>
              <li>
                <strong>Health-related data</strong> — screening responses and notes you provide
                through assessments and booking forms.
              </li>
              <li>
                <strong>Usage data</strong> — which articles, podcasts, videos, and doctors you
                interact with, and anonymised analytics events.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">3. Why we process your data</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>To create and manage your account (contractual necessity).</li>
              <li>
                To deliver the wellness content, screening tools, and booking features you ask for.
              </li>
              <li>To connect you with other mothers in the community.</li>
              <li>To keep the service safe, debug issues, and improve the product.</li>
            </ul>
            <p className="mt-3">
              Where we process health-related data, we rely on your explicit consent, which you give
              when you use the screening or booking features.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">4. Sharing your data</h2>
            <p>
              We do not sell your personal data. We share data only with service providers that help
              us operate (e.g. hosting and cloud infrastructure such as Firebase/Google Cloud),
              under confidentiality obligations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">5. Your rights</h2>
            <p>Depending on where you live, you may have the right to:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Access, correct, or delete your personal data.</li>
              <li>Withdraw consent at any time.</li>
              <li>Export or object to processing of your data.</li>
            </ul>
            <p className="mt-3">
              You can delete your account at any time from the app&apos;s profile screen, which
              removes your profile and account data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">6. Retention &amp; security</h2>
            <p>
              We keep your data only as long as needed to provide the service, comply with legal
              obligations, and resolve disputes. Data is stored using industry-standard encryption
              and access controls.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">7. Contact</h2>
            <p>
              Questions about this policy? Contact us at{" "}
              <a href="mailto:support@hervoice.app" className="text-primary underline">
                support@hervoice.app
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t bg-background">
        <div className="mx-auto max-w-3xl px-6 py-6 text-sm text-muted-foreground">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/terms" className="hover:text-foreground">
              Terms of Service
            </Link>
            <span>© 2026 Speak up Mama. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
