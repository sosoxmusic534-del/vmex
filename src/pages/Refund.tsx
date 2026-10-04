import LegalPage, { CheckList, XList, type LegalSection } from "./LegalPage";

const sections: LegalSection[] = [
  {
    id: "eligibility",
    title: "1. Refund Eligibility Criteria",
    body: (
      <>
        <p>We issue refunds under the following verified technical conditions:</p>
        <CheckList
          items={[
            <><strong>Unresolvable Server Failure:</strong> If our server nodes experience an unresolvable outage exceeding 24 consecutive hours after you purchase a plan, and our technical support cannot provide a functional alternative node.</>,
            <><strong>Duplicate Transactions:</strong> If you are accidentally billed multiple times for the same order due to a payment gateway glitch, duplicate charges are immediately refunded upon verification.</>,
            <><strong>Inability to Deliver:</strong> If we fail to deliver your configuration key or credentials within 12 hours of receiving verified payment.</>,
          ]}
        />
      </>
    ),
  },
  {
    id: "non-refundable",
    title: "2. Non-Refundable Circumstances",
    body: (
      <>
        <p>Refunds will not be granted under the following circumstances:</p>
        <XList
          items={[
            "More than 24 hours have elapsed since the configuration was activated and delivered.",
            "The customer has consumed more than 2GB of data on the purchased package.",
            "Account termination or suspension resulting from a violation of our Acceptable Use Policy (e.g., abusive scanning, DDoS, copyright violation, illegal activity).",
            "Local hardware or third-party client software misconfiguration on the user's personal device, where our support team has verified the server is 100% operational.",
          ]}
        />
      </>
    ),
  },
  {
    id: "how-to-request",
    title: "3. How to Request a Refund",
    body: (
      <>
        <p>
          To submit a refund request, please email our billing department with the following
          information:
        </p>
        <ol className="legal-steps">
          <li>Your registered account email address.</li>
          <li>
            Order Reference Code (e.g., <code className="legal-code">#VMX-123456</code>).
          </li>
          <li>A brief description of the technical issue encountered.</li>
        </ol>

        <a
          href="mailto:thikshanadhananjaya565@gmail.com?subject=Refund%20Request%20-%20%23VMX-"
          className="legal-mail-btn"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M22 6l-10 7L2 6" />
          </svg>
          <span>
            <small>Send your request to</small>
            thikshanadhananjaya565@gmail.com
          </span>
        </a>
      </>
    ),
  },
  {
    id: "timeline",
    title: "4. Processing Timeline",
    body: (
      <>
        <div className="legal-stat">
          <span className="legal-stat-num">2–5</span>
          <span className="legal-stat-label">business days</span>
        </div>
        <p>
          Approved refunds are typically processed within 2 to 5 business days to the original
          payment method (Bank Transfer, Card, or Crypto equivalent).
        </p>
      </>
    ),
  },
];

export default function Refund() {
  return (
    <LegalPage
      crumb="Refund Policy"
      pill="Customer Assurance"
      title="Refund &"
      titleAccent="Cancellation Policy"
      updated="September 19, 2026"
      intro={
        <>
          <p>
            At VMEX Solutions, customer satisfaction is our top priority. We strive to provide
            transparent, reliable, and high-performance encrypted network tunneling services. This
            Refund &amp; Cancellation Policy outlines the conditions under which refunds are
            provided.
          </p>

          <div className="legal-alert success legal-trial">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 12v10H4V12M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
            </svg>
            <p>
              <strong>Test Before You Pay:</strong> We offer a 100% Free{" "}
              <strong>5GB / 24-Hour Trial Pass</strong> with zero financial commitment so you can
              thoroughly verify speeds, latency, and client software compatibility on your specific
              device and ISP before making a payment.
            </p>
          </div>
        </>
      }
      sections={sections}
    />
  );
}
