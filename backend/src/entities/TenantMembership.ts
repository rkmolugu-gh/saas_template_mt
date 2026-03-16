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

export enum MemberRole {
  OWNER = "owner",
  ADMIN = "admin",
  MEMBER = "member",
  VIEWER = "viewer",
}

@Entity("tenant_memberships")
export class TenantMembership {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({ type: "uuid" })
  user_id!: string;

  @Column({ type: "enum", enum: MemberRole, default: MemberRole.MEMBER })
  role!: MemberRole;

  @CreateDateColumn()
  joined_at!: Date;

  // Relations
  @ManyToOne(() => Tenant, (t) => t.memberships, { onDelete: "CASCADE" })
  @JoinColumn({ name: "tenant_id" })
  tenant!: Tenant;

  @ManyToOne(() => User, (u) => u.memberships, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;
}
