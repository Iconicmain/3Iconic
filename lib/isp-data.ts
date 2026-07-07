// ISP Dummy Data for Iconic Fibre

export const stats = {
  uptime: '99.8%',
  avgLatency: '12ms',
  townsCovered: 27,
  supportResponse: '< 2min',
  activeCustomers: '15,000+',
  networkSpeed: '10Gbps',
}

export const kenyaTowns = [
  { name: 'Nairobi', county: 'Nairobi', status: 'available', installDays: '2-3' },
  { name: 'Nyeri', county: 'Nyeri', status: 'available', installDays: '3-5' },
  { name: 'Nakuru', county: 'Nakuru', status: 'available', installDays: '2-4' },
  { name: 'Nanyuki', county: 'Laikipia', status: 'available', installDays: '3-5' },
  { name: 'Thika', county: 'Kiambu', status: 'available', installDays: '2-3' },
  { name: 'Gilgil', county: 'Nakuru', status: 'available', installDays: '4-6' },
  { name: 'Embu', county: 'Embu', status: 'expanding', installDays: '6-8' },
  { name: 'Kirinyaga', county: 'Kirinyaga', status: 'expanding', installDays: '6-8' },
  { name: 'Muranga', county: 'Muranga', status: 'available', installDays: '3-5' },
  { name: 'Kenol', county: 'Muranga', status: 'available', installDays: '4-6' },
  { name: 'Kiambu', county: 'Kiambu', status: 'available', installDays: '2-3' },
  { name: 'Ruiru', county: 'Kiambu', status: 'available', installDays: '2-3' },
  { name: 'Juja', county: 'Kiambu', status: 'available', installDays: '2-4' },
  { name: 'Eldoret', county: 'Uasin Gishu', status: 'expanding', installDays: '7-10' },
  { name: 'Meru', county: 'Meru', status: 'expanding', installDays: '6-8' },
  { name: 'Naivasha', county: 'Nakuru', status: 'available', installDays: '3-5' },
  { name: 'Kisumu', county: 'Kisumu', status: 'expanding', installDays: '8-10' },
  { name: 'Mombasa', county: 'Mombasa', status: 'expanding', installDays: '10-14' },
  { name: 'Ngóng', county: 'Kajiado', status: 'available', installDays: '3-5' },
]

export const homePlans = [
  {
    id: 'home-basic',
    name: 'Home Basic',
    speed: '10 Mbps',
    price: 1500,
    currency: 'KES',
    popular: false,
    features: [
      'Unlimited data',
      'Perfect for browsing & streaming',
      'Up to 3 devices',
      'M-Pesa payments',
      '24/7 support',
    ],
  },
  {
    id: 'home-standard',
    name: 'Home Standard',
    speed: '20 Mbps',
    price: 2500,
    currency: 'KES',
    popular: true,
    features: [
      'Unlimited data',
      '4K streaming on 2 screens',
      'Up to 8 devices',
      'M-Pesa payments',
      'Free router',
      '24/7 priority support',
    ],
  },
  {
    id: 'home-premium',
    name: 'Home Premium',
    speed: '50 Mbps',
    price: 5999,
    currency: 'KES',
    popular: false,
    features: [
      'Unlimited data',
      'Gaming optimized',
      'Unlimited devices',
      'M-Pesa payments',
      'Premium mesh router',
      'Dedicated support line',
    ],
  },
  {
    id: 'home-ultra',
    name: 'Home Ultra',
    speed: '100 Mbps',
    price: 8999,
    currency: 'KES',
    popular: false,
    features: [
      'Unlimited data',
      'Work from home + gaming',
      'Unlimited devices',
      'Static IP option',
      'Premium equipment',
      'White-glove support',
    ],
  },
]

export const businessPlans = [
  {
    id: 'biz-starter',
    name: 'Business Starter',
    speed: '20 Mbps',
    price: 6999,
    currency: 'KES',
    popular: false,
    sla: '99.5% uptime',
    features: [
      'Unlimited data',
      'Static IP included',
      'Business-grade router',
      'Priority support',
      'Email & web hosting ready',
    ],
  },
  {
    id: 'biz-growth',
    name: 'Business Growth',
    speed: '50 Mbps',
    price: 12999,
    currency: 'KES',
    popular: true,
    sla: '99.7% uptime',
    features: [
      'Unlimited data',
      '2 Static IPs',
      'Managed firewall',
      '4-hour response SLA',
      'Free installation',
      'Cloud services ready',
    ],
  },
  {
    id: 'biz-enterprise',
    name: 'Business Enterprise',
    speed: '100 Mbps',
    price: 24999,
    currency: 'KES',
    popular: false,
    sla: '99.9% uptime',
    features: [
      'Unlimited data',
      'Up to 8 Static IPs',
      'Managed security',
      '2-hour response SLA',
      'Redundant connection option',
      'Dedicated account manager',
    ],
  },
]

export const dedicatedPlans = [
  {
    id: 'dedicated-100',
    name: 'Dedicated 100',
    speed: '100 Mbps',
    bandwidth: 'Symmetric',
    price: 'Custom',
    sla: '99.9% uptime',
    features: [
      'Dedicated fiber link',
      'Symmetric upload/download',
      'Custom IP allocation',
      '1-hour response SLA',
      'Redundant paths available',
      'Direct backhaul access',
    ],
  },
  {
    id: 'dedicated-500',
    name: 'Dedicated 500',
    speed: '500 Mbps',
    bandwidth: 'Symmetric',
    price: 'Custom',
    sla: '99.95% uptime',
    features: [
      'Dedicated fiber link',
      'Symmetric upload/download',
      'BGP routing available',
      '30-min response SLA',
      'Dual redundant paths',
      'Network operations center',
    ],
  },
  {
    id: 'dedicated-1g',
    name: 'Dedicated 1G+',
    speed: '1+ Gbps',
    bandwidth: 'Symmetric',
    price: 'Custom',
    sla: '99.99% uptime',
    features: [
      'Dedicated fiber infrastructure',
      'Symmetric upload/download',
      'BGP multihoming',
      '15-min response SLA',
      'Full redundancy',
      '24/7 dedicated NOC',
    ],
  },
]

export const addOns = [
  {
    id: 'static-ip',
    name: 'Static IP Address',
    price: 500,
    description: 'Single static IPv4 address for hosting or VPN',
  },
  {
    id: 'router-install',
    name: 'Professional Installation',
    price: 2000,
    description: 'Expert setup with optimal placement and configuration',
  },
  {
    id: 'mesh-wifi',
    name: 'Mesh Wi-Fi System',
    price: 8000,
    description: 'Whole-home coverage with seamless roaming (3-pack)',
  },
  {
    id: 'managed-security',
    name: 'Managed Security',
    price: 1500,
    description: 'Business firewall, threat monitoring, and updates',
  },
]

export const whyChooseUs = [
  {
    icon: 'Zap',
    title: 'True Fiber Speed',
    description: 'End-to-end fiber infrastructure, not last-mile wireless',
  },
  {
    icon: 'Gamepad2',
    title: 'Low Latency Gaming',
    description: 'Sub-20ms latency to regional servers. Fortnite approved.',
  },
  {
    icon: 'Building2',
    title: 'SME Stability',
    description: 'Business-grade uptime with SLA guarantees',
  },
  {
    icon: 'Headset',
    title: '24/7 Support',
    description: 'Real humans, based in Kenya, speaking your language',
  },
  {
    icon: 'Smartphone',
    title: 'M-Pesa Friendly',
    description: 'Pay monthly via M-Pesa, no bank account needed',
  },
  {
    icon: 'Shield',
    title: 'No Data Caps',
    description: 'Truly unlimited. No throttling, no fair usage policy',
  },
]

export const testimonials = [
  {
    name: 'James Kamau',
    role: 'Gaming Lounge Owner, Nakuru',
    content: 'Switched to Iconic Fibre 6 months ago. Zero complaints from gamers. Latency is consistently under 15ms.',
    avatar: '/placeholder-user.jpg',
  },
  {
    name: 'Grace Wanjiru',
    role: 'Freelance Designer, Thika',
    content: 'Upload speeds are a game changer. I can push 4GB files to clients in minutes, not hours.',
    avatar: '/placeholder-user.jpg',
  },
  {
    name: 'David Otieno',
    role: 'SME Owner, Nyeri',
    content: 'Our POS systems and VoIP phones never go down. Iconic Fibre just works. Best decision for the business.',
    avatar: '/placeholder-user.jpg',
  },
]

export const jobs = [
  {
    id: 'field-tech-nyeri',
    title: 'Field Technician',
    department: 'Operations',
    location: 'Nyeri',
    type: 'Full-time',
    description:
      'Install and maintain fiber connections for homes and businesses across Nyeri and surrounding areas.',
    requirements: [
      'Technical diploma or equivalent',
      'Valid driving license',
      'Comfortable working outdoors',
      'Customer service mindset',
    ],
    benefits: ['Competitive salary', 'Health insurance', 'Equipment provided', 'Training & growth'],
  },
  {
    id: 'network-eng-nairobi',
    title: 'Network Engineer',
    department: 'Engineering',
    location: 'Nairobi',
    type: 'Full-time',
    description:
      'Maintain and optimize our core network infrastructure. Work with BGP, MPLS, and fiber transmission.',
    requirements: [
      'Degree in IT/Telecom or equivalent',
      'CCNP or similar certification',
      '3+ years ISP experience',
      'Proficiency with Cisco/Juniper',
    ],
    benefits: ['Market-leading salary', 'Health + dental', 'Certifications support', 'Remote flexibility'],
  },
  {
    id: 'support-nakuru',
    title: 'Customer Support Agent',
    department: 'Support',
    location: 'Nakuru',
    type: 'Full-time',
    description: 'Provide world-class support to customers via phone, email, and chat. Be the voice of Iconic Fibre.',
    requirements: [
      'Excellent communication in English & Swahili',
      'Technical curiosity',
      'Empathy and problem-solving',
      'Shift flexibility',
    ],
    benefits: ['Competitive pay', 'Health coverage', 'Performance bonuses', 'Career progression'],
  },
  {
    id: 'sales-thika',
    title: 'Business Sales Executive',
    department: 'Sales',
    location: 'Thika',
    type: 'Full-time',
    description: 'Drive business and enterprise customer acquisition. Build relationships with SMEs and corporates.',
    requirements: [
      'Proven B2B sales record',
      'Understanding of internet/telecom',
      'Self-motivated and target-driven',
      'Own transport preferred',
    ],
    benefits: ['Base + commission', 'Health insurance', 'Transport allowance', 'Uncapped earning potential'],
  },
]

export const faqs = [
  {
    category: 'Installation',
    question: 'How long does installation take?',
    answer:
      'Most installations are completed within 2-5 business days after coverage confirmation. We will schedule a convenient time with you.',
  },
  {
    category: 'Billing',
    question: 'Can I pay via M-Pesa?',
    answer:
      'Yes! We support M-Pesa, bank transfer, and card payments. Monthly billing is automatic via your preferred method.',
  },
  {
    category: 'Speed',
    question: 'Will I get the full advertised speed?',
    answer:
      'Yes. Our speeds are not "up to" estimates. We deliver consistent speeds because we use fiber, not wireless.',
  },
  {
    category: 'Coverage',
    question: 'What if my area is not covered yet?',
    answer:
      'Register your interest via our coverage page. We prioritize expansion based on demand and build new areas quarterly.',
  },
  {
    category: 'Support',
    question: 'Is support really 24/7?',
    answer:
      'Absolutely. Call, WhatsApp, or email anytime. We have live agents around the clock, not bots.',
  },
]

export const counties = [
  { name: 'Nairobi', status: 'available', coverage: 85 },
  { name: 'Kiambu', status: 'available', coverage: 70 },
  { name: 'Nyeri', status: 'available', coverage: 65 },
  { name: 'Nakuru', status: 'available', coverage: 60 },
  { name: 'Laikipia', status: 'available', coverage: 45 },
  { name: 'Muranga', status: 'available', coverage: 50 },
  { name: 'Embu', status: 'expanding', coverage: 25 },
  { name: 'Kirinyaga', status: 'expanding', coverage: 20 },
  { name: 'Meru', status: 'expanding', coverage: 15 },
  { name: 'Uasin Gishu', status: 'expanding', coverage: 30 },
  { name: 'Kisumu', status: 'expanding', coverage: 20 },
  { name: 'Mombasa', status: 'expanding', coverage: 10 },
]

export const caseStudies = [
  {
    company: 'TechHub Nakuru',
    industry: 'Co-working Space',
    challenge: 'Needed reliable connectivity for 50+ daily users with varied bandwidth demands.',
    solution: 'Deployed 100 Mbps Business Enterprise with managed Wi-Fi and redundant backup.',
    result: '99.9% uptime over 12 months. Zero customer complaints about internet.',
  },
  {
    company: 'Highlands Hotel',
    industry: 'Hospitality',
    challenge: 'Guest WiFi was slow and unreliable, damaging reviews and bookings.',
    solution: 'Installed 50 Mbps fiber with mesh coverage across 30 rooms and public areas.',
    result: 'Guest satisfaction scores improved 40%. WiFi is now a selling point.',
  },
  {
    company: 'Agritech Logistics',
    industry: 'Agriculture & Logistics',
    challenge: 'Real-time GPS tracking and cloud ERP required stable, low-latency connection.',
    solution: 'Dedicated 20 Mbps symmetric link with static IP and managed firewall.',
    result: 'System downtime reduced to zero. Fleet efficiency improved 25%.',
  },
]

