import React from 'react'

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-navy-950 py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <img src="/hopelinklogo.png" alt="HopeLink" className="h-16 w-16 rounded mx-auto mb-8" />
          <h1 className="text-4xl font-bold text-white mb-8">About HopeLink</h1>
          <p className="text-xl text-skyblue-300 mb-12">
            Building bridges of hope through community-driven donation management.
          </p>
        </div>
        
        <div className="prose prose-lg mx-auto max-w-none">
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Our Mission</h2>
              <p className="text-skyblue-300 leading-relaxed">
                HopeLink connects donors, recipients, and volunteers in a seamless ecosystem 
                for resource sharing and community support. We believe that every donation, 
                every request, and every delivery creates a ripple of hope that strengthens our communities.
              </p>
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">How It Works</h2>
              <p className="text-skyblue-300 leading-relaxed">
                Our platform makes it simple for community members to give, receive, and volunteer. 
                Donors can easily post items they want to share, recipients can browse available 
                donations or create specific requests, and volunteers help ensure items reach 
                those who need them most.
              </p>
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Community Impact</h2>
              <p className="text-skyblue-300 leading-relaxed">
                Together, we're building a network where generosity flows freely and no one 
                goes without. Every interaction on HopeLink contributes to a stronger, 
                more connected community.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AboutPage 