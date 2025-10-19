import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  Heart,
  User,
  LogOut,
  Settings,
  Gift,
  Users,
  Calendar,
  Truck,
  Shield,
  Bell,
  Clock,
  ChevronDown,
  Info,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const { isAuthenticated, profile, signOut } = useAuth();
  const { success, error } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const desktopProfileMenuRef = useRef(null);
  const mobileProfileMenuRef = useRef(null);

  // Hide profile display during callback processing to prevent flash of user info before error handling
  const isCallbackPage = location.pathname === "/auth/callback";
  const shouldShowProfile = isAuthenticated && profile && !isCallbackPage;

  // Close profile menu when clicking outside either desktop or mobile dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedInsideDesktop =
        desktopProfileMenuRef.current &&
        desktopProfileMenuRef.current.contains(event.target);
      const clickedInsideMobile =
        mobileProfileMenuRef.current &&
        mobileProfileMenuRef.current.contains(event.target);
      if (!clickedInsideDesktop && !clickedInsideMobile) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  // Close menus when authentication state changes
  useEffect(() => {
    setIsProfileMenuOpen(false);
    setIsMenuOpen(false);
  }, [isAuthenticated]);

  // Track scroll position to update active section for scroll-based nav
  useEffect(() => {
    const handleScroll = () => {
      if (location.pathname !== "/") {
        setActiveSection("home");
        return;
      }

      const sections = ["home", "events", "about"];
      const scrollPosition = window.scrollY + 100; // Offset for navbar height

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        const element = section === "home" ? document.body : document.getElementById(section);
        if (element) {
          const elementTop = section === "home" ? 0 : element.offsetTop;
          if (scrollPosition >= elementTop) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    // Set initial active section
    handleScroll();

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [location.pathname]);

  const handleSignOut = async () => {
    if (isSigningOut) return;

    try {
      setIsSigningOut(true);
      setIsProfileMenuOpen(false);
      await signOut();
      navigate("/", { replace: true });
      setTimeout(() => {
        success("Successfully signed out");
      }, 100);
    } catch (signOutError) {
      console.error("Error signing out:", signOutError);
      error("Error signing out, but you have been logged out locally");
      navigate("/", { replace: true });
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleScrollNavigation = (scrollTo) => {
    // If we're not on the home page, navigate there first
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(() => {
        if (scrollTo === "home") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          const element = document.getElementById(scrollTo);
          if (element) element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    } else {
      if (scrollTo === "home") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        const element = document.getElementById(scrollTo);
        if (element) element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  // Scroll-aware public nav links for Home page top sections
  const publicNavLinks = [
    { path: "/", label: "Home", scrollTo: "home" },
    { path: "/events", label: "Events", scrollTo: "events" },
    { path: "/about", label: "About", scrollTo: "about" },
  ];

  // Helper to check active link
  const isLinkActive = (link) => {
    if (link.scrollTo) return location.pathname === "/" && activeSection === link.scrollTo;
    return location.pathname === link.path;
  };

  // Get navigation links based on user role
  const getNavLinksForRole = (role) => {
    switch (role) {
      case "donor":
      case "admin":
        return [{ path: "/events", label: "Events" }]; // Events for donors and admins
      case "recipient":
      case "volunteer":
        return []; // No public nav links for recipients and volunteers
      default:
        return publicNavLinks; // Show all for non-authenticated users
    }
  };

  const roleBasedLinks = {
    donor: [
      { path: "/post-donation", label: "Post Donation", icon: Gift },
      { path: "/my-donations", label: "My Donations", icon: Heart },
      { path: "/browse-requests", label: "Browse Requests", icon: Users },
      { path: "/events", label: "Events", icon: Calendar },
    ],
    recipient: [
      { path: "/browse-donations", label: "Browse Donations", icon: Gift },
      { path: "/create-request", label: "Create Request", icon: Heart },
      { path: "/my-requests", label: "My Requests", icon: Users },
      { path: "/events", label: "Events", icon: Calendar },
    ],
    volunteer: [
      { path: "/available-tasks", label: "Available Tasks", icon: Truck },
      { path: "/my-deliveries", label: "My Deliveries", icon: Calendar },
      { path: "/volunteer-schedule", label: "Manage Schedule", icon: Clock },
      { path: "/events", label: "Events", icon: Calendar },
    ],
    admin: [
      { path: "/admin/users", label: "Users", icon: Users },
      { path: "/admin/donations", label: "Donations", icon: Gift },
      { path: "/admin/volunteers", label: "Volunteers", icon: Truck },
      { path: "/admin/requests", label: "Requests", icon: Heart },
      { path: "/events", label: "Events", icon: Calendar },
    ],
  };

  // Links to render based on current auth/role
  const currentNavLinks =
    isAuthenticated && profile?.role ? getNavLinksForRole(profile.role) : publicNavLinks;

  return (
    <nav className="shadow-sm border-b border-navy-800 sticky top-0 z-40" style={{ backgroundColor: "#000f3d" }}>
      <div className="max-w-full xl:max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo Container */}
          <div className="flex items-center relative">
            <Link to="/" className="flex items-center space-x-2">
              <img src="/hopelinklogo.png" alt="HopeLink" className="h-12 rounded" />
              <div className="flex flex-col">
                <span className="text-xl font-bold text-white">HopeLink</span>
                <span className="text-[10px] text-yellow-300">CFC-GK</span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-4 lg:space-x-8">
            {/* Public Navigation - show only when not authenticated */}
            {!isAuthenticated && publicNavLinks.map((link) =>
              link.scrollTo ? (
                <button
                  key={link.path}
                  onClick={() => handleScrollNavigation(link.scrollTo)}
                  className={`px-2 lg:px-3 py-2 text-xs lg:text-sm font-medium transition-all duration-300 ease-in-out relative ${
                    isLinkActive(link) ? "text-yellow-400" : "text-yellow-200 hover:text-yellow-400"
                  }`}
                >
                  {link.label}
                  <div
                    className={`absolute bottom-0 left-0 h-0.5 bg-yellow-400 transition-all duration-300 ease-in-out ${
                      isLinkActive(link) ? "w-full" : "w-0"
                    }`}
                  />
                </button>
              ) : (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-2 lg:px-3 py-2 text-xs lg:text-sm font-medium transition-all duration-300 ease-in-out relative ${
                    isLinkActive(link) ? "text-yellow-400" : "text-yellow-200 hover:text-yellow-400"
                  }`}
                >
                  {link.label}
                  <div
                    className={`absolute bottom-0 left-0 h-0.5 bg-yellow-400 transition-all duration-300 ease-in-out ${
                      isLinkActive(link) ? "w-full" : "w-0"
                    }`}
                  />
                </Link>
              )
            )}

            {/* Role-based Navigation - show for authenticated users in desktop view */}
            {shouldShowProfile && profile?.role && roleBasedLinks[profile.role] && (
              <>
                {roleBasedLinks[profile.role].map((link) => (
                  <button
                    key={link.path}
                    onClick={() => {
                      if (link.path === "/dashboard" || link.path.startsWith("/dashboard")) {
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      } else if (link.path === "/events") {
                        if (location.pathname !== "/dashboard") {
                          navigate("/dashboard");
                          setTimeout(() => {
                            const element = document.getElementById("events");
                            if (element) element.scrollIntoView({ behavior: "smooth" });
                          }, 100);
                        } else {
                          const element = document.getElementById("events");
                          if (element) element.scrollIntoView({ behavior: "smooth" });
                        }
                      } else if (link.path === "/post-donation") {
                        if (location.pathname !== "/dashboard") {
                          navigate("/dashboard");
                          setTimeout(() => {
                            const el = document.getElementById("postdonation");
                            if (el) el.scrollIntoView({ behavior: "smooth" });
                          }, 100);
                        } else {
                          const el = document.getElementById("postdonation");
                          if (el) el.scrollIntoView({ behavior: "smooth" });
                        }
                      } else if (link.path === "/my-donations") {
                        if (location.pathname !== "/dashboard") {
                          navigate("/dashboard");
                          setTimeout(() => {
                            const el = document.getElementById("mydonations");
                            if (el) el.scrollIntoView({ behavior: "smooth" });
                          }, 100);
                        } else {
                          const el = document.getElementById("mydonations");
                          if (el) el.scrollIntoView({ behavior: "smooth" });
                        }
                      } else if (link.path === "/browse-requests") {
                        if (location.pathname !== "/dashboard") {
                          navigate("/dashboard");
                          setTimeout(() => {
                            const el = document.getElementById("browserequests");
                            if (el) el.scrollIntoView({ behavior: "smooth" });
                          }, 100);
                        } else {
                          const el = document.getElementById("browserequests");
                          if (el) el.scrollIntoView({ behavior: "smooth" });
                        }
                      } else {
                        window.location.href = link.path;
                      }
                    }}
                    className={`flex items-center space-x-1 px-2 lg:px-3 py-2 text-xs lg:text-sm font-medium transition-colors ${
                      location.pathname === link.path
                        ? "text-yellow-400"
                        : "text-yellow-200 hover:text-yellow-400"
                    }`}
                  >
                    <link.icon className="h-4 w-4" />
                    <span>{link.label}</span>
                  </button>
                ))}
                <Link
                  to="/about"
                  className={`flex items-center space-x-1 px-2 lg:px-3 py-2 text-xs lg:text-sm font-medium transition-colors text-yellow-200 hover:text-yellow-400`}
                >
                  <Info className="h-4 w-4" />
                  <span>About</span>
                </Link>
              </>
            )}

            {/* Auth Section */}
            {shouldShowProfile ? (
              <div className="relative" ref={desktopProfileMenuRef}>
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-navy-800 transition-colors"
                >
                  <div className="h-8 w-8 bg-yellow-600 rounded-full overflow-hidden flex items-center justify-center">
                    {profile?.profile_image_url ? (
                      <img src={profile.profile_image_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-sm font-medium">
                        {profile?.name?.charAt(0)?.toUpperCase() || "U"}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-medium text-white">{profile?.name || "User"}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-yellow-400 transition-transform ${
                      isProfileMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {isProfileMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-48 bg-navy-900 rounded-lg shadow-lg border border-navy-700 py-1"
                    >
                      <Link
                        to="/profile"
                        className="flex items-center space-x-2 px-4 py-2 text-sm text-yellow-300 hover:bg-navy-800"
                        onClick={() => setIsProfileMenuOpen(false)}
                      >
                        <Settings className="h-4 w-4" />
                        <span>Profile Settings</span>
                      </Link>
                      {profile?.role === "admin" && (
                        <Link
                          to="/admin/settings"
                          className="flex items-center space-x-2 px-4 py-2 text-sm text-yellow-300 hover:bg-navy-800"
                          onClick={() => setIsProfileMenuOpen(false)}
                        >
                          <Shield className="h-4 w-4" />
                          <span>Admin Settings</span>
                        </Link>
                      )}
                      <hr className="my-1 border-navy-700" />
                      <button
                        onClick={handleSignOut}
                        disabled={isSigningOut}
                        className={`flex items-center space-x-2 w-full px-4 py-2 text-sm transition-colors ${
                          isSigningOut
                            ? "text-yellow-400 cursor-not-allowed"
                            : "text-yellow-300 hover:bg-navy-800"
                        }`}
                      >
                        <LogOut className="h-4 w-4" />
                        <span>{isSigningOut ? "Signing Out..." : "Sign Out"}</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/login"
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    location.pathname === "/login"
                      ? "text-yellow-400 border-b-2 border-yellow-400"
                      : "text-yellow-200 hover:text-yellow-400"
                  }`}
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === "/signup" || location.pathname.startsWith("/signup/")
                      ? "bg-[#001a5c] text-yellow-300 border-2 border-yellow-400"
                      : "bg-yellow-600 text-navy-950 hover:bg-yellow-700"
                  }`}
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-2">
            {shouldShowProfile ? (
              <button
                onClick={() => setIsSideMenuOpen(true)}
                className="flex items-center gap-2 p-2 rounded-md text-yellow-400 hover:text-white hover:bg-navy-800"
                aria-label="Open menu"
              >
                <div className="h-6 w-6 bg-yellow-600 rounded-full overflow-hidden flex items-center justify-center">
                  {profile?.profile_image_url ? (
                    <img src={profile.profile_image_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-xs font-medium">
                      {profile?.name?.charAt(0)?.toUpperCase() || "U"}
                    </span>
                  )}
                </div>
                <Menu className="h-5 w-5" />
              </button>
            ) : (
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-md text-yellow-400 hover:text-white hover:bg-navy-800"
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Sidebar Drawer for authenticated users */}
      <AnimatePresence>
        {shouldShowProfile && isSideMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-40"
              onClick={() => setIsSideMenuOpen(false)}
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "tween", duration: 0.2 }}
              className="fixed top-0 left-0 bottom-0 w-72 border-r border-navy-800 z-50 p-4 overflow-y-auto"
              style={{ backgroundColor: "#000f3d" }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <img src="/hopelinklogo.png" alt="HopeLink" className="h-10 rounded" />
                  <span className="text-lg font-bold text-white">Menu</span>
                </div>
                <button
                  onClick={() => setIsSideMenuOpen(false)}
                  className="p-2 rounded-md text-yellow-400 hover:text-white hover:bg-navy-800"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Role-based links */}
              {profile?.role && roleBasedLinks[profile.role] && (
                <div className="space-y-2">
                  {roleBasedLinks[profile.role].map((link) => (
                    <button
                      key={link.path}
                      onClick={() => {
                        setIsSideMenuOpen(false);
                        if (link.path === "/dashboard" || link.path.startsWith("/dashboard")) {
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        } else if (link.path === "/events") {
                          if (location.pathname !== "/dashboard") {
                            navigate("/dashboard");
                            setTimeout(() => {
                              const element = document.getElementById("events");
                              if (element) element.scrollIntoView({ behavior: "smooth" });
                            }, 100);
                          } else {
                            const element = document.getElementById("events");
                            if (element) element.scrollIntoView({ behavior: "smooth" });
                          }
                        } else if (link.path === "/post-donation") {
                          if (location.pathname !== "/dashboard") {
                            navigate("/dashboard");
                            setTimeout(() => {
                              const el = document.getElementById("postdonation");
                              if (el) el.scrollIntoView({ behavior: "smooth" });
                            }, 100);
                          } else {
                            const el = document.getElementById("postdonation");
                            if (el) el.scrollIntoView({ behavior: "smooth" });
                          }
                        } else if (link.path === "/my-donations") {
                          if (location.pathname !== "/dashboard") {
                            navigate("/dashboard");
                            setTimeout(() => {
                              const el = document.getElementById("mydonations");
                              if (el) el.scrollIntoView({ behavior: "smooth" });
                            }, 100);
                          } else {
                            const el = document.getElementById("mydonations");
                            if (el) el.scrollIntoView({ behavior: "smooth" });
                          }
                        } else if (link.path === "/browse-requests") {
                          if (location.pathname !== "/dashboard") {
                            navigate("/dashboard");
                            setTimeout(() => {
                              const el = document.getElementById("browserequests");
                              if (el) el.scrollIntoView({ behavior: "smooth" });
                            }, 100);
                          } else {
                            const el = document.getElementById("browserequests");
                            if (el) el.scrollIntoView({ behavior: "smooth" });
                          }
                        } else {
                          window.location.href = link.path;
                        }
                      }}
                      className={`flex items-center justify-center space-x-2 px-3 py-3 rounded-md text-sm font-medium transition-colors border border-navy-700 ${
                        location.pathname === link.path
                          ? "text-yellow-400 bg-navy-800 border-yellow-400"
                          : "text-yellow-200 hover:text-yellow-400 hover:bg-navy-800 hover:border-yellow-400"
                      }`}
                    >
                      <link.icon className="h-4 w-4" />
                      <span>{link.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Divider */}
              <hr className="my-3 border-navy-700" />

              {/* Public quick links */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-yellow-300 text-center mb-2">Public Links</h3>
                {publicNavLinks.map((link) =>
                  link.scrollTo ? (
                    <button
                      key={link.path}
                      onClick={() => {
                        handleScrollNavigation(link.scrollTo);
                        setIsSideMenuOpen(false);
                      }}
                      className={`block w-full text-center px-3 py-3 rounded-md text-sm font-medium transition-colors border border-navy-700 ${
                        isLinkActive(link)
                          ? "text-yellow-400 bg-navy-800 border-yellow-400"
                          : "text-yellow-200 hover:text-yellow-400 hover:bg-navy-800 hover:border-yellow-400"
                      }`}
                    >
                      {link.label}
                    </button>
                  ) : (
                    <Link
                      key={link.path}
                      to={link.path}
                      className={`block text-center px-3 py-3 rounded-md text-sm font-medium transition-colors border border-navy-700 ${
                        location.pathname === link.path
                          ? "text-yellow-400 bg-navy-800 border-yellow-400"
                          : "text-yellow-200 hover:text-yellow-400 hover:bg-navy-800 hover:border-yellow-400"
                      }`}
                      onClick={() => setIsSideMenuOpen(false)}
                    >
                      {link.label}
                    </Link>
                  )
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Navigation Menu - Show for all users */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-navy-800 shadow-lg"
            style={{ backgroundColor: "#000f3d" }}
          >
            <div className="px-6 py-6 space-y-3 max-w-md mx-auto">
              {/* Public Navigation for Mobile */}
              {publicNavLinks.map((link) =>
                link.scrollTo ? (
                  <button
                    key={link.path}
                    onClick={() => {
                      handleScrollNavigation(link.scrollTo);
                      setIsMenuOpen(false);
                    }}
                    className={`block w-full px-6 py-3 text-center text-base font-semibold rounded-lg transition-all duration-200 ${
                      isLinkActive(link)
                        ? "text-white bg-navy-800 border border-yellow-400/50"
                        : "text-gray-200 hover:text-white hover:bg-navy-800/70 border border-navy-700"
                    }`}
                  >
                    {link.label}
                  </button>
                ) : (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`block px-6 py-3 text-center text-base font-semibold rounded-lg transition-all duration-200 ${
                      isLinkActive(link)
                        ? "text-white bg-navy-800 border border-yellow-400/50"
                        : "text-gray-200 hover:text-white hover:bg-navy-800/70 border border-navy-700"
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                )
              )}

              {/* Mobile Auth Section - Only for non-authenticated users */}
              {!isAuthenticated && (
                <div className="pt-4 space-y-3 border-t border-navy-700/50">
                  <Link
                    to="/login"
                    className={`block px-6 py-3 text-center text-base font-semibold rounded-lg transition-all duration-200 border ${
                      location.pathname === "/login"
                        ? "text-white bg-navy-800 border-yellow-400/50"
                        : "text-gray-200 hover:text-white hover:bg-navy-800/70 border-navy-700"
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/signup"
                    className={`block px-6 py-3 text-center text-base font-bold rounded-lg transition-all duration-200 shadow-md ${
                      location.pathname === "/signup" || location.pathname.startsWith("/signup/")
                        ? "bg-yellow-700 text-navy-950 border-2 border-yellow-400"
                        : "bg-yellow-600 text-navy-950 hover:bg-yellow-500"
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
