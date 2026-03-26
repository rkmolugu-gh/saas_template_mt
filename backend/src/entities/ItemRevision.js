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
exports.ItemRevision = void 0;
const typeorm_1 = require("typeorm");
const Item_1 = require("./Item");
const Tenant_1 = require("./Tenant");
const User_1 = require("./User");
let ItemRevision = class ItemRevision {
};
exports.ItemRevision = ItemRevision;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], ItemRevision.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "uuid" }),
    __metadata("design:type", String)
], ItemRevision.prototype, "item_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "uuid" }),
    __metadata("design:type", String)
], ItemRevision.prototype, "tenant_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "integer" }),
    __metadata("design:type", Number)
], ItemRevision.prototype, "revision_number", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255 }),
    __metadata("design:type", String)
], ItemRevision.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", Object)
], ItemRevision.prototype, "body", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "jsonb", nullable: true }),
    __metadata("design:type", Object)
], ItemRevision.prototype, "data", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 500, nullable: true }),
    __metadata("design:type", Object)
], ItemRevision.prototype, "change_summary", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "uuid" }),
    __metadata("design:type", String)
], ItemRevision.prototype, "created_by", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ItemRevision.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Item_1.Item, (i) => i.revisions, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "item_id" }),
    __metadata("design:type", Item_1.Item)
], ItemRevision.prototype, "item", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Tenant_1.Tenant, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "tenant_id" }),
    __metadata("design:type", Tenant_1.Tenant)
], ItemRevision.prototype, "tenant", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "created_by" }),
    __metadata("design:type", User_1.User)
], ItemRevision.prototype, "creator", void 0);
exports.ItemRevision = ItemRevision = __decorate([
    (0, typeorm_1.Entity)("item_revisions")
], ItemRevision);
//# sourceMappingURL=ItemRevision.js.map