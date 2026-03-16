import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { Tenant } from "./Tenant";
import { User } from "./User";
import { ItemRevision } from "./ItemRevision";

export enum ItemStatus {
  DRAFT = "draft",
  PUBLISHED = "published",
  ARCHIVED = "archived",
}

@Entity("items")
export class Item {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({ type: "uuid", nullable: true })
  current_revision_id!: string | null;

  @Column({ type: "varchar", length: 255 })
  title!: string;

  @Column({ type: "enum", enum: ItemStatus, default: ItemStatus.DRAFT })
  status!: ItemStatus;

  @Column({ type: "varchar", length: 255, nullable: true })
  category!: string | null;

  @Column({ type: "jsonb", nullable: true })
  tags!: string[] | null;

  @Column({ type: "uuid" })
  created_by!: string;

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
  @JoinColumn({ name: "created_by" })
  creator!: User;

  @OneToMany(() => ItemRevision, (r) => r.item)
  revisions!: ItemRevision[];

  @ManyToOne(() => ItemRevision, { nullable: true })
  @JoinColumn({ name: "current_revision_id" })
  current_revision!: ItemRevision | null;
}
