
import { DataSource } from "typeorm";
import { RecordEntity } from "./src/entities/record.entity";
import { SlaActionLogEntity } from "./src/entities/sla-action-log.entity";

async function checkData() {
  const dataSource = new DataSource({
    type: "postgres",
    host: "localhost",
    port: 5432,
    username: "postgres",
    password: "password",
    database: "sla_db",
    entities: [RecordEntity, SlaActionLogEntity],
    synchronize: false,
  });

  await dataSource.initialize();

  const logs = await dataSource.getRepository(SlaActionLogEntity).find({
      take: 5,
      order: { createdAt: "DESC" }
  });

  console.log("Checking logs and their records...");
  for (const log of logs) {
      const record = await dataSource.getRepository(RecordEntity).findOne({
          where: { recordId: log.recordId }
      });
      
      console.log(`Log ID: ${log.id}, RecordID: ${log.recordId}`);
      if (record) {
          console.log(`  -> Record Found. UserApprove:`, JSON.stringify(record.userApprove));
      } else {
          console.log(`  -> Record NOT Found.`);
      }
  }

  await dataSource.destroy();
}

checkData();
