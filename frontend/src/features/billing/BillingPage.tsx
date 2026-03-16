import { useState, useEffect } from 'react';
import api from '../../lib/api';
import type { Plan, Subscription } from '../../types';

export default function BillingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/plans').then((r) => setPlans(r.data)),
      api.get('/plans/subscription').then((r) => setSubscription(r.data)),
    ]).finally(() => setLoading(false));
  }, []);

  const subscribe = async (planId: string) => {
    try {
      const res = await api.post('/plans/subscribe', { plan_id: planId });
      setSubscription(res.data);
    } catch {}
  };

  if (loading) return <div className="text-surface-200/50 text-center py-12">Loading...</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-surface-50">Billing & Plans</h1>
        <p className="text-surface-200/50 text-sm mt-1">Manage your subscription</p>
      </div>

      {subscription && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-surface-50 mb-2">Current Plan</h2>
          <div className="flex items-center gap-4">
            <span className="text-2xl font-bold bg-gradient-to-r from-primary-400 to-primary-300 bg-clip-text text-transparent">
              {subscription.plan?.name || 'Unknown'}
            </span>
            <span className={`badge ${subscription.status === 'active' ? 'badge-green' : 'badge-yellow'}`}>{subscription.status}</span>
          </div>
          <p className="text-sm text-surface-200/50 mt-2">
            Period: {new Date(subscription.current_period_start).toLocaleDateString()} — {new Date(subscription.current_period_end).toLocaleDateString()}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {plans.map((plan) => {
          const isCurrent = subscription?.plan_id === plan.id;
          return (
            <div key={plan.id} className={`card text-center ${isCurrent ? 'ring-2 ring-primary-500/50' : ''}`}>
              <h3 className="text-xl font-bold text-surface-50">{plan.name}</h3>
              <div className="mt-4">
                <span className="text-4xl font-bold text-surface-50">${plan.monthly_price}</span>
                <span className="text-surface-200/50">/mo</span>
              </div>
              {plan.annual_price && (
                <p className="text-sm text-surface-200/40 mt-1">${plan.annual_price}/yr (save {Math.round((1 - plan.annual_price / (plan.monthly_price * 12)) * 100)}%)</p>
              )}
              <div className="mt-6 space-y-2 text-sm text-surface-200/60">
                {plan.features?.map((f) => (
                  <div key={f.id} className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span>
                    <span>{f.feature_key} {f.limit_value && f.limit_value > 0 ? `(${f.limit_value === -1 ? 'Unlimited' : f.limit_value})` : ''}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => subscribe(plan.id)}
                disabled={isCurrent}
                className={`mt-6 w-full ${isCurrent ? 'btn-secondary opacity-50' : 'btn-primary'}`}
              >
                {isCurrent ? 'Current Plan' : 'Subscribe'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
