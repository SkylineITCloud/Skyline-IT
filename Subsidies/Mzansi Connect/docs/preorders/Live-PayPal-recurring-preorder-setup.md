# Live PayPal recurring preorder setup

25 October 2026  |  Operational reference

## Confirmed direction

Live pre-orders with automatic monthly payments and visible USD conversion from rand. No live subscription, approval, payment or supplier agreement has been created. Keep checkout unavailable until account configuration and commercial terms are complete.

## Billing calculation

For n devices, monthly device instalments are R350 multiplied by n for six months. Service is R50 plus R25 multiplied by n minus one. Examples: one device R400 then R50; two R775 then R75; three R1150 then R100. Device totals are R2100, R4200 and R6300, excluding service and shipping.

## Proposed subscription model

Use a finite six-cycle monthly device plan plus an indefinite monthly service plan. The customer must approve both. Do not disguise device instalments as a trial or assume two regular price phases are supported by a standard PayPal plan. Validate any alternative schedule with PayPal.

If one approval succeeds and the other fails or is abandoned, prevent partial activation. Record the state, cancel unintended agreements and handle payments already taken under the refund policy. Link both subscription IDs to the customer, design, quantity and order.

## Live account and hosting

Sign in to the legal seller PayPal Business account and verify receiving currency and payout setup. Use a Live application with secrets stored only on a server. A one-time hosted payment link does not implement this recurring schedule.

GitHub Pages cannot run private API credentials or webhooks. Deploy a secure backend for subscriptions and verified payment state. Do not convert the loopback sandbox server into production merely by changing its API hostname.

## USD policy and start dates

Approve either a fixed USD schedule or a supported repricing policy. Record rate, source, timestamp, rounding and each charge at consent. A changing exchange rate must not silently change recurring USD debits.

Decide the first device instalment date and service start separately. Recommended service start is activation. Cancellation must follow the approved contract and stop future renewals appropriately without erasing required records.

## Server and webhook requirements

Validate merchant, plan, quantity and amount server-side. Verify webhook authenticity and process each event idempotently. Record subscription changes and completed, failed and refunded payments. Browser return alone never proves payment. Reconcile both subscriptions and verify device billing ends after cycle six.

## Activation requirements

Business sign-in; final seller and preorder terms; delivery supplier and battery acceptance; USD policy and billing dates; secure backend; subscription plans and webhooks; partial-approval handling; cancellation/refund checks; cycle-six transition; final amount and recurring consent display. The account holder must complete any actual financial transaction.

## Official references

Billing cycle definition: https://developer.paypal.com/api/subscriptions/v1/definitions/billing_cycle/

Finite cycles: https://developer.paypal.com/docs/multiparty/subscriptions/customize/billing-cycles/

Pricing plans: https://developer.paypal.com/subscriptions/pricing-plan

Live integration: https://developer.paypal.com/studio/checkout/standard/integrate

Payment links: https://www.paypal.com/za/business/accept-payments/payment-links

Research checked 25 October 2026.
