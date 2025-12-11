# How to Use the Interactive Documentation

## Quick Start

### Option 1: Open Directly in Browser

Simply double-click `index.html` or right-click and select "Open with Browser"

```bash
# On macOS
open documentation/index.html

# On Windows
start documentation/index.html

# On Linux
xdg-open documentation/index.html
```

### Option 2: Serve with Local Server

```bash
# Using Python 3
cd documentation
python -m http.server 8000

# Then visit: http://localhost:8000
```

```bash
# Using Node.js (npx http-server)
cd documentation
npx http-server -p 8000

# Then visit: http://localhost:8000
```

## Features

### 1. Sidebar Navigation

The left sidebar contains all API endpoints organized by category:

- **Getting Started** - Introduction, Authentication, Quick Start, Rate Limits
- **Users & Credits** - User management and credit operations
- **Phone Numbers** - WhatsApp and Instagram account management
- **Agents** - AI agent configuration
- **Messages** - Message retrieval and filtering
- **Extractions** - Lead data extraction
- **Webhooks** - Webhook setup and payload examples
- **Error Handling** - Error codes and responses

**Click any item** to jump to that section instantly.

### 2. Search Functionality

Use the search box at the top of the sidebar to filter endpoints:

1. Click in the search box
2. Type your search term (e.g., "agent", "webhook", "create")
3. Sidebar items are filtered in real-time
4. Clear the search to see all items again

### 3. Copy Code Examples

Every code block has a "Copy" button:

1. Hover over any code block
2. Click the "Copy" button in the top-right corner
3. Code is copied to your clipboard
4. Button changes to "Copied!" for confirmation
5. Paste the code into your terminal or code editor

### 4. Navigate Between Sections

- Click sidebar items to jump to sections
- Scroll naturally through the documentation
- Active section is highlighted in the sidebar
- Smooth scrolling for better UX

## What's Documented

### Complete API Coverage

✅ **20+ Endpoints** - All REST API endpoints documented
✅ **50+ Code Examples** - Ready-to-use cURL commands
✅ **Webhook Integration** - Complete webhook setup guide
✅ **Error Handling** - All error codes and responses
✅ **Request/Response Examples** - JSON examples for every endpoint
✅ **Parameter Tables** - Detailed parameter documentation

### Each Endpoint Includes

- HTTP method (GET, POST, PATCH, DELETE)
- Endpoint path
- Path parameters
- Query parameters
- Request headers
- Request body with types
- Success response examples
- Error response examples
- cURL examples
- Important notes and warnings

## Example Workflows

### 1. Getting Started

1. Click "Introduction" in sidebar
2. Read the overview
3. Click "Authentication" to learn about API keys
4. Click "Quick Start" for step-by-step setup
5. Copy and run the cURL commands

### 2. Creating an Agent

1. Search for "create agent" in the search box
2. Click "Create Agent" in the results
3. Read the endpoint documentation
4. Copy the cURL example
5. Replace placeholders with your values
6. Run the command

### 3. Setting Up Webhooks

1. Click "Webhooks" section in sidebar
2. Read "Webhook Verification"
3. Read "Receive Messages"
4. Check "WhatsApp Webhook Payload" for payload structure
5. Check "Instagram Webhook Payload" for Instagram structure

### 4. Handling Errors

1. Click "Error Handling" section
2. Review "Error Codes" table
3. Check "Error Responses" for examples
4. Use correlation_id for support requests

## Tips & Tricks

### Quick Navigation

- Use the search box to find endpoints quickly
- Click sidebar items instead of scrolling
- Bookmark specific sections in your browser

### Using Code Examples

- All cURL examples are ready to copy and run
- Replace `YOUR_API_KEY`, `YOUR_USER_ID`, etc. with your actual values
- Use the copy button to avoid typos

### Understanding Parameters

- 🔴 **Required** badge = Must be included
- ⚪ **Optional** badge = Can be omitted
- Check parameter tables for data types and descriptions

### Reading Responses

- Success responses show expected data structure
- Error responses show what to expect when things go wrong
- HTTP status codes indicate the type of response

## Customization

### Changing Colors

Edit the CSS in `index.html`:

```css
/* Primary color (blue) */
background: #3498db;

/* Sidebar background */
background: #2c3e50;

/* Success color (green) */
background: #27ae60;
```

### Adding Your Logo

Add an image in the sidebar header:

```html
<div class="sidebar-header">
    <img src="your-logo.png" alt="Logo" style="width: 40px; margin-bottom: 10px;">
    <h1>API Documentation</h1>
    <p>Multi-Channel AI Agent</p>
</div>
```

### Changing Base URL

Update the base URL in the introduction section and all examples:

```
https://api.example.com/v1
```

Replace with your actual API URL.

## Deployment

### Host on Web Server

1. Upload `index.html` to your web server
2. Access via `https://your-domain.com/docs/`
3. No build process required

### Host on GitHub Pages

1. Push to GitHub repository
2. Enable GitHub Pages in repository settings
3. Select `documentation` folder as source
4. Access via `https://username.github.io/repo/`

### Host on Netlify/Vercel

1. Connect your repository
2. Set build directory to `documentation`
3. Deploy automatically on push

## Browser Compatibility

✅ Chrome/Edge (latest)
✅ Firefox (latest)
✅ Safari (latest)
✅ Mobile browsers

## Troubleshooting

### Search Not Working

- Make sure JavaScript is enabled
- Try refreshing the page
- Clear browser cache

### Copy Button Not Working

- Ensure you're using HTTPS or localhost
- Check browser clipboard permissions
- Try a different browser

### Styling Issues

- Clear browser cache
- Try hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- Check browser console for errors

## Support

For issues or questions:

- Check the troubleshooting section
- Review error handling documentation
- Contact support with correlation_id from error responses

## Next Steps

1. **Explore the Documentation** - Click through all sections
2. **Try the Examples** - Copy and run cURL commands
3. **Set Up Webhooks** - Follow webhook integration guide
4. **Handle Errors** - Review error handling section
5. **Build Your Integration** - Use the API to build your application

---

**Enjoy the documentation!** 🎉

If you have any questions or need help, refer to the specific sections in the documentation or contact support.
