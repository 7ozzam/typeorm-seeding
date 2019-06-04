import * as yargs from 'yargs'
import chalk from 'chalk'
import { createConnection } from 'typeorm'
import { setConnection, runSeed, getConnectionOptions } from '../typeorm-seeding'
import * as pkg from '../../package.json'
import { printError } from '../utils/log.util'
import { importSeed } from '../importer'
import { loadFiles, importFiles } from '../utils/file.util'

export class SeedCommand implements yargs.CommandModule {
  command = 'seed'
  describe = 'Runs the seeds'

  builder(args: yargs.Argv) {
    return args
      .option('config', {
        default: 'ormconfig.js',
        describe: 'Path to the typeorm config file (json or js).',
      })
      .option('class', {
        describe: 'Specific seed class to run.',
      })
  }

  async handler(args: yargs.Arguments) {
    const log = console.log
    log(chalk.bold(`typeorm-seeding v${(pkg as any).version}`))

    // Get TypeORM config file
    let options
    try {
      options = await getConnectionOptions(args.config as string)
    } catch (error) {
      printError('Could not load the config file!', error)
      process.exit(1)
    }

    // Find all factories and seed with help of the config
    const factoryFiles = loadFiles(options.factories || ['src/database/factories/**/*.ts'])
    const seedFiles = loadFiles(options.seeds || ['src/database/seeds/**/*.ts'])
    try {
      importFiles(factoryFiles)
    } catch (error) {
      printError('Could not load factories!', error)
      process.exit(1)
    }

    // Status logging to print out the amount of factories and seeds.
    log(
      '🔎 ',
      chalk.gray.underline(`found:`),
      chalk.blue.bold(
        `${factoryFiles.length} factories`,
        chalk.gray('&'),
        chalk.blue.bold(`${seedFiles.length} seeds`),
      ),
    )

    // Get database connection and pass it to the seeder
    try {
      const connection = await createConnection(options)
      setConnection(connection)
    } catch (error) {
      printError('Database connection failed! Check your typeORM config file.', error)
      process.exit(1)
    }

    // Show seeds in the console
    for (const seedFile of seedFiles) {
      try {
        const seedFileObject = importSeed(seedFile)
        log(chalk.gray.underline(`executing seed:`), chalk.green.bold(`${seedFileObject.name}`))
        await runSeed(seedFileObject)
      } catch (error) {
        printError(
          'Could not run the seeds! Check if your seed script exports the class as default. Verify that the path to the seeds and factories is correct.',
          error,
        )
        process.exit(1)
      }
    }

    log('👍 ', chalk.gray.underline(`finished seeding`))
    process.exit(0)
  }
}
