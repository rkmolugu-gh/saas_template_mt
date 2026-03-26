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
exports.Invitation = void 0;
const typeorm_1 = require("typeorm");
const Tenant_1 = require("./Tenant");
const TenantMembership_1 = require("./TenantMembership");
let Invitation = class Invitation {
};
exports.Invitation = Invitation;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], Invitation.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "uuid" }),
    __metadata("design:type", String)
], Invitation.prototype, "tenant_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255 }),
    __metadata("design:type", String)
], Invitation.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "enum", enum: TenantMembership_1.MemberRole, default: TenantMembership_1.MemberRole.MEMBER }),
    __metadata("design:type", String)
], Invitation.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, unique: true }),
    __metadata("design:type", String)
], Invitation.prototype, "token", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamp" }),
    __metadata("design:type", Date)
], Invitation.prototype, "expires_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamp", nullable: true }),
    __metadata("design:type", Object)
], Invitation.prototype, "accepted_at", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Invitation.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Tenant_1.Tenant, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "tenant_id" }),
    __metadata("design:type", Tenant_1.Tenant)
], Invitation.prototype, "tenant", void 0);
exports.Invitation = Invitation = __decorate([
    (0, typeorm_1.Entity)("invitations")
], Invitation);
//# sourceMappingURL=Invitation.js.map