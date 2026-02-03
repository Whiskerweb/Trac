import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
    title: 'Privacy Policy - Traaaction',
    description: 'Learn how Traaaction collects, uses, and protects your personal data.',
}

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <header className="border-b border-gray-100">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to home
                    </Link>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
                    <p className="text-gray-500">Last updated: February 3, 2026</p>
                </div>

                <div className="prose prose-gray max-w-none">
                    {/* Introduction */}
                    <p className="text-lg text-gray-600 leading-relaxed">
                        Welcome to Traaaction (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;). Traaaction provides a platform
                        for managing affiliate and partner marketing programs, enabling startups to create missions
                        and sellers to earn commissions through tracked referrals.
                    </p>
                    <p className="text-gray-600">
                        We are committed to protecting your privacy and personal data. This Privacy Policy explains
                        how we collect, use, store, and protect your information when you use our platform at
                        traaaction.com (the &quot;Service&quot;).
                    </p>
                    <p className="text-gray-600">
                        By using our Service, you agree to the collection and use of information as described in
                        this policy. Our <Link href="/terms" className="text-violet-600 hover:text-violet-700">Terms of Service</Link> govern
                        all use of our Service and, together with this Privacy Policy, constitute your agreement with us.
                    </p>

                    {/* Section 1 */}
                    <Section number={1} title="Data Controller">
                        <p>
                            The data controller responsible for your personal data is:
                        </p>
                        <div className="bg-gray-50 rounded-lg p-4 not-prose">
                            <p className="font-semibold text-gray-900">Traaaction</p>
                            <p className="text-gray-600">60 rue Amiral Romain-Desfossés</p>
                            <p className="text-gray-600">29200 Brest, France</p>
                            <p className="text-gray-600 mt-2">
                                Email: <a href="mailto:contact@traaaction.com" className="text-violet-600 hover:text-violet-700">contact@traaaction.com</a>
                            </p>
                        </div>
                    </Section>

                    {/* Section 2 */}
                    <Section number={2} title="Information We Collect">
                        <p>
                            We collect different types of information depending on how you interact with our Service:
                        </p>

                        <h4 className="font-semibold text-gray-900 mt-6">For Startups (Program Owners)</h4>
                        <ul>
                            <li>Account information: name, email address, company name</li>
                            <li>Workspace settings and preferences</li>
                            <li>Payment information processed through Stripe (we do not store full card details)</li>
                            <li>Mission and program configurations</li>
                        </ul>

                        <h4 className="font-semibold text-gray-900 mt-6">For Sellers (Affiliates)</h4>
                        <ul>
                            <li>Account information: name, email address</li>
                            <li>Profile information: bio, social media links, profile picture</li>
                            <li>Payout information: Stripe Connect details, PayPal email, or IBAN</li>
                            <li>Performance data: clicks, leads, sales, and commissions</li>
                        </ul>

                        <h4 className="font-semibold text-gray-900 mt-6">For End Users (Visitors on Client Websites)</h4>
                        <p>
                            When you click on a tracking link or visit a website using our tracking SDK, we may collect:
                        </p>
                        <ul>
                            <li>Click identifiers for attribution purposes</li>
                            <li>IP address (used for geolocation, not stored long-term for EU users)</li>
                            <li>Device type and browser information</li>
                            <li>Country and city (derived from IP)</li>
                            <li>Referrer URL</li>
                            <li>Timestamp of the visit</li>
                        </ul>

                        <h4 className="font-semibold text-gray-900 mt-6">Automatically Collected Data</h4>
                        <p>
                            When you use our Service, we automatically collect:
                        </p>
                        <ul>
                            <li>Log data (IP address, browser type, pages visited)</li>
                            <li>Usage analytics to improve our Service</li>
                            <li>Performance and error data</li>
                        </ul>
                    </Section>

                    {/* Section 3 */}
                    <Section number={3} title="Cookies and Tracking Technologies">
                        <p>
                            We use cookies and similar technologies to operate our Service and provide attribution tracking.
                        </p>

                        <h4 className="font-semibold text-gray-900 mt-6">Cookies We Use</h4>
                        <div className="overflow-x-auto">
                            <table className="min-w-full not-prose text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Cookie</th>
                                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Purpose</th>
                                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Duration</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    <tr>
                                        <td className="py-3 px-4 font-mono text-xs text-gray-600">trac_id</td>
                                        <td className="py-3 px-4 text-gray-600">Attribution tracking (click ID)</td>
                                        <td className="py-3 px-4 text-gray-600">90 days</td>
                                    </tr>
                                    <tr>
                                        <td className="py-3 px-4 font-mono text-xs text-gray-600">trac_active_ws</td>
                                        <td className="py-3 px-4 text-gray-600">Active workspace session</td>
                                        <td className="py-3 px-4 text-gray-600">Session</td>
                                    </tr>
                                    <tr>
                                        <td className="py-3 px-4 font-mono text-xs text-gray-600">sb-*</td>
                                        <td className="py-3 px-4 text-gray-600">Authentication (Supabase)</td>
                                        <td className="py-3 px-4 text-gray-600">Session</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <p className="mt-4">
                            We do not use third-party advertising cookies. Our tracking cookies are strictly first-party
                            and used solely for affiliate attribution.
                        </p>
                    </Section>

                    {/* Section 4 */}
                    <Section number={4} title="How We Use Your Information">
                        <p>We use the collected information for the following purposes:</p>
                        <ul>
                            <li><strong>Service delivery:</strong> To provide, operate, and maintain our platform</li>
                            <li><strong>Attribution:</strong> To track and attribute clicks, leads, and sales to the correct sellers</li>
                            <li><strong>Payments:</strong> To process commissions and payouts to sellers</li>
                            <li><strong>Analytics:</strong> To provide startups with insights about their affiliate programs</li>
                            <li><strong>Communication:</strong> To send transactional emails, notifications, and support responses</li>
                            <li><strong>Security:</strong> To detect fraud, prevent abuse, and protect our users</li>
                            <li><strong>Improvement:</strong> To analyze usage patterns and improve our Service</li>
                            <li><strong>Legal compliance:</strong> To comply with applicable laws and regulations</li>
                        </ul>
                    </Section>

                    {/* Section 5 */}
                    <Section number={5} title="Legal Basis for Processing (GDPR)">
                        <p>
                            Under the General Data Protection Regulation (GDPR), we process your personal data based on
                            the following legal grounds:
                        </p>
                        <ul>
                            <li>
                                <strong>Contract performance:</strong> Processing necessary to provide our Service to you
                                (account management, payment processing, attribution tracking)
                            </li>
                            <li>
                                <strong>Legitimate interests:</strong> Processing for fraud prevention, security,
                                and service improvement, where our interests do not override your rights
                            </li>
                            <li>
                                <strong>Legal obligation:</strong> Processing required to comply with applicable laws
                                (tax records, anti-money laundering)
                            </li>
                            <li>
                                <strong>Consent:</strong> Where required, we will obtain your explicit consent
                                (marketing communications)
                            </li>
                        </ul>
                    </Section>

                    {/* Section 6 */}
                    <Section number={6} title="Data Sharing and Third Parties">
                        <p>
                            We share your data with trusted third-party service providers who help us operate our platform.
                            These providers are contractually obligated to protect your data and use it only as instructed.
                        </p>

                        <h4 className="font-semibold text-gray-900 mt-6">Service Providers (Subprocessors)</h4>
                        <div className="overflow-x-auto">
                            <table className="min-w-full not-prose text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Provider</th>
                                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Purpose</th>
                                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Location</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    <tr>
                                        <td className="py-3 px-4 text-gray-900">Stripe</td>
                                        <td className="py-3 px-4 text-gray-600">Payment processing, Stripe Connect</td>
                                        <td className="py-3 px-4 text-gray-600">US (EU data center available)</td>
                                    </tr>
                                    <tr>
                                        <td className="py-3 px-4 text-gray-900">Supabase</td>
                                        <td className="py-3 px-4 text-gray-600">Authentication, database</td>
                                        <td className="py-3 px-4 text-gray-600">EU (Frankfurt)</td>
                                    </tr>
                                    <tr>
                                        <td className="py-3 px-4 text-gray-900">Vercel</td>
                                        <td className="py-3 px-4 text-gray-600">Hosting, edge functions</td>
                                        <td className="py-3 px-4 text-gray-600">Global (EU edge nodes)</td>
                                    </tr>
                                    <tr>
                                        <td className="py-3 px-4 text-gray-900">Tinybird</td>
                                        <td className="py-3 px-4 text-gray-600">Real-time analytics</td>
                                        <td className="py-3 px-4 text-gray-600">EU (GCP Europe-West)</td>
                                    </tr>
                                    <tr>
                                        <td className="py-3 px-4 text-gray-900">Upstash</td>
                                        <td className="py-3 px-4 text-gray-600">Redis cache, rate limiting</td>
                                        <td className="py-3 px-4 text-gray-600">EU (Frankfurt)</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <h4 className="font-semibold text-gray-900 mt-6">Other Disclosures</h4>
                        <p>We may also disclose your information:</p>
                        <ul>
                            <li>To comply with legal obligations or respond to lawful requests</li>
                            <li>To protect our rights, privacy, safety, or property</li>
                            <li>In connection with a merger, acquisition, or sale of assets (with prior notice)</li>
                            <li>With your consent for any other purpose</li>
                        </ul>
                    </Section>

                    {/* Section 7 */}
                    <Section number={7} title="International Data Transfers">
                        <p>
                            Your data may be transferred to and processed in countries outside the European Economic
                            Area (EEA). When we transfer data outside the EEA, we ensure appropriate safeguards are
                            in place, including:
                        </p>
                        <ul>
                            <li>Standard Contractual Clauses (SCCs) approved by the European Commission</li>
                            <li>Adequacy decisions where applicable</li>
                            <li>Data Processing Agreements with all subprocessors</li>
                        </ul>
                    </Section>

                    {/* Section 8 */}
                    <Section number={8} title="Data Retention">
                        <p>We retain your personal data only as long as necessary for the purposes outlined in this policy:</p>
                        <ul>
                            <li><strong>Account data:</strong> Until you delete your account, plus a reasonable period for backup</li>
                            <li><strong>Transaction data:</strong> 7 years (legal requirement for financial records)</li>
                            <li><strong>Analytics data:</strong> 24 months for detailed data, aggregated data may be kept longer</li>
                            <li><strong>Tracking data:</strong> 90 days for attribution purposes</li>
                            <li><strong>Log data:</strong> 30 days for security and debugging</li>
                        </ul>
                    </Section>

                    {/* Section 9 */}
                    <Section number={9} title="Your Rights Under GDPR">
                        <p>
                            If you are located in the European Union or European Economic Area, you have the following
                            rights regarding your personal data:
                        </p>
                        <ul>
                            <li><strong>Right of access:</strong> Request a copy of the personal data we hold about you</li>
                            <li><strong>Right to rectification:</strong> Request correction of inaccurate or incomplete data</li>
                            <li><strong>Right to erasure:</strong> Request deletion of your personal data (&quot;right to be forgotten&quot;)</li>
                            <li><strong>Right to restriction:</strong> Request limitation of processing in certain circumstances</li>
                            <li><strong>Right to data portability:</strong> Receive your data in a structured, machine-readable format</li>
                            <li><strong>Right to object:</strong> Object to processing based on legitimate interests</li>
                            <li><strong>Right to withdraw consent:</strong> Withdraw consent at any time (where processing is based on consent)</li>
                        </ul>
                        <p>
                            To exercise any of these rights, please contact us at{' '}
                            <a href="mailto:contact@traaaction.com" className="text-violet-600 hover:text-violet-700">
                                contact@traaaction.com
                            </a>. We will respond within 30 days.
                        </p>
                        <p>
                            You also have the right to lodge a complaint with your local Data Protection Authority
                            if you believe we are not handling your data in compliance with GDPR.
                        </p>
                    </Section>

                    {/* Section 10 */}
                    <Section number={10} title="Data Controller vs Data Processor">
                        <p>
                            When you use Traaaction&apos;s tracking features on your website (as a Startup), the following
                            roles apply:
                        </p>
                        <ul>
                            <li>
                                <strong>You (the Startup)</strong> act as the <em>Data Controller</em> for your end users&apos; data.
                                You are responsible for obtaining appropriate consent, informing users about data collection,
                                and responding to their privacy requests.
                            </li>
                            <li>
                                <strong>Traaaction</strong> acts as a <em>Data Processor</em>, processing data on your behalf
                                according to your instructions and our Data Processing Agreement.
                            </li>
                        </ul>
                        <p>
                            As a Startup using our Service, you should ensure your own privacy policy adequately
                            informs your users about the use of Traaaction for affiliate tracking.
                        </p>
                    </Section>

                    {/* Section 11 */}
                    <Section number={11} title="Security">
                        <p>
                            We implement appropriate technical and organizational measures to protect your personal data:
                        </p>
                        <ul>
                            <li>Encryption in transit (TLS/HTTPS) and at rest</li>
                            <li>Secure authentication with Supabase Auth</li>
                            <li>Regular security assessments and monitoring</li>
                            <li>Access controls and audit logging</li>
                            <li>Input validation and SQL injection protection</li>
                            <li>Rate limiting to prevent abuse</li>
                        </ul>
                        <p>
                            While we strive to protect your data, no method of transmission over the Internet
                            is 100% secure. We cannot guarantee absolute security.
                        </p>
                    </Section>

                    {/* Section 12 */}
                    <Section number={12} title="Children's Privacy">
                        <p>
                            Our Service is not intended for individuals under the age of 18. We do not knowingly
                            collect personal data from children. If you become aware that a child has provided us
                            with personal data, please contact us, and we will take steps to delete such information.
                        </p>
                    </Section>

                    {/* Section 13 */}
                    <Section number={13} title="Changes to This Policy">
                        <p>
                            We may update this Privacy Policy from time to time. When we make significant changes,
                            we will notify you by:
                        </p>
                        <ul>
                            <li>Posting the updated policy on this page with a new &quot;Last updated&quot; date</li>
                            <li>Sending an email notification to registered users (for material changes)</li>
                        </ul>
                        <p>
                            We encourage you to review this policy periodically. Your continued use of the Service
                            after changes constitutes acceptance of the updated policy.
                        </p>
                    </Section>

                    {/* Section 14 */}
                    <Section number={14} title="Contact Us">
                        <p>
                            If you have any questions about this Privacy Policy or our data practices, please contact us:
                        </p>
                        <div className="bg-gray-50 rounded-lg p-4 not-prose">
                            <p className="font-semibold text-gray-900">Traaaction</p>
                            <p className="text-gray-600">60 rue Amiral Romain-Desfossés</p>
                            <p className="text-gray-600">29200 Brest, France</p>
                            <p className="text-gray-600 mt-2">
                                Email: <a href="mailto:contact@traaaction.com" className="text-violet-600 hover:text-violet-700">contact@traaaction.com</a>
                            </p>
                        </div>
                    </Section>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-gray-100 py-8">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <p className="text-center text-sm text-gray-400">
                        © {new Date().getFullYear()} Traaaction. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    )
}

function Section({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
    return (
        <section className="mt-12 first:mt-0">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <span className="flex-shrink-0 w-8 h-8 bg-violet-100 text-violet-700 rounded-full flex items-center justify-center text-sm font-bold">
                    {number}
                </span>
                {title}
            </h2>
            <div className="text-gray-600 space-y-4">
                {children}
            </div>
        </section>
    )
}
