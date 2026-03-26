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
exports.TenantMembership = exports.MemberRole = void 0;
const typeorm_1 = require("typeorm");
const Tenant_1 = require("./Tenant");
const User_1 = require("./User");
var MemberRole;
(function (MemberRole) {
    MemberRole["OWNER"] = "owner";
    MemberRole["ADMIN"] = "admin";
    MemberRole["MEMBER"] = "member";
    MemberRole["VIEWER"] = "viewer";
})(MemberRole || (exports.MemberRole = MemberRole = {}));
let TenantMembership = class TenantMembership {
};
exports.TenantMembership = TenantMembership;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], TenantMembership.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "uuid" }),
    __metadata("design:type", String)
], TenantMembership.prototype, "tenant_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "uuid" }),
    __metadata("design:type", String)
], TenantMembership.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "enum", enum: MemberRole, default: MemberRole.MEMBER }),
    __metadata("design:type", String)
], TenantMembership.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], TenantMembership.prototype, "joined_at", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Tenant_1.Tenant, (t) => t.memberships, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "tenant_id" }),
    __metadata("design:type", Tenant_1.Tenant)
], TenantMembership.prototype, "tenant", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, (u) => u.memberships, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "user_id" }),
    __metadata("design:type", User_1.User)
], TenantMembership.prototype, "user", void 0);
exports.TenantMembership = TenantMembership = __decorate([
    (0, typeorm_1.Entity)("tenant_memberships")
], TenantMembership);
//# sourceMappingURL=TenantMembership.js.map