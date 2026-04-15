import mysql, { Pool, PoolOptions } from 'mysql2/promise';

// Validar variables de entorno requeridas al iniciar
const requiredEnvVars = ['DB_HOST', 'DB_DATABASE', 'DB_USER', 'DB_PASSWORD'] as const;

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(
      `Variable de entorno requerida no encontrada: ${envVar}. ` +
      `Asegúrate de configurar todas las variables de entorno de la base de datos.`
    );
  }
}

const poolConfig: PoolOptions = {
  host: process.env.DB_HOST!,
  database: process.env.DB_DATABASE!,
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  port: parseInt(process.env.DB_PORT || '3306', 10),
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 5,
  idleTimeout: 60000,
  queueLimit: 0,
  connectTimeout: 30000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
};

// Singleton: una sola pool para toda la aplicación
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = mysql.createPool(poolConfig);
  }
  return pool;
}

/**
 * Ejecuta una consulta SQL usando el connection pool.
 * Usa parámetros preparados para prevenir SQL injection.
 */
export async function query<T>(sql: string, params?: unknown[]): Promise<T> {
  const db = getPool();
  const [results] = await db.execute(sql, params as (string | number | null | Buffer)[]);
  return results as T;
}

/**
 * Ejecuta una consulta y devuelve el resultado junto con el conteo total.
 * Útil para paginación.
 */
export async function queryWithCount<T>(
  sql: string,
  countSql: string,
  params?: unknown[],
  countParams?: unknown[]
): Promise<{ data: T; total: number }> {
  const db = getPool();
  const [results] = await db.execute(sql, params as (string | number | null | Buffer)[]);
  const [countResult] = await db.execute(countSql, countParams as (string | number | null | Buffer)[]);
  const total = (countResult as Array<{ total: number }>)[0]?.total ?? 0;
  return { data: results as T, total };
}

/**
 * Cierra el pool de conexiones (para cleanup en tests o shutdown).
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
