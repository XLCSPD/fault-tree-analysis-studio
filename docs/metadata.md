# Metadata System

This document describes the industry-neutral metadata system for FTA Studio.

## Overview

The metadata system provides flexible, extensible fields for categorizing and organizing fault tree analyses. It replaces the original aerospace/manufacturing-specific terminology with industry-neutral labels while maintaining full backward compatibility.

## Core Metadata Fields

### Context Fields
| Field | Description | Examples |
|-------|-------------|----------|
| **Site / Location** | Physical site or facility | "Chicago Plant", "Building A", "Remote Office" |
| **Area / Function** | Department or functional area | "Assembly", "Quality", "IT", "Customer Service" |

### Scope Fields
| New Field | Legacy Equivalent | Description |
|-----------|------------------|-------------|
| **Process / Workflow** | `application` | Process or workflow being analyzed |
| **Asset / System** | `model` | Asset, system, or equipment identifier |
| **Item / Product / Output** | `part_name` | Item, product, or deliverable |

### Classification Fields
| Field | Description |
|-------|-------------|
| **Industry** | Industry category (Manufacturing, Healthcare, etc.) |
| **Issue Category** | Type of issue (Quality, Safety, Process, etc.) |

## Reference Tables

### Industries
Global reference table with curated industry categories (sorted by sort_order):
1. Aerospace & Defense
2. Automotive
3. Construction
4. Consumer Packaged Goods (CPG)
5. Distribution & Logistics (3PL)
6. E-commerce & Retail
7. Energy & Utilities
8. Food & Beverage
9. Government / Public Sector
10. Healthcare
11. Hospitality
12. Manufacturing (General)
13. Mining & Metals
14. Pharmaceuticals & Life Sciences
15. Technology / Software (IT / SaaS)
16. Telecommunications
17. Other / Multi-Industry

### Issue Categories
Global reference table with curated issue categories (sorted by sort_order):
1. Safety Incident / Near Miss
2. Property Damage
3. Environmental / Spill
4. Regulatory / Compliance Finding
5. Defect / Nonconformance
6. Spec Out of Tolerance
7. Rework / Scrap / Waste
8. Labeling / Identification Error
9. Delay / Service Failure
10. Downtime / Equipment Failure
11. Capacity / Bottleneck
12. Process Deviation (Standard Work Not Followed)
13. Inventory Accuracy / Variance
14. Scan / Transaction Error
15. Mis-ship / Wrong Item / Wrong Location
16. Documentation / Records Error
17. Cost Overrun / Excess Cost
18. Customer Complaint / Experience Issue
19. Supplier / Inbound Quality Issue
20. Training / Competency Gap
21. Other (Specify)

#### "Other (Specify)" Handling
When "Other (Specify)" is selected as the Issue Category:
- An additional text field `issue_subcategory` is shown
- Users must provide a description for the custom category
- The subcategory is stored in `analyses.issue_subcategory`
- A database trigger validates that subcategory is provided when "Other" is selected

Organizations can add custom categories specific to their needs via the Admin panel.

## Custom Fields Framework

### Overview
Organizations can define custom metadata fields beyond the core fields. Custom fields support:
- Multiple data types
- Validation rules
- Conditional display
- Scope targeting (analysis, node, action item)

### Supported Field Types
| Type | Description | Value Storage |
|------|-------------|---------------|
| `text` | Single-line text input | `value_text` |
| `number` | Numeric value | `value_number` |
| `date` | Date picker | `value_date` |
| `boolean` | Yes/No toggle | `value_boolean` |
| `select` | Single-choice dropdown | `value_json` + `value_text` |
| `multi_select` | Multi-choice checkboxes | `value_json` |
| `url` | URL with validation | `value_text` |
| `email` | Email with validation | `value_text` |

### Creating Custom Fields (Admin)

1. Navigate to **Admin Settings > Custom Fields**
2. Click **Create New Field**
3. Configure:
   - **Key**: Internal identifier (lowercase, underscores)
   - **Label**: Display name
   - **Type**: Field type from above
   - **Required**: Whether field is mandatory
   - **Placeholder**: Input hint text
   - **Help Text**: Description shown below field
   - **Options**: For select/multi_select types

### Database Schema

```sql
-- Custom field definitions
CREATE TABLE metadata_fields (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    key TEXT NOT NULL,
    label TEXT NOT NULL,
    field_type metadata_field_type NOT NULL,
    placeholder TEXT,
    help_text TEXT,
    options JSONB,  -- [{label, value, color?}]
    validation JSONB,
    is_required BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    scope metadata_field_scope DEFAULT 'analysis',
    UNIQUE(organization_id, key)
);

-- Custom field values
CREATE TABLE analysis_metadata_values (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    analysis_id UUID NOT NULL,
    field_id UUID NOT NULL,
    value_text TEXT,
    value_number NUMERIC,
    value_date DATE,
    value_boolean BOOLEAN,
    value_json JSONB,
    UNIQUE(analysis_id, field_id)
);
```

## API Usage

### Fetching Industries
```typescript
import { useIndustries } from '@/lib/hooks/use-metadata'

const { data: industries } = useIndustries()
```

### Fetching Issue Categories
```typescript
import { useIssueCategories } from '@/lib/hooks/use-metadata'

const { data: categories } = useIssueCategories()
```

### Fetching Custom Fields
```typescript
import { useMetadataFields } from '@/lib/hooks/use-metadata'

const { data: fields } = useMetadataFields(organizationId)
```

### Fetching Custom Field Values
```typescript
import { useAnalysisMetadataValues } from '@/lib/hooks/use-metadata'

const { data: values } = useAnalysisMetadataValues(analysisId)
```

### Combined Hook for Metadata Panel
```typescript
import { useAnalysisCustomFields } from '@/lib/hooks/use-metadata'

const { customFields, isLoading } = useAnalysisCustomFields(analysisId, organizationId)
// Returns: Array of { field, value } pairs
```

### Updating Custom Field Values
```typescript
import { useUpsertMetadataValue } from '@/lib/hooks/use-metadata'

const upsertValue = useUpsertMetadataValue(analysisId)

// Update a text field
upsertValue.mutate({
  fieldId: 'field-uuid',
  value: { value_text: 'New value' }
})

// Update a number field
upsertValue.mutate({
  fieldId: 'field-uuid',
  value: { value_number: 42 }
})
```

### Helper Functions
```typescript
import {
  getCustomFieldValue,
  formatCustomFieldValueForSave
} from '@/lib/hooks/use-metadata'

// Extract display value from stored value
const displayValue = getCustomFieldValue(metadataValue, fieldType)

// Format value for database storage
const dbValue = formatCustomFieldValueForSave('number', 42)
// Returns: { value_text: null, value_number: 42, value_date: null, ... }
```

## Migration & Backward Compatibility

### Automatic Data Migration
The migration script automatically copies legacy field data to new fields:
- `model` -> `asset_system`
- `part_name` -> `item_output`
- `application` -> `process_workflow`

### UI Fallback Behavior
The UI displays new field values with fallback to legacy values:
```typescript
const assetSystem = analysis.asset_system || analysis.model
```

### Export Compatibility
Both XLSX and PDF exports use the new field labels with legacy fallback:
- Export shows "Asset / System" with value from `asset_system` or `model`
- Ensures existing analyses export correctly

## Security

### Row Level Security (RLS)
All metadata tables have RLS policies:

| Table | Read | Write |
|-------|------|-------|
| `industries` | All authenticated users | None (admin-seeded) |
| `issue_categories` | Org members + global defaults | Org admins only |
| `metadata_fields` | Org members | Org admins only |
| `analysis_metadata_values` | Org members | Contributors+ |

### Permission Levels
- **Viewer**: Can read metadata
- **Contributor**: Can read/write metadata values
- **Facilitator**: Can read/write metadata values
- **Admin**: Can manage custom field definitions

## File Locations

| Purpose | Path |
|---------|------|
| SQL Migration | `db/06_extended_metadata.sql` |
| TypeScript Types | `types/database.ts` |
| Hooks | `lib/hooks/use-metadata.ts` |
| Metadata Panel | `components/inspector/metadata-panel.tsx` |
| Admin Custom Fields | `app/(admin)/admin/custom-fields/page.tsx` |
| XLSX Export | `lib/export/xlsx-export.ts` |
| PDF Export | `lib/export/pdf-export.tsx` |
