import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Tenant } from "./Tenant";
import { MemberRole } from "./TenantMembership";

@Entity("invitations")
export class Invitation {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({ type: "varchar", length: 255 })
  email!: string;

  @Column({ type: "enum", enum: MemberRole, default: MemberRole.MEMBER })
  role!: MemberRole;

  @Column({ type: "varchar", length: 255, unique: true })
  token!: string;

  @Column({ type: "timestamp" })
  expires_at!: Date;

  @Column({ type: "timestamp", nullable: true })
  accepted_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;

  // Relations
  @ManyToOne(() => Tenant, { onDelete: "CASCADE" })
  @JoinColumn({ name: "tenant_id" })
  tenant!: Tenant;
}
