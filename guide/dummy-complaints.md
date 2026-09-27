# SupportNova — 20 Dummy Complaints for Testing

Two complaints per department, ready to paste into the "Submit Complaint" form. Each one lists
the **product type you'd pick in the dropdown**, the full complaint text, and the department/agent
it should actually route to — which, as covered in `guide/test.md`, isn't always the department
matching the product type. A few of these (marked ⚠️) are deliberately picked to test that.

Login for all of these: `customer@example.com` / `customer123` (or register your own).

---

## 1. Booking Support — `agent.booking@travelnova.com`

### #1 — Booking Confirmation Never Received
**Product type:** Flight
> I booked flight PK-302 to Islamabad two days ago and paid in full, but I still haven't received
> any confirmation email. When I check the app, the booking doesn't show up under "My Trips"
> either. Can someone confirm whether this booking actually went through?

**Expected:** P2 · Booking Support

### #2 — Wrong Travel Dates on Booking
**Product type:** Package
> I booked the 5-day Hunza Valley package for December 20th, but the confirmation I received
> shows December 2nd instead. I need these dates corrected as soon as possible since I've already
> arranged time off work for the 20th.

**Expected:** P2 · Booking Support

---

## 2. Flight Operations — `agent.flights@travelnova.com`

### #3 — Flight Delayed 7 Hours With No Communication
**Product type:** Flight
> My flight PK-455 has been delayed by SEVEN HOURS and nobody from your team has told us
> anything!! I missed my connecting flight in Dubai because of this and now I'm stuck at the
> airport with no idea what's happening. This is completely unacceptable.

**Expected:** P1 · Flight Operations

### #4 — Seat Assignment Changed Without Notice
**Product type:** Flight
> When we checked in, we found our seat assignments had been changed and my family was split up
> across the cabin — we had specifically selected seats together when booking. Could this please
> be corrected before departure?

**Expected:** P3 · Flight Operations

---

## 3. Hotel Services — `agent.hotels@travelnova.com`

### #5 — Room Not Matching What Was Booked
**Product type:** Hotel
> I booked and paid for a Deluxe Sea View room, but on arrival we were given a standard room
> facing the parking lot. The front desk said it was "the best they had available." I'd like this
> resolved or a partial refund for the difference.

**Expected:** P2 · Hotel Services

### #6 — AC Not Working During Heatwave
**Product type:** Hotel
> The air conditioning in our room has not worked for two nights now despite three separate
> requests to the front desk. It's currently 40°C outside and we haven't been able to sleep
> properly either night.

**Expected:** P2 · Hotel Services

---

## 4. Billing & Finance — `agent.billing@travelnova.com`

### #7 — Charged Twice for Same Booking
**Product type:** Hotel
> My card statement shows two separate charges of PKR 45,000 for what should have been a single
> 3-night stay booking. I only made one reservation. Please refund the duplicate charge.

**Expected:** P2 · Billing & Finance

### #8 — Invoice Amount Doesn't Match Booking Total
**Product type:** Tour
> The final invoice I received for the Skardu tour package is PKR 12,000 higher than the total
> price shown to me at checkout. I have a screenshot of the checkout page showing the original
> amount. Can someone explain this discrepancy?

**Expected:** P2 · Billing & Finance

---

## 5. Refunds & Compensation — `agent.refunds@travelnova.com`

### #9 — Refund Not Processed After 3 Weeks
**Product type:** Cruise
> I cancelled my cruise booking 21 days ago. Your refund policy states refunds are processed
> within 10 business days, but I still haven't received anything and support hasn't responded to
> my last two follow-up emails.

**Expected:** P2 · Refunds & Compensation

### #10 — Compensation Promised But Never Paid
**Product type:** Flight
> After my flight delay last month, one of your agents told me over the phone I'd receive a
> PKR 5,000 travel voucher as compensation. It's been three weeks and I still haven't received
> anything, and now nobody can find a record of that promise.

**Expected:** P2 · Refunds & Compensation

---

## 6. Technical Support — `agent.technical@travelnova.com`

### #11 — Booking Lost After System Error ⚠️
**Product type:** Travel Insurance
> I tried to purchase travel insurance for my upcoming trip and the payment page crashed midway
> through. The money was deducted from my account, but I never received a policy number or any
> confirmation. There is nothing under my account showing this purchase.

**Expected:** P0 · **Technical Support** — not Refunds, even though money was taken. The root
cause is a system/payment failure, not a refund-eligibility question. (There's also no "Travel
Insurance department" — see `guide/test.md` §3.)

### #12 — App Crashes Every Time I Open My Bookings
**Product type:** Other
> Every time I try to open "My Bookings" in the mobile app, it crashes immediately and returns me
> to the home screen. This happens consistently on both WiFi and mobile data. I've tried
> reinstalling the app and it's still happening.

**Expected:** P2 · Technical Support

---

## 7. Loyalty & Rewards — `agent.loyalty@travelnova.com`

### #13 — Loyalty Points Missing After Flight
**Product type:** Flight
> I flew with you on flight PK-118 last week and the loyalty points from that booking still
> haven't been credited to my account. My previous flights all showed up within a day or two.

**Expected:** P3 · Loyalty & Rewards

### #14 — Platinum Tier Downgraded Without Explanation
**Product type:** Other
> I logged in today and noticed my account has been downgraded from Platinum to Gold tier. I
> received no notification or explanation for this, and as far as I know I've maintained the
> required activity level this year.

**Expected:** P2 · Loyalty & Rewards

---

## 8. Customer Relations — `agent.relations@travelnova.com`

### #15 — Rude Behavior From Support Agent on Call
**Product type:** Other
> I called support yesterday to ask about my refund status and the agent I spoke with was
> extremely dismissive and hung up on me mid-sentence when I asked a follow-up question. This is
> not the kind of service I expect.

**Expected:** P2 · Customer Relations

### #16 — Ignored at Check-In Counter
**Product type:** Hotel
> I'd like to raise a concern about the front desk experience at check-in. The staff member
> serving me walked away mid-conversation to attend to someone else and never came back to finish
> helping me. No one apologized afterward either.

**Expected:** P3 · Customer Relations — a service-attitude complaint, calm tone, no safety
element, so it stays with Customer Relations rather than Hotel Services or Safety.

---

## 9. Safety & Compliance — `agent.safety@travelnova.com`

### #17 — Harassment at Destination Complaint ⚠️
**Product type:** Hotel
> I need to report that a staff member at the hotel behaved inappropriately toward me during my
> stay as a solo female traveler. I did not feel safe and left the property a day early as a
> result. I want this formally investigated.

**Expected:** P0 · **Safety & Compliance** — not Hotel Services. A conduct/safety issue overrides
the generic hotel-service department regardless of the product type selected.

### #18 — Gas Smell Reported in Hotel Room ⚠️
**Product type:** Hotel
> Hi, I wanted to politely let you know there seems to be a gas smell near the bathroom in my
> hotel room. Could someone please send maintenance to check it out when convenient? Thank you.

**Expected:** P0 · **Safety & Compliance** — the calm, polite tone doesn't lower the priority.
This is the sentiment ≠ urgency trap: a genuine safety hazard is P0 no matter how it's phrased.

---

## 10. Transportation & Logistics — `agent.transport@travelnova.com`

### #19 — Airport Transfer Never Arrived
**Product type:** Transfer
> I had a pre-booked airport transfer to my hotel scheduled for my arrival time, but no driver
> showed up. I waited over an hour before arranging my own transport at 2 AM. I'd like this
> looked into and some form of compensation for the extra cost I incurred.

**Expected:** P2 · Transportation & Logistics

### #20 — Luggage Damaged During Transfer
**Product type:** Transfer
> My suitcase's wheel was broken and the handle torn during the airport-to-hotel transfer service
> arranged through your app. The bag was completely fine when I checked it in at the airport.

**Expected:** P3 · Transportation & Logistics

---

## Quick reference — the "surprise" cases

If you only test a handful, test these three — they're the ones most likely to look like a
routing bug if you don't already know the system routes by **content**, not by the product-type
dropdown (see `guide/test.md` §3 for the full explanation):

| # | Picked product type | Actually routes to | Why |
|---|---|---|---|
| #11 | Travel Insurance | Technical Support | System/payment failure, and there's no "Travel Insurance" department at all |
| #17 | Hotel | Safety & Compliance | Harassment/safety overrides the generic hotel department |
| #18 | Hotel | Safety & Compliance | Gas smell is a safety hazard even written calmly — tests sentiment ≠ urgency |
