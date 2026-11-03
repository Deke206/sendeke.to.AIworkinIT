# sendeke.to.AIworkinIT
## Deployment

Pushes to `main` go live on Cloudflare Pages (production). Pushes to any other
branch are published as a preview deployment. Configure the repo secrets
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, and optionally the variable
`CLOUDFLARE_PROJECT_NAME` (default `sendeke-to`). Set the Pages project's
production branch to `main`.
