"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  Bot,
  CreditCard,
  FileChartColumn,
  Gavel,
  HandCoins,
  History,
  LayoutDashboard,
  MonitorPlay,
  Palette,
  Settings,
  ShoppingBag,
  Truck,
  UserCheck,
  Users,
} from "lucide-react"

// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Aakara Art",
      plan: "Auction",
    },
  ],
  // navMain: [
  //   {
  //     title: "Dashboard",
  //     url: "#",
  //     icon: (
  //       <LayoutDashboard />
  //     ),
  //     // isActive: true,
  //     // items: [
  //     //   {
  //     //     title: "History",
  //     //     url: "#",
  //     //   },
  //     //   {
  //     //     title: "Starred",
  //     //     url: "#",
  //     //   },
  //     //   {
  //     //     title: "Settings",
  //     //     url: "#",
  //     //   },
  //     // ],
  //   },
  //   {
  //     title: "Live Auctions",
  //     url: "#",
  //     icon: (
  //       <Gavel
  //         className="rotate-270" />
  //     ),
  //     // items: [
  //     //   {
  //     //     title: "Genesis",
  //     //     url: "#",
  //     //   },
  //     //   {
  //     //     title: "Explorer",
  //     //     url: "#",
  //     //   },
  //     //   {
  //     //     title: "Quantum",
  //     //     url: "#",
  //     //   },
  //     // ],
  //   },
  //   {
  //     title: "Auctions & Lots",
  //     url: "#",
  //     icon: (

  //       <Layers />
  //     ),
  //     // items: [
  //     //   {
  //     //     title: "Introduction",
  //     //     url: "#",
  //     //   },
  //     //   {
  //     //     title: "Get Started",
  //     //     url: "#",
  //     //   },
  //     //   {
  //     //     title: "Tutorials",
  //     //     url: "#",
  //     //   },
  //     //   {
  //     //     title: "Changelog",
  //     //     url: "#",
  //     //   },
  //     // ],
  //   },
  //   {
  //     title: "Bidding Details",
  //     url: "#",
  //     icon: (
  //       <ReceiptText />
  //     ),
  //     // items: [
  //     //   {
  //     //     title: "General",
  //     //     url: "#",
  //     //   },
  //     //   {
  //     //     title: "Team",
  //     //     url: "#",
  //     //   },
  //     //   {
  //     //     title: "Billing",
  //     //     url: "#",
  //     //   },
  //     //   {
  //     //     title: "Limits",
  //     //     url: "#",
  //     //   },
  //     // ],
  //   },
  //   {
  //     title: "Results",
  //     url: "#",
  //     icon: (
  //       <ChartCandlestick />
  //     ),
  //     // items: [
  //     //   {
  //     //     title: "General",
  //     //     url: "#",
  //     //   },
  //     //   {
  //     //     title: "Team",
  //     //     url: "#",
  //     //   },
  //     //   {
  //     //     title: "Billing",
  //     //     url: "#",
  //     //   },
  //     //   {
  //     //     title: "Limits",
  //     //     url: "#",
  //     //   },
  //     // ],
  //   },
  //   {
  //     title: "Create Auction",
  //     url: "#",
  //     icon: (
  //       <LayersPlus />
  //     ),
  //     // items: [
  //     //   {
  //     //     title: "General",
  //     //     url: "#",
  //     //   },
  //     //   {
  //     //     title: "Team",
  //     //     url: "#",
  //     //   },
  //     //   {
  //     //     title: "Billing",
  //     //     url: "#",
  //     //   },
  //     //   {
  //     //     title: "Limits",
  //     //     url: "#",
  //     //   },
  //     // ],
  //   },
  //   {
  //     title: "Bidding Console",
  //     url: "#",
  //     icon: (
  //       <Gamepad />
  //     ),
  //     // items: [
  //     //   {
  //     //     title: "General",
  //     //     url: "#",
  //     //   },
  //     //   {
  //     //     title: "Team",
  //     //     url: "#",
  //     //   },
  //     //   {
  //     //     title: "Billing",
  //     //     url: "#",
  //     //   },
  //     //   {
  //     //     title: "Limits",
  //     //     url: "#",
  //     //   },
  //     // ],
  //   },
  //   {
  //     title: "User",
  //     url: "#",
  //     icon: (
  //       <Users />
  //     ),
  //     // items: [
  //     //   {
  //     //     title: "General",
  //     //     url: "#",
  //     //   },
  //     //   {
  //     //     title: "Team",
  //     //     url: "#",
  //     //   },
  //     //   {
  //     //     title: "Billing",
  //     //     url: "#",
  //     //   },
  //     //   {
  //     //     title: "Limits",
  //     //     url: "#",
  //     //   },
  //     // ],
  //   },
  // ],

  // each role sees only the pages it can open — see lib/constants/dashboardAccess.ts
  navMain: [
    { title: "Dashboard", url: "/dashboard", icon: <LayoutDashboard className="w-6 h-6" /> },
    // { title: "Live Auctions", url: "/dashboard/live-auctions", icon: <Gavel className="rotate-270" /> },
    {
      title: "Auctions & Lots", url: "/", icon: <Gavel />, items: [
        { title: "Create Auctions", url: "/dashboard/auctions" },
        { title: "Live Auctions", url: "/dashboard/auctions/live-auctions" },
        { title: "Past Auctions", url: "/dashboard/auctions/past-auctions" },
        { title: "Upcoming Auctions", url: "/dashboard/auctions/upcoming-auctions" },
      ],
    },
    {
      title: "Bidding Console",
      url: "/dashboard/bidding-console",
      icon: <MonitorPlay />,
      // also highlighted on a sale's console opened from the bidding floors
      activeOn: /^\/dashboard\/auctions\/live-auctions\/[^/]+/,
    },
    {
      title: "Manage Bidders",
      url: "/dashboard/auctions/manage-bidders",
      icon: <UserCheck />,
      // also highlighted on an auction's bidder pages
      activeOn: /^\/dashboard\/auctions\/[^/]+\/(registrations|lots\/[^/]+\/bidders)/,
    },
    { title: "Bid History", url: "/dashboard/bid-history", icon: <History /> },
    { title: "Proxy Bids", url: "/dashboard/proxy-bids", icon: <Bot /> },
    { title: "Artworks", url: "/dashboard/artworks", icon: <Palette /> },
    // { title: "Bidders", url: "/dashboard/bidders", icon: <UserCheck /> },
    { title: "User", url: "/dashboard/users", icon: <Users /> },
    { title: "Bidders", url: "/dashboard/bidders", icon: <HandCoins /> },
    // { title: "Orders", url: "/dashboard/orders", icon: <ShoppingBag /> },
    // { title: "Payment", url: "/dashboard/payment", icon: <CreditCard /> },
    // { title: "Shipping", url: "/dashboard/shipping", icon: <Truck /> },
    // { title: "Report", url: "/dashboard/report", icon: <FileChartColumn /> },
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: <Settings />,
      items: [
        { title: "General Settings", url: "/dashboard/settings/general" },
        { title: "Team", url: "/dashboard/settings/team" },
        { title: "Website", url: "/dashboard/settings/website" },
        { title: "Activity Logs", url: "/dashboard/settings/activity-logs" },
        { title: "Blocked IPs", url: "/dashboard/settings/blocked-ips" },
        { title: "OTP Limits", url: "/dashboard/settings/otp-limits" },
        // { title: "Roles & Permissions", url: "/dashboard/settings/permissions" },
      ],
    },
  ],

}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        {/* <NavProjects projects={data.projects} /> */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
