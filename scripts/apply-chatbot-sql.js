const fs = require("node:fs");
const path = require("node:path");
const dns = require("node:dns");
const readline = require("node:readline");
const { Client } = require("pg");

dns.setDefaultResultOrder("ipv4first");

const root = path.resolve(__dirname, "..");
const files = [
  path.join(root, "supabase", "chatbot_core.sql"),
  path.join(root, "supabase", "chatbot_seed_initial_knowledge.sql"),
];

function ask(question) {
  if (process.stdin.isTTY) {
    process.stdout.write(question);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    return new Promise((resolve) => {
      let value = "";
      process.stdin.on("data", (char) => {
        if (char === "\r" || char === "\n") {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdout.write("\n");
          resolve(value.trim());
          return;
        }
        if (char === "\u0003") {
          process.exit(130);
        }
        if (char === "\u007f") {
          value = value.slice(0, -1);
          return;
        }
        value += char;
      });
    });
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const connectionString = process.env.CHATBOT_DATABASE_URL || await ask("DATABASE_URL: ");
  if (!connectionString) {
    throw new Error("Missing DATABASE_URL");
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  for (const file of files) {
    const sql = fs.readFileSync(file, "utf8");
    process.stdout.write(`Applying ${path.relative(root, file)}...\n`);
    await client.query(sql);
  }

  const result = await client.query(`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_name like 'chatbot_%'
    order by table_name
  `);

  process.stdout.write(`Created/verified ${result.rowCount} chatbot tables:\n`);
  for (const row of result.rows) {
    process.stdout.write(`- ${row.table_name}\n`);
  }

  const settings = await client.query(`
    select count(*)::int as total
    from public.chatbot_bot_settings
  `);
  process.stdout.write(`Bot settings rows: ${settings.rows[0].total}\n`);

  const knowledge = await client.query(`
    select count(*)::int as total
    from public.chatbot_knowledge_items
  `);
  process.stdout.write(`Knowledge rows: ${knowledge.rows[0].total}\n`);

  await client.end();
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
