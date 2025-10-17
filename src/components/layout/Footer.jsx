import React from 'react'
import { Link } from 'react-router-dom'
import { Heart, Mail, Phone, MapPin } from 'lucide-react'

const Footer = ({ userRole = null }) => {
  const currentYear = new Date().getFullYear()

  // Role-specific footer configurations
  const roleBasedFooterConfig = {
    donor: {
      primaryLinks: [
        { name: 'Post Donation', href: '/post-donation' },
        { name: 'My Donations', href: '/my-donations' },
        { name: 'Browse Requests', href: '/browse-requests' },
        { name: 'Donation Guidelines', href: '/guidelines' },
      ],
      secondaryLinks: [
        { name: 'Tax Benefits', href: '/tax-benefits' },
        { name: 'Impact Reports', href: '/impact' },
        { name: 'Success Stories', href: '/stories' },
      ]
    },
    recipient: {
      primaryLinks: [
        { name: 'Browse Donations', href: '/browse-donations' },
        { name: 'Create Request', href: '/create-request' },
        { name: 'My Requests', href: '/my-requests' },
        { name: 'My Approved Items', href: '/my-approved-donations' },
      ],
      secondaryLinks: [
        { name: 'Eligibility Guide', href: '/eligibility' },
        { name: 'Support Center', href: '/support' },
        { name: 'Community Resources', href: '/resources' },
      ]
    },
    volunteer: {
      primaryLinks: [
        { name: 'Volunteer Dashboard', href: '/volunteer-dashboard' },
        { name: 'Available Tasks', href: '/available-tasks' },
        { name: 'My Deliveries', href: '/my-deliveries' },
        { name: 'Manage Schedule', href: '/volunteer-schedule' },
      ],
      secondaryLinks: [
        { name: 'Volunteer Training', href: '/volunteer-training' },
        { name: 'Recognition Program', href: '/volunteer-recognition' },
        { name: 'Community Impact', href: '/impact' },
      ]
    },
    admin: {
      primaryLinks: [
        { name: 'Admin Dashboard', href: '/admin' },
        { name: 'User Management', href: '/admin/users' },
        { name: 'Donation Management', href: '/admin/donations' },
        { name: 'Request Management', href: '/admin/requests' },
      ],
      secondaryLinks: [
        { name: 'Volunteer Management', href: '/admin/volunteers' },
        { name: 'Platform Settings', href: '/admin/settings' },
        { name: 'Analytics & Reports', href: '/admin/analytics' },
      ]
    }
  }

  // Common links for all users
  const commonLinks = {
    platform: [
      { name: 'How it Works', href: '/about' },
      { name: 'Community Events', href: '/events' },
      { name: 'Success Stories', href: '/stories' },
      { name: 'FAQ', href: '/faq' },
    ],
    resources: [
      { name: 'Getting Started', href: '/getting-started' },
      { name: 'Donation Guidelines', href: '/guidelines' },
      { name: 'Safety & Security', href: '/safety' },
      { name: 'Support Center', href: '/support' },
    ],
    legal: [
      { name: 'Privacy Policy', href: '/privacy-policy' },
      { name: 'Terms of Service', href: '/terms' },
      { name: 'Cookie Policy', href: '/cookies' },
      { name: 'Code of Conduct', href: '/conduct' },
    ]
  }

  // Get configuration for current user role
  const currentConfig = userRole ? roleBasedFooterConfig[userRole] : null

  return (
    <footer className="text-white" style={{backgroundColor: '#000f3d'}}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <img src="/hopelinklogo.png" alt="HopeLink" className="h-12 rounded" />
              <span className="text-2xl font-bold">HopeLink</span>
            </div>
            <p className="text-yellow-200 mb-6 max-w-md">
              Connecting hearts and communities through the power of giving. 
              Together, we build a network of hope, one donation at a time.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-yellow-200">
                <Mail className="h-4 w-4" />
                <span className="text-sm">support@hopelink.org</span>
              </div>
              <div className="flex items-center space-x-2 text-yellow-200">
                <Phone className="h-4 w-4" />
                <span className="text-sm">1-800-HOPE-LINK</span>
              </div>
              <div className="flex items-center space-x-2 text-yellow-200">
                <MapPin className="h-4 w-4" />
                <span className="text-sm">Serving communities nationwide</span>
              </div>
            </div>
          </div>

          {/* Role-specific Section */}
          {currentConfig ? (
            <div className="lg:col-span-1">
              <h3 className="text-lg font-semibold mb-4 text-center">Quick Links</h3>
              <div className="grid grid-cols-1 gap-2">
                {currentConfig.primaryLinks.map((link) => (
                  <Link
                    key={link.name}
                    to={link.href}
                    className="text-yellow-200 hover:text-yellow-400 transition-colors text-sm text-center"
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            /* Default Platform Links for non-authenticated users */
            <div className="lg:col-span-1">
              <h3 className="text-lg font-semibold mb-4">Platform</h3>
              <ul className="space-y-2">
                {commonLinks.platform.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className="text-yellow-200 hover:text-yellow-400 transition-colors text-sm"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Additional Resources */}
          <div className="lg:col-span-1">
            <h3 className="text-lg font-semibold mb-4">Resources</h3>
            <ul className="space-y-2">
              {currentConfig ? (
                currentConfig.secondaryLinks.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className="text-yellow-200 hover:text-yellow-400 transition-colors text-sm"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))
              ) : (
                commonLinks.resources.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className="text-yellow-200 hover:text-yellow-400 transition-colors text-sm"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Community Section */}
          <div className="lg:col-span-1">
            <h3 className="text-lg font-semibold mb-4">Community</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/events"
                  className="text-yellow-200 hover:text-yellow-400 transition-colors text-sm"
                >
                  Community Events
                </Link>
              </li>
              <li>
                <Link
                  to="/stories"
                  className="text-yellow-200 hover:text-yellow-400 transition-colors text-sm"
                >
                  Success Stories
                </Link>
              </li>
              <li>
                <Link
                  to="/about"
                  className="text-yellow-200 hover:text-yellow-400 transition-colors text-sm"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-yellow-200 hover:text-yellow-400 transition-colors text-sm"
                >
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <hr className="border-navy-700 my-8" />

        {/* Bottom Section */}
        <div className="flex flex-col lg:flex-row justify-between items-center">
          <div className="flex flex-wrap gap-6 mb-4 lg:mb-0">
            {commonLinks.legal.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className="text-yellow-300 hover:text-yellow-400 transition-colors text-sm"
              >
                {link.name}
              </Link>
            ))}
          </div>
          
          <div className="text-yellow-300 text-sm">
            © {currentYear} HopeLink. All rights reserved. Built with ❤️ for the community.
          </div>
        </div>

        {/* Mission Statement */}
        <div className="mt-8 pt-8 border-t border-navy-700 text-center">
          <p className="text-yellow-300 text-sm max-w-2xl mx-auto">
            "Hope is being able to see that there is light despite all of the darkness." 
            - Desmond Tutu. Every donation, every request, every delivery creates a brighter tomorrow.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer 