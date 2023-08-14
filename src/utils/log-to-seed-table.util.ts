import { createConnection } from './../connection';
import { ConnectionOptions } from "../connection.js";


export const logToSeedTable = async (seederName: string, options: ConnectionOptions) => {
  const connection = await createConnection(options);
  return await connection.query(`INSERT INTO typeorm_seeds (className) VALUES ('${seederName}')`)
}
