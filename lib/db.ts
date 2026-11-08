import 'server-only';
import { promises as fs } from 'fs';
import path from 'path';
import { pastaDados } from './arquivos';
import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';

/**
 * Where every record lives. Each collection (clientes, pedidos, envios...) is a set of JSON documents.
 *
 * - On the server (Hostinger): one MySQL table, `registros`, one row per document. New fields need no
 *   database change, so updates to the system never touch existing data.
 * - On a computer without MySQL configured: JSON files in the .data/db folder, so the system can be tried
 *   without any account.
 */

export type Colecao = 'clientes' | 'pedidos' | 'envios' | 'config' | 'usuarios' | 'historico';
export type Doc = { id: string };

const PASTA_LOCAL = path.join(pastaDados(), 'db');

export function usandoMysql() {
  return !!(process.env.DATABASE_URL || process.env.MYSQL_HOST);
}

// ---------- MySQL ----------

const conexao = globalThis as unknown as { __dbPool?: Promise<Pool> | null };

async function criarPool(): Promise<Pool> {
  const mysql = await import('mysql2/promise');
  const p = process.env.DATABASE_URL
    ? mysql.createPool({ uri: process.env.DATABASE_URL, connectionLimit: 5, charset: 'utf8mb4' })
    : mysql.createPool({
        host: process.env.MYSQL_HOST,
        port: Number(process.env.MYSQL_PORT || 3306),
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        connectionLimit: 5,
        charset: 'utf8mb4',
      });
  await p.query(`CREATE TABLE IF NOT EXISTS registros (
    colecao VARCHAR(32) NOT NULL,
    id VARCHAR(64) NOT NULL,
    chave VARCHAR(80) NULL,
    dados LONGTEXT NOT NULL,
    atualizado_em DATETIME NOT NULL,
    PRIMARY KEY (colecao, id),
    UNIQUE KEY chave_unica (colecao, chave)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  return p;
}

function mysqlPool() {
  // One shared pool for pages and API routes (see the note on the local cache below).
  if (!conexao.__dbPool) {
    const p = criarPool();
    conexao.__dbPool = p;
    p.catch(() => (conexao.__dbPool = null));
  }
  return conexao.__dbPool;
}

type Linha = RowDataPacket & { dados: string };
const agora = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

// ---------- local JSON files ----------

// Kept on globalThis: Next.js loads this module separately for pages and for API routes,
// and both must see the same data and the same write queue.
const global_ = globalThis as unknown as {
  __dbLocal?: { cache: Map<Colecao, Map<string, { doc: Doc; chave: string | null }>>; fila: Promise<unknown> };
};
const local = (global_.__dbLocal ??= { cache: new Map(), fila: Promise.resolve() });
const cache = local.cache;
/** Runs local writes one at a time, so two saves never overwrite each other. */
function emFila<T>(fn: () => Promise<T>): Promise<T> {
  const r = local.fila.then(fn, fn);
  local.fila = r.catch(() => undefined);
  return r;
}

async function lerColecao(col: Colecao) {
  let m = cache.get(col);
  if (m) return m;
  m = new Map();
  try {
    const bruto = JSON.parse(await fs.readFile(path.join(PASTA_LOCAL, `${col}.json`), 'utf8')) as { doc: Doc; chave: string | null }[];
    for (const r of bruto) m.set(r.doc.id, r);
  } catch {
    // No file yet: empty collection.
  }
  cache.set(col, m);
  return m;
}

async function gravarColecao(col: Colecao) {
  const m = await lerColecao(col);
  await fs.mkdir(PASTA_LOCAL, { recursive: true });
  const destino = path.join(PASTA_LOCAL, `${col}.json`);
  await fs.writeFile(`${destino}.tmp`, JSON.stringify([...m.values()]));
  await fs.rename(`${destino}.tmp`, destino);
}

const copia = <T>(x: T): T => JSON.parse(JSON.stringify(x));

// ---------- public API ----------

export async function listar<T extends Doc>(col: Colecao): Promise<T[]> {
  if (usandoMysql()) {
    const [linhas] = await (await mysqlPool()).query<Linha[]>('SELECT dados FROM registros WHERE colecao = ?', [col]);
    return linhas.map((l) => JSON.parse(l.dados) as T);
  }
  return [...(await lerColecao(col)).values()].map((r) => copia(r.doc as T));
}

export async function buscar<T extends Doc>(col: Colecao, id: string): Promise<T | null> {
  if (!id) return null;
  if (usandoMysql()) {
    const [linhas] = await (await mysqlPool()).query<Linha[]>('SELECT dados FROM registros WHERE colecao = ? AND id = ?', [col, id]);
    return linhas[0] ? (JSON.parse(linhas[0].dados) as T) : null;
  }
  const r = (await lerColecao(col)).get(id);
  return r ? copia(r.doc as T) : null;
}

/** Finds a document by its unique key (an artisan's link code, a user's e-mail). */
export async function buscarPorChave<T extends Doc>(col: Colecao, chave: string): Promise<T | null> {
  if (!chave) return null;
  if (usandoMysql()) {
    const [linhas] = await (await mysqlPool()).query<Linha[]>('SELECT dados FROM registros WHERE colecao = ? AND chave = ?', [col, chave]);
    return linhas[0] ? (JSON.parse(linhas[0].dados) as T) : null;
  }
  for (const r of (await lerColecao(col)).values()) if (r.chave === chave) return copia(r.doc as T);
  return null;
}

/** Creates or replaces a document. `chave` must be unique within the collection (or null). */
export async function gravar<T extends Doc>(col: Colecao, doc: T, chave: string | null = null): Promise<T> {
  if (usandoMysql()) {
    await (await mysqlPool()).query(
      `INSERT INTO registros (colecao, id, chave, dados, atualizado_em) VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE chave = VALUES(chave), dados = VALUES(dados), atualizado_em = VALUES(atualizado_em)`,
      [col, doc.id, chave, JSON.stringify(doc), agora()],
    );
    return doc;
  }
  return emFila(async () => {
    const m = await lerColecao(col);
    if (chave) for (const r of m.values()) if (r.chave === chave && r.doc.id !== doc.id) throw new Error('Chave repetida');
    m.set(doc.id, { doc: copia(doc), chave });
    await gravarColecao(col);
    return doc;
  });
}

/**
 * Changes one document safely: `mudar` receives the latest saved version (locked while it runs, so two
 * saves at the same time never lose each other's changes). Returns null if it does not exist.
 * `chave` (optional) receives the document and returns its unique key; when omitted the key is kept.
 */
export async function atualizar<T extends Doc>(
  col: Colecao,
  id: string,
  mudar: (d: T) => void | Promise<void>,
  chave?: (d: T) => string | null,
): Promise<T | null> {
  if (usandoMysql()) {
    const conn: PoolConnection = await (await mysqlPool()).getConnection();
    try {
      await conn.beginTransaction();
      const [linhas] = await conn.query<Linha[]>('SELECT dados FROM registros WHERE colecao = ? AND id = ? FOR UPDATE', [col, id]);
      if (!linhas[0]) {
        await conn.rollback();
        return null;
      }
      const doc = JSON.parse(linhas[0].dados) as T;
      await mudar(doc);
      if (chave) {
        await conn.query('UPDATE registros SET dados = ?, chave = ?, atualizado_em = ? WHERE colecao = ? AND id = ?', [
          JSON.stringify(doc),
          chave(doc),
          agora(),
          col,
          id,
        ]);
      } else {
        await conn.query('UPDATE registros SET dados = ?, atualizado_em = ? WHERE colecao = ? AND id = ?', [JSON.stringify(doc), agora(), col, id]);
      }
      await conn.commit();
      return doc;
    } catch (e) {
      await conn.rollback().catch(() => undefined);
      throw e;
    } finally {
      conn.release();
    }
  }
  return emFila(async () => {
    const m = await lerColecao(col);
    const r = m.get(id);
    if (!r) return null;
    const doc = copia(r.doc as T);
    await mudar(doc);
    const novaChave = chave ? chave(doc) : r.chave;
    if (novaChave) for (const o of m.values()) if (o.chave === novaChave && o.doc.id !== id) throw new Error('Chave repetida');
    m.set(id, { doc: copia(doc), chave: novaChave });
    await gravarColecao(col);
    return doc;
  });
}

export async function apagar(col: Colecao, id: string): Promise<boolean> {
  if (usandoMysql()) {
    const [r] = await (await mysqlPool()).query('DELETE FROM registros WHERE colecao = ? AND id = ?', [col, id]);
    return ((r as { affectedRows?: number }).affectedRows ?? 0) > 0;
  }
  return emFila(async () => {
    const m = await lerColecao(col);
    const existia = m.delete(id);
    if (existia) await gravarColecao(col);
    return existia;
  });
}

/** Every record of every collection, for the backup file. */
export async function exportarTudo() {
  const cols: Colecao[] = ['clientes', 'pedidos', 'envios', 'config', 'historico'];
  const saida: Record<string, Doc[]> = {};
  for (const c of cols) saida[c] = await listar(c);
  return saida;
}
