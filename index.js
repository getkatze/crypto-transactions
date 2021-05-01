let express = require("express");
let app = express();

let { createClient } = require("@urql/core")
let { Client, Webhook, resources } = require("coinbase-commerce-node");
const { COINBASE_SECRET, SIGNING_SECRET } = require("./config");

let urqlClient = createClient({
    url: "https://katze.tech/graphql"
});

Client.init(COINBASE_SECRET)

let { Charge } = resources;

app.get("/", async (req, res) => {
    const chargedData = {
        name: req.body.campaignId,
        description: `Campaign invoice for ${req.body.campaignId}`,
        local_price: {
            amount: req.body.amount,
            currency: "USD",
        },
        pricing_type: "fixed_price",
        metadata: {
            user: req.body.userId,
            campaign: req.body.campaignId
        }
    }

    const charge = await Charge.create(chargedData);
    res.send(charge);
})

app.get("/webhookHandler", async (req, res) => {
    const rawBody = req.rawBody;
    const signature = req.headers["x-cc-webhook-signature"];

    try {
        const event = Webhook.verifyEventBody(rawBody, signature, signingSecret);
        functions.logger.info(event);

        if (event.type === "charge:pending") {
            await urqlClient.query(`
            query {
                updateInvoiceStatus(campaignId: $id, status: $status) {
                    status
                }
            }
            `, {
                id: event.campaignId,
                status: "pending",
            })
        }
        if (event.type === "charge:confirmed") {
            await urqlClient.query(`
            query {
                updateInvoiceStatus(campaignId: $id, status: $status) {
                    status
                }
            }
            `, {
                id: event.campaignId,
                status: "confirmed",
            })

        }
        if (event.type === "charge:failed") {
            await urqlClient.query(`
            query {
                updateInvoiceStatus(campaignId: $id, status: $status) {
                    status
                }
            }
            `, {
                id: event.campaignId,
                status: "failed",
            })
        }

        res.send(`success ${event.id}`);
    } catch (error) {
        functions.logger.error(error);
        res.status(400).end("failure!");
    }
})

app.listen(process.env.PORT || 8080, function () {
    console.log("server is running")
})