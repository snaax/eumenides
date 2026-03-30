const { stripe } = require("../lib/stripe");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const [basicPrice, fullPrice] = await Promise.all([
      stripe.prices.retrieve(process.env.STRIPE_PRICE_ID_BASIC),
      stripe.prices.retrieve(process.env.STRIPE_PRICE_ID_FULL),
    ]);

    res.status(200).json({
      basic: {
        amount: basicPrice.unit_amount,
        currency: basicPrice.currency,
      },
      full: {
        amount: fullPrice.unit_amount,
        currency: fullPrice.currency,
      },
    });
  } catch (error) {
    console.error("Error fetching prices:", error);
    res.status(500).json({ error: "Failed to fetch prices" });
  }
};
