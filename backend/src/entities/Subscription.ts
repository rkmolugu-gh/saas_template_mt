import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Tenant } from "./Tenant";
import { Plan } from "./Plan";

export enum SubscriptionStatus {
  TRIALING = "trialing",
  ACTIVE = "active",
  PAST_DUE = "past_due",
  CANCELED = "canceled",
}

@Entity("subscriptions")
export class Subscription {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({ type: "uuid" })
  plan_id!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  stripe_sub_id!: string | null;

  @Column({ type: "enum", enum: SubscriptionStatus, default: SubscriptionStatus.ACTIVE })
  status!: SubscriptionStatus;

  @Column({ type: "timestamp" })
  current_period_start!: Date;

  @Column({ type: "timestamp" })
  current_period_end!: Date;

  // Relations
  @ManyToOne(() => Tenant, (t) => t.subscriptions, { onDelete: "CASCADE" })
  @JoinColumn({ name: "tenant_id" })
  tenant!: Tenant;

  @ManyToOne(() => Plan, { onDelete: "CASCADE" })
  @JoinColumn({ name: "plan_id" })
  plan!: Plan;
}
