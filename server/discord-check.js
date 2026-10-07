const { DISCORD_CLIENT_ID: ID, DISCORD_BOT_TOKEN: BOT } = process.env;

const api = async (path) => {
  const r = await fetch(`https://discord.com/api/v10${path}`, { headers: { Authorization: `Bot ${BOT}` } });
  return { ok: r.ok, status: r.status, body: await r.json().catch(() => null) };
};

console.log("\n=== VMEX Discord check ===\n");

const app = await api("/applications/@me");
if (!app.ok) {
  console.log(`✖ Bot token is invalid (HTTP ${app.status}) — reset it in Bot → Reset Token`);
  process.exit(1);
}
console.log(`✔ Bot token works (app: ${app.body.name})`);

console.log(
  app.body.id === ID
    ? "✔ DISCORD_CLIENT_ID matches the bot's app"
    : `✖ DISCORD_CLIENT_ID (${ID}) is a DIFFERENT app than the bot (${app.body.id})`
);

console.log(
  app.body.role_connections_verification_url
    ? `✔ Verification URL set: ${app.body.role_connections_verification_url}`
    : "✖ Linked Roles Verification URL is NOT set (General Information → save it)"
);

const meta = await api(`/applications/${app.body.id}/role-connections/metadata`);
console.log(
  Array.isArray(meta.body) && meta.body.length
    ? `✔ Role options registered: ${meta.body.map((m) => m.key).join(", ")}`
    : "✖ No role options registered — run: npm run discord-register"
);

const guilds = await api("/users/@me/guilds");
console.log(
  Array.isArray(guilds.body) && guilds.body.length
    ? `✔ App is in server(s): ${guilds.body.map((g) => g.name).join(", ")}`
    : "✖ App is not in any server — invite it with OAuth2 → URL Generator → bot"
);

console.log("");