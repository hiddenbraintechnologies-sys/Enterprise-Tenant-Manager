import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "fs/promises";
import { execSync } from "child_process";

// Database schema is synced during build phase via drizzle-kit push
// This prevents deployment startup from hanging on DDL operations

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });

  // Sync database schema during build (before server starts)
  if (process.env.DATABASE_URL) {
    console.log("syncing database schema...");
    try {
      execSync("npx drizzle-kit push --force", { 
        stdio: "inherit",
        timeout: 120000 
      });
      console.log("database schema synced successfully");
    } catch (error) {
      console.error("database schema sync failed (may already be synced):", error);
      // Don't fail the build - schema may already be up to date
    }
  } else {
    console.log("skipping database sync (no DATABASE_URL)");
  }
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
