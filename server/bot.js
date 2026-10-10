import {
  ActionRowBuilder, ActivityType, ButtonBuilder, ButtonStyle, Client, EmbedBuilder, Events,
  GatewayIntentBits, MessageFlags, REST, Routes, SlashCommandBuilder,
} from "discord.js";
import db from "./db.js";
import { enrichServices } from "./xui.js";

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const APP_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const SITE = (process.env.PUBLIC_URL || "https://vmex.net").replace(/\/+$/, "");
const COLOR = 0x5ab4ff;

const q = {
  linkByDiscord: db.prepare("SELECT * FROM discord_links WHERE discord_id = ?"),
  user: db.prepare("SELECT id, name FROM users WHERE id = ?"),
  services: db.prepare(`
    SELECT s.*, p.name AS plan_name FROM services s
    LEFT JOIN plans p ON p.id = s.plan_id WHERE s.user_id = ? ORDER BY s.id DESC`),
  activeCustomers: db.prepare("SELECT COUNT(DISTINCT user_id) AS n FROM services WHERE expires_at > ?"),
};

const fmtBytes = (b) => {
  b = Number(b || 0);
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  while (b >= 1024 && i < u.length - 1) {
    b /= 1024;
    i++;
  }
  return `${b.toFixed(i >= 3 ? 1 : 0)} ${u[i]}`;
};

const linkButton = () =>
  new ActionRowBuilder().addComponents(
    new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Connect Discord").setURL(`${SITE}/portal/account?discord=link#discord`),
    new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Buy a plan").setURL(`${SITE}/portal/store`)
  );

const commands = [
  new SlashCommandBuilder().setName("plan").setDescription("See your VMEX plan, data used and expiry"),
  new SlashCommandBuilder().setName("link").setDescription("Connect your Discord account to VMEX"),
].map((c) => c.toJSON());

async function handlePlan(interaction) {
  const link = q.linkByDiscord.get(interaction.user.id);
  if (!link) {
    return interaction.reply({
      flags: MessageFlags.Ephemeral,
      embeds: [new EmbedBuilder().setColor(COLOR).setTitle("Account not connected")
        .setDescription("Connect your Discord account on the VMEX website to see your plan here.")],
      components: [linkButton()],
    });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const user = q.user.get(link.user_id);
  const rows = q.services.all(link.user_id);
  if (!rows.length) {
    return interaction.editReply({
      embeds: [new EmbedBuilder().setColor(COLOR).setTitle(`Hi ${user?.name ?? "there"}`)
        .setDescription("You don't have a VMEX plan yet.")],
      components: [linkButton()],
    });
  }

  let services = rows;
  try {
    services = await enrichServices(rows);
  } catch {
    /* panel offline — show what we have */
  }

  const now = Date.now();
  const embed = new EmbedBuilder()
    .setColor(COLOR)
    .setTitle(`${user?.name ?? "Your"} VMEX plans`)
    .setFooter({ text: "VMEX · Fast, private V2Ray" });

  for (const [i, svc] of services.slice(0, 5).entries()) {
    const raw = rows[i];
    const active = raw.expires_at > now;
    const used = svc.usedBytes ?? 0;
    const total = svc.totalBytes ?? raw.total_bytes ?? 0;
    embed.addFields({
      name: `${raw.plan_name || raw.name}  ·  ${active ? "Active" : "Expired"}`,
      value: [
        `Data: ${fmtBytes(used)}${total ? ` of ${fmtBytes(total)}` : " (unlimited)"}`,
        `${active ? "Expires" : "Expired"}: <t:${Math.floor(raw.expires_at / 1000)}:R>`,
      ].join("\n"),
    });
  }
  return interaction.editReply({ embeds: [embed] });
}

function rotateStatus(client) {
  const states = [
    () => ({ type: ActivityType.Watching, name: `${q.activeCustomers.get(Date.now()).n} active customers` }),
    () => ({ type: ActivityType.Playing, name: SITE.replace(/^https?:\/\//, "") }),
    () => ({ type: ActivityType.Listening, name: "/plan" }),
  ];
  let i = 0;
  const tick = () => {
    try {
      client.user.setPresence({ status: "online", activities: [states[i % states.length]()] });
    } catch {
      /* ignore */
    }
    i++;
  };
  tick();
  setInterval(tick, 60_000);
}

export async function startBot() {
  if (!TOKEN || !APP_ID) {
    console.warn("! Discord bot not started (DISCORD_BOT_TOKEN / DISCORD_CLIENT_ID missing)");
    return;
  }

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.once(Events.ClientReady, async (c) => {
    console.log(`✔ Discord bot online as ${c.user.tag}`);
    rotateStatus(c);
    try {
      const rest = new REST().setToken(TOKEN);
      const route = GUILD_ID ? Routes.applicationGuildCommands(APP_ID, GUILD_ID) : Routes.applicationCommands(APP_ID);
      await rest.put(route, { body: commands });
      console.log("✔ Slash commands registered");
    } catch (e) {
      console.error("[bot] couldn't register commands:", e.message);
    }
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    try {
      if (interaction.commandName === "plan") await handlePlan(interaction);
      if (interaction.commandName === "link") {
        await interaction.reply({
          flags: MessageFlags.Ephemeral,
          embeds: [new EmbedBuilder().setColor(COLOR).setTitle("Connect your VMEX account")
            .setDescription("Link Discord on the website to get your plan role and use /plan.")],
          components: [linkButton()],
        });
      }
    } catch (e) {
      console.error("[bot] command error:", e.message);
      const msg = { content: "Something went wrong. Please try again.", flags: MessageFlags.Ephemeral };
      if (interaction.deferred || interaction.replied) interaction.editReply(msg).catch(() => {});
      else interaction.reply(msg).catch(() => {});
    }
  });

  client.on("error", (e) => console.error("[bot]", e.message));
  await client.login(TOKEN).catch((e) => console.error("[bot] login failed:", e.message));
}