import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Tenant } from "./Tenant";
import { User } from "./User";

@Entity("audit_logs")
export class AuditLog {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({ type: "uuid" })
  user_id!: string;

  @Column({ type: "varchar", length: 255 })
  action!: string;

  @Column({ type: "varchar", length: 255 })
  resource_type!: string;

  @Column({ type: "uuid", nullable: true })
  resource_id!: string | null;

  @Column({ type: "jsonb", default: {} })
  metadata!: Record<string, unknown>;

  @Column({ type: "varchar", length: 45 })
  ip_address!: string;

  @CreateDateColumn()
  created_at!: Date;

  // Relations
  @ManyToOne(() => Tenant, { onDelete: "CASCADE" })
  @JoinColumn({ name: "tenant_id" })
  tenant!: Tenant;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;
}
