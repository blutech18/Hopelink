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
        { name: 'My Approved Requests', href: '/my-approved-requests' },
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
        { name: 'Direct Donations', href: '/admin/cfc-donations' },
        { name: 'Request Management', href: '/admin/requests' },
      ],
      secondaryLinks: [
        { name: 'Volunteer Management', href: '/admin/volunteers' },
        { name: 'Matching Parameters', href: '/admin/matching-parameters' },
        { name: 'Platform Settings', href: '/profile#admin-settings' },
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
          {/* Brand Section */}
          <div className="lg:col-span-2 sm:col-span-2">
            <div className="flex items-center space-x-2 mb-2 sm:mb-3">
              <img src="/hopelinklogo.png" alt="HopeLink" className="h-8 sm:h-10 rounded" />
              <span className="text-lg sm:text-xl font-bold">HopeLink</span>
            </div>
            <p className="text-xs sm:text-sm text-yellow-200 mb-3 sm:mb-4 max-w-md leading-relaxed">
              Connecting hearts and communities through the power of giving.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2 text-yellow-200">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm">cfcgkmisor@gmail.com</span>
              </div>
              <div className="flex items-center space-x-2 text-yellow-200">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm">+63 123 456 7890</span>
              </div>
              <div className="flex items-center space-x-2 text-yellow-200">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm">Pasil, Kauswagan, Kauswagan, Philippines</span>
              </div>
            </div>
          </div>

          {/* Role-specific Section */}
          {currentConfig ? (
            <div className="lg:col-span-1">
              <h3 className="text-sm sm:text-base font-semibold mb-2 sm:mb-3">Quick Links</h3>
              <ul className="space-y-1.5">
                {currentConfig.primaryLinks.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className="text-yellow-200 hover:text-yellow-400 transition-colors text-xs sm:text-sm block"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            /* Default Platform Links for non-authenticated users */
            <div className="lg:col-span-1">
              <h3 className="text-sm sm:text-base font-semibold mb-2 sm:mb-3">Platform</h3>
              <ul className="space-y-1.5">
                {commonLinks.platform.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className="text-yellow-200 hover:text-yellow-400 transition-colors text-xs sm:text-sm block"
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
            <h3 className="text-sm sm:text-base font-semibold mb-2 sm:mb-3">Resources</h3>
            <ul className="space-y-1.5">
              {currentConfig ? (
                currentConfig.secondaryLinks.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className="text-yellow-200 hover:text-yellow-400 transition-colors text-xs sm:text-sm"
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
                      className="text-yellow-200 hover:text-yellow-400 transition-colors text-xs sm:text-sm"
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
            <h3 className="text-sm sm:text-base font-semibold mb-2 sm:mb-3">Community</h3>
            <ul className="space-y-1.5">
              <li>
                <Link
                  to="/events"
                  className="text-yellow-200 hover:text-yellow-400 transition-colors text-xs sm:text-sm"
                >
                  Community Events
                </Link>
              </li>
              <li>
                <Link
                  to="/stories"
                  className="text-yellow-200 hover:text-yellow-400 transition-colors text-xs sm:text-sm"
                >
                  Success Stories
                </Link>
              </li>
              <li>
                <Link
                  to="/about"
                  className="text-yellow-200 hover:text-yellow-400 transition-colors text-xs sm:text-sm"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-yellow-200 hover:text-yellow-400 transition-colors text-xs sm:text-sm"
                >
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <hr className="border-navy-700 my-4 sm:my-6" />

        {/* Bottom Section */}
        <div className="flex flex-col sm:flex-row lg:flex-row justify-between items-center gap-3">
          <div className="flex flex-wrap justify-center sm:justify-start gap-3 sm:gap-4 lg:gap-6">
            {commonLinks.legal.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className="text-yellow-300 hover:text-yellow-400 transition-colors text-xs sm:text-sm"
              >
                {link.name}
              </Link>
            ))}
          </div>
          
          <div className="text-yellow-300 text-xs sm:text-sm text-center sm:text-right">
            © {currentYear} HopeLink. All rights reserved. Built with ❤️ for the community.
          </div>
        </div>

        {/* Mission Statement */}
        <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-navy-700 text-center">
          <p className="text-yellow-300 text-xs max-w-2xl mx-auto leading-relaxed">
            "Hope is being able to see that there is light despite all of the darkness." - Desmond Tutu
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer 