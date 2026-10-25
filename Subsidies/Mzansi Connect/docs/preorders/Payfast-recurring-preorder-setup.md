# Payfast recurring preorder setup

25 October 2026 | Operational reference

## Provider decision

Payfast is selected for South African rand payments and recurring billing. PayPal and USD conversion are superseded. Alternatives researched were Peach Payments and Paystack. No merchant account, subscription or live payment has yet been activated.

## Confirmed prices

Device instalments are R350 per device per month for six months. Service is R50 for the first device plus R25 for each additional device on the same account. One device costs R400 monthly for six months, then R50. Two cost R775 then R75. Three cost R1150 then R100. Total device instalments are R2100 per device, excluding service and shipping.

## Recurring billing design

Payfast supports subscriptions and tokenization. Recurring billing uses cards, not every one-time payment method. Validate a provider-approved schedule that stops device instalments after six successful monthly cycles and continues only service. Assess separately consented finite device and ongoing service subscriptions, or tokenized billing controlled by the backend. Do not assume a static payment link changes the amount after month six.

Track successful instalments separately from retries and service debits. Prevent duplicate charges, double service billing and unapproved quantity changes. Show dates, amounts and cancellation terms before consent. Do not activate incomplete agreements.

## Account registration

Select online payments, Electronics and the founder-confirmed revenue category below R18 million. Payfast recommends its Aggregator solution for these selections. Complete legal entity, authorised representative, identity, bank and business verification directly with Payfast. The account holder creates the password and accepts the merchant agreement. Do not reuse PayPal credentials.

## Backend requirements

GitHub Pages cannot hold private signing credentials or run payment callback processing. Deploy a secure backend for signed requests, notifications, recurring state, cancellation and refunds. Keep signing passphrases and API credentials private. Validate notifications against the current official signature, merchant, amount and server-validation requirements. Process idempotently and reconcile. Browser return alone is never proof of payment. Do not store raw card details or repurpose the loopback PayPal sandbox server as production.

## Commercial requirements

Confirm seller details, truthful product capabilities, dispatch dates, shipping costs, supplier battery acceptance, return address, cancellation/refund terms, first device debit and service start date. Recommended service start is activation. Obtain appropriate South African review of the instalment arrangement. No delivery promise or merchant agreement is created by this reference.

## Official sources

Developer documentation: https://developers.payfast.co.za/docs

Recurring billing: https://support.payfast.help/portal/en/kb/articles/can-i-receive-recurring-payments-20-9-2022

Subscriptions: https://support.payfast.help/portal/en/kb/payment-solutions/subscriptions

Tokenization: https://payfast.io/features/tokenization/

Alternative: https://www.peachpayments.com/products/subscription-and-recurring-payments/

Research checked 25 October 2026. Confirm current fees and account eligibility directly.
