import React from 'react'
import { Link } from 'react-router-dom'
import { Heart, Mail, Phone, MapPin } from 'lucide-react'

const Footer = () => {
  const currentYear = new Date().getFullYear()

  const footerLinks = {
    platform: [
      { name: 'How it Works', href: '/about' },
      { name: 'Community Events', href: '/events' },
      { name: 'Success Stories', href: '/stories' },
      { name: 'FAQ', href: '/faq' },
    ],
    forDonors: [
      { name: 'Post Donation', href: '/donor/post-donation' },
      { name: 'Donation Guidelines', href: '/guidelines' },
      { name: 'Tax Benefits', href: '/tax-benefits' },
      { name: 'Impact Reports', href: '/impact' },
    ],
    forRecipients: [
      { name: 'Browse Donations', href: '/recipient/browse-donations' },
      { name: 'Request Items', href: '/recipient/create-request' },
      { name: 'Eligibility', href: '/eligibility' },
      { name: 'Support', href: '/support' },
    ],
    volunteers: [
      { name: 'Volunteer Hub', href: '/volunteer/dashboard' },
      { name: 'Delivery Tasks', href: '/volunteer/available-tasks' },
      { name: 'Training', href: '/volunteer-training' },
      { name: 'Recognition', href: '/volunteer-recognition' },
    ],
    legal: [
      { name: 'Privacy Policy', href: '/privacy' },
      { name: 'Terms of Service', href: '/terms' },
      { name: 'Cookie Policy', href: '/cookies' },
      { name: 'Code of Conduct', href: '/conduct' },
    ]
  }

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <img src="/hopelinklogo.png" alt="HopeLink" className="h-8 w-8 rounded" />
              <span className="text-2xl font-bold">HopeLink</span>
            </div>
            <p className="text-gray-300 mb-6 max-w-md">
              Connecting hearts and communities through the power of giving. 
              Together, we build a network of hope, one donation at a time.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-gray-300">
                <Mail className="h-4 w-4" />
                <span className="text-sm">support@hopelink.org</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-300">
                <Phone className="h-4 w-4" />
                <span className="text-sm">1-800-HOPE-LINK</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-300">
                <MapPin className="h-4 w-4" />
                <span className="text-sm">Serving communities nationwide</span>
              </div>
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Platform</h3>
            <ul className="space-y-2">
              {footerLinks.platform.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-gray-300 hover:text-white transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* For Donors */}
          <div>
            <h3 className="text-lg font-semibold mb-4">For Donors</h3>
            <ul className="space-y-2">
              {footerLinks.forDonors.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-gray-300 hover:text-white transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* For Recipients */}
          <div>
            <h3 className="text-lg font-semibold mb-4">For Recipients</h3>
            <ul className="space-y-2">
              {footerLinks.forRecipients.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-gray-300 hover:text-white transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Volunteers */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Volunteers</h3>
            <ul className="space-y-2">
              {footerLinks.volunteers.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-gray-300 hover:text-white transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <hr className="border-gray-800 my-8" />

        {/* Bottom Section */}
        <div className="flex flex-col lg:flex-row justify-between items-center">
          <div className="flex flex-wrap gap-6 mb-4 lg:mb-0">
            {footerLinks.legal.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                {link.name}
              </Link>
            ))}
          </div>
          
          <div className="text-gray-400 text-sm">
            © {currentYear} HopeLink. All rights reserved. Built with ❤️ for the community.
          </div>
        </div>

        {/* Mission Statement */}
        <div className="mt-8 pt-8 border-t border-gray-800 text-center">
          <p className="text-gray-400 text-sm max-w-2xl mx-auto">
            "Hope is being able to see that there is light despite all of the darkness." 
            - Desmond Tutu. Every donation, every request, every delivery creates a brighter tomorrow.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer 