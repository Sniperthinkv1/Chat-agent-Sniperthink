# WhatsApp Template Creation & Variable Mapping Guide

**Complete Journey: From Template Creation to Message Delivery**

---

## Overview

This guide explains the complete flow of WhatsApp template creation, variable mapping, and message delivery in our platform.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        TEMPLATE LIFECYCLE                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   1. CREATE          2. SUBMIT           3. APPROVE          4. SEND       │
│   ────────          ────────            ────────            ────────       │
│   Dashboard         Server sends        Meta reviews        Dashboard      │
│   creates           to Meta API         & approves          sends with     │
│   template                                                  resolved       │
│   with variables                                            values         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Concept: Dashboard Controls Variable Mapping

**The server is a pass-through.** It stores template metadata but does NOT resolve variables. The dashboard:
1. Stores its own mapping configuration
2. Resolves all variable values before sending
3. Sends pre-filled values to the server

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│    DASHBOARD    │         │     SERVER      │         │   WHATSAPP      │
│                 │         │                 │         │                 │
│ • Creates       │ ──────▶ │ • Stores        │         │                 │
│   templates     │         │   template      │         │                 │
│                 │         │                 │         │                 │
│ • Maps vars     │         │ • Stores        │         │                 │
│   to data       │         │   metadata      │         │                 │
│                 │         │                 │         │                 │
│ • Resolves      │ ──────▶ │ • Passes        │ ──────▶ │ • Receives      │
│   values        │ {"1":"John"} values       │         │   message       │
│                 │         │   to WhatsApp   │         │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

---

## Step 1: Create Template

### API Endpoint
```
POST /api/v1/templates
```

### Request Body
```json
{
  "user_id": "user_123",
  "phone_number_id": "pn_456",
  "name": "meeting_confirmation",
  "category": "UTILITY",
  "language": "en",
  "components": [
    {
      "type": "BODY",
      "text": "Hi {{1}}! Your meeting is confirmed.\n\nJoin here: {{2}}\n\nSee you soon!",
      "example": {
        "body_text": [["John", "https://meet.google.com/abc-def-ghi"]]
      }
    },
    {
      "type": "BUTTONS",
      "buttons": [
        {
          "type": "URL",
          "text": "Join Meeting",
          "url": "https://meet.google.com/{{1}}"
        }
      ]
    }
  ],
  "variables": [
    {
      "variable_name": "Customer Name",
      "position": 1,
      "component_type": "BODY",
      "dashboard_mapping": "name",
      "default_value": "there",
      "sample_value": "John"
    },
    {
      "variable_name": "Meeting Link",
      "position": 2,
      "component_type": "BODY",
      "dashboard_mapping": "meetingLink",
      "sample_value": "https://meet.google.com/abc-def-ghi"
    }
  ]
}
```

### Variable Fields Explained

| Field | Required | Description |
|-------|----------|-------------|
| `variable_name` | ✅ Yes | Human-readable label shown in dashboard UI |
| `position` | ✅ Yes | Maps to `{{1}}`, `{{2}}`, etc. in template text |
| `component_type` | No | `HEADER`, `BODY`, or `BUTTON` (default: `BODY`) |
| `dashboard_mapping` | No | Dashboard's identifier for this variable (e.g., `"name"`, `"meetingLink"`) |
| `default_value` | No | Fallback value if dashboard doesn't provide one |
| `sample_value` | ✅ Yes* | Required by Meta for template review |

> **`dashboard_mapping`** is YOUR identifier. Use any string that makes sense for your dashboard's data model. Examples:
> - `"name"` - maps to contact's name
> - `"meetingLink"` - maps to a generated meeting URL
> - `"orderTotal"` - maps to order amount
> - `"customField123"` - maps to any custom data

---

## Step 2: Submit to Meta

After creating the template locally, submit it to Meta for approval:

```
POST /api/v1/templates/:templateId/submit
```

Meta will review and either approve or reject the template.

---

## Step 3: Check Template Status

Templates have these statuses:

| Status | Description |
|--------|-------------|
| `DRAFT` | Created locally, not submitted |
| `PENDING` | Submitted to Meta, awaiting review |
| `APPROVED` | ✅ Ready to use |
| `REJECTED` | Meta rejected (check `rejection_reason`) |
| `PAUSED` | Temporarily disabled by Meta |
| `DISABLED` | Permanently disabled |

---

## Step 4: Send Message with Variables

### The Key Principle

**Dashboard resolves ALL variable values before calling the send API.**

### Send API Endpoint
```
POST /api/v1/send
```

### Request - Dashboard Sends Resolved Values
```json
{
  "phone_number_id": "pn_456",
  "template_id": "tpl_abc123",
  "contact": {
    "phone": "+14155551234",
    "name": "Sarah Johnson"
  },
  "variables": {
    "1": "Sarah Johnson",
    "2": "https://meet.google.com/xyz-123-abc"
  }
}
```

### How Dashboard Resolves Values

```typescript
// Dashboard's logic (NOT server code)
async function sendTemplateMessage(templateId: string, leadId: string) {
  // 1. Fetch template with variables
  const { template, variables } = await api.getTemplate(templateId);
  
  // 2. Fetch lead/contact data from YOUR database
  const lead = await yourDatabase.getLead(leadId);
  
  // 3. Resolve each variable
  const resolvedVariables: Record<string, string> = {};
  
  for (const variable of variables) {
    const position = variable.position.toString();
    
    // Use dashboard_mapping to know which field to use
    switch (variable.dashboard_mapping) {
      case 'name':
        resolvedVariables[position] = lead.name || variable.default_value || '';
        break;
      case 'meetingLink':
        resolvedVariables[position] = lead.meetingLink || generateMeetingLink();
        break;
      case 'orderTotal':
        resolvedVariables[position] = formatCurrency(lead.orderTotal);
        break;
      default:
        // Unknown mapping - use default
        resolvedVariables[position] = variable.default_value || variable.sample_value || '';
    }
  }
  
  // 4. Send with resolved values
  await api.send({
    phone_number_id: selectedPhoneNumber,
    template_id: templateId,
    contact: { phone: lead.phone },
    variables: resolvedVariables  // { "1": "Sarah", "2": "https://meet..." }
  });
}
```

---

## Complete Example: Meeting Confirmation Template

### 1. Dashboard Creates Template

```json
POST /api/v1/templates

{
  "user_id": "user_123",
  "phone_number_id": "pn_456",
  "name": "meeting_booked_v2",
  "category": "UTILITY",
  "components": [
    {
      "type": "BODY",
      "text": "Hi {{1}}! 🎉\n\nYour meeting has been scheduled:\n📅 {{2}}\n⏰ {{3}}\n\nJoin link: {{4}}",
      "example": {
        "body_text": [["John", "Dec 15, 2025", "2:00 PM", "https://meet.google.com/abc"]]
      }
    }
  ],
  "variables": [
    {
      "variable_name": "Customer Name",
      "position": 1,
      "dashboard_mapping": "name",
      "default_value": "there",
      "sample_value": "John"
    },
    {
      "variable_name": "Meeting Date",
      "position": 2,
      "dashboard_mapping": "meetingDate",
      "sample_value": "Dec 15, 2025"
    },
    {
      "variable_name": "Meeting Time",
      "position": 3,
      "dashboard_mapping": "meetingTime",
      "sample_value": "2:00 PM"
    },
    {
      "variable_name": "Join Link",
      "position": 4,
      "dashboard_mapping": "meetingLink",
      "sample_value": "https://meet.google.com/abc"
    }
  ]
}
```

### 2. Submit to Meta
```
POST /api/v1/templates/tpl_abc123/submit
```

### 3. After Approval - Dashboard Sends Message

```typescript
// Dashboard code
const meeting = {
  customerName: "Sarah Johnson",
  date: "December 20, 2025",
  time: "3:30 PM EST",
  link: "https://meet.google.com/xyz-789-def"
};

// Dashboard resolves values based on its mapping
await api.send({
  phone_number_id: "pn_456",
  template_id: "tpl_abc123",
  contact: { phone: "+14155551234" },
  variables: {
    "1": meeting.customerName,    // Position 1 → Customer Name
    "2": meeting.date,            // Position 2 → Meeting Date  
    "3": meeting.time,            // Position 3 → Meeting Time
    "4": meeting.link             // Position 4 → Join Link
  }
});
```

### 4. Customer Receives

```
Hi Sarah Johnson! 🎉

Your meeting has been scheduled:
📅 December 20, 2025
⏰ 3:30 PM EST

Join link: https://meet.google.com/xyz-789-def
```

---

## Database Schema

### `template_variables` Table

| Column | Type | Description |
|--------|------|-------------|
| `variable_id` | VARCHAR(50) | Primary key |
| `template_id` | VARCHAR(50) | FK to templates |
| `variable_name` | VARCHAR(100) | Human-readable label (e.g., "Customer Name") |
| `position` | INTEGER | 1-10, maps to {{1}}-{{10}} |
| `component_type` | VARCHAR(20) | HEADER, BODY, or BUTTON |
| `dashboard_mapping` | VARCHAR(50) | Dashboard's identifier (e.g., "name", "meetingLink") |
| `default_value` | VARCHAR(255) | Fallback value |
| `sample_value` | VARCHAR(255) | For Meta review |
| `description` | TEXT | Help text for UI |
| `is_required` | BOOLEAN | Must have value before sending |
| `placeholder` | VARCHAR(255) | Input placeholder hint |

---

## FAQ

### Q: What is `dashboard_mapping` for?

**A:** It's YOUR identifier that helps the dashboard remember which data source maps to which variable. The server stores it but doesn't use it. Examples:
- `"name"` → Use contact's name
- `"meetingLink"` → Use generated meeting URL
- `"productPrice"` → Use product price from your database

### Q: Can I use any string for `dashboard_mapping`?

**A:** Yes! There are no restrictions. Use whatever makes sense for your dashboard.

### Q: What if I don't provide `dashboard_mapping`?

**A:** That's fine. The dashboard just won't have a hint about which data to use. You can still provide values manually when sending.

### Q: Do I need to send variables by position or by name?

**A:** By position is recommended: `{ "1": "John", "2": "value" }`. The server converts everything to position-based format for WhatsApp.

### Q: What happens if I don't provide a variable value?

**A:** Fallback order:
1. Value you send in `variables`
2. `default_value` from template
3. `sample_value` from template
4. Empty string

---

## Migration Notes

If upgrading from older version with `extraction_field`:
1. Run migration `025_rename_extraction_field_to_dashboard_mapping.sql`
2. Update dashboard code to use `dashboard_mapping` instead of `extraction_field`
3. The field works the same way - just renamed for clarity

---

## Summary

| Who | Does What |
|-----|-----------|
| **Dashboard** | Creates templates, maps variables to data sources, resolves values, sends pre-filled values |
| **Server** | Stores templates & metadata, passes values to WhatsApp API |
| **WhatsApp** | Delivers message with substituted variables |

**Key Point:** The server is a pass-through. Dashboard has full control over variable mapping and resolution.
