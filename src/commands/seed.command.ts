import { createSeedTable, ISeedTable, getExecutedSeeds } from './../utils/seed-table.util';
import * as yargs from 'yargs'
import ora, { Ora } from 'ora'
import chalk from 'chalk'
import { importSeed } from '../importer'
import { loadFiles, importFiles } from '../utils/file.util'
import { runSeeder } from '../typeorm-seeding'
import { configureConnection, getConnectionOptions, ConnectionOptions, createConnection } from '../connection'
import { logToSeedTable } from '../utils/log-to-seed-table.util';
import readPackage from 'read-pkg';
import path from 'path';

interface IArgs {
  datasource: string;
  root: string;
  seed: string
  connection: string;
}

export class SeedCommand implements yargs.CommandModule {
  command = 'seed'
  describe = 'Runs the seeds'

  builder(args: yargs.Argv) {
    return args
      .option('d', {
        alias: 'datasource',
        default: '',
        describe: 'Name of the typeorm datasource file (json or js).',
      })
      .option('r', {
        alias: 'root',
        default: process.cwd(),
        describe: 'Path to your typeorm config file',
      })
      .option('seed', {
        alias: 's',
        describe: 'Specific seed class to run.',
      })
  }

  async handler(args: yargs.Arguments<IArgs>) {
    const log = console.log
    const pkg = await readPackage({ cwd: path.join(process.cwd(), 'node_modules/@7ozzam/typeorm-seeding') })
    log('🌱  ' + chalk.bold(`TypeORM Seeding v${(pkg as any).version}`))
    const spinner = ora('Loading ormconfig').start()
    const configureOption = {
      root: args.root,
      configName: args.datasource,
      connection: args.connection,
    }

    // Get TypeORM config file
    let option: ConnectionOptions
    try {
      configureConnection(configureOption)
      option = await getConnectionOptions()
      spinner.succeed('ORM Config loaded')
    } catch (error) {
      panic(spinner, error, 'Could not load the config file!');
      return;
    }

    // Find all factories and seed with help of the config
    spinner.start('Import Factories')
    const factoryFiles = loadFiles(option.factories)
    try {
      await importFiles(factoryFiles)
      spinner.succeed(`${factoryFiles?.length} Factories are imported`)
    } catch (error) {
      panic(spinner, error, 'Could not import factories!')
    }

    // Show seeds in the console
    spinner.start('Importing Seeders')
    const seedFiles = loadFiles(option.seeds)
    let seedFileObjects: any[] = []
    try {
      seedFileObjects = await Promise.all(seedFiles.map((seedFile) => importSeed(seedFile)))
      spinner.succeed(`${seedFileObjects?.length} Seeders are imported`)
    } catch (error) {
      panic(spinner, error, 'Could not import seeders!')
    }

    // Get database connection and pass it to the seeder
    spinner.start('Connecting to the database')
    try {
      await createConnection()
      spinner.succeed('Database connected')
    } catch (error) {
      panic(spinner, error, 'Database connection failed! Check your typeORM config file.')
    }

    // Create Seed table if not exists
    spinner.start('Get Executed Seeders & filter seed classes');
    let seedsAlreadyRan: Array<ISeedTable> = [];
    try {
      await createSeedTable(option);
      seedsAlreadyRan = await getExecutedSeeds(option);
      const seedRanNames = seedsAlreadyRan.map(sar => sar.className);
      seedFileObjects = seedFileObjects.map(sfo => sfo?.default ? sfo.default : sfo);
      seedFileObjects = seedFileObjects.filter(sfo => !seedRanNames.includes(sfo.name) || (args.seed && args.seed === sfo.name));
      spinner.succeed(`Finish Getting Seeders. ${seedsAlreadyRan.length} seeders already ran, ${seedFileObjects.length} seeders are ready to be executed`);
    } catch(error) {
      panic(spinner, error, 'Error getting executed seeders');
    }

    // Run seeds
    for (const seedFileObject of seedFileObjects) {
      spinner.start(`Executing ${seedFileObject.name} Seeder`)
      try {
        await runSeeder(seedFileObject)
        await logToSeedTable(seedFileObject.name, option)
        spinner.succeed(`Seeder ${seedFileObject.name} executed`)
      } catch (error) {
        panic(spinner, error, `Could not run the seed ${seedFileObject.name}!`)
      }
    }

    log('👍 ', chalk.gray.underline(`Finished Seeding`))
    process.exit(0)
  }
}

function panic(spinner: Ora, error: Error, message: string) {
  spinner.fail(message)
  console.error(error)
  process.exit(1)
}
