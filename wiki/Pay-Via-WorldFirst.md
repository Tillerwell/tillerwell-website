# Pay via WorldFirst

**Pay via WorldFirst** (module name `pay-via-worldfirst-for-shop`) adds a payment
option to your checkout that runs through [WorldFirst](https://www.worldfirst.com).
The shopper picks it, is sent to WorldFirst's own payment page, pays there, and is
brought straight back. Your order confirms itself the moment WorldFirst says the money
is in.

It is a separate module, so it only exists on your site if somebody installs it. Once
it is on, it joins the list on **Shop → Payments** like every other method, with a
settings page of its own along the top.

> **WorldFirst has to set you up first.** This uses WorldFirst's Pay Solution API,
> which is a partner integration rather than a button you press in your account. Ask
> them to enable it, and ask which payment methods their payment page will offer your
> shoppers: that list, including whether it takes bank transfers, is decided on their
> side and not by Cactus.

---

## What you need from WorldFirst

For **sandbox** (testing) and again for **production** (real money):

1. A **Client ID**.
2. The **API address** WorldFirst assigned to you. They give every partner their own,
   so there is no standard one to copy.
3. **WorldFirst's public key**, so Cactus can check their replies really are from them.
   Optional, but worth having.

You make one thing yourself: a pair of keys. Cactus signs everything it sends WorldFirst
with the **private** key; you give WorldFirst the **public** half. On a Mac or Linux
machine:

```bash
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
```

You may also need to give WorldFirst your site's IP addresses to whitelist. Their
technical support will tell you.

---

## Setting it up

1. Go to **Shop → Payments → Pay via WorldFirst**.
2. In the box for the environment you are using, fill in the **API address**, **Client
   ID**, **your private key** (paste the whole thing, BEGIN and END lines included) and
   **WorldFirst's public key**, then press **Save connection**.
3. The keys are kept with your hosting, not in your database, so they only reach the
   running site at its **next deployment**. The page tells you when that is the thing
   it is waiting for.
4. Pick **Sandbox** or **Production** from the dropdown. That one applies immediately.
5. Tick **Offer Pay via WorldFirst at checkout**.

When it is working the page says *Connected to WorldFirst*. Pay via WorldFirst stays off
your checkout until the connection is complete.

There is nothing to register on WorldFirst's side for confirmations: your site sends the
address with every payment. That also means it only works on your live site, not on a
development machine.

---

## Sandbox and production

Sandbox is for testing and moves no real money. Production is real payments from real
customers. They have their own keys and their own API address, and Cactus holds both
sets so you never retype anything to switch. **Which one the shop is using is the setting
to get right**, so the page says it in a coloured banner as well as in the dropdown.

---

## What happens to an order

- The shopper chooses Pay via WorldFirst and is sent to WorldFirst's page.
- Nothing is added to your orders list yet. The order is only created once the money is
  confirmed, so a shopper who changes their mind leaves nothing behind to tidy up.
- When they come back (or when WorldFirst tells your site, if they closed the tab), Cactus
  asks WorldFirst directly whether the payment succeeded, and checks it is for exactly
  the order's amount in exactly the order's currency. Only then is the order created and
  marked paid, and the normal emails, stock changes and downloads happen.
- Nothing WorldFirst's notification *says* is taken on trust. It is only a prompt to go
  and ask.

---

## Currencies

The method is offered for **GBP** unless you list others under *Currencies it is offered
for*. Only list currencies your WorldFirst account is set up to receive. An order in any
other currency simply does not see this option.

---

## Refunds

Pressing **Refund** in the shop records it as normal: items come off the order, your books
are credited and the customer gets their credit note. **It does not send the money.** You
send that back from your WorldFirst account yourself.

---

## If something looks wrong

- **"Not connected yet"**: the page names what is missing. If it says a key is *saved but
  not live yet*, the site needs a deployment.
- **"Connected" but payments do not appear at checkout**: check the toggle is on, and that
  the order's currency is in your list.
- **A shopper paid but there is no order**: check the site's logs for lines starting
  `[pay-via-worldfirst]`; the confirmation is retried by WorldFirst on its own for about a
  day.

See also: [Shop](Shop), [Pay With Atoa](Pay-With-Atoa), [Configuration reference](Configuration-reference).
