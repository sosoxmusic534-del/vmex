import db from "./db.js";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.log("Usage: npm run make-admin -- you@example.com");
  process.exit(1);
}

const { changes } = db.prepare("UPDATE users SET role = 'admin' WHERE email = ?").run(email);
console.log(changes ? `✔ ${email} is now an admin. Log out and back in.` : `✖ No user found with ${email}. Register first.`);