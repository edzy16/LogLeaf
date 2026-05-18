const { spawnSync } = require("node:child_process");

const [, , variant, command, ...args] = process.argv;

if (!variant || !command) {
  console.error("Usage: node scripts/with-app-variant.js <variant> <command> [...args]");
  process.exit(1);
}

const result = spawnSync(command, args, {
  env: { ...process.env, APP_VARIANT: variant },
  shell: true,
  stdio: "inherit",
});

process.exit(result.status ?? 1);
