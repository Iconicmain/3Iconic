# SwiftLink Kenya - Site Structure

## 📁 File Organization

```
app/
├── page.tsx                              # 🏠 Home page (Main landing)
├── layout.tsx                            # Root layout with fonts
├── globals.css                           # Design system colors & fonts
│
├── (marketing)/                          # Marketing pages group
│   ├── packages/
│   │   └── page.tsx                      # 💰 Pricing & Plans
│   ├── coverage/
│   │   └── page.tsx                      # 🗺️ Coverage Map
│   ├── business/
│   │   └── page.tsx                      # 🏢 Enterprise Solutions
│   ├── support/
│   │   └── page.tsx                      # 💬 Help Center
│   ├── careers/
│   │   └── page.tsx                      # 👥 Jobs & Careers
│   ├── about/
│   │   └── page.tsx                      # ℹ️ About Us
│   ├── contact/
│   │   └── page.tsx                      # 📧 Contact
│   └── legal/
│       ├── privacy-policy/
│       │   └── page.tsx                  # 🔒 Privacy
│       └── terms-of-service/
│           └── page.tsx                  # 📋 Terms
│
components/
├── isp/                                  # ISP-specific components
│   ├── glass-card.tsx                    # Premium glass effect card
│   ├── nav-bar.tsx                       # Sticky glass navigation
│   ├── footer.tsx                        # Multi-column footer
│   │
│   └── sections/                         # Home page sections
│       ├── hero-section.tsx              # Hero with animations
│       ├── coverage-finder-section.tsx   # Coverage search
│       ├── plans-bento-section.tsx       # Pricing cards
│       ├── why-us-section.tsx            # Features grid
│       ├── speed-test-section.tsx        # Speed test UI
│       ├── infrastructure-section.tsx    # Network metrics
│       ├── testimonials-section.tsx      # Customer reviews
│       └── careers-teaser.tsx            # Jobs CTA
│
└── ui/                                   # shadcn/ui components
    ├── button.tsx
    ├── badge.tsx
    ├── input.tsx
    ├── textarea.tsx
    └── [57 other components]

lib/
└── isp-data.ts                           # All dummy data

```

## 🎨 Design System

### Colors (in `app/globals.css`)
```css
--primary: #0B6B3A        /* Emerald deep */
--accent: #22C55E         /* Bright green */
--accent-soft: #86EFAC    /* Soft green */
--background: #F7FAF8     /* Off-white */
--foreground: #071411     /* Dark ink */
```

### Fonts (in `app/layout.tsx`)
- **Headings**: Space Grotesk (via `--font-heading`)
- **Body**: Inter (via `--font-sans`)

## 🎯 Page Routes

| URL | Page | Purpose |
|-----|------|---------|
| `/` | Home | Main landing with all sections |
| `/packages` | Packages | Pricing plans (Home/Business/Dedicated) |
| `/coverage` | Coverage | Interactive coverage map |
| `/business` | Business | Enterprise solutions |
| `/support` | Support | Help center & FAQ |
| `/careers` | Careers | Jobs & culture |
| `/about` | About | Company story |
| `/contact` | Contact | Contact form & offices |
| `/legal/privacy-policy` | Legal | Privacy policy |
| `/legal/terms-of-service` | Legal | Terms of service |

## 📊 Data Files

**`lib/isp-data.ts`** contains:
- `stats` - Network statistics
- `kenyaTowns` - 27+ coverage locations
- `homePlans` - 4 residential plans
- `businessPlans` - 3 business plans
- `dedicatedPlans` - 3 enterprise plans
- `addOns` - 4 optional extras
- `whyChooseUs` - 6 feature highlights
- `testimonials` - 3 customer reviews
- `jobs` - 4 open positions
- `faqs` - 5 common questions
- `counties` - 12 county coverage data
- `caseStudies` - 3 business success stories

## 🎭 Component Types

### Layout Components
- `NavBar` - Sticky glass navigation with mobile menu
- `Footer` - Multi-column footer with social links

### UI Components
- `GlassCard` - Premium frosted glass container
- Standard shadcn/ui components (Button, Badge, Input, etc.)

### Section Components (Home page only)
8 modular sections that build the home page experience

## 🎬 Animations

Uses **Framer Motion** for:
- Scroll-triggered reveals (`whileInView`)
- Hover effects (`whileHover`)
- Animated gradients (`motion.div`)
- Progress bars
- Modal transitions

## 📱 Responsive Breakpoints

- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

All components are mobile-first!

## 🚀 Quick Start Commands

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start
```

## 🎨 Customization Points

To make this production-ready:

1. **Data**: Update `lib/isp-data.ts` with real content
2. **Images**: Replace placeholder image paths
3. **Forms**: Connect to backend API
4. **Auth**: Add authentication for customer portal
5. **Payments**: Integrate M-Pesa and card processing
6. **Speed Test**: Connect to real speed test server
7. **Network Status**: Add real-time monitoring

## 🌟 Special Features

### Kenya-Specific
- Town/county search with Kenyan locations
- M-Pesa payment mentions
- Local context and terminology
- Towns: Nyeri, Nakuru, Thika, Nanyuki, etc.

### Design Excellence
- Glassmorphism effects
- Bento grid layouts
- Gradient ambient lighting
- Micro-interactions
- Motion design

### User Experience
- Interactive coverage finder
- Speed test demo
- Job detail drawer
- FAQ accordion
- Network status banner

---

**Everything is ready to run!** Just `npm run dev` and visit `http://localhost:3000`

