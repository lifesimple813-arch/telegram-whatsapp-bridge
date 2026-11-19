import whatsappWeb from "whatsapp-web.js";
import http from "http";

const { Client, LocalAuth } = whatsappWeb;
import { config } from "../config.js";
import { sendAlert } from "../telegram/alert.js";
import log from "../logger.js";

let ready = false;
let reauthAlerted = false;

http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Bot is running!");
}).listen(process.env.PORT || 3000);

const puppeteerConfig = {
  headless: true,
  timeout: 180000,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--no-zygote",
    "--single-process",
  ],
  ...(config.puppeteerExecutablePath && {
    executablePath: config.puppeteerExecutablePath,
  }),
};

const authPath = config.dataDir ? `${config.dataDir}/wwebjs_auth` : "./wwebjs_auth";

let cleanPhone = (process.env.WA_PHONE_NUMBER || "").replace(/[^0-9]/g, "");
if (cleanPhone.startsWith("2180")) {
  cleanPhone = "218" + cleanPhone.slice(4);
}

export const client = new Client({
  authStrategy: new LocalAuth({ dataPath: authPath }),
  authTimeoutMs: 180000,
  puppeteer: puppeteerConfig,
  ...(cleanPhone && {
    pairWithPhoneNumber: {
      phoneNumber: cleanPhone,
      showNotification: true,
    },
  }),
});

client.on("code", async (code) => {
  log.info("========================================");
  log.info(`YOUR WHATSAPP PAIRING CODE: ${code}`);
  log.info("========================================");
  await sendAlert(`🔑 كود ربط واتساب الخاص بكِ الآن هو:\n\n${code}`);
});

client.on("ready", () => {
  ready = true;
  log.info("WhatsApp client is ready!");
});

client.on("authenticated", () => {
  log.info("WhatsApp authenticated!");
});

client.on("auth_failure", async (msg) => {
  log.error(`Auth failure: ${msg}`);
  if (!reauthAlerted) {
    reauthAlerted = true;
    await sendAlert("WhatsApp authentication failed!");
  }
});

export async function initialize() {
  await client.initialize();
}

export async function destroy() {
  await client.destroy();
}

export function isReady() {
  return ready;
}
