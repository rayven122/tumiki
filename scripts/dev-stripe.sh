#!/bin/bash
echo "🚀 Starting Stripe webhook forwarding..."
echo "Make sure your Next.js dev server is running on port 3000"
echo ""
stripe listen --forward-to localhost:3000/api/webhooks/stripe \
  --events checkout.session.completed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.payment_succeeded,invoice.payment_failed