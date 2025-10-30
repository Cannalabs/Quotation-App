import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function StatsCard({ title, value, icon: Icon, color, isLoading, onClick, clickable = false }) {
  const getColorClasses = (color) => {
    const colors = {
      lavender: "from-purple-100 via-purple-200 to-purple-300 text-purple-800",
      mint: "from-green-100 via-green-200 to-green-300 text-green-800",
      blue: "from-blue-100 via-blue-200 to-blue-300 text-blue-800",
      peach: "from-orange-100 via-orange-200 to-orange-300 text-orange-800"
    };
    return colors[color] || colors.lavender;
  };

  const baseClassName = "clay-shadow bg-gradient-to-br from-white/80 to-slate-50/60 border-none rounded-3xl overflow-hidden backdrop-blur-sm text-left w-full";
  
  const CardWrapper = clickable ? 'button' : 'div';
  const cardProps = clickable ? {
    onClick,
    "aria-label": `View details for ${title}`,
    className: `${baseClassName} cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2`
  } : {
    className: baseClassName
  };

  return (
    <CardWrapper {...cardProps}>
      <Card className="border-none bg-transparent shadow-none">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getColorClasses(color)} clay-shadow flex items-center justify-center`}>
              <Icon className="w-7 h-7" />
            </div>
            {/* "Click to view" text has been removed */}
          </div>
          
          <div className="space-y-2">
            <p className="text-slate-600 font-medium text-sm uppercase tracking-wide">
              {title}
            </p>
            {isLoading ? (
              <Skeleton className="h-8 w-24 rounded-xl" />
            ) : (
              <p className="text-3xl font-bold text-slate-800">
                {value}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </CardWrapper>
  );
}