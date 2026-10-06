import Link from "next/link";
import Logo from "@/components/ui/logo";

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">Effective date: 2026-08-11</p>

        <div className="prose prose-sm dark:prose-invert mt-8 max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold">1. About these terms</h2>
            <p>
              These Terms of Service (&quot;Terms&quot;) govern your use of the Speak up Mama app and
              website. By creating an account or using the service, you agree to these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">2. Not medical advice</h2>
            <p>
              Speak up Mama provides general wellness information and support tools. It does{" "}
              <strong>not</strong> provide medical advice, diagnosis, or treatment. If you are
              experiencing a medical or mental-health emergency, contact your local emergency
              services immediately.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">3. Your account</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>You must be 13 or older to use the app.</li>
              <li>You are responsible for keeping your login credentials confidential.</li>
              <li>You agree to provide accurate information and keep your profile up to date.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">4. Acceptable use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Post abusive, harassing, or harmful content.</li>
              <li>Share someone else&apos;s private information without consent.</li>
              <li>Attempt to disrupt, abuse, or gain unauthorised access to the service.</li>
              <li>Use the service for any unlawful purpose.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">5. Community guidelines</h2>
            <p>
              Our community is a supportive space for mothers and families. We may remove content or
              suspend accounts that breach these Terms or harm other users.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">6. Content you post</h2>
            <p>
              You retain ownership of the content you post. You grant Speak up Mama a limited licence to
              store, display, and process that content to provide the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">7. Terminating your account</h2>
            <p>
              You may delete your account at any time from the app. We may suspend or terminate
              access if you violate these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">8. Limitation of liability</h2>
            <p>
              To the fullest extent permitted by law, Speak up Mama is not liable for indirect or
              consequential losses arising from your use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">9. Changes &amp; contact</h2>
            <p>
              We may update these Terms from time to time. Continued use after changes means you
              accept the updated Terms. Questions? Contact us at{" "}
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
            <Link href="/privacy" className="hover:text-foreground">
              Privacy Policy
            </Link>
            <span>© 2026 Speak up Mama. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
