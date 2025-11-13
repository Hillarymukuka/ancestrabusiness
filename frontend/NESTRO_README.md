# Nestro - AI-Powered Help Assistant

## Overview
Nestro is an intelligent, interactive help assistant built into Ancestra Business Manager. It provides contextual help and answers to users without requiring them to leave the app or search through documentation.

## Features

### 🎯 Smart Search
- Real-time search across 120+ questions and answers
- Search by keywords, questions, or answers
- Instant results as you type

### 📚 Category Browsing
- 10 organized help categories
- Easy navigation with breadcrumb support
- Question count displayed per category

### 💬 Interactive Chat Interface
- Beautiful gradient purple design matching Ancestra branding
- Smooth animations and transitions
- Mobile-responsive design

### 🔔 First-Time Notification
- Pinging orange notification badge for new users
- Automatically dismissed after first interaction
- Persistent state stored in localStorage

### 🎨 UI/UX Features
- Clean, modern chat bubble in bottom-right corner
- Expandable to 400px × 600px chat window
- Back button navigation
- Scrollable content areas
- Hover effects and focus states

## How It Works

### User Flow:
1. **Click the purple chat bubble** in the bottom-right corner
2. **Choose an option**:
   - Browse by category
   - Search for specific help
3. **View answers** in a beautiful gradient card
4. **Go back** or ask another question

### Navigation:
- **Home** → All categories listed
- **Category** → All questions in that category
- **Question** → Answer displayed with "Nestro says" card

## Technical Details

### Component Structure
```
Nestro.jsx
├── Chat Bubble (floating button)
├── Chat Window (modal)
│   ├── Header (with back button)
│   ├── Search Bar
│   ├── Chat Body (scrollable)
│   │   ├── Search Results
│   │   ├── Question & Answer View
│   │   ├── Category Questions List
│   │   └── Categories List (Home)
│   └── Footer
```

### Data Structure
```json
[
  {
    "category": "Category Name",
    "questions": [
      {
        "question": "How do I...?",
        "answer": "You can..."
      }
    ]
  }
]
```

### State Management
- `isOpen` - Chat window visibility
- `searchTerm` - Current search query
- `selectedCategory` - Active category
- `selectedQuestion` - Selected Q&A pair
- `hasUnread` - First-time notification badge

### localStorage Keys
- `nestro_seen` - Tracks if user has opened Nestro before

## Customization

### Colors
The component uses Tailwind CSS with custom purple gradients:
- Primary: `from-purple-600 to-purple-700`
- Accent: `from-purple-50 to-purple-100`
- Notification: `orange-500`

### Content
All help content is in `nestro-help-data.json` and can be updated without code changes.

### Styling
Modify Tailwind classes in `Nestro.jsx` to match your brand.

## Categories Included

1. **Getting Started** - Login, roles, orientation
2. **Dashboard** - Metrics, insights, alerts
3. **Inventory & Stock Management** - Products, CSV, stock updates
4. **Sales & Transactions** - Recording sales, receipts, filters
5. **Expenses** - Recording, categories, attachments
6. **Reports & Analytics** - Financial reports, PDF export
7. **Team & Employee Management** - Users, roles, performance
8. **Settings & Configuration** - Receipts, logo, customization
9. **Common Issues & Troubleshooting** - Error messages, fixes
10. **Tips & Best Practices** - Optimization, business insights

## Usage Example

```jsx
import Nestro from './components/Nestro.jsx'

function App() {
  return (
    <div>
      {/* Your app content */}
      <Nestro />
    </div>
  )
}
```

## Future Enhancements

- [ ] Chat history persistence
- [ ] Contact support button
- [ ] Video tutorials integration
- [ ] Multi-language support
- [ ] Analytics tracking (which questions are most searched)
- [ ] AI-powered natural language processing
- [ ] Contextual help based on current page

## Browser Support
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Accessibility
- Keyboard navigation support
- ARIA labels for screen readers
- Focus management
- High contrast support

---

Built with ❤️ for Ancestra Business Manager
