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
exports.File = void 0;
const typeorm_1 = require("typeorm");
const Tenant_1 = require("./Tenant");
const User_1 = require("./User");
let File = class File {
};
exports.File = File;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], File.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "uuid" }),
    __metadata("design:type", String)
], File.prototype, "tenant_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "uuid" }),
    __metadata("design:type", String)
], File.prototype, "uploaded_by", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255 }),
    __metadata("design:type", String)
], File.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255 }),
    __metadata("design:type", String)
], File.prototype, "original_name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255 }),
    __metadata("design:type", String)
], File.prototype, "mime_type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "bigint" }),
    __metadata("design:type", Number)
], File.prototype, "size_bytes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 1000 }),
    __metadata("design:type", String)
], File.prototype, "storage_path", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 500, nullable: true }),
    __metadata("design:type", Object)
], File.prototype, "folder", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", Object)
], File.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: false }),
    __metadata("design:type", Boolean)
], File.prototype, "is_public", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "jsonb", nullable: true }),
    __metadata("design:type", Object)
], File.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamp", nullable: true }),
    __metadata("design:type", Object)
], File.prototype, "deleted_at", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], File.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], File.prototype, "updated_at", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Tenant_1.Tenant, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "tenant_id" }),
    __metadata("design:type", Tenant_1.Tenant)
], File.prototype, "tenant", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "uploaded_by" }),
    __metadata("design:type", User_1.User)
], File.prototype, "uploader", void 0);
exports.File = File = __decorate([
    (0, typeorm_1.Entity)("files")
], File);
//# sourceMappingURL=File.js.map