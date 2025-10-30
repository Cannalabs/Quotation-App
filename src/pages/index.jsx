import Layout from "./Layout.jsx";
import Login from "./Login.jsx";
import ProtectedRoute from "@/components/ProtectedRoute.jsx";

import Dashboard from "./Dashboard";

import Products from "./Products";

import QuoteBuilder from "./QuoteBuilder";

import Customers from "./Customers";

import Quotes from "./Quotes";

import QuotePrint from "./QuotePrint";

import CompanySettings from "./CompanySettings";

import MyAccount from "./MyAccount";

import ConfirmedSalesOrders from "./ConfirmedSalesOrders";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    Login: Login,
    Dashboard: Dashboard,
    Products: Products,
    QuoteBuilder: QuoteBuilder,
    Customers: Customers,
    Quotes: Quotes,
    QuotePrint: QuotePrint,
    CompanySettings: CompanySettings,
    MyAccount: MyAccount,
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            
            {/* Protected routes */}
            <Route path="/" element={
                <ProtectedRoute>
                    <Layout currentPageName="Dashboard">
                        <Dashboard />
                    </Layout>
                </ProtectedRoute>
            } />
            
            <Route path="/dashboard" element={
                <ProtectedRoute>
                    <Layout currentPageName="Dashboard">
                        <Dashboard />
                    </Layout>
                </ProtectedRoute>
            } />
            
            <Route path="/products" element={
                <ProtectedRoute>
                    <Layout currentPageName="Products">
                        <Products />
                    </Layout>
                </ProtectedRoute>
            } />
            
            <Route path="/quotebuilder" element={
                <ProtectedRoute>
                    <Layout currentPageName="QuoteBuilder">
                        <QuoteBuilder />
                    </Layout>
                </ProtectedRoute>
            } />
            
            <Route path="/customers" element={
                <ProtectedRoute>
                    <Layout currentPageName="Customers">
                        <Customers />
                    </Layout>
                </ProtectedRoute>
            } />
            
            <Route path="/quotes" element={
                <ProtectedRoute>
                    <Layout currentPageName="Quotes">
                        <Quotes />
                    </Layout>
                </ProtectedRoute>
            } />

            <Route path="/confirmedsalesorders" element={
                <ProtectedRoute>
                    <Layout currentPageName="ConfirmedSalesOrders">
                        <ConfirmedSalesOrders />
                    </Layout>
                </ProtectedRoute>
            } />
            
            <Route path="/quoteprint" element={
                <ProtectedRoute>
                    <Layout currentPageName="QuotePrint">
                        <QuotePrint />
                    </Layout>
                </ProtectedRoute>
            } />
            
            <Route path="/companysettings" element={
                <ProtectedRoute>
                    <Layout currentPageName="CompanySettings">
                        <CompanySettings />
                    </Layout>
                </ProtectedRoute>
            } />
            
            <Route path="/myaccount" element={
                <ProtectedRoute>
                    <Layout currentPageName="MyAccount">
                        <MyAccount />
                    </Layout>
                </ProtectedRoute>
            } />
            
            {/* Legacy routes for backward compatibility */}
            <Route path="/Dashboard" element={
                <ProtectedRoute>
                    <Layout currentPageName="Dashboard">
                        <Dashboard />
                    </Layout>
                </ProtectedRoute>
            } />
            
            <Route path="/Products" element={
                <ProtectedRoute>
                    <Layout currentPageName="Products">
                        <Products />
                    </Layout>
                </ProtectedRoute>
            } />
            
            <Route path="/QuoteBuilder" element={
                <ProtectedRoute>
                    <Layout currentPageName="QuoteBuilder">
                        <QuoteBuilder />
                    </Layout>
                </ProtectedRoute>
            } />
            
            <Route path="/Customers" element={
                <ProtectedRoute>
                    <Layout currentPageName="Customers">
                        <Customers />
                    </Layout>
                </ProtectedRoute>
            } />
            
            <Route path="/Quotes" element={
                <ProtectedRoute>
                    <Layout currentPageName="Quotes">
                        <Quotes />
                    </Layout>
                </ProtectedRoute>
            } />
            
            <Route path="/QuotePrint" element={
                <ProtectedRoute>
                    <Layout currentPageName="QuotePrint">
                        <QuotePrint />
                    </Layout>
                </ProtectedRoute>
            } />
            
            <Route path="/CompanySettings" element={
                <ProtectedRoute>
                    <Layout currentPageName="CompanySettings">
                        <CompanySettings />
                    </Layout>
                </ProtectedRoute>
            } />
            
            <Route path="/MyAccount" element={
                <ProtectedRoute>
                    <Layout currentPageName="MyAccount">
                        <MyAccount />
                    </Layout>
                </ProtectedRoute>
            } />
        </Routes>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}