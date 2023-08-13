import { Table } from 'typeorm'
import { createConnection, ConnectionOptions } from './../connection'

export interface ISeedTable {
  className: string
  ran_at: Date
}
export const createSeedTable = async (options: ConnectionOptions) => {
  const connection = await createConnection(options)
  await connection.createQueryRunner().createTable(
    new Table({
      name: options.seedsTableName || 'typeorm_seeds',
      columns: [
        {
          name: 'className',
          type: 'varchar',
          isUnique: true,
          isNullable: true,
        },
        {
          name: 'ran_at',
          type: 'timestamp',
          default: 'now()',
        },
      ],
    }),
    true,
  )
}

export const getExecutedSeeds = async (options: ConnectionOptions) => {
  const connection = await createConnection(options)
  return await connection.query(`select * from ${options.seedsTableName || 'typeorm_seeds'}`)
}
