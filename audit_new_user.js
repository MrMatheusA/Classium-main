import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  console.log("=== TRIGGERS ON auth.users ===");
  try {
    const triggersRes = await client.query(`
      SELECT 
          trg.tgname AS trigger_name,
          tbl.relname AS table_name,
          ns.nspname AS schema_name,
          p.proname AS function_name,
          pg_get_triggerdef(trg.oid) AS trigger_definition
      FROM pg_trigger trg
      JOIN pg_class tbl ON trg.tgrelid = tbl.oid
      JOIN pg_namespace ns ON tbl.relnamespace = ns.oid
      JOIN pg_proc p ON trg.tgfoid = p.oid
      WHERE tbl.relname = 'users' AND ns.nspname = 'auth';
    `);
    console.log(JSON.stringify(triggersRes.rows, null, 2));
  } catch (e) {
    console.error("Error querying triggers:", e);
  }

  console.log("\n=== FUNCTIONS LIKE new_user IN public SCHEMA ===");
  try {
    const funcsRes = await client.query(`
      SELECT 
          p.proname as routine_name,
          n.nspname as routine_schema,
          l.lanname as external_language,
          p.prosecdef as is_security_definer,
          pg_get_functiondef(p.oid) as function_definition
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      JOIN pg_language l ON p.prolang = l.oid
      WHERE n.nspname = 'public' AND p.proname LIKE '%new_user%';
    `);
    console.log(JSON.stringify(funcsRes.rows, null, 2));
  } catch (e) {
    console.error("Error querying functions:", e);
  }

  await client.end();
}

run().catch(console.error);
