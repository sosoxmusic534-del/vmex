import { sendOtpEmail } from "./mailer.js";

const to = process.argv[2];
if (!to) {
  console.log("Usage: npm run test-email -- you@example.com");
  process.exit(1);
}

try {
  await sendOtpEmail(to, "Test User", "123456", "login");
  console.log(`✔ Test email sent to ${to}. Check your inbox (and spam).`);
} catch (e) {
  console.error("✖ Failed:", e.message);
  process.exitCode = 1;
}