"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Item = exports.ItemStatus = void 0;
const typeorm_1 = require("typeorm");
const Tenant_1 = require("./Tenant");
const User_1 = require("./User");
const ItemRevision_1 = require("./ItemRevision");
var ItemStatus;
(function (ItemStatus) {
    ItemStatus["DRAFT"] = "draft";
    ItemStatus["PUBLISHED"] = "published";
    ItemStatus["ARCHIVED"] = "archived";
})(ItemStatus || (exports.ItemStatus = ItemStatus = {}));
let Item = class Item {
};
exports.Item = Item;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], Item.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "uuid" }),
    __metadata("design:type", String)
], Item.prototype, "tenant_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "uuid", nullable: true }),
    __metadata("design:type", Object)
], Item.prototype, "current_revision_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255 }),
    __metadata("design:type", String)
], Item.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "enum", enum: ItemStatus, default: ItemStatus.DRAFT }),
    __metadata("design:type", String)
], Item.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true }),
    __metadata("design:type", Object)
], Item.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "jsonb", nullable: true }),
    __metadata("design:type", Object)
], Item.prototype, "tags", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "uuid" }),
    __metadata("design:type", String)
], Item.prototype, "created_by", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamp", nullable: true }),
    __metadata("design:type", Object)
], Item.prototype, "deleted_at", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Item.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Item.prototype, "updated_at", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Tenant_1.Tenant, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "tenant_id" }),
    __metadata("design:type", Tenant_1.Tenant)
], Item.prototype, "tenant", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "created_by" }),
    __metadata("design:type", User_1.User)
], Item.prototype, "creator", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => ItemRevision_1.ItemRevision, (r) => r.item),
    __metadata("design:type", Array)
], Item.prototype, "revisions", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => ItemRevision_1.ItemRevision, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "current_revision_id" }),
    __metadata("design:type", Object)
], Item.prototype, "current_revision", void 0);
exports.Item = Item = __decorate([
    (0, typeorm_1.Entity)("items")
], Item);
//# sourceMappingURL=Item.js.map