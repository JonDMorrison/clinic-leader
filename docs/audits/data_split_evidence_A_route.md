# A) /data Route and Component Tree

## Route Definition

**File:** `src/App.tsx`

```tsx
import DataHome from "./pages/DataHome";

// Line 141
<Route path="/data" element={<AppLayout><DataHome /></AppLayout>} />
```

## Export Default Component

**File:** `src/pages/DataHome.tsx`

```tsx
export default function DataHome() {
```

## Immediate Child Components

| Component | File Path |
|-----------|-----------|
| `DataMetricsTable` | `src/components/data/DataMetricsTable.tsx` |
| `IntegrationsBanner` | `src/components/data/IntegrationsBanner.tsx` |
| `Card, CardContent, CardHeader, CardTitle, CardDescription` | `@/components/ui/card` |
| `Button` | `@/components/ui/button` |
| `Badge` | `@/components/ui/badge` |

## Component Usage in DataHome.tsx

```tsx
// Lines 20-21
import { DataMetricsTable } from "@/components/data/DataMetricsTable";
import { IntegrationsBanner } from "@/components/data/IntegrationsBanner";

// Line 153
<DataMetricsTable isConnected={isConnected} />

// Line 158
<IntegrationsBanner isConnected={isConnected} />
```

## Props Passed

```tsx
// isConnected is derived from janeConnector status
const isConnected = janeConnector?.status === "receiving_data" || 
  janeConnector?.status === "awaiting_first_file" || 
  janeConnector?.status === "active" || 
  janeConnector?.status === "awaiting_jane_setup";
```
