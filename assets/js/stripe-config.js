/**
 * Stripe Client Configuration for SENDEKETO.COM
 * Compatible with file:/// classic scripts, HTTP/HTTPS, and CommonJS
 */
(function (root, factory) {
  const cfg = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = cfg;
  }
  if (root) {
    root.SenDekeStripeConfig = cfg;
    root.stripeConfig = cfg;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  return {
    publishableKey: (typeof window !== 'undefined' && (window.__STRIPE_KEY__ || (window.ENV && window.ENV.STRIPE_PUBLISHABLE_KEY))) || "",
    accountId: "acct_1UMDqqI2soUb8x6t",
    mode: "live"
  };
});
