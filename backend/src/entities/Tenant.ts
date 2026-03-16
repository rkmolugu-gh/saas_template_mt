import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { TenantMembership } from "./TenantMembership";
import { Subscription } from "./Subscription";

export enum TenantStatus {
  ACTIVE = "active",
  SUSPENDED = "suspended",
  DELETED = "deleted",
}

@Entity("tenants")
export class Tenant {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "varchar", length: 255, unique: true })
  slug!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  custom_domain!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  logo_url!: string | null;

  @Column({ type: "enum", enum: TenantStatus, default: TenantStatus.ACTIVE })
  status!: TenantStatus;

  @Column({ type: "varchar", length: 255, nullable: true })
  stripe_customer_id!: string | null;

  @Column({ type: "jsonb", default: {} })
  settings!: Record<string, unknown>;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  // Relations
  @OneToMany(() => TenantMembership, (m) => m.tenant)
  memberships!: TenantMembership[];

  @OneToMany(() => Subscription, (s) => s.tenant)
  subscriptions!: Subscription[];
}
