import LegalPage, { CheckList, type LegalSection } from "./LegalPage";

const sections: LegalSection[] = [
  {
    id: "information-we-collect",
    title: "1. Information We Collect",
    body: (
      <>
        <p>
          When you register for an account, request a free trial, or purchase a configuration
          plan, we may collect the following personal information:
        </p>
        <CheckList
          items={[
            <><strong>Account Data:</strong> Your name, email address, and optional phone/WhatsApp contact information.</>,
            <><strong>Technical Connection Records:</strong> Bandwidth consumption totals (bytes transmitted) to enforce plan quotas and connection timestamps for diagnostic stability.</>,
            <><strong>Payment Verification Data:</strong> Transaction reference IDs and customer-uploaded payment receipt images for manual accounting verification.</>,
          ]}
        />
      </>
    ),
  },
  {
    id: "no-logging",
    title: "2. Strict No-Activity-Logging Policy",
    body: (
      <>
        <p>
          VMEX Solutions operates under a strict privacy-first engineering principle. We do{" "}
          <strong>NOT</strong> monitor, record, inspect, or store your online browsing activity,
          websites visited, DNS lookup history, or content transferred through our encrypted
          tunnels.
        </p>
        <div className="legal-alert success">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          <p>
            All proxy data passing through our servers is encrypted using modern cryptographic
            protocols (<strong>XTLS Reality, TLS, AES-256</strong>).
          </p>
        </div>
      </>
    ),
  },
  {
    id: "advertising",
    title: "3. Third-Party Advertising Disclosure",
    body: (
      <>
        <p>
          Some third-party advertising partners may use cookies and similar tracking technologies to
          personalize advertisements or measure campaign performance across websites.
        </p>
        <CheckList
          items={[
            "Third party vendors, including Google, use cookies to serve ads based on a user's prior visits to your website or other websites.",
            "Google's use of advertising cookies enables it and its partners to serve ads to your users based on their visit to your sites and/or other sites on the Internet.",
            <>
              Users may opt out of personalized advertising by visiting{" "}
              <a href="https://adssettings.google.com" target="_blank" rel="noreferrer">Google Ads Settings</a>{" "}
              or through the Network Advertising Initiative opt-out page at{" "}
              <a href="https://www.aboutads.info/choices" target="_blank" rel="noreferrer">aboutads.info</a>.
            </>,
          ]}
        />
      </>
    ),
  },
  {
    id: "log-files",
    title: "4. Log Files and Web Analytics",
    body: (
      <p>
        Like many modern websites, VMEX Solutions follows a standard procedure of utilizing log
        files. These files record visits when visitors browse websites. The information collected
        by log files includes internet protocol (IP) addresses, browser type, Internet Service
        Provider (ISP), date and time stamp, referring/exit pages, and device types. These are not
        linked to any information that is personally identifiable and are used solely for
        analyzing trends, administering the site, tracking traffic trends, and gathering
        demographic information.
      </p>
    ),
  },
  {
    id: "cookies",
    title: "5. Cookies & Local Storage",
    body: (
      <p>
        We use browser cookies and Local Storage to maintain active sessions, support essential site
        functionality, and remember non-sensitive user preferences. You can choose to disable
        cookies through your individual browser options.
      </p>
    ),
  },
  {
    id: "ccpa",
    title: "6. CCPA Privacy Rights (Do Not Sell My Personal Information)",
    body: (
      <>
        <p>
          Under the California Consumer Privacy Act (CCPA), California consumers have the right to
          request that a business disclose the categories and specific pieces of personal data
          that a business has collected, and request that a business delete any personal data
          collected.
        </p>
        <p>
          VMEX Solutions does <strong>NOT</strong> sell your personal information to any third
          party.
        </p>
      </>
    ),
  },
  {
    id: "gdpr",
    title: "7. GDPR Data Protection Rights",
    body: (
      <>
        <p>
          Every user is entitled to the following rights under the General Data Protection
          Regulation (GDPR):
        </p>
        <CheckList
          items={[
            "The right to access your personal data stored on our platform.",
            "The right to rectification of inaccurate or incomplete information.",
            "The right to erasure of your personal data upon request.",
            "The right to restrict or object to the processing of your data.",
          ]}
        />
      </>
    ),
  },
  {
    id: "children",
    title: "8. Children's Privacy",
    body: (
      <p>
        VMEX Solutions does not knowingly collect any Personal Identifiable Information from
        children under the age of 13. If you believe your child provided this kind of information
        on our website, please contact us immediately, and we will promptly remove such records
        from our databases.
      </p>
    ),
  },
  {
    id: "contact",
    title: "9. Contact Us",
    body: (
      <>
        <p>
          If you have questions, feedback, or requests regarding our Privacy Policy, please contact
          our Data Protection Officer:
        </p>
        <div className="legal-contact">
          <a href="mailto:thikshanadhananjaya565@gmail.com">
            <span>Email</span>
            thikshanadhananjaya565@gmail.com
          </a>
          <a href="https://www.vmex.net/" target="_blank" rel="noreferrer">
            <span>Official Website</span>
            https://www.vmex.net/
          </a>
        </div>
      </>
    ),
  },
];

export default function Privacy() {
  return (
    <LegalPage
      crumb="Privacy Policy"
      pill="Legal Information"
      title="Privacy"
      titleAccent="Policy"
      updated="September 19, 2026"
      effective="January 1, 2026"
      intro={
        <p>
          At VMEX Solutions (accessible via{" "}
          <a href="https://www.vmex.net/" target="_blank" rel="noreferrer">https://www.vmex.net/</a>),
          we prioritize the privacy and security of our visitors and registered users. This Privacy
          Policy document outlines the types of information that is collected and recorded by VMEX
          Solutions and how we use, safeguard, and disclose that information.
        </p>
      }
      sections={sections}
    />
  );
}
