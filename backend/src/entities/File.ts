import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Tenant } from "./Tenant";
import { User } from "./User";

@Entity("files")
export class File {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({ type: "uuid" })
  uploaded_by!: string;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "varchar", length: 255 })
  original_name!: string;

  @Column({ type: "varchar", length: 255 })
  mime_type!: string;

  @Column({ type: "bigint" })
  size_bytes!: number;

  @Column({ type: "varchar", length: 1000 })
  storage_path!: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  folder!: string | null;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "boolean", default: false })
  is_public!: boolean;

  @Column({ type: "jsonb", nullable: true })
  metadata!: Record<string, unknown> | null;

  @Column({ type: "timestamp", nullable: true })
  deleted_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  // Relations
  @ManyToOne(() => Tenant, { onDelete: "CASCADE" })
  @JoinColumn({ name: "tenant_id" })
  tenant!: Tenant;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "uploaded_by" })
  uploader!: User;
}
