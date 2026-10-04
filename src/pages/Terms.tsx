import LegalPage, { XList, type LegalSection } from "./LegalPage";

const sections: LegalSection[] = [
  {
    id: "service-description",
    title: "1. Service Description",
    body: (
      <p>
        VMEX Solutions provides secure encrypted network tunneling, high-speed routing
        configurations, and low-latency network proxy connections utilizing V2Ray, VLESS, XTLS
        Reality, and Trojan protocols. Our servers are hosted in high-tier datacenters in Singapore
        and India, designed to improve connection stability, optimize latency, and safeguard user
        communication data.
      </p>
    ),
  },
  {
    id: "acceptable-use",
    title: "2. Strict Acceptable Use Policy (AUP)",
    body: (
      <>
        <p>
          You agree to use our services solely for lawful, legitimate personal or business
          purposes. You expressly agree <strong>NOT</strong> to engage in:
        </p>
        <XList
          items={[
            "Unauthorized network intrusions, unauthorized penetration testing, port scanning, or malicious vulnerability exploitation.",
            "Distributed Denial of Service (DDoS) attacks, automated botnet deployment, or flooding attacks.",
            "Distribution of malware, trojans, ransomware, or malicious software.",
            "Sending unsolicited bulk commercial messages (SPAM) or unauthorized phishing campaigns.",
            "Circumvention of legitimate digital rights management (DRM) or unauthorized distribution of copyright-protected materials.",
            "Any activity that violates local, national, or international telecommunications and cybersecurity legislation.",
          ]}
        />
        <div className="legal-alert">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01" />
          </svg>
          <p>
            <strong>Violation Notice:</strong> Any account found engaging in abusive or prohibited
            activities will be suspended or permanently terminated without prior notice or refund.
          </p>
        </div>
      </>
    ),
  },
  {
    id: "accounts",
    title: "3. User Accounts and Credentials",
    body: (
      <p>
        Users are responsible for safeguarding their login credentials and generated connection
        keys (UUID, configuration URLs, and QR codes). You agree not to resell, redistribute, or
        publicly leak your private connection configurations unless explicitly permitted by an
        authorized enterprise plan.
      </p>
    ),
  },
  {
    id: "free-trial",
    title: "4. Free Trial Terms",
    body: (
      <p>
        We offer a one-time Free Trial pass (<strong>5GB / 24 Hours</strong>) per verified customer
        account to allow users to evaluate server speeds, connection latency, and protocol
        compatibility with their local network before committing to a paid plan. Automated abuse
        or creation of multiple duplicate accounts to exploit free trial passes is strictly
        prohibited.
      </p>
    ),
  },
  {
    id: "availability",
    title: "5. Service Availability & Maintenance",
    body: (
      <p>
        While VMEX Solutions strives to provide <strong>99.9% uptime</strong> across all Singapore
        and India server nodes, services may occasionally experience brief scheduled maintenance or
        upstream carrier interruptions. We make commercially reasonable efforts to schedule
        maintenance during off-peak hours and notify clients in advance.
      </p>
    ),
  },
  {
    id: "intellectual-property",
    title: "6. Intellectual Property",
    body: (
      <p>
        All website branding, logos, graphics, user interface designs, and proprietary automation
        scripts on vmex.net are the property of VMEX Solutions and are protected by intellectual
        property laws. Unauthorized reproduction or reverse engineering is prohibited.
      </p>
    ),
  },
  {
    id: "liability",
    title: "7. Limitation of Liability",
    body: (
      <p>
        To the maximum extent permitted by law, VMEX Solutions and its developers shall not be
        liable for any indirect, incidental, or consequential damages resulting from the use or
        inability to use our network services, carrier disruptions, or third-party software
        failures.
      </p>
    ),
  },
  {
    id: "contact",
    title: "8. Contact Information",
    body: (
      <>
        <p>For questions or notices regarding these Terms &amp; Conditions, please contact us at:</p>
        <div className="legal-contact">
          <a href="mailto:thikshanadhananjaya565@gmail.com">
            <span>Email</span>
            thikshanadhananjaya565@gmail.com
          </a>
          <a href="https://www.vmex.net/" target="_blank" rel="noreferrer">
            <span>Website</span>
            https://www.vmex.net/
          </a>
        </div>
      </>
    ),
  },
];

export default function Terms() {
  return (
    <LegalPage
      crumb="Terms & Conditions"
      pill="User Agreement"
      title="Terms &"
      titleAccent="Conditions"
      updated="September 19, 2026"
      effective="January 1, 2026"
      intro={
        <p>
          Welcome to VMEX Solutions. These Terms &amp; Conditions govern your access to and use of
          the website <a href="https://www.vmex.net/" target="_blank" rel="noreferrer">https://www.vmex.net/</a> and
          our encrypted proxy configuration services. By registering, accessing, or utilizing our
          services, you confirm that you have read, understood, and agreed to be bound by these
          terms.
        </p>
      }
      sections={sections}
    />
  );
}
