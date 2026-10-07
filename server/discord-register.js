const { DISCORD_CLIENT_ID, DISCORD_BOT_TOKEN } = process.env;

if (!DISCORD_CLIENT_ID || !DISCORD_BOT_TOKEN) {
  console.error("DISCORD_CLIENT_ID and DISCORD_BOT_TOKEN are required.");
  process.exit(1);
}

const metadata = [
  { key: "active_plan", name: "Has an active plan", description: "Has an active VMEX subscription", type: 4 },
  { key: "connected", name: "Connected now", description: "Currently connected to VMEX", type: 4 },
  { key: "orders", name: "Completed orders", description: "Number of completed VMEX orders", type: 2 },
  { key: "member_since", name: "Member for", description: "Date the VMEX account was created", type: 3 },
];

const response = await fetch(`https://discord.com/api/v10/applications/${DISCORD_CLIENT_ID}/role-connections/metadata`, {
  method: "PUT",
  headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}`, "Content-Type": "application/json" },
  body: JSON.stringify(metadata),
});

if (!response.ok) {
  console.error(`✖ Failed (${response.status}): ${await response.text()}`);
  process.exit(1);
}

console.log("✔ Linked role options registered");
