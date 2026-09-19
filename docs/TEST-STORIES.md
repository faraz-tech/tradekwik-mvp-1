# TradeKwik — Manual Test Stories

Every operation on the platform, as a story you can run by hand, with a ready-to-paste payload and what you should see.

Companion docs: [DEVELOPMENT.md](DEVELOPMENT.md) for running the apps, [DEPLOYMENT.md](DEPLOYMENT.md) for going live.

---

## How to use this document

Each story has an **ID**, the **actor**, the **steps**, an **example payload** and the **expected result**. Stories are grouped by area and ordered so that later ones can use data created by earlier ones.

Two ways to run them:

- **Through the UI** — follow the click path in the story. This is what you want for a real test pass.
- **Through the API** — paste the `curl` command. Faster for edge cases and for anything the UI does not expose.

### Setup before you start

```bash
# fresh demo data (DEV ONLY — wipes everything)
pnpm --filter @tradekwik/api db:seed
pnpm dev
```

| App | URL |
| --- | --- |
| Storefront (buyers) | http://localhost:3000 |
| Seller panel | http://localhost:3001 |
| Platform admin | http://localhost:3001/admin-access |
| API | http://localhost:4000/api/v1 |

### Accounts after seeding

| Actor | Login | Password | Notes |
| --- | --- | --- | --- |
| Seller — Shakti (manufacturer) | `9876500001` | `seller123` | Unlimited plan, verified |
| Seller — Meltz (retailer) | `9876500002` | `seller123` | Basic plan, verified |
| Seller — Perfect Fit (retailer) | `9876500003` | `seller123` | **Trial expired** — read-only |
| Seller — Gujarat Thread (wholesaler) | `9876500004` | `seller123` | On trial, docs pending |
| Seller staff — logistics role | `9876500011` | `seller123` | Shakti; orders + transport only |
| Buyer — Priya Sharma | `9876500099` | `buyer123` | Business buyer, 2 orders |
| Super admin | `admin@tradekwik.com` | `admin123` | Access code `TK-DEV-2026` |
| Verifier | `verifier@tradekwik.com` | `admin123` | Documents and buyer review only |

### API helpers

```bash
A=http://localhost:4000/api/v1
J='Content-Type: application/json'

# log in and keep the session in a cookie jar
curl -s -c seller.jar -H "$J" -d '{"phone":"9876500001","password":"seller123"}' $A/auth/seller/login
curl -s -c buyer.jar  -H "$J" -d '{"phone":"9876500099","password":"buyer123"}'  $A/auth/buyer/login
curl -s -c admin.jar  -H "$J" -d '{"email":"admin@tradekwik.com","password":"admin123","accessCode":"TK-DEV-2026"}' $A/auth/admin/login

# then send the jar with every later call
curl -s -b seller.jar $A/seller/dashboard
```

In development the OTP code is returned in the response as `devCode`, so you never need a real SMS.

---

## A. Public browsing (no account)

### A1 — Home page loads with live data
**Actor:** anyone · **UI:** open http://localhost:3000
**Expect:** beta strip at top, rotating carousel, search box, six category tiles with a "View all (19)" link, Latest products, Latest sellers. No pricing wording anywhere.

### A2 — Browse all categories
**UI:** header → Categories, or http://localhost:3000/categories
**Expect:** all 19 categories as tiles. Clicking one opens `/category/<slug>` listing only that category's products.
```bash
curl -s "$A/categories" | head -c 300
```

### A3 — Seller directory with filters
**UI:** header → Sellers
```bash
curl -s "$A/sellers"                      # 3 sellers (expired one excluded)
curl -s "$A/sellers?kind=wholesaler"      # Gujarat Thread only
curl -s "$A/sellers?verified=true"        # Shakti + Meltz
curl -s "$A/sellers?q=surat"              # both Surat businesses
curl -s "$A/sellers?category=ice-cream-desserts"
```
**Expect:** Perfect Fit Tailors never appears — its trial expired. Featured sellers (paid Pro/Unlimited or on trial) sort first.

### A4 — Store page: tabs, in-store search, sort, pagination
**UI:** http://localhost:3000/store/shakti-embroidery-machines
```bash
curl -s "$A/sellers/shakti-embroidery-machines/products?type=tool"
curl -s "$A/sellers/shakti-embroidery-machines/products?q=needle&sort=price_desc"
```
**Expect:** tabs All / Products / Tools / Accessories with counts; search and sort are URL state; 12 per page.

### A5 — Store About page (trust)
**UI:** store page → "About the company, people & process"
```bash
curl -s "$A/sellers/shakti-embroidery-machines/about" | head -c 400
```
**Expect:** owners with photos and bios, process steps, social links, YouTube embeds, premises photos, company facts with **masked GSTIN** (`24ABCDE****F1Z5`), and a "Verified by TradeKwik" panel listing approved document kinds.

### A6 — Product page with wholesale tiers
**UI:** http://localhost:3000/store/gujarat-thread-and-trims/viscose-embroidery-thread-120d-2-box-of-100
**Expect:** "Wholesale only · minimum order 1 units" notice, a quantity/price table (1–9 ₹3,200; 10–49 ₹3,000; 50+ ₹2,800), Share button, and no retail order option.

### A7 — Global search with seller-type filter
```bash
curl -s "$A/products?q=machine"
curl -s "$A/products?sellerKind=wholesaler"
curl -s "$A/products?category=embroidery-machines&page=1"
```

### A7b — Seller numbers are hidden from anonymous visitors
**UI:** open any store or product page while logged out.
**Expect:** one green **"Log in to call or WhatsApp"** button instead of the WhatsApp and Call buttons. The inquiry form is still open to guests.
```bash
# public responses are masked
curl -s "$A/sellers/shakti-embroidery-machines" | grep -o '"phone":"[^"]*"'      # +9198765•••••
curl -s "$A/sellers/shakti-embroidery-machines/contact"                          # 401
# no real number anywhere in the HTML, and no telephone in the JSON-LD
curl -s http://localhost:3000/store/shakti-embroidery-machines | grep -c 919876500001   # 0
```

### A7c — Logged-in buyer sees the real numbers
**UI:** log in as Priya, reopen the store page.
**Expect:** WhatsApp and a Call button showing the actual number. Clicking "Log in to call or WhatsApp" while logged out returns you to the same page after login.
```bash
curl -s -b buyer.jar "$A/sellers/shakti-embroidery-machines/contact"
# → {"data":{"businessName":"...","phone":"+919876500001","whatsappNumber":"+919876500001"}}
```

### A8 — Share a product
**UI:** product page → Share. On desktop a menu opens (WhatsApp, Facebook, X, LinkedIn, Telegram, Email, Copy link).
**Expect:** copied link carries `?utm_source=share&utm_medium=copy`.

### A9 — Legal pages and sitemap
**UI:** footer → About, Contact, Terms of Use, Privacy Policy, Refund & Cancellation.
```bash
curl -s http://localhost:3000/sitemap.xml | head -20
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/pricing   # 404 while hidden
```

---

## B. Buyer account

### B1 — Send a guest inquiry (no account)
**UI:** any product page → "Send inquiry"
```bash
SELLER=$(curl -s $A/sellers/shakti-embroidery-machines | python -c "import sys,json;print(json.load(sys.stdin)['data']['id'])")
PRODUCT=$(curl -s $A/sellers/shakti-embroidery-machines/products/dori-embroidery-machine-heavy-duty | python -c "import sys,json;print(json.load(sys.stdin)['data']['id'])")

curl -s -H "$J" -d "{
  \"sellerId\": \"$SELLER\",
  \"productId\": \"$PRODUCT\",
  \"buyerName\": \"Ramesh Kumar\",
  \"buyerPhone\": \"9812345678\",
  \"buyerCity\": \"Indore\",
  \"buyerType\": \"business\",
  \"quantity\": 2,
  \"message\": \"Need 2 dori machines. What is your best price for Indore delivery?\",
  \"source\": \"product_page\"
}" $A/inquiries
```
**Expect:** `201` with an id. The seller sees it marked "Guest inquiry (no account yet)". No OTP is required today — see the note at the end of §B.

### B2 — Phone number validation
```bash
# all of these are accepted and normalised to 9876500001
for p in "+91 98765 00001" "91-9876500001" "09876500001" "9876500001"; do
  curl -s -H "$J" -d "{\"phone\":\"$p\",\"password\":\"seller123\"}" $A/auth/seller/login -o /dev/null -w "$p → %{http_code}\n"
done
# rejected
curl -s -H "$J" -d '{"phone":"9999999999","purpose":"buyer_register"}' $A/auth/otp/send    # repeated digits
curl -s -H "$J" -d '{"phone":"1234567890","purpose":"buyer_register"}' $A/auth/otp/send    # must start 6-9
curl -s -H "$J" -d '{"phone":"+1 415 555 0100","purpose":"buyer_register"}' $A/auth/otp/send
```

### B3 — Register a buyer with OTP
**UI:** http://localhost:3000/account/register — enter the number, tap "Send OTP to this number", the dev code is shown on screen, verify, then submit.
```bash
# 1. request a code
curl -s -H "$J" -d '{"phone":"9812345678","purpose":"buyer_register"}' $A/auth/otp/send
# → {"data":{"expiresIn":600,"resendAfter":60,"attemptsAllowed":3,"sendsLeftToday":1,"devCode":"123456"}}

# 2. verify it (use the devCode)
curl -s -H "$J" -d '{"phone":"9812345678","purpose":"buyer_register","code":"123456"}' $A/auth/otp/verify
# → {"data":{"otpToken":"eyJ...","expiresAt":"..."}}

# 3. register with the token
curl -s -c newbuyer.jar -H "$J" -d '{
  "fullName": "Ramesh Kumar",
  "phone": "9812345678",
  "email": "ramesh@example.com",
  "password": "buyer123",
  "buyerType": "business",
  "companyName": "Kumar Boutique",
  "city": "Indore",
  "state": "Madhya Pradesh",
  "otpToken": "<<paste otpToken>>"
}' $A/auth/buyer/register
```
**Expect:** account created with `verificationStatus: "phone_verified"`. **Any guest inquiry or order previously sent from 9812345678 is automatically linked to the new account** — check with story B6.

### B4 — OTP abuse limits
```bash
P=9812340001
curl -s -H "$J" -d "{\"phone\":\"$P\",\"purpose\":\"buyer_register\"}" $A/auth/otp/send   # sendsLeftToday: 1
curl -s -H "$J" -d "{\"phone\":\"$P\",\"purpose\":\"buyer_register\"}" $A/auth/otp/send   # "Please wait 60 seconds"
# after 60s → second code, sendsLeftToday: 0; a third is refused for 24 hours
# three wrong guesses burn the code:
curl -s -H "$J" -d "{\"phone\":\"$P\",\"purpose\":\"buyer_register\",\"code\":\"111111\"}" $A/auth/otp/verify
```
**Expect:** "2 attempts left", "1 attempt left", "Incorrect code. Please request a new one." After that even the correct code is rejected.

### B5 — Registering without OTP is refused
```bash
curl -s -H "$J" -d '{"fullName":"No OTP","phone":"9812340002","password":"buyer123"}' $A/auth/buyer/register
# → 400, otpToken required
```
Also try a token issued for a *different* number → `401 Phone verification does not match this number`.

### B6 — Buyer dashboard
**UI:** http://localhost:3000/account (log in as Priya, `9876500099` / `buyer123`)
```bash
curl -s -b buyer.jar $A/buyer/dashboard
curl -s -b buyer.jar $A/buyer/inquiries
curl -s -b buyer.jar $A/buyer/orders
```
**Expect:** counts for open inquiries, active orders, in transit, completed; two orders, one dispatched and one completed.

### B7 — Buyer order detail with bilty
**UI:** Account → Orders → the dispatched order
```bash
ORDER=$(curl -s -b buyer.jar $A/buyer/orders | python -c "import sys,json;print(json.load(sys.stdin)['data'][0]['id'])")
curl -s -b buyer.jar $A/buyer/orders/$ORDER
```
**Expect:** transport panel with transporter name, **LR / bilty number**, vehicle, expected date, one-tap call buttons, "Copy LR number", plus the full status timeline.

### B8 — Buyer messages the seller on an order
```bash
curl -s -b buyer.jar -H "$J" -d '{"action":"message","note":"Please send via VRL, Pune Market Yard branch."}' $A/buyer/orders/$ORDER/actions
```
**Expect:** the note appears on the timeline for both sides; the seller gets a notification (logged in the API console today).

### B9 — Buyer confirms receipt
```bash
curl -s -b buyer.jar -H "$J" -d '{"action":"confirm_received","note":"All items received in good condition."}' $A/buyer/orders/$ORDER/actions
```
**Expect:** order → `completed`, shipment → `delivered`, seller notified. Only allowed once the order is `dispatched` or `delivered`.

### B10 — Buyer cancels a brand-new request
```bash
curl -s -b buyer.jar -H "$J" -d '{"action":"cancel","note":"Ordered elsewhere."}' $A/buyer/orders/<<NEW_ORDER>>/actions
```
**Expect:** works only while the status is `new`. After the seller confirms, it returns "This order is already confirmed. Please contact the seller to cancel it."

### B11 — Buyer profile
```bash
curl -s -b buyer.jar -H "$J" -X PATCH -d '{
  "companyName": "Priya Boutique",
  "gstin": "27PQRST3456U1Z9",
  "city": "Pune",
  "state": "Maharashtra",
  "defaultAddress": "Shop 12, FC Road, Pune, Maharashtra 411004"
}' $A/buyer/profile
```
**Expect:** saved; the default address pre-fills order forms.

### B12 — Buyer business verification
**UI:** Account → Profile → Business verification
```bash
curl -s -b buyer.jar $A/buyer/verification
curl -s -b buyer.jar -H "$J" -d '{
  "kind": "gst_certificate",
  "title": "GST certificate — Priya Boutique",
  "fileUrl": "https://placehold.co/800x1000?text=GST",
  "mimeType": "application/pdf",
  "sizeBytes": 200000,
  "isPublic": false
}' $A/buyer/verification/documents
curl -s -b buyer.jar -X POST $A/buyer/verification/request
```
**Expect:** request refused until company name, GSTIN **and** a GST certificate are all present; then status → `review_pending`. Approved in story E5.

> **Known gap:** guest inquiries and orders (B1) require no OTP. Only the buyer *account* is verified. Sellers see "Guest inquiry (no account yet)" versus a verification badge.

---

## C. Seller — catalogue and store

### C1 — Seller self-registration
**UI:** http://localhost:3001/register — a popup explains the platform is still being built.
```bash
CAT=$(curl -s $A/categories | python -c "import sys,json;print(json.load(sys.stdin)['data'][0]['id'])")
# verify the login number first
curl -s -H "$J" -d '{"phone":"9812350001","purpose":"seller_register"}' $A/auth/otp/send
curl -s -H "$J" -d '{"phone":"9812350001","purpose":"seller_register","code":"<<devCode>>"}' $A/auth/otp/verify

curl -s -H "$J" -d "{
  \"businessName\": \"Nagpur Orange Traders\",
  \"sellerKind\": \"wholesaler\",
  \"categoryId\": \"$CAT\",
  \"description\": \"Wholesale oranges and citrus produce from Nagpur.\",
  \"city\": \"Nagpur\",
  \"state\": \"Maharashtra\",
  \"phone\": \"9812350001\",
  \"whatsappNumber\": \"9812350001\",
  \"email\": \"amit@orangetraders.example.com\",
  \"gstNumber\": \"27ABCDE1234F1Z5\",
  \"servesPanIndia\": true,
  \"ownerName\": \"Amit Joshi\",
  \"loginPhone\": \"9812350001\",
  \"password\": \"seller123\",
  \"otpToken\": \"<<paste otpToken>>\"
}" $A/auth/seller/register
```
**Expect:** `201`, status `pending`, a confirmation screen saying they will be notified. A duplicate login number is refused.

### C2 — Login is blocked until approved
```bash
curl -s -H "$J" -d '{"phone":"9812350001","password":"seller123"}' $A/auth/seller/login
# → 401 "Your store is awaiting approval. We will notify you once it is live."
```

### C3 — Seller dashboard and setup checklist
**UI:** log in as Shakti → Dashboard
**Expect:** a "Your public store" card with the live storefront link, the setup checklist (store settings, company profile, first product, documents, verified badge), counts and a 7-day inquiry chart.
```bash
curl -s -b seller.jar $A/seller/dashboard
```

### C4 — Create a product
```bash
curl -s -b seller.jar -H "$J" -d "{
  \"name\": \"Aari Machine Motor 250W — Spare\",
  \"categoryId\": \"$CAT\",
  \"description\": \"Replacement 250 W motor for all Shakti aari machines. 6-month warranty.\",
  \"specs\": { \"Power\": \"250 W\", \"Voltage\": \"220 V\", \"Warranty\": \"6 months\" },
  \"priceRetail\": 2800,
  \"priceBulk\": 2500,
  \"minBulkQty\": 5,
  \"priceTiers\": [ { \"minQty\": 5, \"price\": 2500 }, { \"minQty\": 20, \"price\": 2300 } ],
  \"wholesaleOnly\": false,
  \"priceOnRequest\": false,
  \"stockStatus\": \"in_stock\",
  \"listingType\": \"accessory\",
  \"media\": [ { \"type\": \"image\", \"url\": \"https://placehold.co/800x600?text=Motor\", \"alt\": \"250W motor\" } ],
  \"isPublished\": true,
  \"seoTitle\": \"Aari Machine Motor 250W — Price in India\"
}" $A/seller/products
```
**Expect:** created with an auto slug. Appears on the store page under the **Accessories** tab within a minute.

### C5 — Wholesale-only product
Same as C4 but `"wholesaleOnly": true`, `"priceRetail": null`, `"priceTiers": [{"minQty":10,"price":450},{"minQty":100,"price":400}]`.
**Expect:** card shows "From ₹400 / unit" and "Wholesale · min 10 units"; the product page hides the retail order option.

### C6 — Edit and delete a product
```bash
PID=<<product id>>
curl -s -b seller.jar -H "$J" -X PATCH -d '{"stockStatus":"out_of_stock","isPublished":false}' $A/seller/products/$PID
curl -s -b seller.jar -X DELETE $A/seller/products/$PID -o /dev/null -w "%{http_code}\n"   # 204
```

### C7 — Store settings
```bash
curl -s -b seller.jar -H "$J" -X PATCH -d '{
  "businessName": "Shakti Embroidery Machines",
  "sellerKind": "manufacturer",
  "description": "Manufacturer of aari and dori embroidery machines since 2009.",
  "city": "Surat",
  "state": "Gujarat",
  "address": "Plot 42, Pandesara GIDC, Surat, Gujarat 394221",
  "phone": "9876500001",
  "whatsappNumber": "9876500001",
  "email": "sales@shaktiembroidery.example.com",
  "gstNumber": "24ABCDE1234F1Z5",
  "servesPanIndia": true,
  "foundedYear": 2009,
  "teamSizeRange": "21-50"
}' $A/seller/profile
```

### C8 — Company profile (public About page)
```bash
curl -s -b seller.jar -H "$J" -X PUT -d '{
  "legalName": "Shakti Embroidery Machines Pvt. Ltd.",
  "registrationType": "private_limited",
  "registrationYear": 2009,
  "udyamNumber": "UDYAM-GJ-22-0012345",
  "capacityNote": "40 single-head and 8 multi-head machines per month.",
  "leadTimeNote": "Ready stock dispatched in 2-3 days; multi-head 4-6 weeks.",
  "paymentTerms": "50% advance with order, balance before dispatch.",
  "returnPolicy": "1-year on-site warranty.",
  "processSteps": [
    { "title": "Frame fabrication", "description": "Laser-cut MS frames welded in-house." },
    { "title": "Quality check", "description": "2-hour stitch test before packing." }
  ],
  "socialLinks": [
    { "platform": "youtube", "url": "https://www.youtube.com/@shaktiembroidery" },
    { "platform": "instagram", "url": "https://www.instagram.com/shaktiembroidery" }
  ],
  "videos": [ { "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "title": "Factory tour" } ],
  "premisesPhotos": [ { "url": "https://placehold.co/800x600?text=Factory", "alt": "Assembly floor" } ]
}' $A/seller/company-profile
```
**Expect:** everything appears on `/store/<slug>/about`. An invalid URL in `socialLinks` is rejected.

### C9 — Owners and key people
```bash
curl -s -b seller.jar -H "$J" -d '{
  "fullName": "Rakesh Patel",
  "designation": "Founder & Managing Director",
  "photoUrl": "https://placehold.co/300x300?text=RP",
  "bio": "Started as a machine fitter in 1998; founded Shakti in 2009.",
  "yearsExperience": 26,
  "languages": ["Gujarati", "Hindi", "English"],
  "isPrimary": true,
  "sortOrder": 0
}' $A/seller/owners
```
**Expect:** marking a second person primary clears the first.

### C10 — Suggest a missing category
**UI:** Products → New → under Category, "Can't find your category? Suggest one"
```bash
curl -s -b seller.jar -H "$J" -d '{"name":"Packaging Machines","note":"We also sell carton sealing machines"}' $A/seller/category-requests
curl -s -b seller.jar -H "$J" -d '{"name":"Embroidery Machines"}' $A/seller/category-requests
# → 400 "Embroidery Machines already exists — pick it from the list."
```

### C11 — Image upload
```bash
curl -s -b seller.jar -F "file=@product.jpg" $A/seller/uploads
```
**Expect:** a URL under `/uploads/`. Max 5 MB; only JPEG, PNG, WebP, GIF.

---

## D. Seller — inquiries, orders and transport

### D1 — See inquiries
```bash
curl -s -b seller.jar $A/seller/inquiries
curl -s -b seller.jar "$A/seller/inquiries?status=new"
```
**Expect:** registered buyers show a verification badge; guests are marked as such.

### D1b — Guest vs registered buyer is obvious
**UI:** seller panel → Inquiries (and Orders). A new **Account** column shows one of:

| Badge | Meaning |
| --- | --- |
| `Guest` (grey) | No account — the mobile number is **not** verified |
| `✓ Registered` (blue) | Has an account with an OTP-verified mobile number |
| `✓ Registered · business review` (amber) | Registered; business verification under review |
| `✓ Verified business` (green) | Registered with a GST-verified business |

```bash
# send one inquiry as a guest and one while logged in, then compare
curl -s -H "$J" -d "{\"sellerId\":\"$SELLER\",\"buyerName\":\"Walk-in\",\"buyerPhone\":\"9811112222\",\"buyerType\":\"personal\",\"message\":\"Guest asking about price\",\"source\":\"store_page\"}" $A/inquiries
curl -s -b buyer.jar -H "$J" -d "{\"sellerId\":\"$SELLER\",\"buyerName\":\"Priya Sharma\",\"buyerPhone\":\"9876500099\",\"buyerType\":\"business\",\"message\":\"Bulk price please\",\"source\":\"store_page\"}" $A/inquiries
curl -s -b seller.jar $A/seller/inquiries | grep -o '"buyerId":[^,]*'
```
**Expect:** the guest row has `"buyerId":null`; the logged-in one carries an id and a verification status. Opening a guest inquiry warns that the number is unverified.

### D2 — Update an inquiry
```bash
INQ=<<inquiry id>>
curl -s -b seller.jar -H "$J" -X PATCH -d '{"status":"quoted","sellerNotes":"Quoted ₹46,000 each, follows up Monday."}' $A/seller/inquiries/$INQ
```

### D3 — Convert an inquiry into a confirmed order
**UI:** Inquiries → open one → "Convert to order"
```bash
curl -s -b seller.jar -H "$J" -d '{
  "orderType": "bulk",
  "items": [ { "name": "Dori Embroidery Machine — Heavy Duty", "qty": 3, "unitPrice": 46000 } ],
  "deliveryAddress": "Shop 12, FC Road, Pune, Maharashtra 411004",
  "quotedAmount": 138000,
  "expectedDeliveryOn": "2026-10-05",
  "freightTerm": "to_pay",
  "buyerMessage": "3 units at ₹46,000 each. 50% advance to start production."
}' $A/seller/inquiries/$INQ/convert
```
**Expect:** a new order in `confirmed`, the inquiry marked `won`, the buyer notified, and a second conversion of the same inquiry refused.

### D4 — Walk an order through its lifecycle
```bash
ORD=<<order id>>
curl -s -b seller.jar $A/seller/order-requests/$ORD                                   # detail + timeline
curl -s -b seller.jar -H "$J" -X PATCH -d '{"status":"in_progress","buyerMessage":"Production started."}' $A/seller/order-requests/$ORD
curl -s -b seller.jar -H "$J" -X PATCH -d '{"status":"ready"}' $A/seller/order-requests/$ORD
```
Valid order: `new → confirmed → in_progress → ready → dispatched → delivered → completed`. `cancelled` is allowed from any non-final state.
```bash
# an illegal jump is refused
curl -s -b seller.jar -H "$J" -X PATCH -d '{"status":"completed"}' $A/seller/order-requests/$ORD
# → 400 Cannot move an order from "Ready to dispatch" to "Completed".
```

### D5 — Dispatch is blocked without transport details
```bash
curl -s -b seller.jar -H "$J" -X PATCH -d '{"status":"dispatched"}' $A/seller/order-requests/$ORD
# → 400 "Add the transport details (LR / bilty number) before marking the order dispatched."
```
**This is the core rule of the logistics flow.**

### D6 — Record the bilty, then dispatch
**UI:** Orders → open → Transport / bilty details
```bash
curl -s -b seller.jar -H "$J" -X PUT -d '{
  "transportName": "VRL Logistics",
  "transportPhone": "9876511111",
  "transportBranch": "Surat (Sachin GIDC) → Pune (Market Yard)",
  "lrNumber": "VRL-SRT-2026-119001",
  "lrDocumentUrl": "https://placehold.co/800x1000?text=Bilty",
  "vehicleNumber": "GJ05 AT 9911",
  "driverPhone": "9876522222",
  "packagesCount": 3,
  "expectedDeliveryOn": "2026-09-24",
  "notes": "Wooden crates. Freight to-pay at Pune branch.",
  "status": "booked"
}' $A/seller/order-requests/$ORD/shipment

curl -s -b seller.jar -H "$J" -X PATCH -d '{"status":"dispatched","buyerMessage":"Left Surat today; call VRL Pune for delivery."}' $A/seller/order-requests/$ORD
```
**Expect:** shipment moves to `in_transit` with a dispatch timestamp, the buyer is notified, and the LR number appears in their dashboard (story B7).

### D7 — Quote and amounts
```bash
curl -s -b seller.jar -H "$J" -X PATCH -d '{
  "quotedAmount": 138000,
  "agreedAmount": 135000,
  "expectedDeliveryOn": "2026-10-05",
  "freightTerm": "included",
  "buyerMessage": "Agreed ₹1,35,000 all-inclusive."
}' $A/seller/order-requests/$ORD
```

### D8 — Private notes stay private
```bash
curl -s -b seller.jar -H "$J" -X PATCH -d '{"sellerNotes":"Buyer negotiates hard; margin is thin."}' $A/seller/order-requests/$ORD
curl -s -b buyer.jar $A/buyer/orders/$ORD | grep -c "margin is thin"   # must be 0
```
**Expect:** `0`. Seller notes must never reach the buyer.

---

## E. Seller — team, plans and verification

### E1 — Roles and permissions
```bash
curl -s -c logistics.jar -H "$J" -d '{"phone":"9876500011","password":"seller123"}' $A/auth/seller/login
curl -s -b logistics.jar -o /dev/null -w "orders:   %{http_code}\n" $A/seller/order-requests     # 200
curl -s -b logistics.jar -o /dev/null -w "products: %{http_code}\n" -X POST -H "$J" -d '{}' $A/seller/products  # 403
```
**Expect:** the logistics user sees only Dashboard and Orders in the sidebar.

### E2 — Add a team member
```bash
curl -s -b seller.jar -H "$J" -d '{
  "name": "Sunita (Sales)",
  "phone": "9812360001",
  "email": "sunita@example.com",
  "password": "seller123",
  "role": "sales"
}' $A/seller/team
```
**Expect:** owner-only. The owner's role cannot be changed, you cannot change your own role, and you cannot remove yourself.

### E3 — Plan limits
```bash
curl -s -b seller.jar $A/seller/subscription
```
Log in as **Meltz** (Basic: 25 products, 2 logins) and add a third login → refused with "Your Basic plan allows 2 team logins. Upgrade from Billing to add more."

### E4 — Expired plan blocks writes but not reads
```bash
curl -s -c expired.jar -H "$J" -d '{"phone":"9876500003","password":"seller123"}' $A/auth/seller/login
curl -s -b expired.jar -o /dev/null -w "read products: %{http_code}\n" $A/seller/products           # 200
curl -s -b expired.jar -H "$J" -X PATCH -d '{"description":"x"}' $A/seller/profile                  # 400 trial ended
```
**Expect:** the store stays visible to buyers, but the seller cannot edit until a plan is activated (story F6).

### E5 — Upload compliance documents
**UI:** Seller panel → Documents & verification
```bash
curl -s -b seller.jar $A/seller/documents      # checklist for this seller kind
curl -s -b seller.jar -H "$J" -d '{
  "kind": "gst_certificate",
  "title": "GST certificate 24ABCDE1234F1Z5",
  "fileUrl": "https://placehold.co/800x1000?text=GST",
  "mimeType": "application/pdf",
  "sizeBytes": 240000,
  "isPublic": true,
  "issuedOn": "2017-07-01"
}' $A/seller/documents

# identity/banking documents can never be public
curl -s -b seller.jar -H "$J" -d '{"kind":"pan","title":"PAN","fileUrl":"https://x.example/a.pdf","mimeType":"application/pdf","sizeBytes":1,"isPublic":true}' $A/seller/documents
# → 400 "Identity and banking documents cannot be made public."
```
Required kinds differ by seller type — a manufacturer needs a factory licence, a retailer a trade licence.

---

## F. Platform admin

### F1 — Hidden, IP-restricted admin login
**UI:** http://localhost:3001/admin-access (unlisted; the seller login page has no admin tab)
```bash
curl -s -o /dev/null -w "access check: %{http_code}\n" $A/auth/admin/access                      # 200 from an allowed IP
curl -s -H "$J" -d '{"email":"admin@tradekwik.com","password":"admin123"}' $A/auth/admin/login   # 400 — code required
curl -s -H "$J" -d '{"email":"admin@tradekwik.com","password":"admin123","accessCode":"WRONG"}' $A/auth/admin/login  # 401
```
Simulate a disallowed IP:
```sql
update admin_allowed_ips set is_active = false;   -- then both endpoints return 404
update admin_allowed_ips set is_active = true;    -- restore
```

### F2 — Platform overview
```bash
curl -s -b admin.jar $A/admin/overview
```

### F3 — Onboard a seller by hand
```bash
curl -s -b admin.jar -H "$J" -d "{
  \"businessName\": \"Rajkot Steel Works\",
  \"categoryId\": \"$CAT\",
  \"sellerKind\": \"manufacturer\",
  \"description\": \"Stainless steel fabrication since 2015.\",
  \"city\": \"Rajkot\",
  \"state\": \"Gujarat\",
  \"address\": \"Plot 8, GIDC Phase 2, Rajkot\",
  \"phone\": \"9812370001\",
  \"whatsappNumber\": \"9812370001\",
  \"email\": \"info@rajkotsteel.example.com\",
  \"gstNumber\": \"24ZZZZZ9999Z9Z9\",
  \"servesPanIndia\": true,
  \"status\": \"active\",
  \"owner\": {
    \"name\": \"Bhavesh Patel\",
    \"phone\": \"9812370001\",
    \"email\": \"bhavesh@rajkotsteel.example.com\",
    \"password\": \"seller123\"
  }
}" $A/admin/sellers
```
**Expect:** created; because the status is `active`, the **7-day trial starts immediately**.

### F4 — Approve a pending seller
```bash
curl -s -b admin.jar "$A/admin/sellers?status=pending"
curl -s -b admin.jar -H "$J" -X PATCH -d '{"status":"active"}' $A/admin/sellers/<<id>>
```
**Expect:** the trial clock starts on approval; the seller can now log in (story C2 now succeeds).

### F5 — Verify or suspend a seller
```bash
curl -s -b admin.jar -H "$J" -X PATCH -d '{"isVerified":true}'   $A/admin/sellers/<<id>>
curl -s -b admin.jar -H "$J" -X PATCH -d '{"status":"suspended"}' $A/admin/sellers/<<id>>
```

### F6 — Activate a paid plan after an offline payment
**UI:** Sellers → the row's "Plan" button
```bash
SID=$(curl -s $A/sellers/perfect-fit-tailors | python -c "import sys,json;print(json.load(sys.stdin)['data']['id'])")
curl -s -b admin.jar -H "$J" -d '{
  "plan": "basic",
  "cycle": "month",
  "amountPaid": 499,
  "paymentMethod": "upi",
  "reference": "UPI-4471-20260920",
  "note": "Paid by UPI on 20 Sept."
}' $A/admin/sellers/$SID/subscription
```
**Expect:** state `active`, ~30 days left, the seller can edit again (re-run E4), and they reappear in the public directory. Granting again while active **extends** rather than overlaps.

### F7 — Extend a trial / remove a grant
```bash
curl -s -b admin.jar -H "$J" -X PATCH -d '{"days":7}' $A/admin/sellers/$SID/subscription/trial
curl -s -b admin.jar -X DELETE $A/admin/sellers/$SID/subscription/grants/<<grantId>>
```

### F8 — Verification desk
**UI:** super admin → Verification desk
```bash
curl -s -b admin.jar $A/admin/verification/queue
curl -s -b admin.jar $A/admin/verification/sellers/<<sellerId>>
curl -s -b admin.jar -H "$J" -X PATCH -d '{"status":"verified"}' $A/admin/verification/documents/<<docId>>
curl -s -b admin.jar -H "$J" -X PATCH -d '{"status":"rejected","rejectionReason":"Cheque image is blurred; account number not readable."}' $A/admin/verification/documents/<<docId>>
```
**Expect:** once every **required** document for that seller kind is verified and unexpired, the Verified badge is granted automatically and the seller is notified.

### F9 — Approve a business buyer
```bash
curl -s -b admin.jar -H "$J" -X PATCH -d '{"decision":"approve","note":"GST verified."}' $A/admin/verification/buyers/<<buyerId>>
curl -s -b admin.jar -H "$J" -X PATCH -d '{"decision":"reject","note":"GSTIN does not match the company name."}' $A/admin/verification/buyers/<<buyerId>>
```
**Expect:** on approval the buyer becomes `business_verified` and sellers see the badge on their inquiries.

### F10 — Manage categories
```bash
curl -s -b admin.jar $A/admin/categories
curl -s -b admin.jar -H "$J" -d '{"name":"Packaging Machines","sortOrder":20,"isActive":true}' $A/admin/categories
curl -s -b admin.jar -H "$J" -d "{\"name\":\"Aari Machines\",\"parentId\":\"$CAT\"}" $A/admin/categories
curl -s -b admin.jar -H "$J" -X PATCH -d '{"isActive":false}' $A/admin/categories/<<id>>
curl -s -b admin.jar -X DELETE $A/admin/categories/$CAT
# → 400 "This category is in use (8 products, 2 sellers, 1 sub-categories). Hide it instead of deleting."
```

### F11 — Review category suggestions
```bash
curl -s -b admin.jar "$A/admin/category-requests?status=pending"
curl -s -b admin.jar -H "$J" -X PATCH -d '{"decision":"approve","name":"Packaging Machines"}' $A/admin/category-requests/<<id>>
curl -s -b admin.jar -H "$J" -X PATCH -d '{"decision":"reject","adminNote":"Too close to Industrial Machines."}' $A/admin/category-requests/<<id>>
```

### F12 — Verifier role is limited
```bash
curl -s -c verifier.jar -H "$J" -d '{"email":"verifier@tradekwik.com","password":"admin123","accessCode":"TK-DEV-2026"}' $A/auth/admin/login
curl -s -b verifier.jar -o /dev/null -w "queue:      %{http_code}\n" $A/admin/verification/queue      # 200
curl -s -b verifier.jar -o /dev/null -w "categories: %{http_code}\n" $A/admin/categories              # 403
curl -s -b verifier.jar -o /dev/null -w "onboard:    %{http_code}\n" -X POST -H "$J" -d '{}' $A/admin/sellers  # 403
```

---

## G. Security and edge cases

| ID | Story | Expected |
| --- | --- | --- |
| G1 | Call any `/seller/*` endpoint with no cookie | `401` |
| G2 | Seller A requests seller B's product by id | `404` — tenant scoping is taken from the token, never the request |
| G3 | Buyer requests another buyer's order | `404` |
| G4 | Submit 6 inquiries in a minute from one IP | 6th returns `429` |
| G5 | Register with a phone that already has an account | `400` "already exists. Please log in." |
| G6 | Log in as a `pending` seller | `401` awaiting approval |
| G7 | Log in as a `suspended` seller | `401` suspended |
| G8 | Open `/api/docs` with `NODE_ENV=production` | `404` unless `ENABLE_SWAGGER=1` |
| G9 | OTP response in production | contains **no** `devCode` |
| G10 | Send `"isPublic": true` on a PAN or bank proof | `400` refused |
| G11 | Make a seller's own product public via another seller's token | `404` |
| G12 | Delete a category that has products | `400` with usage counts |
| G13 | Fetch `/sellers/:slug/contact` with no session | `401` |
| G14 | Fetch it with a **seller** session instead of a buyer | `403` |
| G15 | Scrape any public page or API response for a seller's number | only `+9198765•••••` — never the real digits |

---

## H. End-to-end scenario (run this before any release)

The whole platform in one pass, about 15 minutes.

1. **Admin** approves a pending seller (F4). Trial starts.
2. **Seller** logs in, completes store settings (C7), company profile (C8), an owner (C9) and publishes a product (C4).
3. **Seller** uploads GST, PAN, bank proof, licence and owner ID (E5).
4. **Admin/verifier** approves each document (F8) → Verified badge appears on the store.
5. **Buyer** registers with OTP (B3), browses the store (A4), reads the About page (A5) and sends an inquiry (B1).
6. **Seller** sees the inquiry with the buyer's verification badge (D1), quotes (D2) and converts it to an order (D3).
7. **Seller** moves the order to `in_progress` then `ready` (D4), tries to dispatch and is blocked (D5), enters the bilty and dispatches (D6).
8. **Buyer** sees the LR number and expected date in their dashboard (B7), messages the seller (B8), then confirms receipt (B9).
9. **Seller** sees the order as `completed` with the full timeline.
10. **Admin** records the seller's payment and activates a plan (F6).

Everything in step 10 should leave the seller active in the public directory (A3) with editing unblocked (E4).

---

## Recording results

Copy this table per test run:

| ID | Pass/Fail | Notes |
| --- | --- | --- |
| A1 | | |
| A2 | | |
| … | | |

Report anything that fails with: the story ID, the exact payload you sent, the response you got, and what you expected.
