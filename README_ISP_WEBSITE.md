# SwiftLink Kenya - Premium ISP Website

A **super modern, premium, wow-factor** website design for a Kenyan Internet Service Provider. This is a **design-only** showcase with dummy data - no real backend or API calls.

## 🎨 Design Philosophy

This website breaks away from generic template looks with:

- **Modern Layout Techniques**: Asymmetric grids, bento sections, glassmorphism
- **Premium Visual Language**: Blurred gradients, 3D-ish depth, subtle parallax
- **Kenya Context**: Towns, counties, and local payment methods (M-Pesa)
- **Mobile-First**: Beautiful responsive design across all devices
- **Micro-Interactions**: Hover states, smooth animations, motion reveals

## 🎯 Key Features

### Color System
- **Primary**: Emerald deep (#0B6B3A) - Kenya-inspired green
- **Bright Accent**: #22C55E
- **Soft Accent**: #86EFAC
- **Dark Ink**: #071411
- **Background**: Off-white (#F7FAF8)
- **Glass Panels**: White with opacity over gradients

### Typography
- **Headings**: Space Grotesk - bold, modern, tech-forward
- **Body**: Inter - clean, readable

### Tech Stack
- Next.js 16 (App Router)
- Tailwind CSS v4
- shadcn/ui components
- Framer Motion animations
- Lucide React icons
- TypeScript

## 📄 Pages

### 1. **Home** (`/`)
The wow-factor landing page with:
- Animated hero with fiber visualization
- Live stats cards (uptime, latency, coverage)
- Interactive coverage finder
- Plans bento grid with toggle (Home/Business)
- "Why Us" section
- Speed test UI (demo)
- Infrastructure metrics
- Customer testimonials
- Careers teaser

### 2. **Packages** (`/packages`)
Premium pricing page featuring:
- Three-way toggle: Home / Business / Dedicated
- Filter chips for use cases
- Plan cards with gradient borders
- Add-ons section
- Custom quote CTA

### 3. **Coverage** (`/coverage`)
Interactive coverage explorer:
- Search and filter by town/county
- Map-style visualization with pins
- Status indicators (Available / Expanding)
- Install time estimates
- Expansion roadmap with progress bars
- "Request Coverage" CTA

### 4. **Business** (`/business`)
Enterprise solutions page:
- SLA feature cards
- Dedicated link options
- Custom quote form
- Real case studies with results
- B2B-focused design

### 5. **Support** (`/support`)
Modern help center:
- Network status banner
- Category tiles
- Searchable FAQ accordion
- 24/7 support CTAs

### 6. **Careers** (`/careers`)
Premium careers portal:
- Culture bento grid
- Benefits showcase
- Job listing with filters
- Job detail drawer UI
- Application flow (design only)

### 7. **About** (`/about`)
Company story:
- Mission & vision cards
- Values showcase
- Timeline visualization
- Footprint stats

### 8. **Contact** (`/contact`)
Multi-channel contact:
- Contact method cards
- Contact form
- Office locations with hours
- Map placeholder

### 9. **Legal** (`/legal/privacy-policy`, `/legal/terms-of-service`)
Clean, readable legal pages

## 🎭 Components

### Core Components
- **`GlassCard`**: Premium glass-morphism container
- **`NavBar`**: Sticky glass navigation with active indicators
- **`Footer`**: Multi-column footer with social links

### Section Components
All home page sections are modular:
- `HeroSection`
- `CoverageFinderSection`
- `PlansBentoSection`
- `WhyUsSection`
- `SpeedTestSection`
- `InfrastructureSection`
- `TestimonialsSection`
- `CareersTeaser`

## 📊 Dummy Data

All content is in `lib/isp-data.ts`:
- `stats` - Live network metrics
- `kenyaTowns` - Coverage areas (27+ towns)
- `homePlans` - Residential packages
- `businessPlans` - Business packages
- `dedicatedPlans` - Enterprise options
- `addOns` - Optional extras
- `whyChooseUs` - Feature highlights
- `testimonials` - Customer quotes
- `jobs` - Open positions
- `faqs` - Common questions
- `counties` - County coverage data
- `caseStudies` - Business success stories

## 🎬 Animations

Uses Framer Motion for:
- Scroll-triggered reveals
- Hover lift effects
- Animated gradients
- Progress bars
- Modal/drawer transitions
- Parallax-like motion

## 🎨 Design Patterns Used

1. **Bento Grids**: Asymmetric card layouts
2. **Glassmorphism**: Frosted glass panels with backdrop blur
3. **Gradient Glows**: Subtle ambient lighting effects
4. **Motion Design**: Entrance animations, hover states
5. **Kenya Context**: Local towns, M-Pesa mentions, local terminology

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🎯 Design Goals Achieved

✅ NOT a generic template or blog layout  
✅ Feels like a high-end product website  
✅ Telecom + modern SaaS hybrid aesthetic  
✅ Premium typography and spacing  
✅ Kenya-specific context throughout  
✅ Interactive, not static  
✅ Mobile-first, responsive  
✅ Wow-factor on first impression  

## 🛠️ Customization

To adapt this for a real ISP:

1. **Replace dummy data** in `lib/isp-data.ts`
2. **Connect forms** to real backend/API
3. **Add real images** (replace placeholder paths)
4. **Integrate payment** (M-Pesa, cards)
5. **Add authentication** for customer portal
6. **Connect speed test** to real server
7. **Real-time network status** integration

## 📱 Mobile Responsiveness

Every component is designed mobile-first:
- Touch-friendly buttons and cards
- Collapsible navigation
- Stacked layouts on small screens
- Optimized font sizes
- No horizontal scroll

## 🎨 Color Usage Guidelines

- **Primary**: Main CTAs, active states, brand elements
- **Accent**: Secondary actions, highlights
- **Muted**: Backgrounds, subtle borders
- **Glass**: Overlays with 8-12% opacity
- **Gradients**: Ambient background effects only (no loud rainbows)

## 🌟 Highlights

**What Makes This Special:**
- Every section feels intentionally designed
- No long walls of text
- Strong visual hierarchy
- Premium micro-interactions
- Kenya-specific touches (towns, M-Pesa, local context)
- Modern without being overwhelming
- Professional yet approachable

---

**Built for**: Kenyan ISP showcase  
**Design Style**: Premium, modern, telecom + fintech inspired  
**Status**: Design prototype (no backend)

