import React from 'react'

const PrivacyContent = () => {
  return (
    <div className="space-y-6">
      <section>
        <h4 className="text-lg font-semibold text-white mb-3">1. Information We Collect</h4>
        <div className="space-y-3">
          <p><strong>Personal Information:</strong></p>
          <p>When you create an account, we collect:</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Name, email address, phone number, and address</li>
            <li>Profile information specific to your role (donor, recipient, or volunteer)</li>
            <li>Communication preferences and settings</li>
          </ul>

          <p className="mt-3"><strong>Role-Specific Information:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li><strong>Donors:</strong> Donation types, organization details (if applicable), bio</li>
            <li><strong>Recipients:</strong> Household size, assistance needs, emergency contacts</li>
            <li><strong>Volunteers:</strong> Vehicle information, availability, experience, background check consent</li>
          </ul>

          <p className="mt-3"><strong>Usage Information:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Donation posts, requests, and delivery activities</li>
            <li>Messages and communications between users</li>
            <li>Platform usage patterns and preferences</li>
          </ul>
        </div>
      </section>

      <section>
        <h4 className="text-lg font-semibold text-white mb-3">2. How We Use Your Information</h4>
        <p className="mb-3">We use collected information to:</p>
        <ul className="list-disc list-inside ml-4 space-y-1">
          <li>Facilitate connections between donors, recipients, and volunteers</li>
          <li>Coordinate donation pickups and deliveries</li>
          <li>Send notifications about platform activities and updates</li>
          <li>Improve our services and user experience</li>
          <li>Ensure platform safety and prevent fraud</li>
          <li>Comply with legal obligations and resolve disputes</li>
          <li>Generate anonymized analytics and insights</li>
        </ul>
      </section>

      <section>
        <h4 className="text-lg font-semibold text-white mb-3">3. Information Sharing</h4>
        <div className="space-y-3">
          <p><strong>Within the Platform:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Your profile information is visible to other users as needed for donations and deliveries</li>
            <li>Contact information is shared only when coordinating specific transactions</li>
            <li>Donation posts and requests are visible to relevant community members</li>
          </ul>

          <p className="mt-3"><strong>With Third Parties:</strong></p>
          <p>We do not sell personal information. We may share information with:</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Service providers who help us operate the platform</li>
            <li>Law enforcement when required by law or to protect safety</li>
            <li>Emergency contacts (only when explicitly provided and in emergency situations)</li>
          </ul>
        </div>
      </section>

      <section>
        <h4 className="text-lg font-semibold text-white mb-3">4. Data Security</h4>
        <p className="mb-3">
          We implement appropriate technical and organizational measures to protect your personal information:
        </p>
        <ul className="list-disc list-inside ml-4 space-y-1">
          <li>Encrypted data transmission and storage</li>
          <li>Access controls and authentication requirements</li>
          <li>Regular security assessments and updates</li>
          <li>Secure hosting and database management</li>
        </ul>
        <p className="mt-3">
          However, no system is completely secure. We encourage users to protect their account credentials 
          and report any suspicious activity immediately.
        </p>
      </section>

      <section>
        <h4 className="text-lg font-semibold text-white mb-3">5. Your Rights and Choices</h4>
        <p className="mb-3">You have the right to:</p>
        <ul className="list-disc list-inside ml-4 space-y-1">
          <li><strong>Access:</strong> Request copies of your personal information</li>
          <li><strong>Correct:</strong> Update or correct inaccurate information</li>
          <li><strong>Delete:</strong> Request deletion of your account and personal data</li>
          <li><strong>Restrict:</strong> Limit how we process your information</li>
          <li><strong>Object:</strong> Opt out of certain types of data processing</li>
          <li><strong>Portability:</strong> Receive your data in a machine-readable format</li>
        </ul>
        <p className="mt-3">
          To exercise these rights, contact us at support@hopelink.ph
        </p>
      </section>

      <section>
        <h4 className="text-lg font-semibold text-white mb-3">6. Data Retention</h4>
        <p className="mb-3">
          We retain personal information for as long as necessary to provide our services and comply 
          with legal obligations:
        </p>
        <ul className="list-disc list-inside ml-4 space-y-1">
          <li>Active accounts: Information retained while account is active</li>
          <li>Deleted accounts: Some information may be retained for legal, safety, or fraud prevention purposes</li>
          <li>Communication records: Retained for dispute resolution and service improvement</li>
          <li>Transaction history: Retained for accountability and transparency</li>
        </ul>
      </section>

      <section>
        <h4 className="text-lg font-semibold text-white mb-3">7. Cookies and Tracking</h4>
        <p className="mb-3">
          We use cookies and similar technologies to improve your experience:
        </p>
        <ul className="list-disc list-inside ml-4 space-y-1">
          <li><strong>Essential cookies:</strong> Required for platform functionality</li>
          <li><strong>Analytics cookies:</strong> Help us understand how users interact with the platform</li>
          <li><strong>Preference cookies:</strong> Remember your settings and preferences</li>
        </ul>
        <p className="mt-3">
          You can control cookie settings through your browser, though this may affect platform functionality.
        </p>
      </section>

      <section>
        <h4 className="text-lg font-semibold text-white mb-3">8. Children's Privacy</h4>
        <p className="mb-3">
          HopeLink is not intended for users under 18 years of age. We do not knowingly collect 
          personal information from children. If we become aware that we have collected information 
          from a child, we will take steps to delete such information promptly.
        </p>
      </section>

      <section>
        <h4 className="text-lg font-semibold text-white mb-3">9. International Transfers</h4>
        <p className="mb-3">
          Your information may be transferred to and processed in countries other than the Philippines. 
          We ensure appropriate safeguards are in place to protect your information during such transfers, 
          in accordance with applicable data protection laws.
        </p>
      </section>

      <section>
        <h4 className="text-lg font-semibold text-white mb-3">10. Updates to This Policy</h4>
        <p className="mb-3">
          We may update this Privacy Policy periodically to reflect changes in our practices or 
          applicable laws. We will notify users of significant changes through the platform or 
          email. Your continued use of HopeLink after such changes constitutes acceptance of the 
          updated policy.
        </p>
      </section>

      <section>
        <h4 className="text-lg font-semibold text-white mb-3">11. Contact Information</h4>
        <p className="mb-3">
          For questions about this Privacy Policy or our data practices, please contact us:
        </p>
        <div className="ml-4">
          <p>Email: privacy@hopelink.ph</p>
          <p>Support: support@hopelink.ph</p>
          <p>Address: Cagayan de Oro City, Misamis Oriental, Philippines</p>
        </div>
      </section>

      <section className="text-sm text-skyblue-300 border-t border-navy-700 pt-4">
        <p>Last updated: December 2024</p>
        <p className="mt-2">
          This Privacy Policy explains how HopeLink collects, uses, and protects your personal information. 
          By using our platform, you agree to the collection and use of information in accordance with this policy.
        </p>
      </section>
    </div>
  )
}

export default PrivacyContent 