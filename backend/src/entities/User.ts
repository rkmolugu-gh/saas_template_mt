import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from "typeorm";
import { TenantMembership } from "./TenantMembership";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 255, unique: true })
  email!: string;

  @Column({ type: "varchar", length: 255 })
  full_name!: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  avatar_url!: string | null;

  @Column({ type: "varchar", length: 255 })
  password_hash!: string;

  @CreateDateColumn()
  created_at!: Date;

  // Relations
  @OneToMany(() => TenantMembership, (m) => m.user)
  memberships!: TenantMembership[];
}
