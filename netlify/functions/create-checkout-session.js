const Stripe = require("stripe");

const MIN_DONATION_CENTS = 500;
const MAX_DONATION_CENTS = 10000000; // $100,000 safety ceiling.

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { Allow: "POST", "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Donation checkout is not configured yet." })
      };
    }

    const body = JSON.parse(event.body || "{}");
    const dollars = Number.parseFloat(body.donationAmount);
    const amount = Math.round(dollars * 100);

    if (!Number.isFinite(dollars) || amount < MIN_DONATION_CENTS || amount > MAX_DONATION_CENTS) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Please choose a donation between $5 and $100,000." })
      };
    }

    const email = String(body.email || "").trim().slice(0, 254);
    const firstName = String(body.firstName || "").trim().slice(0, 100);
    const lastName = String(body.lastName || "").trim().slice(0, 100);

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Please enter a valid email address." })
      };
    }

    const proto = event.headers["x-forwarded-proto"] || "https";
    const host = event.headers["x-forwarded-host"] || event.headers.host;
    const baseUrl = process.env.URL || `${proto}://${host}`;

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const donorName = [firstName, lastName].filter(Boolean).join(" ");

    const metadata = {
      donation_amount: (amount / 100).toFixed(2),
      donor_first_name: firstName,
      donor_last_name: lastName,
      donor_email: email,
      source: "i10beatmjc.org"
    };

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      submit_type: "donate",
      success_url: `${baseUrl}/donate/thank-you/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/donate/?canceled=1#donation-form`,
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Donation to I-10 B.E.A.T. M.J.C.",
              description: "Support human trafficking awareness, education, community presentations, resources, and faith-based outreach."
            },
            unit_amount: amount
          },
          quantity: 1
        }
      ],
      metadata,
      payment_intent_data: {
        metadata: {
          ...metadata,
          donor_name: donorName
        }
      }
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      },
      body: JSON.stringify({ url: session.url })
    };
  } catch (error) {
    console.error("create-checkout-session error:", error);

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Unable to start secure checkout. Please try again." })
    };
  }
};
