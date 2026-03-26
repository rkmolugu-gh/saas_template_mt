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
exports.Subscription = exports.SubscriptionStatus = void 0;
const typeorm_1 = require("typeorm");
const Tenant_1 = require("./Tenant");
const Plan_1 = require("./Plan");
var SubscriptionStatus;
(function (SubscriptionStatus) {
    SubscriptionStatus["TRIALING"] = "trialing";
    SubscriptionStatus["ACTIVE"] = "active";
    SubscriptionStatus["PAST_DUE"] = "past_due";
    SubscriptionStatus["CANCELED"] = "canceled";
})(SubscriptionStatus || (exports.SubscriptionStatus = SubscriptionStatus = {}));
let Subscription = class Subscription {
};
exports.Subscription = Subscription;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], Subscription.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "uuid" }),
    __metadata("design:type", String)
], Subscription.prototype, "tenant_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "uuid" }),
    __metadata("design:type", String)
], Subscription.prototype, "plan_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true }),
    __metadata("design:type", Object)
], Subscription.prototype, "stripe_sub_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "enum", enum: SubscriptionStatus, default: SubscriptionStatus.ACTIVE }),
    __metadata("design:type", String)
], Subscription.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamp" }),
    __metadata("design:type", Date)
], Subscription.prototype, "current_period_start", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamp" }),
    __metadata("design:type", Date)
], Subscription.prototype, "current_period_end", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Tenant_1.Tenant, (t) => t.subscriptions, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "tenant_id" }),
    __metadata("design:type", Tenant_1.Tenant)
], Subscription.prototype, "tenant", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Plan_1.Plan, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "plan_id" }),
    __metadata("design:type", Plan_1.Plan)
], Subscription.prototype, "plan", void 0);
exports.Subscription = Subscription = __decorate([
    (0, typeorm_1.Entity)("subscriptions")
], Subscription);
//# sourceMappingURL=Subscription.js.map