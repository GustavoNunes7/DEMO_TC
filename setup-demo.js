require("dotenv").config();
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");

const envPath = path.join(__dirname, ".env");
const dbPath = path.resolve(process.env.DB_PATH || path.join(__dirname, "techcampus.db"));

function setEnv(key, value) {
  let source = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  const pattern = new RegExp("^" + key + "=.*$", "m");
  const line = key + "=" + value;
  source = pattern.test(source)
    ? source.replace(pattern, line)
    : source + (source && !source.endsWith("\n") ? "\n" : "") + line + "\n";
  fs.writeFileSync(envPath, source, { mode: 0o600 });
  process.env[key] = value;
}

function run(script) {
  const result = spawnSync(process.execPath, [path.join(__dirname, script)], {
    cwd: __dirname, env: process.env, stdio: "inherit"
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

function main() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET === "CHANGE_ME_AUTOMATICAMENTE") {
    setEnv("JWT_SECRET", crypto.randomBytes(48).toString("hex"));
    console.log("[DEMO_TC] Segredo JWT local criado.");
  }

  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_EMAIL.trim()) {
    setEnv("ADMIN_EMAIL", "admin@techcampus.com");
  }

  if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 12) {
    const password = crypto.randomBytes(24).toString("base64url");
    setEnv("ADMIN_PASSWORD", password);
    console.log("\n[DEMO_TC] Senha inicial do administrador (exibida uma única vez):");
    console.log("E-mail: " + process.env.ADMIN_EMAIL);
    console.log("Senha: " + password);
    console.log("Guarde-a em local seguro.\n");
  }

  if (!fs.existsSync(dbPath)) {
    console.log("[DEMO_TC] Preparando produtos de demonstração...");
    run("seed-produtos.js");
  }

  console.log("[DEMO_TC] Preparando conta administrativa...");
  run("seed-admin.js");
}

try { main(); }
catch (error) {
  console.error("[DEMO_TC] Falha na preparação:", error.message);
  process.exitCode = 1;
}
