import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Item } from "./Item";
import { Tenant } from "./Tenant";
import { User } from "./User";

@Entity("item_revisions")
export class ItemRevision {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  item_id!: string;

  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({ type: "integer" })
  revision_number!: number;

  @Column({ type: "varchar", length: 255 })
  title!: string;

  @Column({ type: "text", nullable: true })
  body!: string | null;

  @Column({ type: "jsonb", nullable: true })
  data!: Record<string, unknown> | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  change_summary!: string | null;

  @Column({ type: "uuid" })
  created_by!: string;

  @CreateDateColumn()
  created_at!: Date;

  // Relations
  @ManyToOne(() => Item, (i) => i.revisions, { onDelete: "CASCADE" })
  @JoinColumn({ name: "item_id" })
  item!: Item;

  @ManyToOne(() => Tenant, { onDelete: "CASCADE" })
  @JoinColumn({ name: "tenant_id" })
  tenant!: Tenant;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "created_by" })
  creator!: User;
}
