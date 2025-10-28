import React from 'react'

const TermsContent = () => {
  return (
    <div className="space-y-8">
      {/* Terms of Service Section */}
      <div>
        <h2 className="text-2xl font-bold text-yellow-400 mb-6 border-b border-yellow-700 pb-3">
          Terms of Service
        </h2>
        
        <div className="space-y-6">
          <section>
            <h4 className="text-base sm:text-lg font-semibold text-yellow-400 mb-2 sm:mb-3">1. Acceptance of Terms</h4>
            <p className="mb-3">
              By creating an account and using HopeLink, you acknowledge that you have read, 
              understood, and agree to be bound by these Terms of Service and our Privacy Policy. 
              If you do not agree to these terms, please do not use our platform.
            </p>
          </section>

          <section>
            <h4 className="text-base sm:text-lg font-semibold text-yellow-400 mb-2 sm:mb-3">2. User Responsibilities</h4>
            <p className="mb-2">All users are expected to:</p>
            <ul className="list-disc ml-4 space-y-1.5">
              <li>Provide accurate and truthful information</li>
              <li>Respect other community members</li>
              <li>Use the platform in good faith to help those in need</li>
              <li>Follow all applicable local, state, and federal laws</li>
            </ul>

            <p className="mt-3 font-semibold text-yellow-300">Donors:</p>
            <ul className="list-disc ml-4 space-y-1.5">
              <li>Ensure donated items are safe, clean, and in good condition</li>
              <li>Provide accurate descriptions and photos of items</li>
              <li>Be available for pickup arrangements as committed</li>
              <li>Communicate promptly with recipients and volunteers</li>
            </ul>

            <p className="mt-3 font-semibold text-yellow-300">Recipients:</p>
            <ul className="list-disc ml-4 space-y-1.5">
              <li>Only request items that are genuinely needed</li>
              <li>Be available to receive donations as scheduled</li>
              <li>Express gratitude and provide feedback when appropriate</li>
              <li>Use received items for their intended purpose</li>
            </ul>

            <p className="mt-3 font-semibold text-yellow-300">Volunteers:</p>
            <ul className="list-disc ml-4 space-y-1.5">
              <li>Deliver items safely and on time</li>
              <li>Handle all items with care and respect</li>
              <li>Maintain confidentiality of pickup and delivery addresses</li>
              <li>Complete deliveries as committed or notify all parties of delays</li>
            </ul>
          </section>

          <section>
            <h4 className="text-base sm:text-lg font-semibold text-yellow-400 mb-2 sm:mb-3">3. Prohibited Activities</h4>
            <p className="mb-2">Users are strictly prohibited from:</p>
            <ul className="list-disc ml-4 space-y-1.5">
              <li>Selling or monetizing donations that should be given freely</li>
              <li>Posting false, misleading, or fraudulent information</li>
              <li>Using the platform for commercial or business purposes (unless authorized)</li>
              <li>Harassing, threatening, or discriminating against other users</li>
              <li>Sharing inappropriate, offensive, or illegal content</li>
              <li>Attempting to bypass platform security or access unauthorized areas</li>
              <li>Creating multiple accounts to circumvent limitations or bans</li>
            </ul>
          </section>

          <section>
            <h4 className="text-base sm:text-lg font-semibold text-yellow-400 mb-2 sm:mb-3">4. Platform Responsibilities and Limitations</h4>
            <p className="mb-3">
              HopeLink serves as a facilitating platform and is not responsible for:
            </p>
            <ul className="list-disc ml-4 space-y-1.5">
              <li>The quality, safety, or condition of donated items</li>
              <li>Failed deliveries or scheduling conflicts between users</li>
              <li>Loss, damage, or theft of items during transit</li>
              <li>Disputes between users regarding donations or services</li>
              <li>Verification of user identities or the accuracy of posted information</li>
            </ul>
            <p className="mt-3">
              Users engage with each other at their own risk and discretion. HopeLink encourages 
              all users to exercise caution and common sense in their interactions.
            </p>
          </section>

          <section>
            <h4 className="text-base sm:text-lg font-semibold text-yellow-400 mb-2 sm:mb-3">5. Account Management</h4>
            <p className="mb-3">
              HopeLink reserves the right to suspend or terminate user accounts that violate these 
              terms or engage in behavior harmful to the community. Users may delete their accounts 
              at any time, though some information may be retained for legal or safety purposes.
            </p>
          </section>

          <section>
            <h4 className="text-base sm:text-lg font-semibold text-yellow-400 mb-2 sm:mb-3">6. Intellectual Property</h4>
            <p className="mb-3">
              The HopeLink platform, including its design, features, and content, is owned by HopeLink 
              and protected by intellectual property laws. Users retain ownership of content they post 
              but grant HopeLink a license to use such content for platform operations.
            </p>
          </section>

          <section>
            <h4 className="text-base sm:text-lg font-semibold text-yellow-400 mb-2 sm:mb-3">7. Liability Limitations</h4>
            <p className="mb-3">
              To the fullest extent permitted by law, HopeLink shall not be liable for any indirect, 
              incidental, special, consequential, or punitive damages arising from your use of the platform. 
              Our total liability shall not exceed the amount you paid to use our services (if any).
            </p>
          </section>

          <section>
            <h4 className="text-base sm:text-lg font-semibold text-yellow-400 mb-2 sm:mb-3">8. Modifications to Terms</h4>
            <p className="mb-3">
              HopeLink may update these Terms of Service from time to time. Users will be notified 
              of significant changes, and continued use of the platform constitutes acceptance of 
              updated terms.
            </p>
          </section>

          <section>
            <h4 className="text-base sm:text-lg font-semibold text-yellow-400 mb-2 sm:mb-3">9. Governing Law</h4>
            <p className="mb-3">
              These Terms of Service are governed by the laws of the Republic of the Philippines. 
              Any disputes will be resolved in the appropriate courts of Misamis Oriental, Philippines.
            </p>
          </section>
        </div>
      </div>

      {/* Privacy Policy Section */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-yellow-400 mb-4 sm:mb-6 border-b-2 border-yellow-500/20 pb-3">
          Privacy Policy
        </h2>
        
        <div className="space-y-6">
          <section>
            <h4 className="text-lg font-semibold text-white mb-3">1. Information We Collect</h4>
            <div className="space-y-3">
              <p className="font-semibold text-yellow-300">Personal Information:</p>
              <p>When you create an account, we collect:</p>
              <ul className="list-disc ml-4 space-y-1.5">
                <li>Name, email address, phone number, and address</li>
                <li>Profile information specific to your role (donor, recipient, or volunteer)</li>
                <li>Communication preferences and settings</li>
              </ul>

              <p className="mt-3 font-semibold text-yellow-300">Role-Specific Information:</p>
              <ul className="list-disc ml-4 space-y-1.5">
                <li><span className="font-semibold text-yellow-300">Donors:</span> Donation types, organization details (if applicable), bio</li>
                <li><span className="font-semibold text-yellow-300">Recipients:</span> Household size, assistance needs, emergency contacts</li>
                <li><span className="font-semibold text-yellow-300">Volunteers:</span> Vehicle information, availability, experience, background check consent</li>
              </ul>

              <p className="mt-3 font-semibold text-yellow-300">Usage Information:</p>
              <ul className="list-disc ml-4 space-y-1.5">
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
              <p className="font-semibold text-yellow-300">Within the Platform:</p>
              <ul className="list-disc ml-4 space-y-1.5">
                <li>Your profile information is visible to other users as needed for donations and deliveries</li>
                <li>Contact information is shared only when coordinating specific transactions</li>
                <li>Donation posts and requests are visible to relevant community members</li>
              </ul>

              <p className="mt-3 font-semibold text-yellow-300">With Third Parties:</p>
              <p>We do not sell personal information. We may share information with:</p>
              <ul className="list-disc ml-4 space-y-1.5">
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
              <li><span className="font-semibold text-yellow-300">Access:</span> Request copies of your personal information</li>
              <li><span className="font-semibold text-yellow-300">Correct:</span> Update or correct inaccurate information</li>
              <li><span className="font-semibold text-yellow-300">Delete:</span> Request deletion of your account and personal data</li>
              <li><span className="font-semibold text-yellow-300">Restrict:</span> Limit how we process your information</li>
              <li><span className="font-semibold text-yellow-300">Object:</span> Opt out of certain types of data processing</li>
              <li><span className="font-semibold text-yellow-300">Portability:</span> Receive your data in a machine-readable format</li>
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
              <li><span className="font-semibold text-yellow-300">Essential cookies:</span> Required for platform functionality</li>
              <li><span className="font-semibold text-yellow-300">Analytics cookies:</span> Help us understand how users interact with the platform</li>
              <li><span className="font-semibold text-yellow-300">Preference cookies:</span> Remember your settings and preferences</li>
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
        </div>
      </div>
    </div>
  )
}

export default TermsContent 