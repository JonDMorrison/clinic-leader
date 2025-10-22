# White-Label & Custom Branding System

## Overview
Complete white-label support for multi-tenant SaaS deployment. Each organization can customize their visual identity, domain, and enforce license limits.

## Features

### 1. **Branding Management** (`/branding`)
- **Logo & Favicon**: Upload custom brand assets
- **Color Palette**: Full HSL color customization (primary, secondary, accent)
- **Typography**: Google Fonts integration
- **Subdomain**: Custom subdomain routing (e.g., `yourcompany.app.com`)
- **Custom Domain**: CNAME support for branded domains

### 2. **License Management** (`/licensing`)
- **Plan Tiers**: Basic, Pro, Enterprise
- **User Limits**: Track and enforce user count per plan
- **AI Call Limits**: Monthly API call quotas
- **Usage Tracking**: Real-time progress bars for all limits
- **Renewal Dates**: Automatic expiration tracking

### 3. **Theme System**
All branding is stored in the `branding` table and can be applied dynamically:
- Colors use HSL format matching the design system
- Semantic tokens from `index.css` ensure consistency
- Real-time preview in settings

## Database Schema

### `branding` Table
```sql
- id: uuid (primary key)
- organization_id: uuid (foreign key → teams)
- logo_url: text
- primary_color: text (HSL format: "215 50% 50%")
- secondary_color: text
- accent_color: text
- font_family: text (Google Fonts name)
- favicon_url: text
- subdomain: text (unique)
- custom_domain: text (unique)
```

### `licenses` Table
```sql
- id: uuid (primary key)
- organization_id: uuid (foreign key → teams)
- plan: enum ('Basic', 'Pro', 'Enterprise')
- active: boolean
- renewal_date: date
- users_limit: integer
- ai_calls_limit: integer
```

## API Endpoints

### Edge Function: `verify-license`
**Purpose**: Check license limits before operations
**Endpoint**: `/functions/v1/verify-license`
**Method**: POST

**Request Body**:
```json
{
  "organizationId": "uuid",
  "checkType": "users" | "ai_calls"
}
```

**Response**:
```json
{
  "allowed": true,
  "usage": 5,
  "limit": 10,
  "plan": "Pro"
}
```

## Usage

### Admin Configuration
1. Navigate to `/settings` → Click "Manage Branding"
2. Upload logo and favicon URLs
3. Configure color palette (HSL format)
4. Set subdomain or custom domain
5. Save changes - theme applies immediately

### Checking Licenses
```typescript
import { supabase } from "@/integrations/supabase/client";

const checkLicense = async () => {
  const { data, error } = await supabase.functions.invoke("verify-license", {
    body: {
      organizationId: "your-org-id",
      checkType: "users"
    }
  });
  
  if (!data.allowed) {
    console.log("License limit reached!");
  }
};
```

## Plan Comparison

| Feature | Basic | Pro | Enterprise |
|---------|-------|-----|------------|
| Users | 10 | 25 | Unlimited |
| AI Calls/Month | 1,000 | 5,000 | Unlimited |
| White-Label | ❌ | ✅ | ✅ |
| Custom Domain | ❌ | ✅ | ✅ |
| Priority Support | ❌ | ❌ | ✅ |

## Security

### Row Level Security (RLS)
- **Branding**: Anyone can read (for domain resolution), only org admins can modify
- **Licenses**: Org admins can read their own license, only system admins can modify

### Domain Verification
- Custom domains require DNS configuration
- Subdomains are automatically validated for uniqueness

## Future Enhancements

### Phase 2: Domain Routing
- Middleware for automatic org resolution by subdomain/domain
- Dynamic theme injection based on hostname
- Multi-tenant request routing

### Phase 3: Billing Integration
- Stripe subscription management
- Automatic license activation/deactivation
- Usage-based billing for AI calls
- Self-service plan upgrades

### Phase 4: Reseller Portal
- White-label template cloning
- Partner dashboard for managing client organizations
- Commission tracking

## Color Format Guide

All colors use HSL format matching Tailwind's design system:

```css
/* Format: hue saturation% lightness% */
primary_color: "215 50% 50%"   /* Blue */
secondary_color: "215 25% 96%" /* Light gray-blue */
accent_color: "215 50% 95%"    /* Very light blue */
```

Use online HSL pickers to generate values:
- [HSL Color Picker](https://hslpicker.com/)
- [Coolors HSL](https://coolors.co/)

## Notes

- Logo URLs should be publicly accessible (CDN recommended)
- Favicon should be .ico, .png, or .svg format
- Google Fonts names must match exactly (e.g., "Inter", "Roboto")
- Subdomain pattern: lowercase letters, numbers, hyphens only
- Custom domains require CNAME pointing to your app

## Support

For white-label setup assistance or custom Enterprise features, contact your account manager.
