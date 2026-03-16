import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from "typeorm";
import { PlanFeature } from "./PlanFeature";

@Entity("plans")
export class Plan {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  stripe_price_id!: string | null;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  monthly_price!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  annual_price!: number | null;

  @Column({ type: "boolean", default: true })
  is_active!: boolean;

  @Column({ type: "jsonb", default: {} })
  limits!: Record<string, unknown>;

  // Relations
  @OneToMany(() => PlanFeature, (pf) => pf.plan)
  features!: PlanFeature[];
}
