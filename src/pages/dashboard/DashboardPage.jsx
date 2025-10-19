import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Gift,
  Heart,
  Truck,
  Calendar,
  Users,
  TrendingUp,
  Plus,
  Eye,
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  MapPin,
  Tag,
  Star,
  User as UserIcon,
  Image as ImageIcon,
  ArrowRight,
  Edit,
  Trash2,
  MoreHorizontal,
  Activity,
  X,
  Bell,
  Phone,
  Award,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { db, supabase } from "../../lib/supabase";
import { DashboardSkeleton } from "../../components/ui/Skeleton";
import ProfileCompletionPrompt from "../../components/ui/ProfileCompletionPrompt";
import { IDVerificationBadge } from "../../components/ui/VerificationBadge";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import ConfirmationModal from "../../components/ui/ConfirmationModal";

const DashboardPage = () => {
  const { profile, isDonor, isRecipient, isVolunteer, isAdmin } = useAuth();
  const { success, error } = useToast();
  const [stats, setStats] = useState({});
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Donor-specific state
  const [donations, setDonations] = useState([]);
  const [donationSearchTerm, setDonationSearchTerm] = useState("");
  const [donationStatusFilter, setDonationStatusFilter] = useState("all");
  const [donationCategoryFilter, setDonationCategoryFilter] = useState("all");
  const [deletingDonationId, setDeletingDonationId] = useState(null);

  // Recipient-specific state
  const [availableDonations, setAvailableDonations] = useState([]);
  const [recipientSearchTerm, setRecipientSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedCondition, setSelectedCondition] = useState("");
  const [showUrgentOnly, setShowUrgentOnly] = useState(false);
  const [claimingId, setClaimingId] = useState(null);
  const [requestedDonations, setRequestedDonations] = useState(new Set());

  // Request-specific state
  const [requests, setRequests] = useState([]);
  const [requestSearchTerm, setRequestSearchTerm] = useState("");
  const [requestStatusFilter, setRequestStatusFilter] = useState("all");
  const [deletingRequestId, setDeletingRequestId] = useState(null);

  // Events-specific state
  const [events, setEvents] = useState([]);
  const [eventSearchTerm, setEventSearchTerm] = useState("");
  const [eventStatusFilter, setEventStatusFilter] = useState("all");
  const [eventCategoryFilter, setEventCategoryFilter] = useState("all");

  // Volunteer-specific state
  const [deliveries, setDeliveries] = useState([]);
  const [volunteerNotifications, setVolunteerNotifications] = useState([]);
  const [deliverySearchTerm, setDeliverySearchTerm] = useState("");
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState("all");

  // Admin-specific state
  const [allUsers, setAllUsers] = useState([]);
  const [adminStats, setAdminStats] = useState({});
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");

  const loadDashboardData = useCallback(async () => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Load events for all authenticated users
      const eventsData = await db.getEvents();
      setEvents(eventsData);

      if (isDonor) {
        const [donationsData, availableDonationsData] = await Promise.all([
          db.getDonations({ donor_id: profile.id }),
          db.getDonations({ status: "available" }),
        ]);

        setDonations(donationsData);
        setAvailableDonations(availableDonationsData);
        setStats({
          totalDonations: donationsData.length,
          activeDonations: donationsData.filter((d) => d.status === "available")
            .length,
          completedDonations: donationsData.filter(
            (d) => d.status === "delivered"
          ).length,
        });
        setRecentActivity(donationsData.slice(0, 5));
      } else if (isRecipient) {
        const [requestsData, availableDonationsData] = await Promise.all([
          db.getRequests({ requester_id: profile.id }),
          db.getDonations({ status: "available" }),
        ]);

        setRequests(requestsData);
        setAvailableDonations(availableDonationsData);
        setStats({
          totalRequests: requestsData.length,
          openRequests: requestsData.filter((r) => r.status === "open").length,
          fulfilledRequests: requestsData.filter(
            (r) => r.status === "fulfilled"
          ).length,
        });
        setRecentActivity(requestsData.slice(0, 5));
      } else if (isVolunteer) {
        const [deliveriesData, notificationsData] = await Promise.all([
          db.getDeliveries({ volunteer_id: profile.id }),
          db.getVolunteerNotifications({ volunteer_id: profile.id }),
        ]);

        setDeliveries(deliveriesData);
        setVolunteerNotifications(notificationsData);
        setStats({
          totalDeliveries: deliveriesData.length,
          activeDeliveries: deliveriesData.filter(
            (d) => d.status === "in_progress"
          ).length,
          completedDeliveries: deliveriesData.filter(
            (d) => d.status === "completed"
          ).length,
        });
        setRecentActivity(deliveriesData.slice(0, 5));
      } else if (isAdmin) {
        const [allDonations, allRequests, allUsersData] = await Promise.all([
          db.getDonations(),
          db.getRequests(),
          db.getUsers(),
        ]);

        setAllUsers(allUsersData);
        setStats({
          totalDonations: allDonations.length,
          totalRequests: allRequests.length,
          totalUsers: allUsersData.length,
        });
        setAdminStats({
          totalEvents: eventsData.length,
          activeEvents: eventsData.filter((e) => e.status === "active").length,
          totalVolunteers: allUsersData.filter((u) => u.role === "volunteer")
            .length,
        });
        setRecentActivity([
          ...allDonations.slice(0, 2),
          ...allRequests.slice(0, 2),
          ...eventsData.slice(0, 1),
        ]);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, [profile?.id, isDonor, isRecipient, isAdmin]);

  useEffect(() => {
    if (!profile) {
      setLoading(false);
      return;
    }

    // Redirect based on role to ensure users see the correct dashboard
    if (isVolunteer) {
      navigate("/volunteer-dashboard", { replace: true });
      return;
    }

    // Log profile info for debugging
    console.log("Dashboard - Profile role:", profile.role);
    console.log("Dashboard - Role checks:", {
      isDonor,
      isRecipient,
      isVolunteer,
      isAdmin,
    });

    loadDashboardData();

    // Set up real-time subscriptions for live updates
    let donationsSubscription;
    let requestsSubscription;

    if (supabase && profile?.id) {
      if (isDonor) {
        // Subscribe to donation changes for donors
        donationsSubscription = supabase
          .channel("dashboard_donations")
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "donations",
              filter: `donor_id=eq.${profile.id}`,
            },
            () => {
              console.log("📊 Dashboard donation change detected");
              loadDashboardData();
            }
          )
          .subscribe();
      } else if (isRecipient) {
        // Subscribe to request changes for recipients
        requestsSubscription = supabase
          .channel("dashboard_requests")
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "donation_requests",
              filter: `requester_id=eq.${profile.id}`,
            },
            () => {
              console.log("📊 Dashboard request change detected");
              loadDashboardData();
            }
          )
          .subscribe();
      }
    }

    // Cleanup subscriptions
    return () => {
      if (donationsSubscription) {
        supabase.removeChannel(donationsSubscription);
      }
      if (requestsSubscription) {
        supabase.removeChannel(requestsSubscription);
      }
    };
  }, [profile, isVolunteer, navigate, loadDashboardData, isDonor, isRecipient]);

  const getDashboardCards = () => {
    if (isDonor) {
      return [
        {
          title: "Post New Donation",
          description: "Share items with your community",
          icon: Plus,
          color: "bg-blue-500",
          link: "/post-donation",
        },
        {
          title: "My Donations",
          description: "Manage your donations",
          icon: Gift,
          color: "bg-green-500",
          link: "/my-donations",
        },
        {
          title: "Browse Requests",
          description: "See what recipients need",
          icon: Users,
          color: "bg-pink-500",
          link: "/browse-requests",
        },
        {
          title: "Browse Events",
          description: "Join community events",
          icon: Calendar,
          color: "bg-purple-500",
          link: "/events",
        },
      ];
    } else if (isRecipient) {
      return [
        {
          title: "Browse Donations",
          description: "Find items you need",
          icon: Eye,
          color: "bg-blue-500",
          link: "/browse-donations",
        },
        {
          title: "Create Request",
          description: "Request specific items",
          icon: Plus,
          color: "bg-pink-500",
          link: "/create-request",
        },
        {
          title: "My Requests",
          description: "Track your requests",
          icon: Heart,
          color: "bg-green-500",
          link: "/my-requests",
        },
      ];
    } else if (isAdmin) {
      return [
        {
          title: "Admin Panel",
          description: "Manage the platform",
          icon: Users,
          color: "bg-red-500",
          link: "/admin",
        },
        {
          title: "View All Donations",
          description: "Monitor all donations",
          icon: Gift,
          color: "bg-blue-500",
          link: "/admin/donations",
        },
        {
          title: "Platform Statistics",
          description: "View platform analytics",
          icon: TrendingUp,
          color: "bg-green-500",
          link: "/admin/stats",
        },
      ];
    }
    return [];
  };

  const getStatsCards = () => {
    if (isDonor) {
      return [
        {
          label: "Total Donations",
          value: stats.totalDonations || 0,
          icon: Gift,
        },
        {
          label: "Active Donations",
          value: stats.activeDonations || 0,
          icon: Clock,
        },
        {
          label: "Completed",
          value: stats.completedDonations || 0,
          icon: TrendingUp,
        },
      ];
    } else if (isRecipient) {
      return [
        {
          label: "Total Requests",
          value: stats.totalRequests || 0,
          icon: Heart,
        },
        { label: "Open Requests", value: stats.openRequests || 0, icon: Clock },
        {
          label: "Fulfilled",
          value: stats.fulfilledRequests || 0,
          icon: TrendingUp,
        },
      ];
    } else if (isVolunteer) {
      return [
        {
          label: "Total Deliveries",
          value: stats.totalDeliveries || 0,
          icon: Truck,
        },
        {
          label: "Active Deliveries",
          value: stats.activeDeliveries || 0,
          icon: Clock,
        },
        {
          label: "Completed",
          value: stats.completedDeliveries || 0,
          icon: TrendingUp,
        },
      ];
    } else if (isAdmin) {
      return [
        {
          label: "Total Donations",
          value: stats.totalDonations || 0,
          icon: Gift,
        },
        {
          label: "Total Requests",
          value: stats.totalRequests || 0,
          icon: Heart,
        },
        { label: "Total Users", value: stats.totalUsers || 0, icon: Users },
      ];
    }
    return [];
  };

  // Filter functions
  const getFilteredDonations = () => {
    return donations.filter((donation) => {
      const matchesSearch =
        donation.title
          ?.toLowerCase()
          .includes(donationSearchTerm.toLowerCase()) ||
        donation.description
          ?.toLowerCase()
          .includes(donationSearchTerm.toLowerCase());
      const matchesStatus =
        donationStatusFilter === "all" ||
        donation.status === donationStatusFilter;
      const matchesCategory =
        donationCategoryFilter === "all" ||
        donation.category === donationCategoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  };

  const getFilteredAvailableDonations = () => {
    return availableDonations.filter((donation) => {
      const matchesSearch =
        donation.title
          ?.toLowerCase()
          .includes(recipientSearchTerm.toLowerCase()) ||
        donation.description
          ?.toLowerCase()
          .includes(recipientSearchTerm.toLowerCase());
      const matchesCategory =
        !selectedCategory || donation.category === selectedCategory;
      const matchesCondition =
        !selectedCondition || donation.condition === selectedCondition;
      const matchesUrgent = !showUrgentOnly || donation.is_urgent;
      return (
        matchesSearch && matchesCategory && matchesCondition && matchesUrgent
      );
    });
  };

  const getFilteredRequests = () => {
    return requests.filter((request) => {
      const matchesSearch =
        request.title
          ?.toLowerCase()
          .includes(requestSearchTerm.toLowerCase()) ||
        request.description
          ?.toLowerCase()
          .includes(requestSearchTerm.toLowerCase());
      const matchesStatus =
        requestStatusFilter === "all" || request.status === requestStatusFilter;
      return matchesSearch && matchesStatus;
    });
  };

  const getFilteredEvents = () => {
    return events.filter((event) => {
      const matchesSearch =
        event.title?.toLowerCase().includes(eventSearchTerm.toLowerCase()) ||
        event.description
          ?.toLowerCase()
          .includes(eventSearchTerm.toLowerCase());
      const matchesStatus =
        eventStatusFilter === "all" || event.status === eventStatusFilter;
      const matchesCategory =
        eventCategoryFilter === "all" || event.category === eventCategoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  };

  const getFilteredDeliveries = () => {
    return deliveries.filter((delivery) => {
      const matchesSearch =
        delivery.title
          ?.toLowerCase()
          .includes(deliverySearchTerm.toLowerCase()) ||
        delivery.description
          ?.toLowerCase()
          .includes(deliverySearchTerm.toLowerCase());
      const matchesStatus =
        deliveryStatusFilter === "all" ||
        delivery.status === deliveryStatusFilter;
      return matchesSearch && matchesStatus;
    });
  };

  const getFilteredUsers = () => {
    return allUsers.filter((user) => {
      const matchesSearch =
        user.name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(userSearchTerm.toLowerCase());
      const matchesRole =
        userRoleFilter === "all" || user.role === userRoleFilter;
      return matchesSearch && matchesRole;
    });
  };

  // Action handlers
  const handleDeleteDonation = async (donationId) => {
    try {
      await db.deleteDonation(donationId);
      setDonations((prev) => prev.filter((d) => d.id !== donationId));
      success("Donation deleted successfully");
    } catch (error) {
      console.error("Error deleting donation:", error);
      error("Failed to delete donation");
    } finally {
      setDeletingDonationId(null);
    }
  };

  const handleDeleteRequest = async (requestId) => {
    try {
      await db.deleteRequest(requestId);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      success("Request deleted successfully");
    } catch (error) {
      console.error("Error deleting request:", error);
      error("Failed to delete request");
    } finally {
      setDeletingRequestId(null);
    }
  };

  const handleClaimDonation = async (donationId) => {
    try {
      setClaimingId(donationId);
      await db.claimDonation(donationId, profile.id);
      setRequestedDonations((prev) => new Set([...prev, donationId]));
      success("Donation claimed successfully! The donor will be notified.");
      loadDashboardData(); // Refresh data
    } catch (error) {
      console.error("Error claiming donation:", error);
      error("Failed to claim donation");
    } finally {
      setClaimingId(null);
    }
  };

  if (loading || !profile) {
    return <DashboardSkeleton />;
  }

  const dashboardCards = getDashboardCards();
  const statsCards = getStatsCards();

  // Handle case where user has unexpected role or no role-specific content
  if (!isDonor && !isRecipient && !isAdmin && profile) {
    return (
      <div className="min-h-screen py-6 sm:py-8 overflow-x-hidden" style={{ backgroundColor: "#00237d" }}>
        <div className="max-w-full xl:max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Welcome, {profile.name}!
            </h1>
            <p className="text-skyblue-300 mb-8">
              We're setting up your account. Your role: {profile.role}
            </p>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-8">
              <p className="text-yellow-400">
                If you're seeing this, there might be an issue with your account
                role. Please contact support or try logging out and back in.
              </p>
            </div>
            <Link to="/profile" className="btn btn-primary">
              Update Profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 sm:py-8 overflow-x-hidden" style={{ backgroundColor: "#00237d" }}>
      <div className="max-w-full xl:max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          id="dashboard"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white break-words">
                Welcome back, {profile?.name}!
              </h1>
              <p className="text-yellow-200 text-sm sm:text-base mt-2">
                {isDonor && "Ready to make a difference with your donations?"}
                {isRecipient && "Let's find the support you need."}
                {isVolunteer && "Thank you for helping connect our community."}
                {isAdmin && "Manage the HopeLink platform."}
              </p>
            </div>
            {/* ID Verification Status Badge */}
            <div className="flex items-center">
              <IDVerificationBadge
                idStatus={profile?.id_verification_status}
                hasIdUploaded={
                  profile?.primary_id_type && profile?.primary_id_number
                }
                size="lg"
                showText={true}
                showDescription={false}
              />
            </div>
          </div>
        </motion.div>

        {/* Profile Completion Prompt */}
        <ProfileCompletionPrompt />

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-3 gap-2 sm:gap-6 mb-8"
        >
          {statsCards.map((stat, index) => (
            <div
              key={index}
              className="card p-4 sm:p-6 border border-gray-600"
              style={{ backgroundColor: "#001a5c" }}
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <stat.icon className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-300" />
                </div>
                <div className="ml-4">
                  <p className="text-xs sm:text-sm font-medium text-yellow-200">
                    {stat.label}
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-white">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-xl font-semibold text-white mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {dashboardCards.map((card, index) => (
              <button
                key={index}
                onClick={() => {
                  if (card.link === "/post-donation") {
                    document
                      .getElementById("postdonation")
                      ?.scrollIntoView({ behavior: "smooth" });
                  } else if (card.link === "/browse-donations") {
                    document
                      .getElementById("browsedonations")
                      ?.scrollIntoView({ behavior: "smooth" });
                  } else if (card.link === "/create-request") {
                    document
                      .getElementById("createrequest")
                      ?.scrollIntoView({ behavior: "smooth" });
                  } else if (card.link === "/my-donations") {
                    document
                      .getElementById("mydonations")
                      ?.scrollIntoView({ behavior: "smooth" });
                  } else if (card.link === "/my-requests") {
                    document
                      .getElementById("myrequests")
                      ?.scrollIntoView({ behavior: "smooth" });
                  } else if (card.link === "/browse-requests") {
                    document
                      .getElementById("browserequests")
                      ?.scrollIntoView({ behavior: "smooth" });
                  } else {
                    window.location.href = card.link;
                  }
                }}
                className="card p-4 sm:p-6 hover:shadow-lg transition-shadow group border border-gray-600"
                style={{ backgroundColor: "#001a5c" }}
              >
                <div className="flex items-center">
                  <div
                    className={`flex-shrink-0 p-2 sm:p-3 rounded-lg ${card.color} text-white group-hover:scale-110 transition-transform`}
                  >
                    <card.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <div className="ml-4 text-left">
                    <h3 className="text-base sm:text-lg font-medium text-white group-hover:text-yellow-300 transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-yellow-200">
                      {card.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-12"
        >
          <div
            className="card p-6 border border-gray-600"
            style={{ backgroundColor: "#001a5c" }}
          >
            <h2 className="text-xl font-semibold text-white mb-4">
              Recent Activity
            </h2>
            {recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-3 p-3 rounded-lg border border-gray-600"
                    style={{ backgroundColor: "#001a5c" }}
                  >
                    <div className="flex-shrink-0">
                      {isDonor && <Gift className="h-5 w-5 text-yellow-300" />}
                      {isRecipient && (
                        <Heart className="h-5 w-5 text-yellow-300" />
                      )}
                      {isVolunteer && (
                        <Truck className="h-5 w-5 text-yellow-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {activity.title}
                      </p>
                      <p className="text-sm text-yellow-200">
                        Status: {activity.status}
                      </p>
                    </div>
                    <div className="text-xs text-yellow-300">
                      {new Date(activity.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-yellow-300">No recent activity</p>
                <p className="text-sm text-yellow-200 mt-1">
                  Get started with the quick actions above!
                </p>
              </div>
            )}
          </div>

          {/* Community Events */}
          <div
            className="card p-6 border border-gray-600"
            style={{ backgroundColor: "#001a5c" }}
          >
            <h2 className="text-xl font-semibold text-white mb-4">
              Community Events
            </h2>
            <div className="space-y-4">
              <div
                className="flex items-center space-x-3 p-3 rounded-lg border border-gray-600"
                style={{ backgroundColor: "#001a5c" }}
              >
                <Calendar className="h-5 w-5 text-yellow-300" />
                <div>
                  <p className="text-sm font-medium text-white">
                    Winter Clothing Drive
                  </p>
                  <p className="text-xs text-yellow-200">Dec 15 - Dec 31</p>
                </div>
              </div>
              <div
                className="flex items-center space-x-3 p-3 rounded-lg border border-gray-600"
                style={{ backgroundColor: "#001a5c" }}
              >
                <Users className="h-5 w-5 text-yellow-300" />
                <div>
                  <p className="text-sm font-medium text-white">
                    Holiday Food Bank
                  </p>
                  <p className="text-xs text-yellow-200">Ongoing</p>
                </div>
              </div>
            </div>
            <Link
              to="/events"
              className="block mt-4 text-center text-yellow-300 hover:text-yellow-200 font-medium text-sm"
            >
              View All Events →
            </Link>
          </div>
        </motion.div>

        {/* Donor Sections */}
        {isDonor && (
          <>
            {/* Post Donation Section */}
            <motion.div
              id="postdonation"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mb-12"
            >
              <div
                className="card p-6 border border-gray-600"
                style={{ backgroundColor: "#001a5c" }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold text-white flex items-center">
                    <Plus className="h-6 w-6 mr-2 text-yellow-300" />
                    Post New Donation
                  </h2>
                  <Link to="/post-donation" className="btn btn-primary">
                    Create Donation
                  </Link>
                </div>
                <p className="text-yellow-200 mb-4">
                  Share items with your community and make a difference in
                  someone's life.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div
                    className="p-4 rounded-lg border border-gray-600"
                    style={{ backgroundColor: "#001a5c" }}
                  >
                    <Gift className="h-8 w-8 text-yellow-300 mb-2" />
                    <h3 className="text-white font-medium">Food Items</h3>
                    <p className="text-sm text-yellow-200">
                      Non-perishable food items
                    </p>
                  </div>
                  <div
                    className="p-4 rounded-lg border border-gray-600"
                    style={{ backgroundColor: "#001a5c" }}
                  >
                    <Package className="h-8 w-8 text-yellow-300 mb-2" />
                    <h3 className="text-white font-medium">Clothing</h3>
                    <p className="text-sm text-yellow-200">
                      Clean, good condition clothing
                    </p>
                  </div>
                  <div
                    className="p-4 rounded-lg border border-gray-600"
                    style={{ backgroundColor: "#001a5c" }}
                  >
                    <Heart className="h-8 w-8 text-yellow-300 mb-2" />
                    <h3 className="text-white font-medium">Other Items</h3>
                    <p className="text-sm text-yellow-200">
                      Household items, books, toys
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* My Donations Section */}
            <motion.div
              id="mydonations"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mb-12"
            >
              <div
                className="card p-6 border border-gray-600"
                style={{ backgroundColor: "#001a5c" }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold text-white flex items-center">
                    <Gift className="h-6 w-6 mr-2 text-yellow-300" />
                    My Donations
                  </h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-yellow-300" />
                      <input
                        type="text"
                        placeholder="Search donations..."
                        value={donationSearchTerm}
                        onChange={(e) => setDonationSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-navy-800 border border-gray-600 rounded-lg text-white placeholder-yellow-200 focus:outline-none focus:border-yellow-400"
                      />
                    </div>
                    <select
                      value={donationStatusFilter}
                      onChange={(e) => setDonationStatusFilter(e.target.value)}
                      className="px-3 py-2 bg-navy-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-400"
                    >
                      <option value="all">All Status</option>
                      <option value="available">Available</option>
                      <option value="claimed">Claimed</option>
                      <option value="delivered">Delivered</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  {getFilteredDonations().length > 0 ? (
                    getFilteredDonations().map((donation) => (
                      <div
                        key={donation.id}
                        className="p-4 rounded-lg border border-gray-600"
                        style={{ backgroundColor: "#001a5c" }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="text-white font-medium">
                              {donation.title}
                            </h3>
                            <p className="text-sm text-yellow-200 mt-1">
                              {donation.description}
                            </p>
                            <div className="flex items-center space-x-4 mt-2">
                              <span className="text-xs text-yellow-300 bg-yellow-500/20 px-2 py-1 rounded">
                                {donation.category}
                              </span>
                              <span
                                className={`text-xs px-2 py-1 rounded ${
                                  donation.status === "available"
                                    ? "bg-green-500/20 text-green-300"
                                    : donation.status === "claimed"
                                    ? "bg-yellow-500/20 text-yellow-300"
                                    : "bg-blue-500/20 text-blue-300"
                                }`}
                              >
                                {donation.status}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setDeletingDonationId(donation.id)}
                              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Gift className="h-12 w-12 text-yellow-300 mx-auto mb-4" />
                      <p className="text-yellow-300">No donations found</p>
                      <p className="text-sm text-yellow-200 mt-1">
                        Start by posting your first donation!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Browse Requests Section */}
            <motion.div
              id="browserequests"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="mb-12"
            >
              <div
                className="card p-6 border border-gray-600"
                style={{ backgroundColor: "#001a5c" }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold text-white flex items-center">
                    <Users className="h-6 w-6 mr-2 text-yellow-300" />
                    Browse Requests
                  </h2>
                  <Link to="/browse-requests" className="btn btn-primary">
                    View All Requests
                  </Link>
                </div>
                <p className="text-yellow-200 mb-4">
                  See what recipients in your community need and help fulfill
                  their requests.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    className="p-4 rounded-lg border border-gray-600"
                    style={{ backgroundColor: "#001a5c" }}
                  >
                    <Heart className="h-8 w-8 text-yellow-300 mb-2" />
                    <h3 className="text-white font-medium">Urgent Needs</h3>
                    <p className="text-sm text-yellow-200">
                      High priority requests
                    </p>
                  </div>
                  <div
                    className="p-4 rounded-lg border border-gray-600"
                    style={{ backgroundColor: "#001a5c" }}
                  >
                    <Clock className="h-8 w-8 text-yellow-300 mb-2" />
                    <h3 className="text-white font-medium">Recent Requests</h3>
                    <p className="text-sm text-yellow-200">
                      Latest community needs
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}

        {/* Recipient Sections */}
        {isRecipient && (
          <>
            {/* Browse Donations Section */}
            <motion.div
              id="browsedonations"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mb-12"
            >
              <div
                className="card p-6 border border-gray-600"
                style={{ backgroundColor: "#001a5c" }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold text-white flex items-center">
                    <Eye className="h-6 w-6 mr-2 text-yellow-300" />
                    Browse Available Donations
                  </h2>
                  <Link to="/browse-donations" className="btn btn-primary">
                    View All Donations
                  </Link>
                </div>

                <div className="flex items-center space-x-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-yellow-300" />
                    <input
                      type="text"
                      placeholder="Search donations..."
                      value={recipientSearchTerm}
                      onChange={(e) => setRecipientSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-navy-800 border border-gray-600 rounded-lg text-white placeholder-yellow-200 focus:outline-none focus:border-yellow-400"
                    />
                  </div>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-3 py-2 bg-navy-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-400"
                  >
                    <option value="">All Categories</option>
                    <option value="Food">Food</option>
                    <option value="Clothing">Clothing</option>
                    <option value="Medical Supplies">Medical Supplies</option>
                    <option value="Educational Materials">
                      Educational Materials
                    </option>
                    <option value="Household Items">Household Items</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Toys & Games">Toys & Games</option>
                    <option value="Books">Books</option>
                    <option value="Furniture">Furniture</option>
                    <option value="Other">Other</option>
                  </select>
                  <label className="flex items-center space-x-2 text-yellow-200">
                    <input
                      type="checkbox"
                      checked={showUrgentOnly}
                      onChange={(e) => setShowUrgentOnly(e.target.checked)}
                      className="rounded border-gray-600 bg-navy-800 text-yellow-400 focus:ring-yellow-400"
                    />
                    <span className="text-sm">Urgent only</span>
                  </label>
                </div>

                <div className="space-y-4">
                  {getFilteredAvailableDonations().length > 0 ? (
                    getFilteredAvailableDonations()
                      .slice(0, 5)
                      .map((donation) => (
                        <div
                          key={donation.id}
                          className="p-4 rounded-lg border border-gray-600"
                          style={{ backgroundColor: "#001a5c" }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <h3 className="text-white font-medium">
                                  {donation.title}
                                </h3>
                                {donation.is_urgent && (
                                  <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded">
                                    Urgent
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-yellow-200 mb-2">
                                {donation.description}
                              </p>
                              <div className="flex items-center space-x-4">
                                <span className="text-xs text-yellow-300 bg-yellow-500/20 px-2 py-1 rounded">
                                  {donation.category}
                                </span>
                                <span className="text-xs text-yellow-300 bg-yellow-500/20 px-2 py-1 rounded">
                                  {donation.condition}
                                </span>
                                {donation.location && (
                                  <span className="text-xs text-yellow-300 flex items-center">
                                    <MapPin className="h-3 w-3 mr-1" />
                                    {donation.location}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {requestedDonations.has(donation.id) ? (
                                <span className="text-sm text-yellow-300 bg-yellow-500/20 px-3 py-1 rounded">
                                  Requested
                                </span>
                              ) : (
                                <button
                                  onClick={() =>
                                    handleClaimDonation(donation.id)
                                  }
                                  disabled={claimingId === donation.id}
                                  className="btn btn-primary btn-sm"
                                >
                                  {claimingId === donation.id ? (
                                    <LoadingSpinner size="sm" />
                                  ) : (
                                    "Claim"
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="text-center py-8">
                      <Gift className="h-12 w-12 text-yellow-300 mx-auto mb-4" />
                      <p className="text-yellow-300">No donations found</p>
                      <p className="text-sm text-yellow-200 mt-1">
                        Try adjusting your search criteria
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Create Request Section */}
            <motion.div
              id="createrequest"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mb-12"
            >
              <div
                className="card p-6 border border-gray-600"
                style={{ backgroundColor: "#001a5c" }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold text-white flex items-center">
                    <Plus className="h-6 w-6 mr-2 text-yellow-300" />
                    Create New Request
                  </h2>
                  <Link to="/create-request" className="btn btn-primary">
                    Create Request
                  </Link>
                </div>
                <p className="text-yellow-200 mb-4">
                  Request specific items you need from the community.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div
                    className="p-4 rounded-lg border border-gray-600"
                    style={{ backgroundColor: "#001a5c" }}
                  >
                    <Heart className="h-8 w-8 text-yellow-300 mb-2" />
                    <h3 className="text-white font-medium">Essential Items</h3>
                    <p className="text-sm text-yellow-200">
                      Food, clothing, medical supplies
                    </p>
                  </div>
                  <div
                    className="p-4 rounded-lg border border-gray-600"
                    style={{ backgroundColor: "#001a5c" }}
                  >
                    <Package className="h-8 w-8 text-yellow-300 mb-2" />
                    <h3 className="text-white font-medium">Household Items</h3>
                    <p className="text-sm text-yellow-200">
                      Furniture, appliances, tools
                    </p>
                  </div>
                  <div
                    className="p-4 rounded-lg border border-gray-600"
                    style={{ backgroundColor: "#001a5c" }}
                  >
                    <Star className="h-8 w-8 text-yellow-300 mb-2" />
                    <h3 className="text-white font-medium">Special Requests</h3>
                    <p className="text-sm text-yellow-200">
                      Educational materials, toys
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* My Requests Section */}
            <motion.div
              id="myrequests"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="mb-12"
            >
              <div
                className="card p-6 border border-gray-600"
                style={{ backgroundColor: "#001a5c" }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold text-white flex items-center">
                    <Heart className="h-6 w-6 mr-2 text-yellow-300" />
                    My Requests
                  </h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-yellow-300" />
                      <input
                        type="text"
                        placeholder="Search requests..."
                        value={requestSearchTerm}
                        onChange={(e) => setRequestSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-navy-800 border border-gray-600 rounded-lg text-white placeholder-yellow-200 focus:outline-none focus:border-yellow-400"
                      />
                    </div>
                    <select
                      value={requestStatusFilter}
                      onChange={(e) => setRequestStatusFilter(e.target.value)}
                      className="px-3 py-2 bg-navy-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-400"
                    >
                      <option value="all">All Status</option>
                      <option value="open">Open</option>
                      <option value="fulfilled">Fulfilled</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  {getFilteredRequests().length > 0 ? (
                    getFilteredRequests().map((request) => (
                      <div
                        key={request.id}
                        className="p-4 rounded-lg border border-gray-600"
                        style={{ backgroundColor: "#001a5c" }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="text-white font-medium">
                              {request.title}
                            </h3>
                            <p className="text-sm text-yellow-200 mt-1">
                              {request.description}
                            </p>
                            <div className="flex items-center space-x-4 mt-2">
                              <span className="text-xs text-yellow-300 bg-yellow-500/20 px-2 py-1 rounded">
                                {request.category}
                              </span>
                              <span
                                className={`text-xs px-2 py-1 rounded ${
                                  request.status === "open"
                                    ? "bg-green-500/20 text-green-300"
                                    : request.status === "fulfilled"
                                    ? "bg-blue-500/20 text-blue-300"
                                    : "bg-red-500/20 text-red-300"
                                }`}
                              >
                                {request.status}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setDeletingRequestId(request.id)}
                              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Heart className="h-12 w-12 text-yellow-300 mx-auto mb-4" />
                      <p className="text-yellow-300">No requests found</p>
                      <p className="text-sm text-yellow-200 mt-1">
                        Create your first request to get started!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}

        {/* Events Section - For All Authenticated Users */}
        <motion.div
          id="events"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mb-12"
        >
          <div
            className="card p-6 border border-gray-600"
            style={{ backgroundColor: "#001a5c" }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-white flex items-center">
                <Calendar className="h-6 w-6 mr-2 text-yellow-300" />
                Community Events
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-yellow-300" />
                  <input
                    type="text"
                    placeholder="Search events..."
                    value={eventSearchTerm}
                    onChange={(e) => setEventSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-navy-800 border border-gray-600 rounded-lg text-white placeholder-yellow-200 focus:outline-none focus:border-yellow-400"
                  />
                </div>
                <select
                  value={eventStatusFilter}
                  onChange={(e) => setEventStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-navy-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-400"
                >
                  <option value="all">All Status</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              {getFilteredEvents().length > 0 ? (
                getFilteredEvents()
                  .slice(0, 6)
                  .map((event) => (
                    <div
                      key={event.id}
                      className="p-4 rounded-lg border border-gray-600"
                      style={{ backgroundColor: "#001a5c" }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="text-white font-medium">
                            {event.title}
                          </h3>
                          <p className="text-sm text-yellow-200 mt-1">
                            {event.description}
                          </p>
                          <div className="flex items-center space-x-4 mt-2">
                            <span className="text-xs text-yellow-300 flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {new Date(event.date).toLocaleDateString()}
                            </span>
                            {event.location && (
                              <span className="text-xs text-yellow-300 flex items-center">
                                <MapPin className="h-3 w-3 mr-1" />
                                {event.location}
                              </span>
                            )}
                            <span
                              className={`text-xs px-2 py-1 rounded ${
                                event.status === "upcoming"
                                  ? "bg-blue-500/20 text-blue-300"
                                  : event.status === "ongoing"
                                  ? "bg-green-500/20 text-green-300"
                                  : "bg-gray-500/20 text-gray-300"
                              }`}
                            >
                              {event.status}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Link
                            to={`/events/${event.id}`}
                            className="btn btn-primary btn-sm"
                          >
                            View Details
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-yellow-300 mx-auto mb-4" />
                  <p className="text-yellow-300">No events found</p>
                  <p className="text-sm text-yellow-200 mt-1">
                    Check back later for upcoming community events
                  </p>
                </div>
              )}
            </div>

            <Link
              to="/events"
              className="block mt-6 text-center text-yellow-300 hover:text-yellow-200 font-medium text-sm"
            >
              View All Events →
            </Link>
          </div>
        </motion.div>

        {/* Volunteer Sections */}
        {isVolunteer && (
          <>
            {/* Available Tasks Section */}
            <motion.div
              id="availabletasks"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mb-12"
            >
              <div
                className="card p-6 border border-gray-600"
                style={{ backgroundColor: "#001a5c" }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold text-white flex items-center">
                    <Truck className="h-6 w-6 mr-2 text-yellow-300" />
                    Available Delivery Tasks
                  </h2>
                  <Link to="/available-tasks" className="btn btn-primary">
                    View All Tasks
                  </Link>
                </div>
                <p className="text-yellow-200 mb-4">
                  Help connect donors and recipients by delivering items.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    className="p-4 rounded-lg border border-gray-600"
                    style={{ backgroundColor: "#001a5c" }}
                  >
                    <Package className="h-8 w-8 text-yellow-300 mb-2" />
                    <h3 className="text-white font-medium">
                      Pending Deliveries
                    </h3>
                    <p className="text-sm text-yellow-200">
                      Items waiting for pickup
                    </p>
                  </div>
                  <div
                    className="p-4 rounded-lg border border-gray-600"
                    style={{ backgroundColor: "#001a5c" }}
                  >
                    <Clock className="h-8 w-8 text-yellow-300 mb-2" />
                    <h3 className="text-white font-medium">Scheduled Today</h3>
                    <p className="text-sm text-yellow-200">
                      Deliveries for today
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* My Deliveries Section */}
            <motion.div
              id="mydeliveries"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mb-12"
            >
              <div
                className="card p-6 border border-gray-600"
                style={{ backgroundColor: "#001a5c" }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold text-white flex items-center">
                    <Truck className="h-6 w-6 mr-2 text-yellow-300" />
                    My Deliveries
                  </h2>
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-yellow-300" />
                      <input
                        type="text"
                        placeholder="Search deliveries..."
                        value={deliverySearchTerm}
                        onChange={(e) => setDeliverySearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-navy-800 border border-gray-600 rounded-lg text-white placeholder-yellow-200 focus:outline-none focus:border-yellow-400"
                      />
                    </div>
                    <select
                      value={deliveryStatusFilter}
                      onChange={(e) => setDeliveryStatusFilter(e.target.value)}
                      className="px-3 py-2 bg-navy-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-400"
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  {getFilteredDeliveries().length > 0 ? (
                    getFilteredDeliveries().map((delivery) => (
                      <div
                        key={delivery.id}
                        className="p-4 rounded-lg border border-gray-600"
                        style={{ backgroundColor: "#001a5c" }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="text-white font-medium">
                              {delivery.title}
                            </h3>
                            <p className="text-sm text-yellow-200 mt-1">
                              {delivery.description}
                            </p>
                            <div className="flex items-center space-x-4 mt-2">
                              <span className="text-xs text-yellow-300 flex items-center">
                                <MapPin className="h-3 w-3 mr-1" />
                                {delivery.pickup_location} →{" "}
                                {delivery.delivery_location}
                              </span>
                              <span
                                className={`text-xs px-2 py-1 rounded ${
                                  delivery.status === "pending"
                                    ? "bg-yellow-500/20 text-yellow-300"
                                    : delivery.status === "in_progress"
                                    ? "bg-blue-500/20 text-blue-300"
                                    : "bg-green-500/20 text-green-300"
                                }`}
                              >
                                {delivery.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Truck className="h-12 w-12 text-yellow-300 mx-auto mb-4" />
                      <p className="text-yellow-300">No deliveries found</p>
                      <p className="text-sm text-yellow-200 mt-1">
                        Check available tasks to start helping!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Volunteer Schedule Section */}
            <motion.div
              id="volunteerschedule"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="mb-12"
            >
              <div
                className="card p-6 border border-gray-600"
                style={{ backgroundColor: "#001a5c" }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold text-white flex items-center">
                    <Clock className="h-6 w-6 mr-2 text-yellow-300" />
                    Manage Schedule
                  </h2>
                  <Link to="/volunteer-schedule" className="btn btn-primary">
                    Update Schedule
                  </Link>
                </div>
                <p className="text-yellow-200 mb-4">
                  Set your availability to help with deliveries.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div
                    className="p-4 rounded-lg border border-gray-600"
                    style={{ backgroundColor: "#001a5c" }}
                  >
                    <Calendar className="h-8 w-8 text-yellow-300 mb-2" />
                    <h3 className="text-white font-medium">Set Availability</h3>
                    <p className="text-sm text-yellow-200">
                      Update your schedule
                    </p>
                  </div>
                  <div
                    className="p-4 rounded-lg border border-gray-600"
                    style={{ backgroundColor: "#001a5c" }}
                  >
                    <Bell className="h-8 w-8 text-yellow-300 mb-2" />
                    <h3 className="text-white font-medium">Notifications</h3>
                    <p className="text-sm text-yellow-200">
                      {volunteerNotifications.length} new
                    </p>
                  </div>
                  <div
                    className="p-4 rounded-lg border border-gray-600"
                    style={{ backgroundColor: "#001a5c" }}
                  >
                    <Award className="h-8 w-8 text-yellow-300 mb-2" />
                    <h3 className="text-white font-medium">Your Impact</h3>
                    <p className="text-sm text-yellow-200">
                      {stats.completedDeliveries || 0} deliveries completed
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}

        {/* Admin Sections */}
        {isAdmin && (
          <>
            {/* User Management Section */}
            <motion.div
              id="adminusers"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mb-12"
            >
              <div
                className="card p-6 border border-gray-600"
                style={{ backgroundColor: "#001a5c" }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold text-white flex items-center">
                    <Users className="h-6 w-6 mr-2 text-yellow-300" />
                    User Management
                  </h2>
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-yellow-300" />
                      <input
                        type="text"
                        placeholder="Search users..."
                        value={userSearchTerm}
                        onChange={(e) => setUserSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-navy-800 border border-gray-600 rounded-lg text-white placeholder-yellow-200 focus:outline-none focus:border-yellow-400"
                      />
                    </div>
                    <select
                      value={userRoleFilter}
                      onChange={(e) => setUserRoleFilter(e.target.value)}
                      className="px-3 py-2 bg-navy-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-400"
                    >
                      <option value="all">All Roles</option>
                      <option value="donor">Donors</option>
                      <option value="recipient">Recipients</option>
                      <option value="volunteer">Volunteers</option>
                      <option value="admin">Admins</option>
                    </select>
                    <Link to="/admin/users" className="btn btn-primary">
                      Manage Users
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div
                    className="p-4 rounded-lg border border-gray-600"
                    style={{ backgroundColor: "#001a5c" }}
                  >
                    <UserIcon className="h-8 w-8 text-yellow-300 mb-2" />
                    <h3 className="text-white font-medium">Total Users</h3>
                    <p className="text-2xl font-bold text-yellow-300">
                      {stats.totalUsers || 0}
                    </p>
                  </div>
                  <div
                    className="p-4 rounded-lg border border-gray-600"
                    style={{ backgroundColor: "#001a5c" }}
                  >
                    <Gift className="h-8 w-8 text-yellow-300 mb-2" />
                    <h3 className="text-white font-medium">Donors</h3>
                    <p className="text-2xl font-bold text-yellow-300">
                      {
                        getFilteredUsers().filter((u) => u.role === "donor")
                          .length
                      }
                    </p>
                  </div>
                  <div
                    className="p-4 rounded-lg border border-gray-600"
                    style={{ backgroundColor: "#001a5c" }}
                  >
                    <Heart className="h-8 w-8 text-yellow-300 mb-2" />
                    <h3 className="text-white font-medium">Recipients</h3>
                    <p className="text-2xl font-bold text-yellow-300">
                      {
                        getFilteredUsers().filter((u) => u.role === "recipient")
                          .length
                      }
                    </p>
                  </div>
                  <div
                    className="p-4 rounded-lg border border-gray-600"
                    style={{ backgroundColor: "#001a5c" }}
                  >
                    <Truck className="h-8 w-8 text-yellow-300 mb-2" />
                    <h3 className="text-white font-medium">Volunteers</h3>
                    <p className="text-2xl font-bold text-yellow-300">
                      {adminStats.totalVolunteers || 0}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {getFilteredUsers()
                    .slice(0, 5)
                    .map((user) => (
                      <div
                        key={user.id}
                        className="p-4 rounded-lg border border-gray-600"
                        style={{ backgroundColor: "#001a5c" }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="text-white font-medium">
                              {user.name}
                            </h3>
                            <p className="text-sm text-yellow-200 mt-1">
                              {user.email}
                            </p>
                            <div className="flex items-center space-x-4 mt-2">
                              <span className="text-xs text-yellow-300 bg-yellow-500/20 px-2 py-1 rounded">
                                {user.role}
                              </span>
                              <span className="text-xs text-yellow-300">
                                Joined:{" "}
                                {new Date(user.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </motion.div>

            {/* Admin Donations Overview */}
            <motion.div
              id="admindonations"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mb-12"
            >
              <div
                className="card p-6 border border-gray-600"
                style={{ backgroundColor: "#001a5c" }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold text-white flex items-center">
                    <Gift className="h-6 w-6 mr-2 text-yellow-300" />
                    Donations Overview
                  </h2>
                  <Link to="/admin/donations" className="btn btn-primary">
                    Manage Donations
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div
                    className="p-4 rounded-lg border border-gray-600"
                    style={{ backgroundColor: "#001a5c" }}
                  >
                    <Package className="h-8 w-8 text-yellow-300 mb-2" />
                    <h3 className="text-white font-medium">Total Donations</h3>
                    <p className="text-2xl font-bold text-yellow-300">
                      {stats.totalDonations || 0}
                    </p>
                  </div>
                  <div
                    className="p-4 rounded-lg border border-gray-600"
                    style={{ backgroundColor: "#001a5c" }}
                  >
                    <Heart className="h-8 w-8 text-yellow-300 mb-2" />
                    <h3 className="text-white font-medium">Total Requests</h3>
                    <p className="text-2xl font-bold text-yellow-300">
                      {stats.totalRequests || 0}
                    </p>
                  </div>
                  <div
                    className="p-4 rounded-lg border border-gray-600"
                    style={{ backgroundColor: "#001a5c" }}
                  >
                    <TrendingUp className="h-8 w-8 text-yellow-300 mb-2" />
                    <h3 className="text-white font-medium">Active Events</h3>
                    <p className="text-2xl font-bold text-yellow-300">
                      {adminStats.activeEvents || 0}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}

        {/* Confirmation Modals */}
        <ConfirmationModal
          isOpen={deletingDonationId !== null}
          onClose={() => setDeletingDonationId(null)}
          onConfirm={() => handleDeleteDonation(deletingDonationId)}
          title="Delete Donation"
          message="Are you sure you want to delete this donation? This action cannot be undone."
          confirmText="Delete"
          confirmClass="bg-red-600 hover:bg-red-700"
        />

        <ConfirmationModal
          isOpen={deletingRequestId !== null}
          onClose={() => setDeletingRequestId(null)}
          onConfirm={() => handleDeleteRequest(deletingRequestId)}
          title="Delete Request"
          message="Are you sure you want to delete this request? This action cannot be undone."
          confirmText="Delete"
          confirmClass="bg-red-600 hover:bg-red-700"
        />
      </div>
    </div>
  );
};

export default DashboardPage;
