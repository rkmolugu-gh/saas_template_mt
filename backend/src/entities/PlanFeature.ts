import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Plan } from "./Plan";

@Entity("plan_features")
export class PlanFeature {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  plan_id!: string;

  @Column({ type: "varchar", length: 255 })
  feature_key!: string;

  @Column({ type: "boolean", default: true })
  enabled!: boolean;

  @Column({ type: "integer", nullable: true })
  limit_value!: number | null;

  // Relations
  @ManyToOne(() => Plan, (p) => p.features, { onDelete: "CASCADE" })
  @JoinColumn({ name: "plan_id" })
  plan!: Plan;
}
