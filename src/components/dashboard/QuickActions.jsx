import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { PlusCircle, Upload, Users, Package } from "lucide-react";

export default function QuickActions() {
  const actions = [
  {
    title: "New Quote",
    description: "Create a quotation",
    icon: PlusCircle,
    href: createPageUrl("QuoteBuilder"),
    color: "lavender"
  },
  {
    title: "Add Customer",
    description: "Register new client",
    icon: Users,
    href: createPageUrl("Customers"),
    color: "blue"
  },
  {
    title: "Upload Products",
    description: "Import from CSV",
    icon: Upload,
    href: createPageUrl("Products"),
    color: "mint"
  },
  {
    title: "Manage Catalog",
    description: "View all products",
    icon: Package,
    href: createPageUrl("Products"),
    color: "peach"
  }];


  const getColorClasses = (color) => {
    const colors = {
      lavender: "from-purple-100 to-purple-200 text-purple-700 hover:from-purple-200 hover:to-purple-300",
      mint: "from-green-100 to-green-200 text-green-700 hover:from-green-200 hover:to-green-300",
      blue: "from-blue-100 to-blue-200 text-blue-700 hover:from-blue-200 hover:to-blue-300",
      peach: "from-orange-100 to-orange-200 text-orange-700 hover:from-orange-200 hover:to-orange-300"
    };
    return colors[color] || colors.lavender;
  };

  return (
    <Card className="clay-shadow bg-gradient-to-br from-white/80 to-slate-50/60 border-none rounded-3xl mb-8 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl font-bold text-slate-800">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {actions.map((action) =>
          <Link key={action.title} to={action.href}>
              <Button
              variant="ghost"
              className={`
                  w-full h-auto p-6 clay-button bg-gradient-to-br ${getColorClasses(action.color)} 
                  border-none rounded-2xl flex flex-col items-center gap-3 
                  hover:scale-105 transition-all duration-300
                `}>

                <action.icon className="w-8 h-8" />
                <div className="text-center">
                  <p className="font-semibold text-sm">{action.title}</p>
                  <p className="text-sm opacity-80">{action.description}</p>
                </div>
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>);

}