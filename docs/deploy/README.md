# Production environment templates

Copy each file to the matching app and fill in every `<<CHANGE>>` value:

| Template | Copy to | Read at |
| --- | --- | --- |
| `api.env.example` | `apps/api/.env` | runtime |
| `storefront.env.example` | `apps/storefront/.env.production` | **build time** (NEXT_PUBLIC_*) and runtime |
| `admin.env.example` | `apps/admin/.env.production` | **build time** |

Never commit the filled-in files — `.env*` is already in `.gitignore`.

Full instructions: [../DEPLOYMENT.md](../DEPLOYMENT.md)
