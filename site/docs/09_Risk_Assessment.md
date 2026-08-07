# Risk Assessment & Mitigation — Circuit Forge Technologies

---

## 1. Risk Methodology

Risks are assessed on two dimensions:
- **Probability:** 1 (Rare) to 5 (Almost Certain)
- **Impact:** 1 (Negligible) to 5 (Catastrophic)
- **Risk Score:** Probability × Impact (1-25)

**Risk Levels:**
| Score | Level | Action |
|---|---|---|
| 1-6 | Low | Monitor |
| 7-12 | Medium | Mitigate |
| 13-18 | High | Active management required |
| 19-25 | Critical | Immediate action required |

---

## 2. Risk Register

### 2.1 Market & Revenue Risks

| # | Risk | Prob | Impact | Score | Mitigation |
|---|---|---|---|---|---|
| R1 | Insufficient initial client demand | 4 | 4 | **16 (High)** | Pre-launch marketing, parent co. referrals, startup packages |
| R2 | Pricing pressure from competitors | 3 | 3 | 9 (Medium) | Differentiate on quality + local support, not price |
| R3 | Economic downturn reduces spending | 2 | 4 | 8 (Medium) | Diversify client base, offer tiered pricing, education sector |
| R4 | Seasonality of project work | 3 | 3 | 9 (Medium) | Retainer model, consulting services, multiple service lines |
| R5 | Client concentration (single large client) | 2 | 4 | 8 (Medium) | Cap any single client at 30% of revenue |

### 2.2 Technical Risks

| # | Risk | Prob | Impact | Score | Mitigation |
|---|---|---|---|---|---|
| T1 | Design errors requiring re-spin | 3 | 3 | 9 (Medium) | Rigorous review process, design rule checks, simulation |
| T2 | Technology becomes obsolete | 2 | 2 | 4 (Low) | Continuous learning, modular design, vendor-agnostic approach |
| T3 | Tool/software failure | 1 | 3 | 3 (Low) | Backup systems, version control, cloud backups |
| T4 | Complex project exceeds capabilities | 2 | 3 | 6 (Low) | Honest scoping, subcontract specialist work, phased approach |
| T5 | Component supply chain delays | 3 | 3 | 9 (Medium) | Multiple suppliers, buffer stock, alternative parts identified |

### 2.3 Operational Risks

| # | Risk | Prob | Impact | Score | Mitigation |
|---|---|---|---|---|---|
| O1 | Founder illness/incapacity | 2 | 5 | **10 (Medium)** | Documentation, subcontractor relationships, Skyline IT backup |
| O2 | Difficulty finding skilled talent | 3 | 4 | **12 (Medium)** | Internship pipeline, remote freelancers, training investment |
| O3 | Employee turnover | 2 | 3 | 6 (Low) | Competitive pay, growth opportunities, knowledge docs |
| O4 | Workspace issues | 2 | 2 | 4 (Low) | Home office → co-working → dedicated lab |
| O5 | Equipment failure | 2 | 2 | 4 (Low) | Warranty, spare tools, insurance |

### 2.4 Financial Risks

| # | Risk | Prob | Impact | Score | Mitigation |
|---|---|---|---|---|---|
| F1 | Late client payments | 4 | 3 | **12 (Medium)** | 50% upfront, NET-7 terms, late payment penalties |
| F2 | Client defaults on payment | 2 | 4 | 8 (Medium) | Credit check, milestone payments, IP retention until paid |
| F3 | Underestimating project costs | 3 | 3 | 9 (Medium) | Detailed scoping, contingency in quotes, time tracking |
| F4 | Insufficient startup capital | 2 | 5 | **10 (Medium)** | Lean startup, phased equipment, Skyline IT backing |
| F5 | Currency fluctuations (imported components) | 3 | 2 | 6 (Low) | Local suppliers where possible, buffer in quotes |

### 2.5 Legal & Compliance Risks

| # | Risk | Prob | Impact | Score | Mitigation |
|---|---|---|---|---|---|
| L1 | IP disputes with clients | 2 | 4 | 8 (Medium) | Clear contracts, IP assignment clauses, documentation |
| L2 | Regulatory non-compliance (ICASA, CE) | 2 | 4 | 8 (Medium) | Use compliance partners, stay updated on regulations |
| L3 | Contract disputes | 2 | 3 | 6 (Low) | Clear SOWs, legal review of templates, professional insurance |
| L4 | Data breach / loss of client IP | 1 | 5 | 5 (Low) | Encrypted storage, access control, NDAs, cyber insurance |
| L5 | Professional liability claim | 1 | 4 | 4 (Low) | Professional indemnity insurance, quality processes |

---

## 3. Risk Heat Map

```
Impact →
    5 | L4            | R3, T5, F2, L1, L2 |           | R1          |
    4 |               |                     |           |             |
    3 | L5, T3, T4    | R2, R4, F3, O2     | T1, F1    |             |
    2 | T2, O3, O4,   |                     |           |             |
      | O5, F5        |                     |           |             |
    1 |               | L3                 |           |             |
      +─────────────────────────────────────────────────────────
        1       2            3             4           5
                            Probability →
```

**Critical (13+):** R1 (Insufficient demand)  
**High (10-12):** O1 (Founder illness), O2 (Talent shortage), F1 (Late payments), F4 (Capital)  
**Medium (7-9):** R2, R3, R4, R5, T1, T5, F2, F3, L1, L2  
**Low (1-6):** T2, T3, T4, O3, O4, O5, F5, L3, L4, L5

---

## 4. Key Mitigation Actions (Top 5 Risks)

### 1. Insufficient Client Demand (R1)
- **Before launch:** Build website, LinkedIn presence, GitHub portfolio with sample projects
- **Month 1-2:** Direct outreach to 50+ potential clients, offer 20% launch discount
- **Ongoing:** Monthly content marketing, quarterly networking events
- **KPI:** 15+ qualified leads per month by Month 3

### 2. Founder Illness (O1)
- Maintain detailed documentation of all processes
- Establish relationship with 2-3 freelance engineers who can cover
- Skyline IT management as backup oversight
- Health insurance and critical illness cover

### 3. Late Payments (F1)
- 50% deposit required before work begins
- Clear payment terms in contract (NET-7)
- Automated invoice reminders
- Late payment interest at 2% per month
- IP retention clause until full payment

### 4. Finding Skilled Talent (O2)
- Partnership with university engineering departments
- Internship program for final-year students
- Competitive contractor rates for freelancers
- Build reputation through open-source contributions

### 5. Insufficient Capital (F4)
- Lean startup model with phased investment
- Home office for first 6 months
- Equipment purchases aligned with revenue
- Skyline IT credit facility as backup
- Invoice factoring as alternative

---

## 5. Contingency Budget

| Item | Amount | Purpose |
|---|---|---|
| Operating reserve | R30,000 | 1 month of expenses |
| Equipment replacement | R10,000 | Critical tool failure |
| Legal contingency | R10,000 | Dispute resolution |
| Emergency fund | R20,000 | Personal/health emergency |
| **Total** | **R70,000** | |

---

## 6. Risk Review Schedule

| Review | Frequency | Responsible |
|---|---|---|
| Risk register review | Monthly | Founder |
| Financial risk review | Weekly | Founder |
| Client risk assessment | Per project | Founder |
| Full risk audit | Quarterly | Founder + Skyline IT |
| Insurance review | Annually | Founder |

---

*Circuit Forge Technologies — A Skyline IT Company*
