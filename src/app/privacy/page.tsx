import type { Metadata } from "next";
import Link from "next/link";
import { LampTitleLockup } from "@/components/LampBrand";

export const metadata: Metadata = {
  title: "Privacy Policy — Lamp",
  description:
    "How Lamp (lamp119.app) handles your account information, study notes, and Bible highlights.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#FAF7F2] dark:bg-[#141210] text-[#1C1917] dark:text-[#F5F0E8] px-4 py-10 sm:py-16">
      <div className="max-w-2xl mx-auto rounded-3xl bg-[#FDFCFA] dark:bg-[#1D1A17] border border-[#E6DCCB] dark:border-[#2F2A24] p-6 sm:p-10 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#EFE8DC] dark:border-[#2A2520] pb-5">
          <LampTitleLockup size="sm" subtitle="PRIVACY POLICY" />
          <Link
            href="/"
            className="text-xs font-semibold text-[#9A6B24] dark:text-[#DFB164] hover:underline"
          >
            ← Back to Lamp
          </Link>
        </div>

        <div className="space-y-4 text-sm leading-relaxed text-[#3F3A35] dark:text-[#D9D2C8]">
          <p className="text-xs text-[#6B635B] dark:text-[#A39A90]">
            Last updated: November 2026 · <strong>lamp119.app</strong>
          </p>

          <p>
            <strong>Lamp</strong> is a free, non-commercial personal and small-group
            Bible study web app. Your privacy matters, and we collect only the
            minimum information needed to keep your personal study notes and Bible
            highlights synced to your own account.
          </p>

          <section className="space-y-1.5">
            <h2 className="font-serif text-lg font-semibold text-[#1C1917] dark:text-[#F5F0E8]">
              1. Information We Collect
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Account details:</strong> Your display name, email address,
                and optional church or small-group name when you create a profile or
                sign in with Google.
              </li>
              <li>
                <strong>Your study data:</strong> Bible highlights, margin notes,
                word studies, sermon notes, YouTube summaries, and scanned study
                entries that you choose to save inside Lamp.
              </li>
            </ul>
          </section>

          <section className="space-y-1.5">
            <h2 className="font-serif text-lg font-semibold text-[#1C1917] dark:text-[#F5F0E8]">
              2. How Your Information Is Used
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                To sign you in securely and keep your personal library private to
                your account.
              </li>
              <li>
                When you tap a verse, word study, sermon summary, YouTube study, or
                page scan, only the requested text or image is sent to the AI
                service to generate your study response.
              </li>
              <li>
                <strong>No ads, no tracking pixels, and no data selling:</strong> We
                never sell, rent, or share your personal information or study notes
                with advertisers or data brokers.
              </li>
            </ul>
          </section>

          <section className="space-y-1.5">
            <h2 className="font-serif text-lg font-semibold text-[#1C1917] dark:text-[#F5F0E8]">
              3. Google Sign-In
            </h2>
            <p>
              If you choose <strong>Continue with Google</strong>, Lamp requests
              only your basic OpenID profile (name and verified email address) to
              authenticate your Lamp account. Lamp does not access your Gmail,
              Google Drive, Contacts, or Calendar.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="font-serif text-lg font-semibold text-[#1C1917] dark:text-[#F5F0E8]">
              4. Data Deletion &amp; Contact
            </h2>
            <p>
              You can delete any saved note or highlight directly inside Lamp at any
              time. To request full account deletion or ask any privacy question,
              email{" "}
              <a
                href="mailto:nick.w.engle@gmail.com"
                className="text-[#9A6B24] dark:text-[#DFB164] font-semibold hover:underline"
              >
                nick.w.engle@gmail.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
