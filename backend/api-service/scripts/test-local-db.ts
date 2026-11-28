import { Client } from "pg";
const client = new Client({
  host: "::1",
  port: 5432,
  database: "AquaLoop",
  user: process.env.PGUSER || "aqualoop_app",
  password: process.env.PGPASSWORD,
  connectionTimeoutMillis: 5000,
});

async function main() {
  try {
    await client.connect();

    console.log("Connected to PostgreSQL!");

    const result = await client.query(`
      SELECT
        current_database() AS connected_database,
        inet_server_addr()::text AS server_address,
        inet_server_port() AS server_port
    `);

    console.table(result.rows);

    const databases = await client.query(`
      SELECT datname
      FROM pg_database
      WHERE datistemplate = false
      ORDER BY datname
    `);

    console.log("Available databases:");
    const households = await client.query(`
  SELECT COUNT(*)::int AS total
  FROM aqualoop.households
`);

    console.log("Total AquaLoop households:", households.rows[0].total);
    console.table(databases.rows);
  } catch (error) {
    console.error("Database test failed:", error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
