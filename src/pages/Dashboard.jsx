import React, { useState, useEffect } from "react";
import { Customer, Product, Quotation } from "@/api/entities";
// import { Quotation, Customer, Product } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  TrendingUp, 
  FileText, 
  Users, 
  Package, 
  Euro,
  Calendar,
  BarChart3,
  PlusCircle 
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

import StatsCard from "../components/dashboard/StatsCard";
import QuickActions from "../components/dashboard/QuickActions";
import RecentQuotes from "../components/dashboard/RecentQuotes";
import TopProducts from "../components/dashboard/TopProducts";
import MonthlyValueChart from "../components/dashboard/MonthlyValueChart";
import FilteredQuotesList from "../components/dashboard/FilteredQuotesList";
import FilteredCustomersList from "../components/dashboard/FilteredCustomersList";
import FilteredProductsList from "../components/dashboard/FilteredProductsList";

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalQuotes: 0,
    monthlyQuotes: 0,
    totalValue: 0,
    monthlyValue: 0,
    totalCustomers: 0,
    totalProducts: 0
  });
  const [recentQuotes, setRecentQuotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showMonthlyChart, setShowMonthlyChart] = useState(false);
  const [showMonthlyQuotes, setShowMonthlyQuotes] = useState(false);
  const [showCustomersList, setShowCustomersList] = useState(false);
  const [showProductsList, setShowProductsList] = useState(false);
  const [monthlyQuotes, setMonthlyQuotes] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      const [allQuotes, allCustomers, allProducts] = await Promise.all([
        Quotation.list("-created_date"),
        Customer.list(),
        Product.list()
      ]);

      // Filter out archived and deleted quotes from dashboard calculations
      const activeQuotes = allQuotes.filter(q => !q.is_deleted && !q.is_archived);
      const monthlyActiveQuotes = activeQuotes.filter(q => {
        const quoteDate = new Date(q.created_date);
        return quoteDate >= monthStart && quoteDate <= monthEnd;
      });

      // Filter out archived products from dashboard calculations
      const activeProducts = allProducts.filter(p => !p.is_archived);

      setStats({
        totalQuotes: activeQuotes.length,
        monthlyQuotes: monthlyActiveQuotes.length,
        totalValue: activeQuotes.reduce((sum, q) => sum + (q.total || q.total_amount || 0), 0),
        monthlyValue: monthlyActiveQuotes.reduce((sum, q) => sum + (q.total || q.total_amount || 0), 0),
        totalCustomers: allCustomers.length,
        totalProducts: activeProducts.length
      });

      // Store monthly quotes for filtered view
      setMonthlyQuotes(monthlyActiveQuotes);

      // Only show active quotes in recent quotes widget
      setRecentQuotes(activeQuotes.slice(0, 5));
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMonthlyQuotesClick = () => {
    setShowMonthlyQuotes(true);
  };

  const handleMonthlyValueClick = () => {
    setShowMonthlyChart(true);
  };

  const handleCustomersClick = () => {
    setShowCustomersList(true);
  };

  const handleProductsClick = () => {
    setShowProductsList(true);
  };

  return (
    <div className="p-6 space-y-8 bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-800 mb-2">
              Sales Dashboard
            </h1>
            <p className="text-slate-600 text-lg">
              Welcome back! Here's your sales overview for {format(new Date(), 'MMMM yyyy')}
            </p>
          </div>
          
          <Link to={createPageUrl("QuoteBuilder")}>
            <Button className="clay-button bg-gradient-to-r from-purple-200 to-purple-300 text-purple-800 border-none rounded-2xl px-6 py-3 font-semibold hover:from-purple-300 hover:to-purple-400 transition-all duration-300">
              <PlusCircle className="w-5 h-5 mr-2" />
              Create New Quote
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Monthly Quotes"
            value={stats.monthlyQuotes}
            icon={FileText}
            color="lavender"
            isLoading={isLoading}
            clickable={true}
            onClick={handleMonthlyQuotesClick}
          />
          <StatsCard
            title="Monthly Value"
            value={`€${stats.monthlyValue.toLocaleString()}`}
            icon={Euro}
            color="mint"
            isLoading={isLoading}
            clickable={true}
            onClick={handleMonthlyValueClick}
          />
          <StatsCard
            title="Total Customers"
            value={stats.totalCustomers}
            icon={Users}
            color="blue"
            isLoading={isLoading}
            clickable={true}
            onClick={handleCustomersClick}
          />
          <StatsCard
            title="Products"
            value={stats.totalProducts}
            icon={Package}
            color="peach"
            isLoading={isLoading}
            clickable={true}
            onClick={handleProductsClick}
          />
        </div>

        {/* Quick Actions */}
        <QuickActions />

        {/* Content Grid */}
        <div className="grid lg:grid-cols-2 gap-8">
          <RecentQuotes quotes={recentQuotes} isLoading={isLoading} />
          <TopProducts isLoading={isLoading} />
        </div>

        {/* Modals/Overlays */}
        {showMonthlyChart && (
          <MonthlyValueChart 
            onClose={() => setShowMonthlyChart(false)}
            monthlyValue={stats.monthlyValue}
          />
        )}

        {showMonthlyQuotes && (
          <FilteredQuotesList
            quotes={monthlyQuotes}
            title="Monthly Quotes"
            subtitle={`Quotes created in ${format(new Date(), 'MMMM yyyy')}`}
            onClose={() => setShowMonthlyQuotes(false)}
          />
        )}

        {showCustomersList && (
          <FilteredCustomersList
            title="Active Customers"
            subtitle="All active customers in your database"
            onClose={() => setShowCustomersList(false)}
          />
        )}

        {showProductsList && (
          <FilteredProductsList
            title="Active Products"
            subtitle="All active products in your catalog"
            onClose={() => setShowProductsList(false)}
          />
        )}
      </div>
    </div>
  );
}