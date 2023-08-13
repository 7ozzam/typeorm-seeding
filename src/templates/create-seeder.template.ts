const makeTemplate = ({className}: {className: string}) => `/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/no-default-export */
import type { Factory, Seeder } from '@7ozzam/typeorm-seeding';
import type { DataSource } from 'typeorm';

export default class ${className} implements Seeder {
  public async run(_factory: Factory, _connection: DataSource): Promise<any> {
    // add your logic here
  }
}`;

export default makeTemplate;
