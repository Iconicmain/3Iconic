'use client';

import { useState, useEffect } from 'react';
import { Mail, Crown, Gem } from 'lucide-react';

export default function ComingSoonPage() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    // Set launch date (30 days from now)
    const launchDate = new Date();
    launchDate.setDate(launchDate.getDate() + 30);

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = launchDate.getTime() - now;

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="max-w-2xl mx-auto text-center">
        {/* Logo/Brand */}
        <div className="mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-emerald-700 mb-4">3ICONIC</h1>
        </div>

        {/* Main Heading */}
        <h2 className="text-4xl md:text-5xl font-bold text-emerald-800 mb-4">
          Coming Soon ✨
        </h2>

        {/* Subtitle */}
        <p className="text-lg text-emerald-700 mb-12 max-w-xl mx-auto">
          🌐 Professional WiFi installation services for institutions. Connecting your organization with reliable, high-speed internet solutions. 💻
        </p>

        {/* Countdown Timer */}
        <div className="grid grid-cols-4 gap-4 mb-12 max-w-xl mx-auto">
          {[
            { label: 'Days', value: timeLeft.days },
            { label: 'Hours', value: timeLeft.hours },
            { label: 'Minutes', value: timeLeft.minutes },
            { label: 'Seconds', value: timeLeft.seconds },
          ].map((item, idx) => (
            <div
              key={idx}
              className="bg-white border-2 border-emerald-200 rounded-lg p-4 shadow-sm"
            >
              <div className="text-3xl md:text-4xl font-bold text-emerald-700 mb-1">
                {String(item.value).padStart(2, '0')}
              </div>
              <div className="text-xs text-emerald-600 uppercase tracking-wider">
                {item.label}
              </div>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <div className="flex justify-center items-center mb-8">
          <button className="bg-white border-2 border-emerald-300 hover:bg-emerald-50 text-emerald-700 px-8 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2 shadow-md hover:shadow-lg">
            <Mail className="w-5 h-5 text-amber-600" />
            <span>Notify Me</span>
          </button>
        </div>

        {/* Footer */}
        <p className="text-emerald-600 text-sm">
          © 2025 3ICONIC. All rights reserved.
        </p>
      </div>
    </div>
  );
}
