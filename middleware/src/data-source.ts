import { DataSource } from "typeorm";
import * as dotenv from "dotenv";

dotenv.config();

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASS || "postgres",
  database: process.env.DB_NAME || "saas_template",
  synchronize: false,
  logging: process.env.NODE_ENV === "development",
  entities: [],
  migrations: [],
  subscribers: [],
  poolSize: parseInt(process.env.DB_POOL_SIZE || "10", 10),
  extra: {
    connectionTimeoutMillis: 5000,
  },
});
